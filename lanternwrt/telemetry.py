"""Normalize netifd and iwinfo telemetry for the dashboard."""
import ipaddress


def select(source, keys):
    return {key: source[key] for key in keys.split() if key in source}


def interface_status(interface, config):
    addresses = [address for family in ("ipv4-address", "ipv6-address")
                 for address in interface.get(family, [])]
    for assigned in interface.get("ipv6-prefix-assignment", []):
        local = assigned.get("local-address")
        if isinstance(local, dict):
            addresses.append(local)
    return {
        "name": interface["interface"],
        "device": interface.get("l3_device") or interface.get("device") or config.get("device"),
        "lowerDevice": interface.get("device") or config.get("device"),
        "protocol": interface.get("proto") or config.get("proto"),
        "up": interface.get("up"), "pending": interface.get("pending"), "uptime": interface.get("uptime"),
        "addresses": list(dict.fromkeys(f"{addr['address']}/{addr['mask']}" for addr in addresses
                                        if "address" in addr and "mask" in addr)),
        "dns": interface.get("dns-server", []),
        "gateways": list(dict.fromkeys(route["nexthop"] for route in interface.get("route", [])
                                       if route.get("mask") == 0 and route.get("nexthop"))),
    }


def network_devices(devices, wifi, counters):
    if devices is None:
        return None
    wireless_names = {row.get("ifname") for row in wifi or []}
    result = []
    for name, device in devices.items():
        if not isinstance(device, dict):
            continue
        kind = device.get("devtype") or device.get("type")
        if name in wireless_names or device.get("wireless"):
            kind = "wireless"
        elif kind in {"dsa", "ethernet"}:
            kind = "ethernet"
        stats = select(device.get("statistics", {}), "rx_bytes tx_bytes rx_packets tx_packets")
        if name in counters:
            stats.setdefault("rx_bytes", counters[name][0])
            stats.setdefault("tx_bytes", counters[name][1])
        result.append({
            "name": name, "kind": kind, "mac": device.get("macaddr"),
            "members": device.get("bridge-members", []), "statistics": stats,
            **select(device, "type up carrier speed mtu conduit"),
        })
    return result


def hosts_by_mac(leases, neighbors):
    hosts = {}
    for lease in leases:
        hosts[lease["mac"].lower()] = {"host": lease["name"] if lease["name"] != "*" else None,
                                       "addresses": [lease["ip"]]}
    for line in neighbors.splitlines():
        fields = line.split()
        if "lladdr" not in fields or fields[-1] in {"FAILED", "INCOMPLETE"}:
            continue
        index = fields.index("lladdr")
        if index + 1 == len(fields):
            continue
        try:
            address = str(ipaddress.ip_address(fields[0]))
        except ValueError:
            continue
        record = hosts.setdefault(fields[index + 1].lower(), {"addresses": []})
        if address not in record["addresses"]:
            record["addresses"].append(address)
    return hosts


def wireless_status(config, get, leases, neighbors):
    live = get("wifi_status")
    if config is None and live is None:
        return None, [], None
    radios = {row["id"]: row for row in config or [] if row["type"] == "wifi-device"}
    wifi = {row["id"]: row for row in config or [] if row["type"] == "wifi-iface"}
    station_data = False
    stations = []
    hosts = hosts_by_mac(leases, neighbors)
    states = {}
    for radio_id, radio in (live or {}).items():
        radios.setdefault(radio_id, {"id": radio_id})
        for status in radio.get("interfaces", []):
            if status.get("section"):
                section = status["section"]
                row = wifi.setdefault(section, {"id": section, "device": radio_id})
                for key, value in select(status.get("config", {}), "mode ssid encryption network disabled").items():
                    row.setdefault(key, value)
                states[section] = status
    for section, row in wifi.items():
        status = states.get(section, {})
        ifname = status.get("ifname")
        info = get(f"iwinfo:{ifname}") or {}
        assoc = get(f"assoc:{ifname}")
        peers = assoc.get("results", []) if assoc is not None else None
        mode = row.get("mode")
        if mode == "sta" and peers is not None:
            up = bool(peers)
        elif row.get("disabled") in (True, "1") or (live or {}).get(row.get("device"), {}).get("disabled") is True:
            up = False
        else:
            up = bool(ifname) if (row.get("device") in (live or {})) else None
        encryption = select(info.get("encryption", {}), "enabled wpa authentication ciphers")
        row.update({
            "ifname": ifname, "up": up, "disabled": row.get("disabled") in (True, "1") or
            (live or {}).get(row.get("device"), {}).get("disabled") is True,
            "security": encryption, "peerCount": len(peers) if peers is not None else None,
            **select(info, "channel frequency bitrate bssid signal noise htmode"),
        })
        if mode != "sta" and peers is not None:
            station_data = True
            for peer in peers:
                mac = peer.get("mac")
                if not isinstance(mac, str):
                    continue
                stations.append({"wifi": section, "mac": mac, **hosts.get(mac.lower(), {}),
                                 **select(peer, "signal noise connected_time"),
                                 **{key: select(peer.get(key, {}), "rate mhz mcs nss ht vht he eht") for key in ("rx", "tx")}})
        radio = radios.get(row.get("device"))
        if radio is not None and info:
            radio["hardware"] = info.get("hardware", {}).get("name") or radio.get("hardware")
            for key in ("channel", "frequency", "hwmodes", "htmode", "country"):
                if key in info and (key not in radio or key == "channel" and not isinstance(radio[key], int)):
                    radio[key] = info[key]
    for radio in radios.values():
        radio.update(select((live or {}).get(radio["id"], {}), "up pending disabled"))
    return list(wifi.values()), list(radios.values()), stations if station_data else None
