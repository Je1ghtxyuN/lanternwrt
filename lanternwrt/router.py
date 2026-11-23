"""OpenWrt data collection and scoped rpcd calls."""
import json
import os
import re
import shlex
import subprocess


PACKAGES = {
    "network": "proto device type ports vlan vid ipaddr netmask gateway dns metric",
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
section leases cat /tmp/dhcp.leases
section storage df -kP /
section counters cat /proc/net/dev
section cpu cat /proc/stat
section routes4 ip -4 route show
section routes6 ip -6 route show
""" + "\n".join(f"section {name} ubus call uci get '{json.dumps({'config': name})}'" for name in PACKAGES) + "\nexit 0"


class RouterError(RuntimeError):
    pass


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
        raise RouterError("SSH connection failed") from exc
    if result.returncode:
        raise RouterError("Router command failed")
    return result.stdout


def rpc(obj, method, payload):
    command = shlex.join(["ubus", "call", obj, method, json.dumps(payload, ensure_ascii=False)])
    return json.loads(run_ssh("sh -s", stdin=command + "\n") or "{}")


def read_router():
    return snapshot(run_ssh("sh -s", stdin=READ_SCRIPT))


def snapshot(raw):
    segments = re.split(r"(?:^|\n)@@([a-z0-9_]+)\n", raw)
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
    interfaces = []
    for interface in dump["interface"]:
        addresses = [f"{addr['address']}/{addr['mask']}"
                     for family in ("ipv4-address", "ipv6-address")
                     for addr in interface.get(family, [])
                     if "address" in addr and "mask" in addr]
        interfaces.append({"name": interface["interface"], "device": interface.get("l3_device") or interface.get("device"),
                           "protocol": interface.get("proto"), "up": interface.get("up"),
                           "addresses": addresses, "dns": interface.get("dns-server", [])})
    configs = {}
    for name, fields in PACKAGES.items():
        config = get(name)
        configs[name] = None if config is None else [
            {"id": section_id, "type": section.get(".type"),
             **{field: section[field] for field in fields.split() if field in section}}
            for section_id, section in config.get("values", {}).items()
        ]
    wifi_live = get("wifi_status") or {}
    radios = {item["id"]: item for item in configs["wireless"] or [] if item["type"] == "wifi-device"}
    wifi = None if configs["wireless"] is None else []
    for item in configs["wireless"] or []:
        if item["type"] != "wifi-iface":
            continue
        radio = radios.get(item.get("device"), {})
        live = wifi_live.get(item.get("device"), {})
        status = next((row for row in live.get("interfaces", []) if row.get("section") == item["id"]), {})
        wifi.append({**item, "band": radio.get("band"), "channel": radio.get("channel"),
                     "ifname": status.get("ifname"), "up": bool(status.get("ifname")) if wifi_live else None})
    info = get("info") or {}
    board = get("board") or {}
    storage_match = re.search(r"(\d+)%\s+/$", blocks.get("storage", "").strip())
    cpu = next((line.split()[1:9] for line in blocks.get("cpu", "").splitlines() if line.startswith("cpu ")), [])
    devices = get("devices")
    leases = [line.split() for line in blocks.get("leases", "").splitlines()]
    counters = {}
    for line in blocks.get("counters", "").splitlines():
        label, sep, values = line.partition(":")
        fields = values.split()
        if sep and len(fields) == 16 and all(value.isdecimal() for value in fields):
            counters[label.strip()] = [int(fields[0]), int(fields[8])]
    return {
        "board": {key: board.get(key) for key in ("model", "hostname", "kernel", "release")},
        "interfaces": interfaces, "wifi": wifi, "configs": configs,
        "uptime": info.get("uptime"), "memory": info.get("memory"),
        "storage": int(storage_match[1]) if storage_match else None,
        "cpu": [int(value) for value in cpu] if all(value.isdecimal() for value in cpu) else [],
        "counters": counters,
        "ports": None if devices is None else [
            {"name": name, "type": value.get("type"), "up": value.get("up"),
             "carrier": value.get("carrier"), "speed": value.get("speed"),
             "mtu": value.get("mtu"), "mac": value.get("macaddr")}
            for name, value in devices.items() if isinstance(value, dict)
        ],
        "leases": [{"expires": int(parts[0]), "mac": parts[1], "ip": parts[2], "name": parts[3]}
                   for parts in leases if len(parts) >= 4 and parts[0].isdecimal()],
        "routes": {family: blocks.get("routes" + family, "").strip().splitlines() for family in ("4", "6")},
    }


def wifi_values(data):
    if not isinstance(data, dict) or not data or set(data) - {"ssid", "key"}:
        raise ValueError("invalid Wi-Fi values")
    for key, value in data.items():
        if not isinstance(value, str) or any(ord(char) < 32 or ord(char) == 127 for char in value):
            raise ValueError("invalid control character")
        size = len(value.encode("utf-8"))
        if key == "ssid" and not 1 <= size <= 32:
            raise ValueError("invalid SSID length")
        if key == "key" and not (8 <= size <= 63 or re.fullmatch(r"[0-9a-fA-F]{64}", value)):
            raise ValueError("invalid passphrase length")
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
    session = rpc("session", "create", {"timeout": 180})["ubus_rpc_session"]
    options = {"ubus_rpc_session": session}
    try:
        rpc("session", "grant", {**options, "scope": "uci", "objects": [["wireless", "read"], ["wireless", "write"]]})
        rpc("uci", "set", {**options, "config": "wireless", "section": section, "values": values})
    except RouterError:
        try:
            rpc("session", "destroy", options)
        except RouterError:
            pass
        raise
    rpc("uci", "apply", {**options, "rollback": True, "timeout": 60})
    return session
