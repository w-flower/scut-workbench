/* SCUT 工作台 · 在线版主程序
   纯前端 + localStorage 持久化；数据通过 repository 抽象，后续可无缝换 Supabase。
*/
import { DEMO, DEMO_ACCOUNT } from "./demo-seed.js";

/* ---------------- utils ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => "x" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toMin = (s) => { const m = String(s || "").match(/(\d{1,2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : null; };
const todayStr = () => ymd(new Date());
function dayDiff(iso) { const t = new Date(todayStr() + "T00:00:00"); const d = new Date(String(iso).slice(0, 10) + "T00:00:00"); return Math.round((d - t) / 86400000); }
function weekNo(termStart) { const s = new Date(termStart + "T00:00:00"); const t = new Date(todayStr() + "T00:00:00"); return Math.floor((t - s) / 604800000) + 1; }
function relDue(iso) { const d = dayDiff(iso); if (!isFinite(d)) return ""; if (d < 0) return `已逾期 ${-d} 天`; if (d === 0) return "今天"; if (d === 1) return "明天"; return `${d} 天后`; }
function fmtTime(iso) { const m = String(iso || "").match(/(\d{1,2}):(\d{2})/); return m ? `${pad(m[1])}:${m[2]}` : ""; }

/* ---------------- store ---------------- */
const KEY = "scut.online.v1";
let store = load();
let lastUndo = null;
let S = { view: "today", roleIdx: 0, hwFilter: "undone", affairTab: null, cmdSel: 0, cmdItems: [] };

function defaultStore() {
  const d = JSON.parse(JSON.stringify(DEMO));
  return {
    user: d.user, org: d.org, memberships: d.memberships, periods: d.periods, courses: d.courses,
    homework: d.homework, todos: d.todos, notices: d.notices, events: d.events, collections: d.collections,
    approvals: d.approvals, roster: d.roster, focusPresets: d.focusPresets, links: d.links,
    focusSessions: [],
    prefs: { theme: "light", aiModel: "deepseek-chat", aiKey: "", focusMethod: "pomodoro", musicOn: false, playlistId: "3098275264" },
    meta: { seededAt: new Date().toISOString(), version: 1 }
  };
}
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) return migrate(JSON.parse(raw)); } catch (e) {}
  const s = defaultStore(); try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} return s;
}
function migrate(s) { const d = defaultStore(); return Object.assign(d, s, { prefs: Object.assign(d.prefs, s.prefs || {}) }); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }

/* ---------------- auth ---------------- */
function isAuthed() { try { return localStorage.getItem("scut.auth") === "1"; } catch (e) { return false; } }
window.__doLogin = function () {
  const email = $("#lg-email").value.trim(); const pw = $("#lg-pw").value;
  if (email === DEMO_ACCOUNT.email && pw === DEMO_ACCOUNT.password) {
    localStorage.setItem("scut.auth", "1"); location.reload();
  } else { $("#lg-err").textContent = "账号或密码不对。演示账号：demo@scut.edu.cn / Demo#2026"; }
};
window.__doLogout = function () { localStorage.removeItem("scut.auth"); location.reload(); };

/* ---------------- core model helpers ---------------- */
function caps() { return store.memberships[S.roleIdx]?.capabilities || []; }
function has(cap) { return caps().includes(cap); }
function curRole() { return store.memberships[S.roleIdx] || { name: "普通学生", org: store.org.name, capabilities: ["own"] }; }

/* ---------------- icons ---------------- */
const IC = {
  today: '<path d="M4 5h16v15H4z"/><path d="M8 3v4M16 3v4M4 9h16"/><path d="M9 13h2v3H9z" fill="currentColor" stroke="none"/>',
  homework: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  grid: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M9 9v12M15 9v12"/>',
  users: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 2.5-5 6-5s6 2 6 5"/><path d="M16 5a3 3 0 0 1 0 6M21 20c0-2.5-1.5-4-4-4.5"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7z"/><path d="M10 21a2 2 0 0 0 4 0"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2 2M16.4 16.4l2 2M18.4 5.6l-2 2M7.6 16.4l-2 2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  check: '<path d="M5 12l5 5 9-11"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  moon: '<path d="M20 14a8 8 0 1 1-9-11 6 6 0 0 0 9 11z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',
  play: '<path d="M7 4l13 8-13 8z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M7 4v16M17 4v16" stroke-width="3"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4"/>',
  music: '<path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/>'
};
const ico = (n, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ""}</svg>`;

/* ---------------- toast ---------------- */
let toastTimer = null;
function toast(msg, actionLabel, action) {
  const el = $("#toast"); if (!el) return;
  el.innerHTML = `<span>${esc(msg)}</span>` + (actionLabel ? `<button id="toast-act">${esc(actionLabel)}</button>` : "");
  el.classList.add("show");
  if (actionLabel) { $("#toast-act").onclick = () => { el.classList.remove("show"); action && action(); }; }
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 3800);
}

/* ---------------- commit (with undo) ---------------- */
function commit(label, mutator, undoable = true) {
  const snap = JSON.stringify(store);
  mutator(store); save();
  if (undoable) lastUndo = () => { store = JSON.parse(snap); save(); render(); };
  render();
  if (undoable) toast(label, "撤销", () => { lastUndo && (lastUndo(), toast("已撤销")); });
  else toast(label);
}

/* ---------------- nav / shell ---------------- */
const VIEWS = [
  { id: "today", name: "今天", icon: "today" },
  { id: "homework", name: "作业", icon: "homework" },
  { id: "schedule", name: "课表", icon: "grid" },
  { id: "affairs", name: "事务", icon: "users", capAny: ["collect", "remind", "roster", "approve", "assign", "stats"] },
  { id: "notices", name: "通知", icon: "bell" },
  { id: "events", name: "活动", icon: "calendar" },
  { id: "focus", name: "专注", icon: "timer" },
  { id: "settings", name: "设置", icon: "settings" }
];
function visibleViews() { return VIEWS.filter((v) => !v.capAny || v.capAny.some(has)); }
function counts() {
  const t = todayStr();
  return {
    today: store.todos.filter((x) => !x.done && (!x.date || x.date <= t)).length,
    homework: store.homework.filter((h) => h.state !== "已提交").length,
    notices: store.notices.filter((n) => !n.read).length
  };
}
function renderNav() {
  const c = counts();
  const vs = visibleViews();
  $("#nav").innerHTML = '<div class="nav-label">工作台</div>' + vs.filter((v) => v.id !== "settings").map((v) =>
    `<button class="nav-item" data-act="view" data-id="${v.id}" aria-current="${S.view === v.id ? "page" : "false"}">${ico(v.icon)}<span>${v.name}</span>${c[v.id] ? `<span class="count num">${c[v.id]}</span>` : ""}</button>`
  ).join("") + '<div class="nav-label">系统</div>' +
    `<button class="nav-item" data-act="view" data-id="settings" aria-current="${S.view === "settings" ? "page" : "false"}">${ico("settings")}<span>设置</span></button>`;
}
function renderTop() {
  const v = VIEWS.find((x) => x.id === S.view) || VIEWS[0];
  const wk = weekNo(store.user.termStart);
  $("#crumb").innerHTML = `<h1>${v.name}</h1><span class="week">第 ${wk} 周 · ${esc(store.user.campus)}</span>`;
  const opts = store.memberships.map((m, i) => `<option value="${i}" ${i === S.roleIdx ? "selected" : ""}>${esc(m.name)} · ${esc(m.org)}</option>`).join("");
  $("#rolewrap").innerHTML = `<span class="muted">身份</span><select id="roleSel">${opts}</select>`;
  $("#roleSel").onchange = (e) => { S.roleIdx = +e.target.value; if (!visibleViews().some((v) => v.id === S.view)) S.view = "today"; render(); };
}
function render() {
  renderNav(); renderTop();
  const box = $("#content");
  const fn = ({ today: viewToday, homework: viewHomework, schedule: viewSchedule, affairs: viewAffairs, notices: viewNotices, events: viewEvents, focus: viewFocus, settings: viewSettings })[S.view] || viewToday;
  box.innerHTML = fn();
  bindView();
}
function setView(id) { S.view = id; history.replaceState(null, "", "#" + id); render(); window.scrollTo(0, 0); }

/* ---------------- view: today ---------------- */
function todayCourses() { const wd = new Date(todayStr() + "T00:00:00").getDay(); return store.courses.filter((c) => c.day === wd); }
function flowItems() {
  const t = todayStr();
  const items = [];
  store.todos.filter((x) => !x.done && (!x.date || x.date <= t)).forEach((x) => items.push({ kind: "todo", id: x.id, title: x.title, due: x.date + " " + (x.time || ""), date: x.date, time: x.time, cat: x.cat, ref: x }));
  store.homework.filter((h) => h.state !== "已提交" && dayDiff(h.due) <= 2).forEach((h) => items.push({ kind: "homework", id: h.id, title: h.title, sub: h.course, due: h.due, date: h.due.slice(0, 10), time: fmtTime(h.due), cat: "作业", ref: h }));
  return items.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}
function viewToday() {
  const cs = todayCourses();
  const now = new Date(); const nowMin = now.getHours() * 60 + now.getMinutes();
  let rows = "";
  store.periods.forEach(([n, s, e], i) => {
    const sc = cs.filter((c) => c.s <= n && c.e >= n);
    const block = sc.map((c) => `<div class="course"><b>${esc(c.name)}</b><span class="room">${esc(c.room)}</span></div>`).join("");
    rows += `<div class="axis-row"><div class="axis-time num">${esc(s)}</div><div class="axis-slot" data-p="${i}">${block}</div></div>`;
  });
  const flow = flowItems();
  const flowHtml = flow.length ? flow.map((it) =>
    `<div class="row ${it.kind === "todo" && it.ref.done ? "done" : ""}">
      ${it.kind === "todo" ? `<button class="check" data-act="todo-toggle" data-id="${it.id}" aria-pressed="${!!it.ref.done}" aria-label="完成">${ico("check", "sm")}</button>` : `<span class="tag blue">作业</span>`}
      <div class="grow"><div class="title">${esc(it.title)}</div><div class="meta"><span class="tag ${dayDiff(it.date) < 0 ? "red" : dayDiff(it.date) <= 1 ? "amber" : ""}">${esc(relDue(it.date))}${it.time ? " · " + it.time : ""}</span>${it.sub ? `<span>${esc(it.sub)}</span>` : ""}${it.cat ? `<span class="tag">${esc(it.cat)}</span>` : ""}</div></div>
      <button class="link-btn" data-act="view" data-id="${it.kind === "homework" ? "homework" : "today"}">${it.kind === "homework" ? "去处理" : "查看"}</button>
    </div>`).join("") : `<div class="empty"><b>今天没有临近截止</b>享受一下吧。</div>`;

  return `
  <div class="section">
    <div class="panel">
      <div class="panel-head"><h3>AI 整理信息</h3><span class="sub">粘贴一段群消息/通知，自动拆成待办（不填 key 走内置规则）</span></div>
      <div class="panel-body">
        <div class="addrow">
          <input class="grow" id="ai-input" placeholder="例：线代习题四 2-5 下周三前交；周五班会汇总名单">
          <button class="btn primary sm" data-act="ai-parse">${ico("search", "sm")}解析</button>
        </div>
        <div id="ai-out"></div>
      </div>
    </div>
  </div>
  <div class="today-grid">
    <div class="section">
      <div class="section-head"><h2>今日时间轴</h2><span class="sub">${new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })}</span></div>
      <div class="panel"><div class="panel-body"><div class="axis" id="axis">${rows}<div class="nowline" id="nowline"><span>现在 ${pad(now.getHours())}:${pad(now.getMinutes())}</span></div></div></div></div>
    </div>
    <div class="section">
      <div class="section-head"><h2>待处理</h2><span class="sub">${flow.length} 项</span></div>
      <div class="panel"><div class="panel-body">
        <div class="addrow"><input class="grow" id="tq-title" placeholder="快速添加待办，回车保存"><button class="btn sm" data-act="todo-add">${ico("plus", "sm")}</button></div>
        <div id="flow">${flowHtml}</div>
      </div></div>
    </div>
  </div>`;
}
function positionNowline() {
  const el = $("#nowline"); if (!el) return;
  const now = new Date(); const mn = now.getHours() * 60 + now.getMinutes();
  const ps = store.periods; let idx = -1, frac = 0;
  for (let i = 0; i < ps.length; i++) { const a = toMin(ps[i][1]), b = toMin(ps[i][2]); if (mn >= a && mn <= b) { idx = i; frac = (mn - a) / Math.max(1, b - a); break; } }
  const rows = $$("#axis .axis-row");
  if (!rows.length) return;
  const H = rows[0].offsetHeight || 42;
  let y;
  if (idx < 0) { y = mn < toMin(ps[0][1]) ? 0 : rows.length * H; }
  else y = idx * H + frac * H;
  el.style.top = y + "px";
  if (mn < toMin(ps[0][1]) || mn > toMin(ps[ps.length - 1][2])) el.style.display = "none";
}

/* ---------------- rule engine AI ---------------- */
function parseRule(text) {
  const out = [];
  String(text).split(/[；;。\n]+/).map((s) => s.trim()).filter(Boolean).forEach((seg) => {
    let due = null; const now = new Date();
    if (/今天/.test(seg)) due = ymd(now);
    else if (/明天/.test(seg)) { const d = new Date(now); d.setDate(d.getDate() + 1); due = ymd(d); }
    else if (/后天/.test(seg)) { const d = new Date(now); d.setDate(d.getDate() + 2); due = ymd(d); }
    const wk = seg.match(/周([一二三四五六日天])/);
    if (!due && wk) { const map = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 }; const target = map[wk[1]]; const d = new Date(now); const cur = d.getDay(); let add = (target - cur + 7) % 7; if (add === 0) add = 7; d.setDate(d.getDate() + add); due = ymd(d); }
    const md = seg.match(/(\d{1,2})\s*[\/月-]\s*(\d{1,2})/);
    if (!due && md) due = `${now.getFullYear()}-${pad(md[1])}-${pad(md[2])}`;
    const tm = seg.match(/(\d{1,2})[:：点](\d{2})?/); const time = tm ? `${pad(tm[1])}:${tm[2] || "00"}` : "";
    let title = seg.replace(/[，,。；;].*$/, "").trim();
    if (title.length > 26) title = title.slice(0, 26);
    if (!title) title = seg.slice(0, 26);
    out.push({ title, due: due || "", time, conf: due ? 0.86 : 0.55 });
  });
  return out;
}
window.__aiParse = function () {
  const txt = $("#ai-input").value.trim(); if (!txt) { toast("先粘一段文字"); return; }
  const cands = parseRule(txt);
  $("#ai-out").innerHTML = `<div class="rule"></div><div class="muted" style="font-size:12px;margin-bottom:8px">解析出 ${cands.length} 条候选（规则引擎 · 未配置 key）</div>` +
    cands.map((c, i) => `<div class="row"><span class="tag ${c.conf > .8 ? "green" : "amber"}">${Math.round(c.conf * 100)}%</span><div class="grow"><div class="title">${esc(c.title)}</div><div class="meta">${c.due ? "截止 " + esc(c.due) + (c.time ? " " + c.time : "") : "未识别截止时间"}</div></div><button class="btn sm primary" data-act="ai-adopt" data-idx="${i}">采纳</button></div>`).join("");
  S._aiCands = cands;
};

/* ---------------- view: homework ---------------- */
function viewHomework() {
  const list = store.homework.filter((h) => S.hwFilter === "all" || h.state !== "已提交");
  const rows = list.length ? list.map((h) => `
    <div class="hw-card">
      <div class="top">
        <div style="flex:1;min-width:0">
          <span class="course">${esc(h.course)}</span>
          <div class="h">${esc(h.title)}</div>
          <div class="foot">
            <span class="tag ${dayDiff(h.due) < 0 ? "red" : dayDiff(h.due) <= 1 ? "amber" : "blue"}">${esc(relDue(h.due))} · ${esc(h.due.slice(5))}</span>
            <select class="hw-state" data-id="${h.id}" style="height:26px;border:1px solid var(--line);border-radius:6px;background:var(--surface)">
              ${["未提交", "进行中", "已提交"].map((s) => `<option ${s === h.state ? "selected" : ""}>${s}</option>`).join("")}
            </select>
            ${h.note ? `<span>${esc(h.note)}</span>` : ""}
          </div>
        </div>
        <button class="link-btn" data-act="hw-del" data-id="${h.id}" title="删除">${ico("trash", "sm")}</button>
      </div>
    </div>`).join("") : `<div class="empty"><b>没有符合条件的作业</b>换个筛选看看。</div>`;
  return `
  <div class="section">
    <div class="filters" style="margin-bottom:14px">
      <button class="chip" data-act="hw-filter" data-id="undone" aria-pressed="${S.hwFilter === "undone"}">未完成</button>
      <button class="chip" data-act="hw-filter" data-id="all" aria-pressed="${S.hwFilter === "all"}">全部</button>
    </div>
    <div class="panel"><div class="panel-head"><h3>课程作业</h3><span class="sub">${list.length} 条</span></div><div class="panel-body">
      <div class="addrow">
        <input class="hw_course" placeholder="课程" style="width:150px">
        <input class="hw_title grow" placeholder="作业标题">
        <input class="hw_due" type="datetime-local" style="width:200px">
        <button class="btn primary sm" data-act="hw-add">${ico("plus", "sm")}添加</button>
      </div>
      <div id="hw-list">${rows}</div>
    </div></div>
  </div>`;
}

/* ---------------- view: schedule ---------------- */
function viewSchedule() {
  const wdNames = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  const todayW = (new Date(todayStr() + "T00:00:00").getDay() + 6) % 7;
  let head = `<div class="hd" style="background:var(--surface-2)"></div>` + wdNames.map((w, i) => `<div class="hd ${i === todayW ? "today" : ""}">${w}</div>`).join("");
  let body = "";
  store.periods.forEach(([n, s]) => {
    body += `<div class="tm num">${esc(s)}<br><span style="font-size:9px">第${n}节</span></div>`;
    for (let d = 1; d <= 7; d++) {
      const cs = store.courses.filter((c) => c.day === d && c.s === n);
      body += `<div class="cell ${d - 1 === todayW ? "today" : ""}">${cs.map((c) => `<div class="ev" title="${esc(c.name)} @ ${esc(c.room)} · ${esc(c.weeks)}周">${esc(c.name)}</div>`).join("")}</div>`;
    }
  });
  return `
  <div class="section">
    <div class="panel"><div class="panel-head"><h3>本周课表</h3><span class="sub">第 ${weekNo(store.user.termStart)} 周</span></div>
      <div class="panel-body" style="overflow-x:auto"><div class="week" style="min-width:720px">${head}${body}</div></div>
    </div>
    <div class="panel" style="margin-top:16px"><div class="panel-head"><h3>添加课程</h3></div><div class="panel-body">
      <div class="addrow">
        <input class="sc_name grow" placeholder="课程名">
        <select class="sc_day">${wdNames.map((w, i) => `<option value="${i + 1}">${w}</option>`).join("")}</select>
        <select class="sc_s">${store.periods.map(([n]) => `<option value="${n}">第${n}节</option>`).join("")}</select>
        <select class="sc_e">${store.periods.map(([n]) => `<option value="${n}" ${n === 2 ? "selected" : ""}>到第${n}节</option>`).join("")}</select>
        <input class="sc_room" placeholder="地点" style="width:110px">
        <button class="btn primary sm" data-act="sc-add">${ico("plus", "sm")}</button>
      </div>
    </div></div>
  </div>`;
}

/* ---------------- view: affairs (role-driven) ---------------- */
function affairTabs() {
  const t = [];
  if (has("collect")) t.push(["collect", "收集"]);
  if (has("approve")) t.push(["approve", "审批"]);
  if (has("roster")) t.push(["roster", "名单"]);
  if (has("stats")) t.push(["stats", "统计"]);
  if (has("assign")) t.push(["assign", "任务"]);
  return t;
}
function viewAffairs() {
  const tabs = affairTabs();
  const cur = S.affairTab && tabs.some((x) => x[0] === S.affairTab) ? S.affairTab : (tabs[0] || ["collect"])[0];
  S.affairTab = cur;
  const tabHtml = tabs.map(([k, n]) => `<button class="chip" data-act="affair-tab" data-id="${k}" aria-pressed="${cur === k}">${n}</button>`).join("");
  let body = "";
  if (cur === "collect") body = renderCollectTab();
  else if (cur === "approve") body = renderApproveTab();
  else if (cur === "roster") body = renderRosterTab();
  else if (cur === "stats") body = renderStatsTab();
  else body = renderAssignTab();
  return `
  <div class="section">
    <div class="section-head"><h2>${esc(curRole().name)} · ${esc(curRole().org)}</h2><span class="sub">只显示你这个身份拥有的能力</span></div>
    <div class="filters" style="margin-bottom:14px">${tabHtml}</div>
    <div class="panel"><div class="panel-body">${body}</div></div>
  </div>`;
}
function renderCollectTab() {
  const list = store.collections;
  const rows = list.length ? list.map((c) => {
    const pct = c.total ? Math.round((c.got / c.total) * 100) : 0;
    return `<div class="row"><div class="grow"><div class="title">${esc(c.title)}</div>
      <div class="meta"><span>截止 ${esc(c.due)}</span><span>字段：${esc((c.fields || []).join("/"))}</span></div>
      <div class="progress-line" style="margin-top:6px"><b class="num" style="font-size:12px">${c.got}/${c.total}</b><div class="progress-track"><i style="width:${pct}%"></i></div>${c.got >= c.total ? '<span class="tag green">已收齐</span>' : `<span class="tag red">还差 ${c.total - c.got}</span>`}</div>
    </div><button class="link-btn" data-act="collect-remind" data-id="${c.id}">生成催办</button></div>`;
  }).join("") : `<div class="empty"><b>暂无收集任务</b></div>`;
  return `<div class="addrow"><input class="co_title grow" placeholder="收集任务名"><input class="co_total" type="number" placeholder="总人数" style="width:100px"><button class="btn primary sm" data-act="collect-add">${ico("plus", "sm")}发起收集</button></div><div>${rows}</div>`;
}
function renderApproveTab() {
  const rows = store.approvals.length ? store.approvals.map((a) => `<div class="row"><div class="grow"><div class="title">${esc(a.title)}</div><div class="meta"><span class="tag">${esc(a.kind)}</span><span>${esc(a.applicant)}</span></div></div>
    <span class="tag ${a.state === "已通过" ? "green" : "amber"}">${esc(a.state)}</span>
    ${a.state !== "已通过" ? `<button class="link-btn" data-act="approve-ok" data-id="${a.id}">通过</button>` : ""}</div>`).join("") : `<div class="empty"><b>没有待审批</b></div>`;
  return `<div>${rows}</div>`;
}
function renderRosterTab() {
  const cls = store.roster.class || [], lea = store.roster.league || [];
  const chips = (arr) => arr.map((n) => `<span class="tag">${esc(n)}</span>`).join(" ");
  return `<div class="section"><div class="section-head"><h2 style="font-size:13.5px">班级名单 · ${cls.length} 人</h2></div><div style="display:flex;flex-wrap:wrap;gap:6px">${chips(cls) || '<span class="muted">未导入</span>'}</div></div>
  <div class="rule"></div>
  <div class="section"><div class="section-head"><h2 style="font-size:13.5px">团员名单 · ${lea.length} 人</h2></div><div style="display:flex;flex-wrap:wrap;gap:6px">${chips(lea) || '<span class="muted">未导入</span>'}</div></div>`;
}
function renderStatsTab() {
  const hw = store.homework.length, hwDone = store.homework.filter((h) => h.state === "已提交").length;
  const td = store.todos.length, tdDone = store.todos.filter((t) => t.done).length;
  const col = store.collections.reduce((s, c) => s + c.got, 0), colT = store.collections.reduce((s, c) => s + c.total, 0);
  const cell = (n, l) => `<div style="text-align:center"><div class="num" style="font-size:30px;font-weight:700">${n}</div><div class="muted" style="font-size:12px">${l}</div></div>`;
  return `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">${cell(hwDone + "/" + hw, "作业已交")}${cell(tdDone + "/" + td, "待办完成")}${cell(col + "/" + colT, "收集回执")}${cell(store.events.length, "活动总数")}</div>`;
}
function renderAssignTab() {
  const rows = store.todos.filter((t) => !t.done).map((t) => `<div class="row"><div class="grow"><div class="title">${esc(t.title)}</div><div class="meta"><span class="tag">${esc(t.cat)}</span><span>${esc(t.date)}</span></div></div></div>`).join("");
  return `<div class="muted" style="font-size:12.5px;margin-bottom:8px">派给部门成员的待办（演示）</div>${rows || '<div class="empty"><b>暂无</b></div>'}`;
}

/* ---------------- view: notices ---------------- */
function viewNotices() {
  const rows = store.notices.length ? store.notices.map((n) => `<div class="row ${n.read ? "done" : ""}"><span class="tag ${n.read ? "" : "blue"}">${esc(n.source)}</span><div class="grow"><div class="title">${esc(n.title)}</div><div class="meta"><span>${esc(n.time)}</span><span>${esc(n.body)}</span></div></div><button class="link-btn" data-act="notice-read" data-id="${n.id}">${n.read ? "已读" : "标已读"}</button></div>`).join("") : `<div class="empty"><b>没有通知</b></div>`;
  const add = has("notice") ? `<div class="panel" style="margin-bottom:16px"><div class="panel-head"><h3>发布通知（${esc(curRole().name)}）</h3></div><div class="panel-body"><div class="addrow"><input class="no_title grow" placeholder="通知标题"><input class="no_body grow" placeholder="正文摘要"><button class="btn primary sm" data-act="notice-add">${ico("plus", "sm")}发布</button></div></div></div>` : "";
  return `<div class="section">${add}<div class="panel"><div class="panel-head"><h3>通知</h3><span class="sub">${store.notices.filter((n) => !n.read).length} 条未读</span></div><div class="panel-body">${rows}</div></div></div>`;
}

/* ---------------- view: events ---------------- */
function viewEvents() {
  const list = store.events.slice().sort((a, b) => a.start.localeCompare(b.start));
  const kindName = { exam: "考试", activity: "活动", deadline: "截止", course: "课程" };
  const rows = list.map((e) => `<div class="row"><span class="tag ${e.kind === "exam" || e.kind === "deadline" ? "red" : "blue"}">${kindName[e.kind] || "活动"}</span><div class="grow"><div class="title">${esc(e.name)}</div><div class="meta"><span>${esc(e.start)}</span><span>${esc(e.place)}</span></div></div><span class="tag">${esc(relDue(e.start.slice(0, 10)))}</span></div>`).join("");
  return `<div class="section"><div class="panel"><div class="panel-head"><h3>日程与活动</h3></div><div class="panel-body">
    <div class="addrow"><input class="ev_name grow" placeholder="活动名"><input class="ev_start" type="datetime-local"><input class="ev_place" placeholder="地点" style="width:120px">
      <select class="ev_kind"><option value="activity">活动</option><option value="exam">考试</option><option value="deadline">截止</option><option value="course">课程</option></select>
      <button class="btn primary sm" data-act="ev-add">${ico("plus", "sm")}</button></div>
    ${rows || '<div class="empty"><b>暂无活动</b></div>'}
  </div></div></div>`;
}

/* ---------------- view: focus ---------------- */
const FT = { running: false, endAt: 0, remain: 0, phase: "focus", rounds: 0, method: "pomodoro", tick: null };
function viewFocus() {
  const p = store.focusPresets.find((x) => x.key === (store.prefs.focusMethod || "pomodoro")) || store.focusPresets[0];
  const total = p.focus * 60;
  const rem = FT.running ? Math.max(0, Math.round((FT.endAt - Date.now()) / 1000)) : (FT.remain || total);
  const mm = Math.floor(rem / 60), ss = rem % 60;
  const presets = store.focusPresets.map((x) => `<button class="chip" data-act="focus-preset" data-id="${x.key}" aria-pressed="${store.prefs.focusMethod === x.key}">${esc(x.name)} · ${x.focus}min</button>`).join("");
  const music = store.prefs.musicOn
    ? `<iframe style="border:0;width:100%;height:86px;border-radius:8px" src="https://music.163.com/outchain/player?type=0&id=${encodeURIComponent(store.prefs.playlistId)}&auto=0&height=66" onerror="this.style.display='none';document.getElementById('music-fb').style.display='block'"></iframe><div id="music-fb" style="display:none;font-size:12px"><a href="https://music.163.com/playlist?id=${encodeURIComponent(store.prefs.playlistId)}" target="_blank">音乐加载失败，在网易云打开</a></div>`
    : `<div class="muted" style="font-size:12.5px">音乐已关闭</div>`;
  return `<div class="focus-wrap">
    <div class="focus-clock">
      <div class="phase">${FT.phase === "focus" ? "专 注" : "休 息"}</div>
      <div class="time" id="focus-time">${pad(mm)}:${pad(ss)}</div>
      <div class="rounds">已完成 ${FT.rounds} 轮 · ${esc(p.name)}</div>
      <div class="presets">${presets}</div>
      <div class="focus-ctrl">
        <button class="btn primary" data-act="focus-toggle">${FT.running ? ico("pause"):ico("play")} ${FT.running ? "暂停" : "开始"}</button>
        <button class="btn" data-act="focus-reset">${ico("reset")}复位</button>
      </div>
    </div>
    <div>
      <div class="panel" style="margin-bottom:16px"><div class="panel-head"><h3>专注音乐</h3><div class="spacer"></div><button class="chip" data-act="music-toggle" aria-pressed="${store.prefs.musicOn}">${store.prefs.musicOn ? "开" : "关"}</button></div><div class="panel-body">${music}</div></div>
      <div class="panel"><div class="panel-head"><h3>今日专注记录</h3></div><div class="panel-body">${store.focusSessions.filter((s) => s.date === todayStr()).length ? store.focusSessions.filter((s) => s.date === todayStr()).map((s) => `<div class="row"><span class="tag green">${esc(s.method)}</span><span class="muted">${esc(s.minutes)} 分钟</span></div>`).join("") : '<div class="empty"><b>还没有记录</b>开始第一个番茄吧。</div>'}</div></div>
    </div>
  </div>`;
}
function focusTick() {
  const el = $("#focus-time"); if (!el) return;
  const rem = Math.max(0, Math.round((FT.endAt - Date.now()) / 1000));
  el.textContent = `${pad(Math.floor(rem / 60))}:${pad(rem % 60)}`;
  if (rem <= 0) { focusDone(); }
}
function focusDone() {
  clearInterval(FT.tick); FT.running = false; FT.rounds++; FT.remain = 0;
  const p = store.focusPresets.find((x) => x.key === store.prefs.focusMethod) || store.focusPresets[0];
  store.focusSessions.push({ date: todayStr(), method: p.name, minutes: p.focus });
  commit("专注完成一轮", (st) => { st.focusSessions = store.focusSessions; }, false);
  render();
}

/* ---------------- view: settings ---------------- */
function viewSettings() {
  return `
  <div class="set-block"><h3>账号</h3><div class="bd">
    <div>当前账号：<b>${esc(DEMO_ACCOUNT.email)}</b>（演示账号）</div>
    <div class="muted" style="font-size:12px">数据保存在本浏览器（localStorage）。换设备/多人共享时用下方"导出/导入"迁移。</div>
    <div><button class="btn sm" onclick="__doLogout()">退出登录</button></div>
  </div></div>
  <div class="set-block"><h3>AI 设置（BYOK）</h3><div class="bd">
    <label>API Key（只存本机浏览器，不会上传）</label>
    <input id="st-aikey" placeholder="sk-..." value="${esc(store.prefs.aiKey)}">
    <label>模型</label><input id="st-model" value="${esc(store.prefs.aiModel)}">
    <div class="muted" style="font-size:12px">不填 key 时，"AI 整理"走内置规则引擎，照样能用。</div>
    <div><button class="btn sm primary" data-act="save-ai">保存</button></div>
  </div></div>
  <div class="set-block"><h3>外观</h3><div class="bd">
    <label>主题</label>
    <div class="filters"><button class="chip" data-act="theme" data-id="light" aria-pressed="${store.prefs.theme === "light"}">浅色</button><button class="chip" data-act="theme" data-id="dark" aria-pressed="${store.prefs.theme === "dark"}">深色</button></div>
  </div></div>
  <div class="set-block"><h3>数据</h3><div class="bd">
    <div class="filters"><button class="btn sm" data-act="export">导出 JSON</button><button class="btn sm" data-act="import">导入 JSON</button><button class="btn sm danger" data-act="reset">重置演示数据</button></div>
    <div class="muted" style="font-size:12px">重置会恢复到初始的演示数据。</div>
  </div></div>
  <div class="set-block"><h3>我的角色</h3><div class="bd">${store.memberships.map((m) => `<div class="row"><div class="grow"><div class="title">${esc(m.name)} · ${esc(m.org)}</div><div class="meta">${m.capabilities.map((c) => `<span class="tag">${c}</span>`).join("")}</div></div></div>`).join("")}</div></div>`;
}

/* ---------------- event binding ---------------- */
function bindView() {
  if (S.view === "today") { setTimeout(positionNowline, 30); const i = $("#tq-title"); if (i) i.onkeydown = (e) => { if (e.key === "Enter") addTodo(); }; }
  if (S.view === "homework") $$(".hw-state").forEach((s) => (s.onchange = (e) => commit("已更新状态", (st) => { const h = st.homework.find((x) => x.id === e.target.dataset.id); if (h) h.state = e.target.value; })));
  if (S.view === "notices") { /* handled by delegation */ }
}
function addTodo() {
  const i = $("#tq-title"); const v = i && i.value.trim(); if (!v) return;
  commit("已添加待办", (st) => st.todos.push({ id: uid(), date: todayStr(), time: "", title: v, cat: "学习", done: false, important: false }));
}
window.addEventListener("DOMContentLoaded", boot);
function boot() {
  if (!isAuthed()) return; // login overlay visible
  $("#login").style.display = "none";
  applyTheme(store.prefs.theme);
  if (!store.memberships[S.roleIdx]) S.roleIdx = 0;
  render();
  document.addEventListener("click", onClick);
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openCmd(); }
    if (e.key === "Escape") closeCmd();
  });
  setInterval(() => { if (S.view === "today") positionNowline(); }, 30000);
}
function applyTheme(t) { document.documentElement.dataset.theme = t === "dark" ? "dark" : "light"; }
function onClick(e) {
  const t = e.target.closest("[data-act]"); if (!t) return;
  const act = t.dataset.act; const id = t.dataset.id;
  if (act === "open-cmd") { openCmd(); return; }
  if (act === "theme-toggle") { store.prefs.theme = store.prefs.theme === "dark" ? "light" : "dark"; save(); applyTheme(store.prefs.theme); render(); return; }
  if (act === "view") { setView(id); return; }
  if (act === "todo-toggle") { commit("已更新", (st) => { const x = st.todos.find((t2) => t2.id === id); if (x) x.done = !x.done; }); return; }
  if (act === "todo-add") { addTodo(); return; }
  if (act === "ai-parse") { window.__aiParse(); return; }
  if (act === "ai-adopt") { const c = (S._aiCands || [])[+t.dataset.idx]; if (c) commit("已采纳为待办", (st) => st.todos.push({ id: uid(), date: c.due || todayStr(), time: c.time || "", title: c.title, cat: "学习", done: false, important: false })); return; }
  if (act === "hw-filter") { S.hwFilter = id; render(); return; }
  if (act === "hw-add") {
    const course = $(".hw_course").value.trim(), title = $(".hw_title").value.trim(), due = $(".hw_due").value;
    if (!title) { toast("填标题"); return; }
    commit("已添加作业", (st) => st.homework.push({ id: uid(), course: course || "未分类", title, due: due || (todayStr() + "T23:59"), state: "未提交", note: "" }));
    return;
  }
  if (act === "hw-del") { commit("已删除作业", (st) => { st.homework = st.homework.filter((h) => h.id !== id); }); return; }
  if (act === "sc-add") {
    const name = $(".sc_name").value.trim(); if (!name) { toast("填课程名"); return; }
    commit("已添加课程", (st) => st.courses.push({ day: +$(".sc_day").value, s: +$(".sc_s").value, e: Math.max(+$(".sc_s").value, +$(".sc_e").value), name, room: $(".sc_room").value.trim() || "待定", weeks: "3-16" }));
    return;
  }
  if (act === "affair-tab") { S.affairTab = id; render(); return; }
  if (act === "collect-add") { const title = $(".co_title").value.trim(); if (!title) { toast("填任务名"); return; } commit("已发起收集", (st) => st.collections.push({ id: uid(), title, role: curRole().role || "monitor", due: todayStr(), fields: ["姓名"], total: +($(".co_total").value || 0) || 50, got: 0 })); return; }
  if (act === "collect-remind") { const c = store.collections.find((x) => x.id === id); toast("催办模板已生成：" + (c ? c.title : "") + " 还差 " + (c ? c.total - c.got : 0) + " 人，请尽快提交"); return; }
  if (act === "approve-ok") { commit("已通过审批", (st) => { const a = st.approvals.find((x) => x.id === id); if (a) a.state = "已通过"; }); return; }
  if (act === "notice-read") { commit("已标记", (st) => { const n = st.notices.find((x) => x.id === id); if (n) n.read = !n.read; }); return; }
  if (act === "notice-add") { const title = $(".no_title").value.trim(); if (!title) { toast("填标题"); return; } commit("已发布通知", (st) => st.notices.unshift({ id: uid(), title, source: curRole().name, body: $(".no_body").value.trim(), time: "刚刚", read: false })); return; }
  if (act === "ev-add") { const name = $(".ev_name").value.trim(); if (!name) { toast("填活动名"); return; } commit("已添加活动", (st) => st.events.push({ id: uid(), name, start: $(".ev_start").value || (todayStr() + "T19:00"), place: $(".ev_place").value.trim() || "待定", kind: $(".ev_kind").value })); return; }
  if (act === "focus-preset") { store.prefs.focusMethod = id; save(); FT.running = false; FT.remain = 0; clearInterval(FT.tick); render(); return; }
  if (act === "focus-toggle") {
    if (FT.running) { clearInterval(FT.tick); FT.remain = Math.max(0, Math.round((FT.endAt - Date.now()) / 1000)); FT.running = false; render(); return; }
    const p = store.focusPresets.find((x) => x.key === store.prefs.focusMethod) || store.focusPresets[0];
    const base = FT.remain > 0 ? FT.remain : (FT.phase === "focus" ? p.focus * 60 : p.short * 60);
    FT.endAt = Date.now() + base * 1000; FT.running = true;
    clearInterval(FT.tick); FT.tick = setInterval(focusTick, 250); render(); return;
  }
  if (act === "focus-reset") { clearInterval(FT.tick); FT.running = false; FT.remain = 0; FT.phase = "focus"; render(); return; }
  if (act === "music-toggle") { store.prefs.musicOn = !store.prefs.musicOn; save(); render(); return; }
  if (act === "save-ai") { store.prefs.aiKey = $("#st-aikey").value; store.prefs.aiModel = $("#st-model").value; save(); toast("已保存"); return; }
  if (act === "theme") { store.prefs.theme = id; save(); applyTheme(id); render(); return; }
  if (act === "export") { const blob = new Blob([JSON.stringify(store, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "scut-workbench-data.json"; a.click(); return; }
  if (act === "import") { const inp = document.createElement("input"); inp.type = "file"; inp.accept = ".json"; inp.onchange = () => { const f = inp.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { try { store = migrate(JSON.parse(r.result)); save(); render(); toast("已导入"); } catch (e) { toast("导入失败：文件格式不对"); } }; r.readAsText(f); }; inp.click(); return; }
  if (act === "reset") { if (confirm("重置为初始演示数据？当前改动会丢失。")) { store = defaultStore(); save(); S.roleIdx = 0; render(); toast("已重置"); } return; }
}

/* ---------------- command palette ---------------- */
function openCmd() { $("#cmd").classList.add("show"); $("#cmd input").value = ""; renderCmd(""); $("#cmd input").focus(); }
function closeCmd() { $("#cmd").classList.remove("show"); }
function cmdItems() {
  const v = VIEWS.filter((x) => visibleViews().some((y) => y.id === x.id)).map((x) => ({ label: "前往：" + x.name, act: () => setView(x.id) }));
  const todos = store.todos.filter((t) => !t.done).slice(0, 6).map((t) => ({ label: "待办：" + t.title, act: () => setView("today") }));
  return v.concat(todos);
}
function renderCmd(q) {
  const all = cmdItems().filter((x) => x.label.includes(q));
  S.cmdItems = all;
  $("#cmd .list").innerHTML = all.map((x, i) => `<div class="item ${i === 0 ? "sel" : ""}" data-i="${i}">${esc(x.label)}</div>`).join("") || `<div class="item">没有匹配</div>`;
  $$("#cmd .item[data-i]").forEach((el) => (el.onclick = () => { all[+el.dataset.i].act(); closeCmd(); }));
}
document.addEventListener("input", (e) => { if (e.target.matches("#cmd input")) renderCmd(e.target.value); });
