# LanternWrt

A self-hosted WebUI for OpenWrt. View interfaces, traffic and router resources from a browser, with English and Simplified Chinese built in.

[简体中文](README.zh-CN.md) · [MIT License](LICENSE)

## Features

- Overview of active interfaces, DHCP leases, uptime, CPU, memory and storage.
- Per-interface RX/TX, IPv4 and IPv6 addresses, device and bridge member diagrams, Ethernet carrier and negotiated speed, and routes.
- Wi-Fi radios, channels and frequencies, AP/STA mode, and associated station signal and PHY rates when the firmware exposes iwinfo.
- DHCP/DNS configuration, firewall rules and a searchable IPv4 DHCP lease list.
- Optional SSID and passphrase editing for existing Wi-Fi APs, with an explicit confirmation window backed by OpenWrt rpcd rollback.

LanternWrt runs on a separate host and reads the router through SSH and ubus. Interface names and available Wi-Fi capabilities come from the device. This is an early release. Interface, DHCP/DNS, firewall and routing screens are currently read-only.

The [beta release](https://github.com/Je1ghtxyuN/lanternwrt/releases/tag/v0.1.0-beta) supports monitoring and evaluation.

## Quick start

Prerequisites: Python 3.10+ and OpenSSH for live router mode. The demo requires only Python.

```sh
git clone https://github.com/Je1ghtxyuN/lanternwrt.git
cd lanternwrt
python3 -m lanternwrt.server
```

Open <http://127.0.0.1:8787/> to try the demo.

## Connect to OpenWrt

Configure an SSH host alias with key authentication and a verified host key, then check that `ssh -o BatchMode=yes openwrt ubus call system board` succeeds.

```sh
LANTERN_SSH_TARGET=openwrt python3 -m lanternwrt.server --router
```

`LANTERN_SSH_TARGET` accepts an alias or `user@host`. Set `LANTERN_SSH_CONFIG` to use a separate SSH configuration file. The SSH account must be allowed to run the ubus queries used by the app. Missing firmware capabilities can leave individual sections unavailable.

The server binds to loopback by default. For a separate deployment host, keep the bind local and connect via SSH forwarding:

```sh
ssh -N -L 8787:127.0.0.1:8787 dashboard-host
```

Anyone who can reach the backend can view the network data and use any enabled write operations. Keep the backend private. If you place it behind an authenticating reverse proxy, preserve the public Host header and set `LANTERN_ORIGIN` to the proxy's exact HTTP(S) origin, without a trailing slash.

### Docker

```sh
docker build -t lanternwrt .
docker run --rm -p 127.0.0.1:8787:8787 lanternwrt
```

For router mode, add `--router` after the image name. Set `LANTERN_SSH_TARGET` and `LANTERN_SSH_CONFIG=/ssh/config` with Docker's `-e` flags, and mount a dedicated SSH configuration and verified host keys read-only under `/ssh`. Mount the dedicated private key read-only as well. The image runs as UID 10001. The configuration, key and known-hosts paths must be accessible to that UID, and the SSH config should reference their container paths explicitly.

For a read-only deployment using Dropbear, you can [restrict the monitoring key to the status collector](docs/read-only-ssh.md).

### Optional Wi-Fi writes

Set `LANTERN_ENABLE_WRITES=1` to enable edits to existing APs. Reads and writes use the host's SSH identity. Writes require a firmware version with the relevant rpcd session and UCI methods, and the ability to create an ephemeral UCI session. Apply, then explicitly confirm before the rollback window ends. Use a wired management path when changing the Wi-Fi network you are connected to.

## Compatibility and development

Read-only collection has been smoke-tested on a 360 T7 running Kwrt 25.12.0 and an x86/64 VM running stock OpenWrt 25.12.6. The Kwrt test covered telemetry, read-only enforcement and restarting the separate Linux Docker container. The x86/64 VM test covered wired telemetry. The demo and automated tests run without a router. Other OpenWrt builds can expose different ubus objects and DHCP lease formats. Live configuration changes are experimental.

```sh
python3 -m unittest discover -s tests
node --check lanternwrt/static/app.js
```

## License

[MIT](LICENSE).
