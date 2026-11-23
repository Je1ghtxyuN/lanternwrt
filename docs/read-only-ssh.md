# Restrict an SSH key to status collection

Use a dedicated key for monitoring and keep your existing administrative session open while installing it. The collector needs the `ucode` modules for UCI and ubus, as shipped on the tested firmware. SSH to the router as an administrator to install the generated file:

```sh
python3 -c 'from lanternwrt.router import restricted_read_script; print(restricted_read_script(), end="")' |
  ssh openwrt-admin 'umask 077; cat > /etc/dropbear/lanternwrt-status'
```

Add an entry to the router's `/etc/dropbear/authorized_keys`. Replace the example public key with your dedicated monitoring public key. Preserve existing administrative keys.

```text
command="/bin/sh /etc/dropbear/lanternwrt-status",no-port-forwarding,no-agent-forwarding,no-X11-forwarding,no-pty ssh-ed25519 YOUR_PUBLIC_KEY monitoring
```

Configure the corresponding SSH alias for LanternWrt and pin the router's verified host key. With that alias, `ssh openwrt-monitor true` should exit with status 126. `ssh openwrt-monitor 'sh -s' </dev/null` should emit a structured snapshot. The collector evaluates only the existing fixed script and filters the UCI configuration before returning it. Its output contains live network identifiers and still needs to be treated as private. Keep `LANTERN_ENABLE_WRITES` unset with this deployment.
