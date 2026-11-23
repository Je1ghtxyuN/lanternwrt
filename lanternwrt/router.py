"""OpenWrt data collection and scoped rpcd calls."""
import json
import os
import re
import shlex
import subprocess
import time

from .configuration import Change, RESOURCES, build_change
from .telemetry import interface_status, network_devices, wireless_status


PACKAGES = {
    "network": "name proto device type ports vlan vid interface target ipaddr ip6addr netmask gateway ip6gw dns metric",
    "wireless": "device mode ssid encryption network disabled band channel htmode",
    "dhcp": "interface start limit leasetime ignore dhcpv4 dhcpv6 ra mac ip name server",
    "firewall": "name network input output forward masq src dest proto src_ip dest_ip src_dport dest_port target family enabled",
}
READ_SCRIPT = r"""
section() {
    printf '\n@@%s\n' "$1"
    shift
    "$@" 2>/dev/null
}
section interfaces ubus call network.interface dump
section board ubus call system board
section info ubus call system info
section devices ubus call network.device status
section wifi_status ubus call network.wireless status
if command -v jsonfilter >/dev/null; then
    for ifname in $(ubus call iwinfo devices 2>/dev/null | jsonfilter -e '@.devices[*]'); do
        case "$ifname" in *[!a-zA-Z0-9_.-]*) continue;; esac
        args=$(printf '{"device":"%s"}' "$ifname")
        section "iwinfo:$ifname" ubus call iwinfo info "$args"
        section "assoc:$ifname" ubus call iwinfo assoclist "$args"
    done
fi
section leases cat /tmp/dhcp.leases
section neighbors ip neigh show
section storage df -kP /
section counters cat /proc/net/dev
section cpu cat /proc/stat
section routes4 ip -4 route show
section routes6 ip -6 route show
""" + "\n".join(f"section {name} ubus call uci get '{json.dumps({'config': name})}'" for name in PACKAGES) + "\nexit 0"

SAFE_UCI_SCRIPT = """
import { cursor } from 'uci';
const config = cursor();
const fields = split(ARGV[1], ' ');
const values = {};
config.foreach(ARGV[0], null, (section) => {
    const row = {'.type': section['.type']};
    for (let key in fields)
        if (key in section)
            row[key] = section[key];
    values[section['.name']] = row;
});
printf('%J\\n', {values});
"""

SAFE_WIRELESS_SCRIPT = """
import { connect } from 'ubus';
const radios = connect().call('network.wireless', 'status', {}) ?? {};
const safe = {};
for (let name in keys(radios)) {
    const radio = radios[name];
    const entry = {interfaces: []};
    for (let field in ['up', 'pending', 'disabled'])
        if (field in radio)
            entry[field] = radio[field];
    for (let iface in radio.interfaces ?? []) {
        const data = {};
        for (let field in ['mode', 'ssid', 'encryption', 'network', 'disabled'])
            if (iface.config && field in iface.config)
                data[field] = iface.config[field];
        push(entry.interfaces, {section: iface.section, ifname: iface.ifname, config: data});
    }
    safe[name] = entry;
}
printf('%J\\n', safe);
"""

SAFE_INTERFACE_SCRIPT = """
import { connect } from 'ubus';
const dump = connect().call('network.interface', 'dump', {});
if (type(dump?.interface) != 'array')
    exit(1);
const interface = map(dump.interface, (item) => {
    const row = {};
    for (let k in ['interface', 'proto', 'up', 'pending', 'uptime', 'device', 'l3_device',
                   'ipv4-address', 'ipv6-address', 'ipv6-prefix-assignment', 'dns-server', 'route'])
        if (k in item)
            row[k] = item[k];
    return row;
});
printf('%J\\n', {interface});
"""


def restricted_read_script():
    """Build a self-contained collector for an SSH forced command on OpenWrt."""
    script = READ_SCRIPT.replace("section wifi_status ubus call network.wireless status",
                                 shlex.join(["section", "wifi_status", "ucode", "-e", SAFE_WIRELESS_SCRIPT]))
    script = script.replace("section interfaces ubus call network.interface dump",
                            shlex.join(["section", "interfaces", "ucode", "-e", SAFE_INTERFACE_SCRIPT]))
    for name, fields in PACKAGES.items():
        source = f"section {name} ubus call uci get '{json.dumps({'config': name})}'"
        script = script.replace(source, shlex.join(["section", name, "ucode", "-e", SAFE_UCI_SCRIPT, "--", name, fields]))
    return """#!/bin/sh
case "${SSH_ORIGINAL_COMMAND:-}" in
    "sh -s") ;;
    *) exit 126 ;;
esac
""" + script


class RouterError(RuntimeError):
    pass


class RouterTransportError(RouterError):
    pass


class UnconfirmedApply(RouterError):
    def __init__(self, session, deadline):
        super().__init__("Router did not acknowledge apply")
        self.session = session
        self.deadline = deadline


def run_ssh(command, *, stdin=None):
    target = os.environ.get("LANTERN_SSH_TARGET", "")
    if not re.fullmatch(r"[A-Za-z0-9_][A-Za-z0-9_.:@-]*", target):
        raise RouterError("Invalid SSH target")
    config = os.environ.get("LANTERN_SSH_CONFIG")
    args = ["ssh"] + (["-F", config] if config else [])
    args += ["-o", "BatchMode=yes", "-o", "StrictHostKeyChecking=yes",
             "-o", "ConnectTimeout=5", "--", target, command]
    try:
        result = subprocess.run(args, input=stdin, text=True, capture_output=True, timeout=14)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise RouterTransportError("SSH connection failed") from exc
    if result.returncode == 255:
        raise RouterTransportError("SSH connection interrupted")
    if result.returncode:
        raise RouterError("Router command failed")
    return result.stdout


def rpc(obj, method, payload):
    command = shlex.join(["ubus", "call", obj, method, json.dumps(payload, ensure_ascii=False)])
    return json.loads(run_ssh("sh -s", stdin=command + "\n") or "{}")


def read_router():
    return snapshot(run_ssh("sh -s", stdin=READ_SCRIPT))


def snapshot(raw):
    segments = re.split(r"(?:^|\n)@@([a-z0-9_]+(?::[A-Za-z0-9_.-]+)?)\n", raw)
    blocks = dict(zip(segments[1::2], segments[2::2]))
    def get(name):
        try:
            data = json.loads(blocks.get(name, ""))
        except ValueError:
            return None
        return data if isinstance(data, dict) else None
    dump = get("interfaces")
    if dump is None or not isinstance(dump.get("interface"), list):
        raise RouterError("OpenWrt network.interface is unavailable")
    configs = {}
    for name, fields in PACKAGES.items():
        config = get(name)
        configs[name] = None if config is None else [
            {"id": section_id, "type": section.get(".type"),
             **{("deviceType" if field == "type" else field): section[field]
                for field in fields.split() if field in section}}
            for section_id, section in config.get("values", {}).items()
        ]
    network_config = {item["id"]: item for item in configs["network"] or [] if item["type"] == "interface"}
    interfaces = [interface_status(interface, network_config.get(interface["interface"], {})) for interface in dump["interface"]]
    info = get("info") or {}
    board = get("board") or {}
    storage_match = re.search(r"(\d+)%\s+/$", blocks.get("storage", "").strip())
    cpu = next((line.split()[1:9] for line in blocks.get("cpu", "").splitlines() if line.startswith("cpu ")), [])
    lease_fields = [line.split() for line in blocks.get("leases", "").splitlines()]
    leases = [{"expires": int(parts[0]), "mac": parts[1], "ip": parts[2], "name": parts[3]}
              for parts in lease_fields if len(parts) >= 4 and parts[0].isdecimal()]
    wifi, radios, stations = wireless_status(configs["wireless"], get, leases, blocks.get("neighbors", ""))
    counters = {}
    for line in blocks.get("counters", "").splitlines():
        label, sep, values = line.partition(":")
        fields = values.split()
        if sep and len(fields) == 16 and all(value.isdecimal() for value in fields):
            counters[label.strip()] = [int(fields[0]), int(fields[8])]
    return {
        "board": {key: board.get(key) for key in ("model", "hostname", "kernel", "release")},
        "interfaces": interfaces, "wifi": wifi, "radios": radios, "stations": stations, "configs": configs,
        "uptime": info.get("uptime"), "memory": info.get("memory"),
        "storage": int(storage_match[1]) if storage_match else None,
        "cpu": [int(value) for value in cpu] if all(value.isdecimal() for value in cpu) else [],
        "counters": counters,
        "ports": network_devices(get("devices"), wifi, counters),
        "leases": leases,
        "routes": {family: blocks.get("routes" + family, "").strip().splitlines() for family in ("4", "6")},
    }


def wifi_values(data):
    if not isinstance(data, dict) or not data or set(data) - {"ssid", "key", "disabled"}:
        raise ValueError("invalid Wi-Fi values")
    for key, value in data.items():
        if not isinstance(value, str) or any(ord(char) < 32 or ord(char) == 127 for char in value):
            raise ValueError("invalid control character")
        size = len(value.encode("utf-8"))
        if key == "ssid" and not 1 <= size <= 32:
            raise ValueError("invalid SSID length")
        if key == "key" and not (8 <= size <= 63 or re.fullmatch(r"[0-9a-fA-F]{64}", value)):
            raise ValueError("invalid passphrase length")
        if key == "disabled" and value not in {"0", "1"}:
            raise ValueError("invalid AP state")
    return data.copy()


def apply_wifi(section, data):
    if not isinstance(section, str) or not re.fullmatch(r"[A-Za-z0-9_]+", section):
        raise ValueError("invalid UCI section")
    values = wifi_values(data)
    current = rpc("uci", "get", {"config": "wireless", "section": section}).get("values", {})
    if current.get(".type") != "wifi-iface" or current.get("mode") != "ap":
        raise ValueError("section is not an AP")
    if "key" in values and current.get("encryption", "").split("+")[0] not in {"psk", "psk2", "psk-mixed", "sae", "sae-mixed"}:
        raise ValueError("unsupported security mode")
    return apply_change(Change("wireless", section, "wifi-iface", values))


def apply_network_config(resource, section, values, *, remove=False):
    if not isinstance(resource, str) or resource not in RESOURCES or not isinstance(remove, bool):
        raise ValueError("unknown configuration resource")
    package = RESOURCES[resource][0]
    current = rpc("uci", "get", {"config": package}).get("values", {})
    return apply_change(build_change(resource, section, values, {package: current}, remove=remove))


def apply_change(change):
    session = rpc("session", "create", {"timeout": 180})["ubus_rpc_session"]
    options = {"ubus_rpc_session": session}
    config = {**options, "config": change.package}
    section = {**config, "section": change.section}
    try:
        rpc("session", "grant", {**options, "scope": "uci", "objects": [[change.package, "read"], [change.package, "write"]]})
        if change.remove:
            rpc("uci", "delete", section)
        elif change.create:
            rpc("uci", "add", {**config, "name": change.section, "type": change.section_type, "values": change.values})
        else:
            if change.values:
                rpc("uci", "set", {**section, "values": change.values})
            if change.delete_options:
                rpc("uci", "delete", {**section, "options": change.delete_options})
        if not rpc("uci", "changes", config).get("changes"):
            raise ValueError("no changed options")
    except (RouterError, ValueError):
        try:
            rpc("session", "destroy", options)
        except RouterError:
            pass
        raise
    deadline = time.monotonic() + 58
    try:
        rpc("uci", "apply", {**options, "rollback": True, "timeout": 60})
    except RouterTransportError as exc:
        raise UnconfirmedApply(session, deadline) from exc
    return session
