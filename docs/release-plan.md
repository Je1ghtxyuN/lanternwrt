# LanternWrt release plan

## Beta

- [x] Build the project image and run it on a loopback-only port on a separate host.
- [x] Verify that the router's deployment key can invoke the status collector and cannot execute arbitrary commands. Filter configuration fields before returning them.
- [x] Check startup, live telemetry, write rejection, and container restart on Kwrt.
- [x] Boot a stock OpenWrt image in an isolated VM and verify SSH and live telemetry.
- [x] Update the English and Simplified Chinese READMEs with the demonstrated compatibility and publish the GitHub prerelease.

## 1.0

- [x] Add typed UCI changes for interfaces, DHCP/DNS, IPv4 port forwards, static routes, and existing wireless APs.
- [x] Verify apply, confirm, reject, and automatic rollback, including a LAN address change that interrupted the WebUI's management connection on the OpenWrt 25.12.6 test VM.
- [x] Verify simulated Wi-Fi association with the updated SSID and WPA2 key and again with the original settings after rollback.
- [x] Exercise configuration forms and transaction recovery in Chrome, and document the tested firmware and platform coverage.

Release tags and downloadable source archives are recorded on [GitHub Releases](https://github.com/Je1ghtxyuN/lanternwrt/releases).
