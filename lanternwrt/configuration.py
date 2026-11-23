"""Build a scoped UCI change from a validated dashboard form."""
from dataclasses import dataclass, field
import ipaddress
import re
from uuid import uuid4


RESOURCES = {
    "interface": ("network", ("interface",), {"proto", "device", "ipaddr", "ip6addr", "gateway", "ip6gw", "dns", "username", "password"}),
    "dhcp": ("dhcp", ("dhcp",), {"start", "limit", "leasetime", "ignore"}),
    "dns": ("dhcp", ("dnsmasq",), {"server"}),
    "forward": ("firewall", ("redirect",), {"name", "src", "dest", "proto", "src_dport", "dest_ip", "dest_port", "enabled"}),
    "route": ("network", ("route", "route6"), {"interface", "target", "gateway", "metric"}),
}
CREATABLE = {"forward", "route"}


@dataclass
class Change:
    package: str
    section: str
    section_type: str
    values: dict
    create: bool = False
    delete_options: list = field(default_factory=list)
    remove: bool = False


def identifier(value):
    if not isinstance(value, str) or not re.fullmatch(r"[A-Za-z0-9_]+", value):
        raise ValueError("invalid UCI identifier")
    return value


def port(value):
    if not re.fullmatch(r"[0-9]{1,5}(?:-[0-9]{1,5})?", value):
        raise ValueError("invalid port")
    first, _, last = value.partition("-")
    if not 1 <= int(first) <= int(last or first) <= 65535:
        raise ValueError("invalid port")
    return value


def number(value, low, high):
    if not re.fullmatch(r"[0-9]{1,10}", value) or not low <= int(value) <= high:
        raise ValueError("invalid number")
    return str(int(value))


def binary(value):
    if value not in {"0", "1"}:
        raise ValueError("invalid switch")
    return value


def bind_address(value, family):
    address = ipaddress.ip_address(value)
    if address.version != family:
        raise ValueError("address family mismatch")
    return str(address)


def cidrs(raw, family):
    parsed = []
    for value in raw.split():
        if "/" not in value:
            raise ValueError("a prefix length is required")
        address = ipaddress.ip_interface(value)
        if address.version != family:
            raise ValueError("address family mismatch")
        parsed.append(str(address))
    return parsed


def build_change(resource, section, fields, configs, *, remove=False):
    if not isinstance(resource, str) or resource not in RESOURCES or not isinstance(fields, dict):
        raise ValueError("unknown configuration resource")
    package, types, allowed = RESOURCES[resource]
    if fields.keys() - allowed or any(
        not isinstance(value, str) or len(value) > 2048 or any(ord(char) < 32 and char != "\n" for char in value)
        for value in fields.values()
    ):
        raise ValueError("unsupported option")
    create = section is None
    if create and (resource not in CREATABLE or remove):
        raise ValueError("this resource requires an existing section")
    config = configs.get(package, {})
    name = "lantern_" + uuid4().hex[:12] if create else identifier(section)
    current = config.get(name, {})
    kind = types[0] if create else current.get(".type")
    if kind not in types:
        raise ValueError("section type mismatch")
    if resource == "forward" and not create and current.get("target") != "DNAT":
        raise ValueError("section is not a port forward")
    change = Change(package, name, kind, {}, create)
    if remove:
        if resource not in CREATABLE or fields:
            raise ValueError("unsupported removal")
        change.remove = True
        return change
    if not fields:
        raise ValueError("no values")
    values = change.values

    def clearable(key, value):
        if value:
            values[key] = value
        elif key in current:
            change.delete_options.append(key)

    def take(key, validate):
        if key in fields:
            values[key] = validate(fields[key])

    if resource == "interface":
        proto = fields.get("proto", current.get("proto"))
        if proto not in {"static", "dhcp", "dhcpv6", "pppoe"}:
            raise ValueError("unsupported interface protocol")
        if "proto" in fields:
            values["proto"] = proto
        if "device" in fields:
            if not re.fullmatch(r"[A-Za-z0-9_@.:-]{1,64}", fields["device"]):
                raise ValueError("invalid network device")
            values["device"] = fields["device"]
        for family, addr_key, gateway_key in ((4, "ipaddr", "gateway"), (6, "ip6addr", "ip6gw")):
            if addr_key in fields:
                if proto != "static":
                    raise ValueError("static address requires static protocol")
                clearable(addr_key, cidrs(fields[addr_key], family))
                if addr_key == "ipaddr" and "netmask" in current:
                    change.delete_options.append("netmask")
            if gateway_key in fields:
                if proto != "static":
                    raise ValueError("static gateway requires static protocol")
                clearable(gateway_key, bind_address(fields[gateway_key], family) if fields[gateway_key] else "")
        if proto == "static" and not any(fields.get(key, current.get(key)) for key in ("ipaddr", "ip6addr")):
            raise ValueError("a static address is required")
        if "dns" in fields:
            clearable("dns", [str(ipaddress.ip_address(value)) for value in fields["dns"].split()])
        for key in ("username", "password"):
            if key in fields:
                if proto != "pppoe" or not fields[key] or "\n" in fields[key]:
                    raise ValueError("invalid PPPoE credential")
                values[key] = fields[key]
    elif resource == "dhcp":
        take("start", lambda value: number(value, 1, 65535))
        take("limit", lambda value: number(value, 1, 65535))
        if "leasetime" in fields:
            if not re.fullmatch(r"(?:[1-9][0-9]{0,5}[smhdw]?|infinite)", fields["leasetime"]):
                raise ValueError("invalid lease time")
            values["leasetime"] = fields["leasetime"]
        take("ignore", binary)
    elif resource == "dns":
        servers = [str(ipaddress.ip_address(value)) for value in fields["server"].split()]
        if any(not re.fullmatch(r"[0-9a-fA-F:.]+", str(value)) for value in servers):
            raise ValueError("invalid DNS server")
        clearable("server", servers)
    elif resource == "forward":
        zones = {entry.get("name") for entry in config.values() if entry.get(".type") == "zone"}
        selected = {**current, **fields}
        if not all(selected.get(key) in zones for key in ("src", "dest")):
            raise ValueError("unknown firewall zone")
        proto = selected.get("proto")
        normalized = " ".join(proto) if isinstance(proto, list) else proto
        if normalized not in {"tcp", "udp", "tcp udp", "udp tcp"}:
            raise ValueError("invalid transport")
        for key in ("name", "src", "dest", "proto"):
            if key in fields:
                if not fields[key] or "\n" in fields[key]:
                    raise ValueError("invalid firewall field")
                values[key] = fields[key]
        for key in ("src_dport", "dest_port"):
            values[key] = port(selected.get(key, ""))
        values["dest_ip"] = bind_address(selected.get("dest_ip", ""), 4)
        if create:
            values.update(target="DNAT", family="ipv4")
        take("enabled", binary)
    else:
        chosen = {**current, **fields}
        interface = identifier(chosen.get("interface"))
        if config.get(interface, {}).get(".type") != "interface":
            raise ValueError("unknown route interface")
        if "/" not in chosen.get("target", ""):
            raise ValueError("route requires CIDR")
        target = ipaddress.ip_network(chosen["target"], strict=False)
        family = "route6" if target.version == 6 else "route"
        if not create and family != kind:
            raise ValueError("route family cannot be changed")
        change.section_type = family
        values.update(interface=interface, target=str(target))
        if "netmask" in current:
            change.delete_options.append("netmask")
        if "gateway" in fields:
            clearable("gateway", bind_address(fields["gateway"], target.version) if fields["gateway"] else "")
        take("metric", lambda value: number(value, 0, 4294967295))
    return change
