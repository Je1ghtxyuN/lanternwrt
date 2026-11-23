import unittest
from unittest.mock import patch

from lanternwrt.router import apply_wifi, snapshot, wifi_values
from lanternwrt.server import State


class RouterTests(unittest.TestCase):
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

    @patch("lanternwrt.router.rpc")
    def test_access_point_edit_stages_only_requested_fields_with_rollback(self, rpc):
        rpc.side_effect = [{"values": {".type": "wifi-iface", "mode": "ap", "encryption": "psk2"}},
                           {"ubus_rpc_session": "token"}, {}, {}, {}]
        self.assertEqual(apply_wifi("guest", {"ssid": "Guest Wi-Fi"}), "token")
        self.assertEqual(rpc.call_args_list[-2].args, ("uci", "set", {
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
