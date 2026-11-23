import time
import unittest
from unittest.mock import patch

from lanternwrt.configuration import build_change
from lanternwrt.router import UnconfirmedApply
from lanternwrt.server import State


class ConfigurationTests(unittest.TestCase):
    def test_static_ipv4_is_normalized_to_a_cidr_list(self):
        changes = build_change("interface", "lan", {
            "proto": "static", "ipaddr": "192.0.2.10/24", "dns": "192.0.2.53\n2001:db8::53",
        }, {"network": {"lan": {".type": "interface", "proto": "dhcp"}}})
        self.assertEqual(changes.values["ipaddr"], ["192.0.2.10/24"])
        self.assertEqual(changes.values["dns"], ["192.0.2.53", "2001:db8::53"])

    def test_rejects_arbitrary_uci_keys_and_unsupported_protocols(self):
        fixtures = {"network": {"lan": {".type": "interface", "proto": "static"}}}
        for options in ({"proto": "static", "evil": "x"}, {"proto": "arbitrary"}, {"proto": "static", "ipaddr": "192.0.2.3"}):
            with self.subTest(options=options), self.assertRaises(ValueError):
                build_change("interface", "lan", options, fixtures)

    def test_static_route_rejects_gateway_family_mismatch(self):
        fixtures = {"network": {"lan": {".type": "interface"}}}
        with self.assertRaises(ValueError):
            build_change("route", None, {"interface": "lan", "target": "2001:db8::/64", "gateway": "192.0.2.9"}, fixtures)
        route = build_change("route", None, {"interface": "lan", "target": "2001:db8::1/64", "gateway": "2001:db8::1"}, fixtures)
        self.assertEqual(route.section_type, "route6")
        self.assertEqual(route.values["target"], "2001:db8::/64")

    def test_rejects_forward_to_an_unknown_zone_or_invalid_port(self):
        fixtures = {"firewall": {"a": {".type": "zone", "name": "wan"}, "b": {".type": "zone", "name": "lan"}}}
        values = {"name": "HTTPS", "src": "wan", "dest": "lan", "proto": "tcp", "src_dport": "443",
                  "dest_ip": "192.0.2.8", "dest_port": "8443"}
        self.assertEqual(build_change("forward", None, values, fixtures).values["target"], "DNAT")
        for override in ({"dest": "nope"}, {"dest_port": "65536"}):
            with self.assertRaises(ValueError):
                build_change("forward", None, {**values, **override}, fixtures)

    def test_can_stage_an_explicit_list_clear(self):
        fixtures = {"dhcp": {"main": {".type": "dnsmasq", "server": ["192.0.2.2"]}}}
        self.assertEqual(build_change("dns", "main", {"server": ""}, fixtures).delete_options, ["server"])

    def test_static_ipv6_interface_can_be_configured_without_ipv4(self):
        fixtures = {"network": {"lan": {".type": "interface", "proto": "static"}}}
        change = build_change("interface", "lan", {"ip6addr": "2001:db8::123/64", "ip6gw": "2001:db8::1"}, fixtures)
        self.assertEqual(change.values, {"ip6addr": ["2001:db8::123/64"], "ip6gw": "2001:db8::1"})

    @patch("lanternwrt.server.apply_network_config")
    def test_management_disconnect_keeps_confirmation_available(self, apply):
        apply.side_effect = UnconfirmedApply("session", time.monotonic() + 30)
        with patch.dict("os.environ", {"LANTERN_ENABLE_WRITES": "1"}):
            state = State(False, set())
        result = state.change("apply", {"resource": "interface", "id": "lan", "values": {}})
        self.assertTrue(result["unconfirmed"])
        self.assertTrue(state.transaction_status()["pending"])
        with self.assertRaises(BlockingIOError):
            state.change("apply", {})
