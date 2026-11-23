# LanternWrt release plan

## Beta

- [x] Build the project image and run it on a loopback-only port on a separate host.
- [x] Verify that the router's deployment key can invoke the status collector and cannot execute arbitrary commands. Filter configuration fields before returning them.
- [x] Check startup, live telemetry, write rejection, and container restart on Kwrt.
- [x] Boot a stock OpenWrt image in an isolated VM and verify SSH and live telemetry.
- [ ] Update the English and Simplified Chinese READMEs with the demonstrated compatibility and publish the GitHub prerelease.

## 1.0

- [ ] Add typed UCI changes for interfaces, DHCP/DNS, firewall, routes, and wireless.
- [ ] Verify apply, confirm, reject, and automatic rollback, including an interrupted management connection in the test VM.
- [ ] Exercise the supported changes in the WebUI and document network topology, firmware, and platform coverage.
- [ ] Tag and publish the tested release.
