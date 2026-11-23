const $ = (selector) => document.querySelector(selector);
const copy = {
  overview: ["Overview", "总览"], network: ["Network", "网络"], devices: ["Devices", "设备"], settings: ["Settings", "设置"],
  active: ["Active interfaces", "活动接口"], leases: ["DHCP leases", "DHCP 租约"], uptime: ["Uptime", "运行时间"],
  interfaces: ["Interfaces", "接口"], wifi: ["Wi-Fi", "Wi-Fi"], dhcp: ["DHCP / DNS", "DHCP / DNS"],
  firewall: ["Firewall", "防火墙"], routes: ["Routes", "路由"], ports: ["Network devices", "网络设备"],
  name: ["Name", "名称"], protocol: ["Protocol", "协议"], device: ["Device", "设备"], state: ["Status", "状态"],
  address: ["Addresses", "地址"], live: ["Interface traffic", "接口流量"], resource: ["Resources", "资源使用"],
  memory: ["Memory", "内存"], storage: ["Storage", "存储"], receive: ["RX", "接收"], transmit: ["TX", "发送"],
  up: ["Up", "运行中"], down: ["Down", "停用或未连接"], unknown: ["Unknown", "未知"],
  band: ["Band", "频段"], mode: ["Mode", "模式"], encryption: ["Security", "加密"], channel: ["Channel", "信道"],
  type: ["Type", "类型"], values: ["Parameters", "参数"], search: ["Search leases", "搜索租约"],
  empty: ["No entries", "暂无条目"], unsupported: ["Unavailable on this device", "此设备未提供该数据"],
  expires: ["Expires", "到期时间"], error: ["Router data is unavailable", "无法读取路由器数据"],
  loading: ["Reading router data…", "正在读取路由器数据…"], lang: ["Interface language", "界面语言"],
  general: ["General", "常规"], firmware: ["Firmware", "固件"], demo: ["Demo mode", "演示模式"],
  reading: ["Read-only", "只读模式"], edit: ["Edit", "编辑"], cancel: ["Cancel", "取消"],
  password: ["New passphrase", "新密码"], apply: ["Apply", "应用"], confirm: ["Keep changes", "保留更改"],
  rollback: ["Revert", "回退"], pending: ["Automatic rollback", "自动回退"], good: ["Changes confirmed", "已确认更改"],
  reverted: ["Changes reverted", "已回退更改"], expired: ["Confirmation window closed", "确认窗口已结束"],
  invalid_config: ["Check the fields or change a value", "请检查字段或修改配置值"],
  pending_conflict: ["A change is pending or has expired", "有更改待确认或已过期"],
  router_unavailable: ["The router did not accept the request", "路由器未接受请求"],
  read_only: ["Router changes are disabled", "当前未启用写入"], forbidden: ["Request rejected", "请求被拒绝"],
  timeout: ["Could not reach the dashboard", "无法连接面板"], navigation: ["Main navigation", "主导航"],
  skip: ["Skip to content", "跳到主要内容"],
  mtu: ["MTU", "MTU"], speed: ["Link speed", "链路速率"],
  ethernet: ["Ethernet", "以太网"], bridge: ["Bridge", "网桥"], wireless: ["Wireless", "无线"],
  linkUp: ["Link up", "链路已连接"], linkDown: ["No carrier", "无载波"], pendingLink: ["Pending", "连接中"],
  disabled: ["Disabled", "已禁用"], disconnected: ["Not connected", "未连接"],
  lower: ["Lower device", "下层设备"], gateway: ["Gateway", "网关"], members: ["Bridge members", "网桥成员"],
  duplexFull: ["full duplex", "全双工"], duplexHalf: ["half duplex", "半双工"],
  packets: ["packets", "包"], signal: ["Signal / noise", "信号 / 噪声"],
  signals: ["Signal", "信号"], noise: ["Noise", "噪声"], radios: ["Radio overview", "射频概览"],
  stations: ["Associated stations", "已关联站点"], bitrate: ["Link rate", "链路速率"],
  open: ["Open", "开放"], host: ["Host", "主机"], otherPorts: ["Device inventory", "网络设备清单"],
  static: ["Static address", "静态地址"], unmanaged: ["Unmanaged", "不受管理"],
  deviceConfig: ["Device configuration", "设备配置"],
  add: ["Add", "添加"], remove: ["Delete", "删除"], removeConfirm: ["Delete this configuration entry?", "删除此配置项？"],
  dhcpPools: ["DHCP pools", "DHCP 地址池"], dnsServers: ["Upstream DNS servers", "上游 DNS 服务器"],
  unconfirmed: ["Router response interrupted. Changes may still roll back.", "路由器连接中断，配置可能自动回退。"],
  portForwards: ["Port forwards", "端口转发"], staticRoutes: ["Static routes", "静态路由"],
  addresses: ["IPv4 addresses (CIDR)", "IPv4 地址（CIDR）"], dnsField: ["DNS server addresses", "DNS 服务器地址"],
  addresses6: ["IPv6 addresses (CIDR)", "IPv6 地址（CIDR）"], gateway6: ["IPv6 gateway", "IPv6 网关"],
  start: ["Start offset", "起始偏移"], limit: ["Lease limit", "地址数量"], leasetime: ["Lease time", "租期"],
  enabled: ["Enabled", "启用"], src: ["Source zone", "源区域"], dest: ["Destination zone", "目标区域"],
  src_dport: ["External port", "外部端口"], dest_ip: ["Destination IPv4", "目标 IPv4"],
  dest_port: ["Destination port", "目标端口"], target: ["Destination (CIDR)", "目的网段（CIDR）"],
  metric: ["Metric", "跃点数"], interface: ["Interface", "接口"], user: ["Username", "用户名"],
  newPassword: ["New password", "新密码"], saveNew: ["Apply new entry", "应用新增配置"],
};
const paths = {overview: "M3 10 12 3l9 7v10H3z M9 20v-7h6v7",
  network: "M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8 16a6 6 0 0 1 8 0M12 20h.01",
  devices: "M3 4h18v13H3z M8 21h8m-4-4v4",
  settings: "M12 3v4m0 10v4m9-9h-4M7 12H3m15.4-6.4-2.8 2.8m-7.2 7.2-2.8 2.8m0-12.8 2.8 2.8m7.2 7.2 2.8 2.8M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z"};
const tabs = ["interfaces", "wifi", "dhcp", "firewall", "routes"];
const state = {lang: localStorage.getItem("lantern-language") === "zh" ? 1 : 0, data: null, failed: false,
  previous: null, graphs: new Map(), cpu: null, traffic: "", edit: "", editor: null, until: 0, search: ""};
const t = (key) => copy[key]?.[state.lang] ?? key;
const e = (value) => String(value ?? "—").replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[char]);
const icon = (key) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + paths[key] + '"/></svg>';
const show = (value) => e(Array.isArray(value) ? value.join(", ") || "—" : value);
const mono = (value) => "<code>" + show(value) + "</code>";
const label = (up) => '<span class="status' + (up === true ? " up" : "") + '"><i class="dot' + (up === true ? " up" : "") + '"></i>' + t(up === true ? "up" : up === false ? "down" : "unknown") + "</span>";
const card = (title, content, tool = "") => '<section class="card"><div class="card-title"><h2>' + title + "</h2>" + tool + "</div>" + content + "</section>";
const table = (headers, rows) => rows === null || !rows.length ? '<p class="empty">' + t(rows === null ? "unsupported" : "empty") + "</p>" :
  '<div class="table-wrap"><table><thead><tr>' + headers.map((key) => '<th scope="col">' + t(key) + "</th>").join("") +
  "</tr></thead><tbody>" + rows.map((row) => "<tr>" + row.map((cell) => "<td>" + cell + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>";
const date = (value) => value ? new Date(value * 1000).toLocaleString(state.lang ? "zh-CN" : "en") : "—";

function route() {
  const [page, tab] = location.hash.slice(1).split("/");
  return [Object.hasOwn(paths, page) ? page : "overview", tabs.includes(tab) ? tab : "interfaces"];
}
function metric(key, value, glyph) {
  return '<div class="metric"><div class="label">' + icon(glyph) + t(key) + '</div><div class="value">' + e(value) + "</div></div>";
}
function duration(seconds) {
  if (typeof seconds !== "number") return "—";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor(seconds / 3600) % 24;
  const minutes = Math.floor(seconds / 60) % 60;
  return state.lang ? (days ? days + " 天 " : "") + hours + " 小时 " + minutes + " 分" :
    (days ? days + "d " : "") + hours + "h " + minutes + "m";
}
function resources(data) {
  const memory = data.memory;
  const free = memory?.available ?? memory?.free;
  const used = memory?.total && free != null ? Math.round((1 - free / memory.total) * 100) : null;
  const parts = [["CPU", state.cpu], [t("memory"), used], [t("storage"), data.storage]];
  return '<div class="resources">' + parts.map(([name, value]) => {
    const percent = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : null;
    return '<div class="' + (percent >= 90 ? "warn" : "") + '"><div class="bar-meta"><span>' + e(name) +
      "</span><b>" + (percent === null ? "—" : percent + "%") + "</b></div>" +
      (percent === null ? "" : '<progress aria-label="' + e(name) + '" max="100" value="' + percent + '"></progress>') + "</div>";
  }).join("") + "</div>";
}
function renderTraffic(data) {
  const candidates = [...new Set(data.interfaces.map(({device}) => device).filter((device) => Object.hasOwn(data.counters, device)))];
  if (!candidates.length) return card(t("live"), '<p class="empty">' + t("unsupported") + "</p>");
  if (!candidates.includes(state.traffic)) state.traffic = candidates[0];
  const selector = '<select id="traffic-device" aria-label="' + t("device") + '">' +
    candidates.map((device) => '<option' + (device === state.traffic ? " selected" : "") + ">" + e(device) + "</option>").join("") + "</select>";
  const graph = state.graphs.get(state.traffic) ?? [];
  const latest = graph.at(-1);
  const max = Math.max(1, ...graph.flat());
  const line = (index, color) => '<polyline fill="none" vector-effect="non-scaling-stroke" stroke="' + color + '" stroke-width="2.5" points="' +
    graph.map((pair, position) => (position * 600 / Math.max(1, graph.length - 1)).toFixed(1) + "," +
      (149 - pair[index] / max * 141).toFixed(1)).join(" ") + '"/>';
  const legend = (key, index) => '<span><i class="dot ' + (index ? "tx" : "rx") + '"></i>' +
    t(key) + " <b>" + (latest ? latest[index].toFixed(2) + " Mbps" : "—") + "</b></span>";
  return card(t("live"), '<div class="chart-body"><div class="legend">' + legend("receive", 0) + legend("transmit", 1) +
    '</div><svg class="chart" viewBox="0 0 600 155" preserveAspectRatio="none" role="img" aria-label="' + t("live") +
    '">' + line(0, "#3158ed") + line(1, "#14a4a2") + "</svg></div>", selector);
}
function interfaces(data) {
  return card(t("interfaces"), table(["name", "protocol", "state", "address", "device"], data.interfaces.map((item) =>
    [mono(item.name), show(item.protocol), label(item.up), mono(item.addresses), mono(item.device)])));
}
function indicator(text, active) {
  return '<span class="status' + (active ? " up" : "") + '"><i class="dot' + (active ? " up" : "") + '"></i>' + e(text) + "</span>";
}
function definition(key, value) {
  return '<div><dt>' + t(key) + "</dt><dd>" + value + "</dd></div>";
}
function formatNumber(value, max = 1) {
  return new Intl.NumberFormat(state.lang ? "zh-CN" : "en", {maximumFractionDigits: max}).format(value);
}
function amount(value, unit, digits) {
  return Number.isFinite(value) ? formatNumber(value, digits) + " " + unit : "—";
}
function protocol(value) {
  return show(({static: t("static"), dhcp: "DHCP", dhcpv6: "DHCPv6", pppoe: "PPPoE",
    wireguard: "WireGuard", none: t("unmanaged")})[value] || value);
}
function speed(value) {
  const match = /^(\d+)([FH])?$/.exec(value);
  return !match ? show(value) : amount(Number(match[1]), "Mbps") +
    (match[2] ? " · " + t(match[2] === "F" ? "duplexFull" : "duplexHalf") : "");
}
function bytes(value) {
  if (!Number.isFinite(value)) return "—";
  const units = ["B", "KiB", "MiB", "GiB", "TiB", "PiB"];
  const index = Math.min(units.length - 1, Math.max(0, Math.floor(Math.log(Math.max(value, 1)) / Math.log(1024))));
  return amount(value / 1024 ** index, units[index], 2);
}
function deviceTile(port, name = port?.name, connected) {
  const kind = port?.kind;
  const mark = kind === "ethernet" ? '<i class="rj45"></i>' :
    icon(kind === "wireless" ? "network" : kind === "bridge" ? "overview" : "devices");
  const carrier = connected ?? port?.carrier;
  const stateText = carrier === true ? "linkUp" : carrier === false ? "linkDown" : "unknown";
  return '<div class="device-tile" data-link="' + (carrier === true ? "up" : carrier === false ? "down" : "unknown") +
    '"><div class="device-mark">' + mark + '</div><b>' + show(name) + "</b>" + indicator(t(stateText), carrier === true) +
    (port?.speed != null ? '<span class="link-speed">' + speed(port.speed) + "</span>" : "") + "</div>";
}
function configButton(resource, id, isNew = false) {
  return '<button class="btn" data-resource="' + resource + '" data-section="' + e(id) + '"' +
    (isNew ? ' data-new="true"' : "") + ">" + t(isNew ? "add" : "edit") + "</button>";
}
function interfaceDetails(data) {
  const ports = new Map((data.ports ?? []).map((port) => [port.name, port]));
  const conduits = new Set((data.ports ?? []).map((port) => port.conduit).filter(Boolean));
  const physical = [...ports.values()].filter((port) => port.kind === "ethernet" && !conduits.has(port.name));
  const strip = physical.length ? card(t("ethernet"), '<div class="port-grid">' + physical.map((port) => deviceTile(port)).join("") + "</div>") : "";
  const cards = data.interfaces.map((item) => {
    const device = ports.get(item.device);
    const lower = item.lowerDevice !== item.device && item.lowerDevice ? ports.get(item.lowerDevice) : null;
    const fields = [["IPv4", item.addresses.filter((address) => !address.includes(":"))],
      ["IPv6", item.addresses.filter((address) => address.includes(":"))], ["gateway", item.gateways], ["DNS", item.dns]];
    const stats = device?.statistics ?? {};
    const total = (direction) => bytes(stats[direction + "_bytes"]) +
      (Number.isFinite(stats[direction + "_packets"]) ? " · " + amount(stats[direction + "_packets"], t("packets"), 0) : "");
    const info = '<dl class="facts">' + definition("protocol", protocol(item.protocol)) +
      definition("uptime", e(duration(item.uptime))) + definition("MAC", mono(device?.mac || lower?.mac)) +
      fields.map(([key, value]) => definition(key, mono(value))).join("") +
      definition("receive", e(total("rx"))) + definition("transmit", e(total("tx"))) + "</dl>";
    const related = [...new Set([...(item.lowerDevice && item.lowerDevice !== item.device ? [item.lowerDevice] : []),
      ...(device?.members ?? [])])].filter((name) => name !== item.device);
    const diagram = item.device ? '<div class="device-map">' + deviceTile(device, item.device) +
      (related.length ? '<div class="map-branch"><div class="map-label">' + t(device?.members?.length ? "members" : "lower") +
      '</div><div class="map-leaves">' + related.map((name) => deviceTile(ports.get(name), name)).join("") + "</div></div>" : "") + "</div>" : "";
    const status = item.up ? "up" : item.pending ? "pendingLink" : item.up === false ? "down" : "unknown";
    const configured = data.configs.network?.find((row) => row.id === item.name && row.type === "interface");
    const edit = data.writes && configured && ["static", "dhcp", "dhcpv6", "pppoe"].includes(configured.proto)
      ? configButton("interface", item.name) : "";
    return '<article class="card interface-card"><div class="card-title"><h3>' + e(item.name) + "</h3>" +
      '<div class="wifi-state">' + indicator(t(status), item.up) + edit + "</div></div>" + diagram + info + "</article>";
  }).join("");
  const inventory = '<details class="card inventory"' + ($("#content .inventory")?.open ? " open" : "") + "><summary>" + t("otherPorts") + '</summary>' +
    table(["name", "type", "state", "mtu", "speed"], data.ports?.map((port) =>
      [mono(port.name), show(port.type), label(port.carrier ?? port.up), show(port.mtu), speed(port.speed)]) ?? null) +
    card(t("deviceConfig"), table(["name", "type", "values"],
      configRows(data.configs.network?.filter(({type}) => type !== "interface")))) + "</details>";
  return '<div class="panel-stack">' + strip + '<div class="interface-grid">' + cards + "</div>" + inventory + "</div>";
}
function overview(data) {
  return '<div class="grid metrics">' + metric("active", data.interfaces.filter((item) => item.up).length, "network") +
    metric("leases", data.leases.length, "devices") + metric("uptime", duration(data.uptime), "overview") +
    '</div><div class="grid chart-grid">' + renderTraffic(data) + card(t("resource"), resources(data)) + "</div>" + interfaces(data);
}
function configRows(items) {
  return items?.map(({id, type, ...values}) => [mono(id), show(type),
    Object.entries(values).map(([key, value]) => '<span class="small-data"><code>' + e(key) + "</code> " + show(value) + "</span>").join("") || "—"]) ?? null;
}
function renderWifi(data) {
  const band = (raw, freq) => {
    if (Number.isFinite(freq)) {
      if (freq >= 2400 && freq <= 2500) return "2.4 GHz";
      if (freq >= 4900 && freq < 5925) return "5 GHz";
      if (freq >= 5925 && freq <= 7125) return "6 GHz";
      if (freq >= 57000 && freq <= 71000) return "60 GHz";
    }
    return ({ "2g": "2.4 GHz", "5g": "5 GHz", "6g": "6 GHz", "60g": "60 GHz" })[raw] || raw;
  };
  const dbm = (signal, noise) => {
    const level = signal >= -55 ? 4 : signal >= -67 ? 3 : signal >= -75 ? 2 : 1;
    const bars = Number.isFinite(signal) ? '<span class="signal-bars level-' + level +
      '" aria-hidden="true"><i></i><i></i><i></i><i></i></span>' : "";
    return '<span class="signal-readout">' + bars + e([amount(signal, "dBm", 0), amount(noise, "dBm", 0)].join(" / ")) + "</span>";
  };
  const securityName = (row) => {
    if (row.security?.enabled === false || row.encryption === "none") return t("open");
    const protocol = ({psk: "WPA-Personal", psk2: "WPA2-Personal", "psk-mixed": "WPA/WPA2-Personal",
      sae: "WPA3-Personal", "sae-mixed": "WPA2/WPA3-Personal", wpa2: "WPA2-Enterprise", owe: "OWE"})[row.encryption?.split("+")[0]];
    const ciphers = row.security?.ciphers?.map((value) => value.toUpperCase());
    return [protocol || row.encryption, ciphers?.join(", ")].filter(Boolean).join(" · ") || "—";
  };
  const radios = data.radios?.length ? data.radios : [...new Map((data.wifi ?? [])
    .map((row) => [row.device ?? "Wi-Fi", {id: row.device ?? "Wi-Fi", band: row.band, channel: row.channel}])).values()];
  const wifiRows = (radio) => (data.wifi ?? []).filter((row) => (row.device ?? "Wi-Fi") === radio.id);
  const radioCards = radios?.map((radio) => {
    const standard = radio.hwmodes?.length ? "802.11" + radio.hwmodes.join("/") : null;
    const title = '<div class="radio-heading"><div class="device-mark">' + icon("network") +
      '</div><div><h3>' + show(radio.hardware || radio.id) + '</h3><code>' + e(radio.id) + '</code></div></div>';
    const metrics = '<dl class="facts radio-facts">' + definition("band", show(band(radio.band, radio.frequency))) +
      definition("channel", show(radio.channel) +
        (Number.isFinite(radio.frequency) ? " · " + amount(radio.frequency / 1000, "GHz", 3) : "")) +
      definition("802.11", show(standard)) + definition("HT mode", show(radio.htmode)) + "</dl>";
    const rows = wifiRows(radio).map((row) => {
      const stateText = row.disabled || row.radioDisabled ? "disabled" : row.up === true ? "up" : row.up === false ? "disconnected" : "unknown";
      const editButton = data.writes && row.mode === "ap" ? '<button class="btn" data-edit="' + e(row.id) + '">' + t("edit") + "</button>" : "";
      return '<div class="wifi-interface"><div class="wifi-identity"><div><h3>' + show(row.ssid || row.id) + '</h3>' +
        '<div class="wifi-meta"><span class="tag">' + show(row.mode?.toUpperCase()) + "</span>" +
        mono(row.ifname ?? row.id) + "</div></div><div class=\"wifi-state\">" + indicator(t(stateText), row.up === true) +
        editButton + '</div></div><dl class="facts wifi-facts">' + definition("BSSID", mono(row.bssid)) +
        definition("network", mono(row.network)) + definition("encryption", e(securityName(row))) +
        definition("signal", dbm(row.signal, row.noise)) +
        definition("bitrate", e(amount(Number.isFinite(row.bitrate) ? row.bitrate / 1000 : null, "Mbps"))) + "</dl></div>";
    }).join("");
    return '<article class="card radio-card"><div class="card-title">' + title +
      indicator(t(radio.disabled ? "disabled" : radio.up === true ? "up" : radio.pending ? "pendingLink" : radio.up === false ? "down" : "unknown"), radio.up === true) +
      "</div>" + metrics + (rows || '<p class="empty">' + t("empty") + "</p>") + "</article>";
  }).join("");
  const rate = (info) => {
    if (!Number.isFinite(info?.rate)) return "—";
    const standard = info.eht ? "EHT" : info.he ? "HE" : info.vht ? "VHT" : info.ht ? "HT" : "";
    const meta = [
      Number.isFinite(info.mhz) ? info.mhz + " MHz" : "",
      Number.isFinite(info.mcs) ? (standard ? standard + "-" : "") + "MCS " + info.mcs : standard,
      Number.isFinite(info.nss) ? "NSS " + info.nss : "",
    ].filter(Boolean).join(" · ");
    return e(amount(info.rate / 1000, "Mbps")) + (meta ? '<span class="small-data">' + e(meta) + "</span>" : "");
  };
  const peers = data.stations?.map((row) => {
    const wifi = data.wifi?.find((item) => item.id === row.wifi);
    return [show(wifi?.ssid || row.wifi) + '<span class="small-data">' + show(wifi?.ifname) + "</span>", mono(row.mac),
      show(row.host) + (row.addresses?.length ? '<span class="small-data">' + mono(row.addresses) + "</span>" : ""),
      dbm(row.signal, row.noise), rate(row.rx), rate(row.tx)];
  }) ?? null;
  const listing = '<div class="panel-stack"><h2>' + t("radios") + '</h2><div class="radio-grid">' + radioCards +
    "</div>" + card(t("stations"), table(["wifi", "MAC", "host", "signal", "receive", "transmit"], peers)) + "</div>";
  const selected = data.wifi?.find((row) => row.id === state.edit);
  if (!selected) return listing;
  const security = ["psk", "psk2", "psk-mixed", "sae", "sae-mixed"].includes(selected?.encryption?.split("+")[0]);
  const buttons = (keys) => keys.map((key, index) => '<button type="button" class="btn' + (index ? " primary" : "") +
    '" data-action="' + key + '">' + t(key) + "</button>").join("");
  const editor = '<form id="wifi-form"><label>SSID<input name="ssid" required value="' +
    e(selected.ssid ?? "") + '"></label>' + (security ? '<label>' + t("password") + '<input name="key" type="password" autocomplete="new-password"></label>' : "") +
    '<label>' + t("state") + '<select name="disabled"><option value="0"' + (!selected.disabled ? " selected" : "") +
    ">" + t("enabled") + '</option><option value="1"' + (selected.disabled ? " selected" : "") + ">" +
    t("disabled") + "</option></select></label>" +
    '<footer>' + buttons(["cancel"]) + '<button class="btn primary">' + t("apply") + "</button></footer></form>";
  return '<div class="split">' + listing + '<div class="editor">' + card(t("edit") + " Wi-Fi", editor) + "</div></div>";
}
function configurationTable(data, packageName, resource, types, title) {
  const rows = data.configs[packageName]?.filter((row) => types.includes(row.type) &&
    (resource !== "forward" || row.target === "DNAT"));
  const names = rows?.map((row) => [show(row.name || row.interface || row.id),
    ...configRows([row])[0].slice(2),
    ...(data.writes ? [configButton(resource, row.id)] : [])]) ?? null;
  const add = data.writes && rows && ["forward", "route"].includes(resource) ? configButton(resource, "", true) : "";
  return card(t(title), table(["name", "values", ...(data.writes ? [""] : [])], names), add);
}
function renderConfigEditor(data) {
  const {resource, id} = state.editor;
  const pkg = ({interface: "network", dhcp: "dhcp", dns: "dhcp", forward: "firewall", route: "network"})[resource];
  const row = data.configs[pkg]?.find((item) => item.id === id) ?? {};
  const field = (name, label, value, attrs = "") => '<label>' + t(label) + '<input name="' + name +
    '" value="' + e(value ?? "") + '"' + (attrs ? " " + attrs : "") + "></label>";
  const selectField = (name, label, options, current) => '<label>' + t(label) + '<select name="' + name + '">' +
    options.map(([value, text]) => '<option value="' + e(value) + '"' + (current === value ? " selected" : "") +
      ">" + e(text) + "</option>").join("") + "</select></label>";
  const lines = (value) => Array.isArray(value) ? value.join(" ") : value;
  const withPrefix = (ip) => {
    if (!ip || ip.includes("/") || !row.netmask) return ip;
    const mask = row.netmask.split(".").map(Number).map((octet) => octet.toString(2).padStart(8, "0")).join("");
    return /^1*0*$/.test(mask) ? ip + "/" + mask.replace(/0/g, "").length : ip;
  };
  const switches = [["0", t("disabled")], ["1", t("enabled")]];
  let fields = "";
  if (resource === "interface") {
    const proto = state.editor.proto ?? row.proto;
    fields = selectField("proto", "protocol", [["static", t("static")], ["dhcp", "DHCP"], ["dhcpv6", "DHCPv6"], ["pppoe", "PPPoE"]], proto) +
      field("device", "device", row.device) + field("dns", "dnsField", lines(row.dns));
    if (proto === "static") {
      fields += field("ipaddr", "addresses", withPrefix(lines(row.ipaddr))) +
        field("gateway", "gateway", row.gateway) + field("ip6addr", "addresses6", lines(row.ip6addr)) +
        field("ip6gw", "gateway6", row.ip6gw);
    }
    if (proto === "pppoe") fields += field("username", "user", null, 'autocomplete="off"') +
      field("password", "newPassword", null, 'type="password" autocomplete="new-password"');
  } else if (resource === "dhcp") {
    fields = field("start", "start", row.start, 'inputmode="numeric"') +
      field("limit", "limit", row.limit, 'inputmode="numeric"') + field("leasetime", "leasetime", row.leasetime) +
      selectField("ignore", "state", [...switches].reverse().map(([value, label]) => [value === "1" ? "0" : "1", label]), row.ignore ?? "0");
  } else if (resource === "dns") {
    fields = field("server", "dnsServers", lines(row.server));
  } else if (resource === "forward") {
    const zones = data.configs.firewall?.filter((item) => item.type === "zone" && item.name).map((item) => [item.name, item.name]) ?? [];
    fields = field("name", "name", row.name, "required") + selectField("src", "src", zones, row.src ?? "wan") +
      selectField("dest", "dest", zones, row.dest ?? "lan") +
      selectField("proto", "protocol", [["tcp","TCP"],["udp","UDP"],["tcp udp","TCP + UDP"]], lines(row.proto)?.replace("udp tcp", "tcp udp")) +
      field("src_dport", "src_dport", row.src_dport, "required") + field("dest_ip", "dest_ip", row.dest_ip, "required") +
      field("dest_port", "dest_port", row.dest_port, "required") + selectField("enabled", "state", switches, row.enabled ?? "1");
  } else {
    const targets = data.configs.network?.filter((item) => item.type === "interface").map((item) => [item.id, item.id]) ?? [];
    fields = selectField("interface", "interface", targets, row.interface) + field("target", "target", withPrefix(row.target), "required") +
      field("gateway", "gateway", row.gateway) + field("metric", "metric", row.metric, 'inputmode="numeric"');
  }
  const remove = id && ["forward", "route"].includes(resource)
    ? '<button type="button" class="btn danger" data-action="remove">' + t("remove") + "</button>" : "";
  const form = '<form id="config-form">' + fields + "<footer>" + remove +
    '<button class="btn" type="button" data-action="cancel">' + t("cancel") + '</button><button class="btn primary">' +
    t(id ? "apply" : "saveNew") + "</button></footer></form>";
  return '<div class="editor">' + card(t(id ? "edit" : "add"), form) + "</div>";
}
function network(data, tab) {
  if (tab === "wifi" && !data.wifi?.length && !data.radios?.length) tab = "interfaces";
  const nav = '<nav class="tabs" aria-label="' + t("network") + '">' + tabs.filter((key) => key !== "wifi" || data.wifi?.length || data.radios?.length)
    .map((key) => '<a href="#network/' + key + '"' + (tab === key ? ' aria-current="page"' : "") + ">" + t(key) + "</a>").join("") + "</nav>";
  const panels = {interfaces: () => interfaceDetails(data),
    wifi: () => renderWifi(data),
    dhcp: () => '<div class="panel-stack">' + configurationTable(data, "dhcp", "dhcp", ["dhcp"], "dhcpPools") +
      configurationTable(data, "dhcp", "dns", ["dnsmasq"], "dnsServers") +
      card(t("dhcp"), table(["name", "type", "values"], configRows(data.configs.dhcp))) + "</div>",
    firewall: () => '<div class="panel-stack">' + configurationTable(data, "firewall", "forward", ["redirect"], "portForwards") +
      card(t("firewall"), table(["name", "type", "values"], configRows(data.configs.firewall))) + "</div>",
    routes: () => '<div class="panel-stack">' + configurationTable(data, "network", "route", ["route", "route6"], "staticRoutes") +
      ["4","6"].map((family) => card("IPv" + family, table(["routes"], data.routes[family].map((row) => [mono(row)])))).join("") + "</div>"};
  const panel = panels[tab]();
  return nav + (state.editor && data.writes ? '<div class="split config-split">' + panel + renderConfigEditor(data) + "</div>" : panel);
}
function leaseRows(data) {
  const search = state.search.trim().toLowerCase();
  return data.leases.filter((item) => [item.name, item.ip, item.mac].some((value) => value.toLowerCase().includes(search)))
    .map((item) => [show(item.name === "*" ? "—" : item.name), mono(item.ip), mono(item.mac), show(date(item.expires))]);
}
function devices(data) {
  const search = '<input type="search" id="device-search" placeholder="' + t("search") + '" aria-label="' + t("search") + '" value="' + e(state.search) + '">';
  return card(t("leases"), '<div id="leases-table">' + table(["name", "IP", "MAC", "expires"], leaseRows(data)) + "</div>", search);
}
function settings(data) {
  const buttons = ["简体中文", "English"].map((text, index) => '<button data-lang="' + (1 - index) +
    '" aria-pressed="' + (state.lang === 1 - index) + '">' + text + "</button>").join("");
  const release = [data?.board.release?.distribution, data?.board.release?.version].filter(Boolean).join(" ");
  return '<div class="panel-stack">' + card(t("general"), '<div class="setting"><b>' + t("lang") +
    '</b><div class="seg" role="group" aria-label="' + t("lang") + '">' + buttons + "</div></div>") +
    (data ? card(t("device"), '<div class="setting"><b>' + t("firmware") + "</b><span>" +
    show(release || null) + "</span></div>") : "") + "</div>";
}
function render() {
  const [page, tab] = route();
  const data = state.data;
  document.documentElement.lang = state.lang ? "zh-CN" : "en";
  $(".skip").textContent = t("skip");
  $("#nav").setAttribute("aria-label", t("navigation"));
  $("#nav").innerHTML = Object.keys(paths).map((key) =>
    '<a class="navitem" href="#' + key + '"' + (page === key ? ' aria-current="page"' : "") + ">" + icon(key) + t(key) + "</a>").join("");
  $("#breadcrumb").textContent = "LanternWrt / " + t(page);
  $("#router").innerHTML = data ? '<i class="dot' + (state.failed ? "" : " up") + '"></i>' + show(data.board.model || data.board.hostname) : "";
  $("#sidebar-foot").innerHTML = data?.demo ? '<span class="tag">' + t("demo") + "</span>" :
    data && !data.writes ? '<span class="tag">' + t("reading") + "</span>" : "";
  const issue = state.failed ? '<div class="banner" role="alert">' + t("error") + "</div>" : "";
  const body = page === "settings" ? settings(data) : !data ? (state.failed ? "" : '<p class="empty">' + t("loading") + "</p>") :
    page === "network" ? network(data, tab) : page === "devices" ? devices(data) : overview(data);
  const transaction = state.until ? '<div class="banner transaction"><strong>' + t("pending") +
    ' · <span id="timer"></span></strong><div><button class="btn" data-action="rollback">' + t("rollback") +
    '</button><button class="btn primary" data-action="confirm">' + t("confirm") + "</button></div></div>" : "";
  $("#content").innerHTML = '<div class="heading"><h1>' + t(page) + "</h1></div>" + issue + transaction + body;
  tick();
}
function updateSamples(data) {
  const prior = state.previous;
  if (prior && data.sampledAt <= prior.sampledAt) return;
  if (prior) {
    const elapsed = data.sampledAt - prior.sampledAt;
    for (const [name, values] of Object.entries(data.counters)) {
      const before = prior.counters[name];
      if (!before || before.some((value, i) => values[i] < value)) continue;
      const sample = data.demo
        ? [28 + 8 * Math.sin(data.sampledAt / 8) + 4 * Math.cos(data.sampledAt / 3), 6 + 3 * Math.cos(data.sampledAt / 9)]
        : values.map((value, i) => (value - before[i]) * 8 / elapsed / 1e6);
      state.graphs.set(name, [...(state.graphs.get(name) ?? []), sample].slice(-60));
    }
    const cpu = data.cpu.map((value, i) => value - prior.cpu[i]);
    const total = cpu.reduce((sum, part) => sum + part, 0);
    if (total > 0 && cpu.every((part) => part >= 0)) state.cpu = Math.round((1 - (cpu[3] + cpu[4]) / total) * 100);
  }
  if (data.demo) state.cpu = 18;
  state.previous = data;
}
async function refresh() {
  const first = !state.data;
  try {
    const response = await fetch("/api/status", {signal: AbortSignal.timeout(16000)});
    if (!response.ok) throw new Error();
    const data = await response.json();
    updateSamples(data);
    const recovered = state.failed;
    state.failed = false;
    state.data = data;
    const changing = $("#wifi-form") || $("#config-form") || state.until;
    const interacting = document.activeElement?.matches("input, select, button, a");
    if (first || (!changing && !interacting && (recovered || ["overview", "network", "devices"].includes(route()[0])))) render();
  } catch {
    if (!state.failed) {
      state.failed = true;
      if (!$("#wifi-form") && !$("#config-form")) render();
    }
  }
}
let noticeTimer;
function notify(key) {
  $("#notice").textContent = t(key);
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { $("#notice").textContent = ""; }, 5500);
}
function tick() {
  if (!state.until) return;
  const seconds = Math.ceil((state.until - Date.now()) / 1000);
  if (seconds <= 0) {
    state.until = 0;
    state.edit = "";
    render();
    notify("expired");
  } else if ($("#timer")) $("#timer").textContent = seconds + "s";
}
async function reviewPending() {
  try {
    const response = await fetch("/api/change", {signal: AbortSignal.timeout(5000)});
    if (!response.ok) return;
    const result = await response.json();
    const changed = Boolean(state.until) !== result.pending;
    state.until = result.pending ? Date.now() + result.remaining * 1000 : 0;
    if (changed) { state.edit = ""; state.editor = null; render(); }
  } catch { /* Keep the last countdown while reconnecting to the dashboard. */ }
}
async function modify(action, data = {}, area = "change") {
  const buttons = [...document.querySelectorAll(".editor button, .transaction button")];
  buttons.forEach((button) => { button.disabled = true; });
  try {
    const response = await fetch("/api/" + area + "/" + action, {method: "POST",
      headers: {"Content-Type": "application/json"}, body: JSON.stringify(data), signal: AbortSignal.timeout(30000)});
    const result = await response.json();
    if (!response.ok) return notify(result.error);
    if (result.unconfirmed) notify("unconfirmed");
    state.until = result.pending ? Date.now() + result.remaining * 1000 : 0;
    state.edit = "";
    state.editor = null;
    if (!result.pending) {
      notify(action === "confirm" ? "good" : "reverted");
      await refresh();
    }
    render();
  } catch {
    notify("timeout");
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
}
document.addEventListener("click", ({target}) => {
  const button = target.closest("button");
  if (!button) return;
  if (button.dataset.lang) {
    state.lang = Number(button.dataset.lang);
    localStorage.setItem("lantern-language", state.lang ? "zh" : "en");
    render();
  }
  if (button.dataset.edit && !state.until) {
    state.edit = button.dataset.edit;
    state.editor = null;
    render();
    $("#wifi-form input")?.focus();
  }
  if (button.dataset.resource && !state.until) {
    state.editor = {resource: button.dataset.resource, id: button.dataset.new ? null : button.dataset.section};
    state.edit = "";
    render();
    $("#config-form input, #config-form select")?.focus();
  }
  const action = button.dataset.action;
  if (action === "cancel") { state.edit = ""; state.editor = null; render(); }
  if (action === "remove" && state.editor && window.confirm(t("removeConfirm"))) {
    modify("apply", {...state.editor, remove: true, values: {}});
  }
  if (action === "confirm" || action === "rollback") modify(action);
});
document.addEventListener("submit", (event) => {
  if (!["wifi-form", "config-form"].includes(event.target.id)) return;
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.target));
  if (event.target.id === "wifi-form") {
    if (!values.key) delete values.key;
    modify("apply", {id: state.edit, values}, "wifi");
  } else if (state.editor) {
    for (const key of ["username", "password", "device", "metric", "start", "limit", "leasetime"]) {
      if (!values[key]) delete values[key];
    }
    modify("apply", {...state.editor, values});
  }
});
document.addEventListener("change", ({target}) => {
  if (target.id === "traffic-device") { state.traffic = target.value; render(); }
  if (target.name === "proto" && target.form?.id === "config-form") {
    state.editor.proto = target.value;
    render();
    $("#config-form select[name=proto]")?.focus();
  }
});
document.addEventListener("input", ({target}) => {
  if (target.id !== "device-search") return;
  state.search = target.value;
  $("#leases-table").innerHTML = table(["name", "IP", "MAC", "expires"], leaseRows(state.data));
});
window.addEventListener("hashchange", () => { state.editor = null; state.edit = ""; render(); $("#content").focus(); });
render();
refresh();
reviewPending();
setInterval(refresh, 5000);
setInterval(reviewPending, 5000);
setInterval(tick, 1000);
