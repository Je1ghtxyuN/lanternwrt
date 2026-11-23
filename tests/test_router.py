import os
import subprocess
import unittest
from unittest.mock import patch

from lanternwrt.router import apply_wifi, restricted_read_script, snapshot, wifi_values
from lanternwrt.server import State


class RouterTests(unittest.TestCase):
    def test_restricted_collector_refuses_unexpected_command_before_reading(self):
        result = subprocess.run(["sh"], input=restricted_read_script(), text=True,
                                capture_output=True, env={**os.environ, "SSH_ORIGINAL_COMMAND": "id"})
        self.assertEqual(result.returncode, 126)
        self.assertEqual(result.stdout, "")

    def test_wired_router_with_custom_interface_name(self):
        data = snapshot("""
@@interfaces
{"interface":[{"interface":"uplink2","up":true,"proto":"pppoe","l3_device":"pppoe-uplink2","ipv4-address":[{"address":"192.0.2.3","mask":24}]}]}
@@network
{"values":{"uplink2":{".type":"interface","username":"secret-user","password":"secret"}}}
""")
        self.assertEqual(data["interfaces"][0]["name"], "uplink2")
        self.assertEqual(data["interfaces"][0]["addresses"], ["192.0.2.3/24"])
        self.assertIsNone(data["wifi"])
        self.assertNotIn("secret", str(data))

    def test_wireless_sta_and_ap_are_distinct_and_keys_are_private(self):
        data = snapshot("""
@@interfaces
{"interface":[]}
@@wireless
{"values":{"radio0":{".type":"wifi-device","band":"5g"},"ap0":{".type":"wifi-iface","device":"radio0","ssid":"Lab","mode":"ap","key":"ap-secret"},"sta0":{".type":"wifi-iface","device":"radio0","ssid":"Upstream","mode":"sta","key":"sta-secret"}}}
""")
        self.assertEqual([row["mode"] for row in data["wifi"]], ["ap", "sta"])
        self.assertNotIn("-secret", str(data))

    def test_wifi_validation_preserves_spaces_and_rejects_incomplete_psk(self):
        self.assertEqual(wifi_values({"ssid": " Lab ", "key": "long-enough"})["ssid"], " Lab ")
        for data in ({"ssid": "路" * 11}, {"ssid": "Lab", "key": "short"}, {"mode": "sta"}):
            with self.assertRaises(ValueError):
                wifi_values(data)

    def test_network_topology_keeps_logical_state_distinct_from_carrier(self):
        data = snapshot("""
@@interfaces
{"interface":[{"interface":"lan","up":true,"l3_device":"br-lan","proto":"static","uptime":69,"route":[{"target":"0.0.0.0","mask":0,"nexthop":"192.0.2.1"}]},{"interface":"wan6","device":"eth1","pending":true,"up":false}]}
@@devices
{"br-lan":{"type":"bridge","bridge-members":["eth1","wlan0"],"carrier":true,"statistics":{"rx_bytes":0,"rx_packets":0,"tx_bytes":127,"tx_packets":2}},"eth1":{"type":"Network device","devtype":"dsa","carrier":false},"wlan0":{"wireless":true}}
""")
        lan, wan6 = data["interfaces"]
        self.assertEqual(lan["gateways"], ["192.0.2.1"])
        self.assertEqual(lan["uptime"], 69)
        self.assertTrue(wan6["pending"])
        ports = {row["name"]: row for row in data["ports"]}
        self.assertEqual(ports["br-lan"]["members"], ["eth1", "wlan0"])
        self.assertEqual(ports["br-lan"]["statistics"]["rx_bytes"], 0)
        self.assertFalse(ports["eth1"]["carrier"])
        self.assertEqual(ports["eth1"]["kind"], "ethernet")
        self.assertEqual(ports["wlan0"]["kind"], "wireless")

    def test_wifi_uses_runtime_channel_and_sanitizes_association_metrics(self):
        data = snapshot("""
@@interfaces
{"interface":[]}
@@wireless
{"values":{"r0":{".type":"wifi-device","band":"5g","channel":"auto"},"ap0":{".type":"wifi-iface","device":"r0","mode":"ap","ssid":"Lab"},"ap1":{".type":"wifi-iface","device":"r0","mode":"ap","disabled":"1"}}}
@@wifi_status
{"r0":{"up":true,"interfaces":[{"section":"ap0","ifname":"phy0-ap0"}]}}
@@iwinfo:phy0-ap0
{"channel":157,"frequency":5785,"signal":-50,"noise":-92,"hardware":{"name":"Example radio"},"hwmodes":["ac","ax"]}
@@assoc:phy0-ap0
{"results":[{"mac":"02:00:00:00:00:10","signal":-56,"noise":-92,"rx":{"rate":287800,"mhz":80,"mcs":6,"nss":2},"tx":{"rate":144400,"mhz":40},"trap":"not-public"}]}
@@leases
1680001000 02:00:00:00:00:10 192.0.2.10 labphone *
""")
        self.assertEqual(data["radios"][0]["channel"], 157)
        self.assertEqual(data["radios"][0]["frequency"], 5785)
        self.assertTrue(data["wifi"][0]["up"])
        self.assertFalse(data["wifi"][1]["up"])
        self.assertEqual(data["stations"][0]["host"], "labphone")
        self.assertEqual(data["stations"][0]["rx"]["rate"], 287800)
        self.assertNotIn("not-public", str(data))

    @patch("lanternwrt.router.rpc")
    def test_access_point_edit_stages_only_requested_fields_with_rollback(self, rpc):
        rpc.side_effect = [{"values": {".type": "wifi-iface", "mode": "ap", "encryption": "psk2"}},
                           {"ubus_rpc_session": "token"}, {}, {}, {"changes": [["set", "guest", "ssid", "Guest Wi-Fi"]]}, {}]
        self.assertEqual(apply_wifi("guest", {"ssid": "Guest Wi-Fi"}), "token")
        self.assertEqual(rpc.call_args_list[-3].args, ("uci", "set", {
            "ubus_rpc_session": "token", "config": "wireless", "section": "guest",
            "values": {"ssid": "Guest Wi-Fi"},
        }))
        self.assertEqual(rpc.call_args.args, ("uci", "apply", {
            "ubus_rpc_session": "token", "rollback": True, "timeout": 60,
        }))

    @patch("lanternwrt.router.rpc")
    def test_sta_cannot_be_modified_by_ap_editor(self, rpc):
        rpc.return_value = {"values": {".type": "wifi-iface", "mode": "sta"}}
        with self.assertRaises(ValueError):
            apply_wifi("uplink", {"ssid": "Guest Wi-Fi"})
        self.assertEqual(rpc.call_count, 1)

    @patch("lanternwrt.server.rpc")
    @patch("lanternwrt.server.apply_wifi", return_value="token")
    def test_confirmation_uses_original_session_and_blocks_overlapping_writes(self, apply, rpc):
        with patch.dict("os.environ", {"LANTERN_ENABLE_WRITES": "1"}):
            state = State(False, set())
        self.assertTrue(state.wifi("apply", {"id": "ap", "values": {"ssid": "name"}})["pending"])
        with self.assertRaises(BlockingIOError):
            state.wifi("apply", {})
        self.assertFalse(state.wifi("confirm", {})["pending"])
        apply.assert_called_once()
        rpc.assert_called_once_with("uci", "confirm", {"ubus_rpc_session": "token"})


if __name__ == "__main__":
    unittest.main()
