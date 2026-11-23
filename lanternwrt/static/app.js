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
  invalid_config: ["Check the SSID or passphrase", "请检查 SSID 或密码"],
  pending_conflict: ["A change is pending or has expired", "有更改待确认或已过期"],
  router_unavailable: ["The router did not accept the request", "路由器未接受请求"],
  read_only: ["Router changes are disabled", "当前未启用写入"], forbidden: ["Request rejected", "请求被拒绝"],
  timeout: ["Could not reach the dashboard", "无法连接面板"], navigation: ["Main navigation", "主导航"],
  skip: ["Skip to content", "跳到主要内容"],
  mtu: ["MTU", "MTU"], speed: ["Link speed", "链路速率"],
};
const paths = {overview: "M3 10 12 3l9 7v10H3z M9 20v-7h6v7",
  network: "M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8 16a6 6 0 0 1 8 0M12 20h.01",
  devices: "M3 4h18v13H3z M8 21h8m-4-4v4",
  settings: "M12 3v4m0 10v4m9-9h-4M7 12H3m15.4-6.4-2.8 2.8m-7.2 7.2-2.8 2.8m0-12.8 2.8 2.8m7.2 7.2 2.8 2.8M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z"};
const tabs = ["interfaces", "wifi", "dhcp", "firewall", "routes"];
const state = {lang: localStorage.getItem("lantern-language") === "zh" ? 1 : 0, data: null, failed: false,
  previous: null, graphs: new Map(), cpu: null, traffic: "", edit: "", until: 0, search: ""};
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
  const rows = data.wifi?.map((row) => [show(row.ssid || row.id), show(row.band), mono(row.mode?.toUpperCase()), show(row.encryption),
    label(row.up), data.writes && row.mode === "ap" ? '<button class="btn" data-edit="' + e(row.id) + '">' + t("edit") + "</button>" : ""]) ?? null;
  const listing = card("Wi-Fi", table(["name", "band", "mode", "encryption", "state", ""], rows));
  const selected = data.wifi?.find((row) => row.id === state.edit);
  if (!selected && !state.until) return listing;
  const security = ["psk", "psk2", "psk-mixed", "sae", "sae-mixed"].includes(selected?.encryption?.split("+")[0]);
  const buttons = (keys) => keys.map((key, index) => '<button type="button" class="btn' + (index ? " primary" : "") +
    '" data-action="' + key + '">' + t(key) + "</button>").join("");
  const editor = state.until ? '<div class="confirm"><strong>' + t("pending") + ' · <span id="timer"></span></strong><footer>' +
    buttons(["rollback", "confirm"]) + "</footer></div>" : '<form id="wifi-form"><label>SSID<input name="ssid" required value="' +
    e(selected.ssid ?? "") + '"></label>' + (security ? '<label>' + t("password") + '<input name="key" type="password" autocomplete="new-password"></label>' : "") +
    '<footer>' + buttons(["cancel"]) + '<button class="btn primary">' + t("apply") + "</button></footer></form>";
  return '<div class="split">' + listing + '<div class="editor">' + card(t("edit") + " Wi-Fi", editor) + "</div></div>";
}
function network(data, tab) {
  const nav = '<nav class="tabs" aria-label="' + t("network") + '">' + tabs.filter((key) => key !== "wifi" || data.wifi?.length)
    .map((key) => '<a href="#network/' + key + '"' + (tab === key ? ' aria-current="page"' : "") + ">" + t(key) + "</a>").join("") + "</nav>";
  const panels = {interfaces: () => '<div class="panel-stack">' + interfaces(data) +
      card(t("ports"), table(["name", "type", "state", "mtu", "speed"], data.ports?.map((port) =>
        [mono(port.name), show(port.type), label(port.carrier ?? port.up), show(port.mtu), show(port.speed)]) ?? null)) +
      card(t("device"), table(["name", "type", "values"], configRows(data.configs.network?.filter(({type}) => type !== "interface")))) + "</div>",
    wifi: () => renderWifi(data),
    dhcp: () => card(t("dhcp"), table(["name", "type", "values"], configRows(data.configs.dhcp))),
    firewall: () => card(t("firewall"), table(["name", "type", "values"], configRows(data.configs.firewall))),
    routes: () => '<div class="panel-stack">' + ["4","6"].map((family) =>
      card("IPv" + family, table(["routes"], data.routes[family].map((row) => [mono(row)])))).join("") + "</div>"};
  return nav + panels[tab]();
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
  $("#content").innerHTML = '<div class="heading"><h1>' + t(page) + "</h1></div>" + issue + body;
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
    const changing = $("#wifi-form") || state.until;
    const interacting = document.activeElement?.matches("input, select, button, a");
    if (first || (!changing && !interacting && (recovered || ["overview", "network", "devices"].includes(route()[0])))) render();
  } catch {
    if (!state.failed) {
      state.failed = true;
      if (!$("#wifi-form")) render();
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
async function modify(action, data = {}) {
  const buttons = [...document.querySelectorAll(".editor button")];
  buttons.forEach((button) => { button.disabled = true; });
  try {
    const response = await fetch("/api/wifi/" + action, {method: "POST",
      headers: {"Content-Type": "application/json"}, body: JSON.stringify(data), signal: AbortSignal.timeout(30000)});
    const result = await response.json();
    if (!response.ok) return notify(result.error);
    state.until = result.pending ? Date.now() + result.remaining * 1000 : 0;
    if (!result.pending) {
      state.edit = "";
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
    render();
    $("#wifi-form input")?.focus();
  }
  const action = button.dataset.action;
  if (action === "cancel") { state.edit = ""; render(); }
  if (action === "confirm" || action === "rollback") modify(action);
});
document.addEventListener("submit", (event) => {
  if (event.target.id !== "wifi-form") return;
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.target));
  if (!values.key) delete values.key;
  modify("apply", {id: state.edit, values});
});
document.addEventListener("change", ({target}) => {
  if (target.id === "traffic-device") { state.traffic = target.value; render(); }
});
document.addEventListener("input", ({target}) => {
  if (target.id !== "device-search") return;
  state.search = target.value;
  $("#leases-table").innerHTML = table(["name", "IP", "MAC", "expires"], leaseRows(state.data));
});
window.addEventListener("hashchange", () => { render(); $("#content").focus(); });
render();
refresh();
setInterval(refresh, 5000);
setInterval(tick, 1000);
