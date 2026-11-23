# Development plan

1. Discover interfaces, devices, wireless modes, leases, routes and router resources over OpenWrt's existing SSH and ubus services. Test sparse firmware responses and secret filtering.
2. Build the Overview, Network, Devices and Settings screens with local English and Simplified Chinese preferences. Offer a fixture-based demo.
3. Add validated Wi-Fi edits through rpcd's rollback mechanism, with tests for rejected input and incomplete management reconnection. Keep live writes opt-in.
4. Verify the web UI and read-only collection on a router, document deployment and limitations in both languages, and publish the initial commit under the maintainer's GitHub identity.
