/* SCUT 工作台 · 在线版（Supabase 真读写）
   数据层：supabase-js 直连，RLS 兜底；首次登录自动灌演示种子。
   设计：深靛 shell + 冷白地面 + 单一强调色，等边距、等半径、微交互；无装饰 emoji。
*/
import { DEMO, DEMO_ACCOUNT } from "./demo-seed.js";

/* ---------- Supabase ---------- */
let createClient;
try { ({ createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm")); }
catch (e) { ({ createClient } = await import("https://esm.sh/@supabase/supabase-js@2")); }
const SUPABASE_URL = "https://nglgymxsnnlaqxvmvrxo.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5nbGd5bXhzbm5sYXF4dm12cnhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM2MTAwNzYsImV4cCI6MjEwOTE4NjA3Nn0.qdFqI4WCp6kJcLQMqTwpAIdXOuxHOxTe_vHezyX8_6g";
const db = createClient(SUPABASE_URL, SUPABASE_ANON, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } });

/* ---------- utils ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const dedupe = (a, k) => { const s = new Set(); return a.filter((x) => { const v = x[k]; if (s.has(v)) return false; s.add(v); return true; }); };
const pad = (n) => String(n).padStart(2, "0");
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => ymd(new Date());
const toMin = (s) => { const m = String(s || "").match(/(\d{1,2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : null; };
function dayDiff(iso) { if (!iso) return NaN; const t = new Date(todayStr() + "T00:00:00"); const d = new Date(String(iso).slice(0, 10) + "T00:00:00"); return Math.round((d - t) / 86400000); }
function weekNo(termStart) { const s = new Date(termStart + "T00:00:00"); const t = new Date(todayStr() + "T00:00:00"); return Math.max(1, Math.floor((t - s) / 604800000) + 1); }
function wdOf(iso) { const g = new Date(iso + "T00:00:00").getDay(); return g === 0 ? 7 : g; }
function selDate() { const d = new Date(todayStr() + "T00:00:00"); d.setDate(d.getDate() + (S.dayOffset || 0)); return ymd(d); }
function ddv(id) { const el = document.querySelector('[data-dd="' + id + '"]'); return el ? el.dataset.value : ""; }
function dd(id, opts, val, cls = "") {
  const cur = opts.find((o) => String(o[0]) === String(val)) || opts[0] || ["", ""];
  return `<div class="dd-wrap ${cls}" data-dd="${id}" data-value="${esc(cur[0])}"><button type="button" class="dd-trigger"><span class="dd-val">${esc(cur[1])}</span><span class="chev">${ico("chevron", "xs")}</span></button><div class="dd-menu">${opts.map((o) => `<div class="dd-opt" data-v="${esc(o[0])}" aria-selected="${String(o[0]) === String(cur[0])}"><span>${esc(o[1])}</span><span class="chk">${ico("check", "xs")}</span></div>`).join("")}</div></div>`;
}
function handleDD(id, val) {
  if (id === "roleSel") { S.roleIdx = +val; if (!visibleViews().some((v) => v.id === S.view)) S.view = "today"; render(); return; }
  if (id.indexOf("hwstate-") === 0) { const hid = id.slice(8); const h = DB.homework.find((x) => x.id === hid); if (h) mutate("已更新状态", () => db.from("homework").update({ state: val }).eq("id", hid), () => db.from("homework").update({ state: h.state }).eq("id", hid)); return; }
}
function relDue(iso) { const d = dayDiff(iso); if (!isFinite(d)) return ""; if (d < 0) return `已逾期 ${-d} 天`; if (d === 0) return "今天"; if (d === 1) return "明天"; return `${d} 天后`; }
const fmtHM = (iso) => { if (!iso) return ""; const m = String(iso).match(/T(\d{2}):(\d{2})/) || String(iso).match(/(\d{1,2}):(\d{2})/); return m ? `${pad(m[1])}:${m[2]}` : ""; };
const fmtMD = (iso) => { if (!iso) return ""; const m = String(iso).slice(0, 10).match(/\d{4}-(\d{2})-(\d{2})/); return m ? `${m[1]}/${m[2]}` : ""; };
const weekdayName = ["", "周一", "周二", "周三", "周四", "周五", "周六", "周日"];
function todayWeekday() { const g = new Date().getDay(); return g === 0 ? 7 : g; }

/* ---------- icons (single stroke system) ---------- */
/* 自定义图标系统（母题：地平线 + 现在点；圆角 1.8 线性，几何统一） */
const IC = {
  today: '<rect x="3.5" y="4.5" width="17" height="16" rx="4"/><path d="M8 3v3.5M16 3v3.5M3.5 9.5h17"/><circle cx="12" cy="14.4" r="1.7" fill="currentColor" stroke="none"/>',
  homework: '<path d="M6 3.5h8.5A2.5 2.5 0 0 1 17 6v14.5H6z"/><path d="M6 3.5A2 2 0 0 0 4 5.5v13A2 2 0 0 1 6 16.5"/><path d="M9 8.5h4.5M9 12h4.5"/>',
  grid: '<rect x="3.5" y="4" width="17" height="16" rx="3.5"/><path d="M3.5 9.3h17M9.3 9.3V20M14.7 9.3V20"/>',
  users: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19.5c0-2.8 2.4-4.6 5.5-4.6s5.5 1.8 5.5 4.6"/><path d="M16 6.2a3 3 0 0 1 0 5.6"/><path d="M20.5 19.5c0-2.2-1.3-3.6-3.6-4.1"/>',
  bell: '<path d="M6 9a6 6 0 0 1 12 0c0 5 1.6 6 1.6 6H4.4S6 14 6 9z"/><path d="M9.8 20a2.2 2.2 0 0 0 4.4 0"/><circle cx="17.5" cy="4" r="1.6" fill="currentColor" stroke="none"/>',
  calendar: '<rect x="3.5" y="4.5" width="17" height="16" rx="3.5"/><path d="M3.5 9.5h17M8 3v3.5M16 3v3.5"/><circle cx="12" cy="14.5" r="1.5" fill="currentColor" stroke="none"/>',
  timer: '<circle cx="12" cy="13" r="7.5"/><path d="M12 9.5v3.7l2.2 1.6M9.5 2.5h5"/><circle cx="12" cy="13" r="1.1" fill="currentColor" stroke="none"/>',
  settings: '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8l1.4 2.1 2.5-.4.6 2.4 2.2 1.2-1 2.3 1 2.3-2.2 1.2-.6 2.4-2.5-.4L12 21.2l-1.4-2.1-2.5.4-.6-2.4L5.3 15.9l1-2.3-1-2.3 2.2-1.2.6-2.4 2.5.4z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', check: '<path d="M5 12.5l4.5 4.5L19 6.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>',
  moon: '<path d="M20 14.5A8.2 8.2 0 1 1 9.5 4a6.4 6.4 0 0 0 10.5 10.5z"/>',
  user: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20c0-3.3 3.1-5.2 7-5.2s7 1.9 7 5.2"/>',
  switch: '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
  command: '<rect x="4" y="4" width="6" height="6" rx="2"/><rect x="14" y="4" width="6" height="6" rx="2"/><rect x="4" y="14" width="6" height="6" rx="2"/><rect x="14" y="14" width="6" height="6" rx="2"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/><path d="M10.5 11v5M13.5 11v5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  external: '<path d="M14 4h6v6M20 4l-8.5 8.5M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  play: '<path d="M7 4.5l13 7.5-13 7.5z" fill="currentColor" stroke="none"/>',
  pause: '<path d="M7.5 4.5v15M16.5 4.5v15" stroke-width="3.2"/>',
  reset: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4.5v4h4"/>',
  music: '<path d="M9 18V5.5l10-2V16"/><circle cx="6.2" cy="18" r="2.8"/><circle cx="16.2" cy="16" r="2.8"/>',
  pin: '<path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10z"/><circle cx="12" cy="11" r="2.1"/>',
  clock: '<circle cx="12" cy="12" r="8"/><path d="M12 7.5V12l3 1.8"/>',
  inbox: '<path d="M4 13l2.2-7.2A2 2 0 0 1 8.1 4.4h7.8a2 2 0 0 1 1.9 1.4L20 13"/><path d="M4 13v4.6A2.4 2.4 0 0 0 6.4 20h11.2A2.4 2.4 0 0 0 20 17.6V13"/><path d="M4 13h4l1.5 2.5h5L16 13h4"/>',
  chart: '<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7" y="11" width="3" height="6" rx="1"/><rect x="12.5" y="7" width="3" height="10" rx="1"/><rect x="18" y="13" width="3" height="4" rx="1"/>',
  flag: '<path d="M6 21V4"/><path d="M6 4.5h11l-2 3.5 2 3.5H6"/>',
  db: '<ellipse cx="12" cy="6" rx="7" ry="2.8"/><path d="M5 6v12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8V6"/><path d="M5 12c0 1.5 3.1 2.8 7 2.8s7-1.3 7-2.8"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" fill="currentColor" stroke="none"/>',
  dot: '<circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>'
};
const ico = (n, cls = "") => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${IC[n] || ""}</svg>`;

/* ---------- state ---------- */
let user = null;
const DB = { memberships: [], todos: [], homework: [], schedule: [], notices: [], events: [], collections: [], approvals: [], rosters: [], sessions: [], prefs: {} };
const S = { view: "today", roleIdx: 0, hwFilter: "undone", affairTab: null, ready: false, dayOffset: 0 };
const capCache = () => (DB.memberships[S.roleIdx] && DB.memberships[S.roleIdx].roles && DB.memberships[S.roleIdx].roles.capabilities) || ["own"];
const has = (c) => capCache().includes(c);
const curM = () => DB.memberships[S.roleIdx] || { title: "普通学生", org_id: null, roles: { name: "普通学生", capabilities: ["own"] }, orgs: { name: "" } };
const curOrg = () => curM().org_id;
function orgWithCap(cap) { const m = DB.memberships.find((x) => (x.roles?.capabilities || []).includes(cap)); return m ? m.org_id : curOrg(); }
function classOrg() { const m = DB.memberships.find((x) => (x.orgs?.name || "").includes("班")); return m ? m.org_id : curOrg(); }
function unionOrg() { const m = DB.memberships.find((x) => (x.orgs?.name || "").includes("学生会")); return m ? m.org_id : curOrg(); }

/* ---------- toast ---------- */
let toastTimer = null;
function toast(msg, actionLabel, action, kind = "") {
  const el = $("#toast"); if (!el) return;
  el.className = "show " + kind;
  el.innerHTML = `<span>${esc(msg)}</span>` + (actionLabel ? `<button id="toast-act">${esc(actionLabel)}</button>` : "");
  if (actionLabel) { $("#toast-act").onclick = () => { el.classList.remove("show"); action && action(); }; }
  clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 3600);
}

/* ---------- data ---------- */
async function loadAll() {
  const [mem, td, hw, sc, no, ev, co, ap, ro, fs, pf] = await Promise.all([
    db.from("memberships").select("id,org_id,role_id,title,status,roles(name,capabilities,key),orgs(name)").eq("status", "active"),
    db.from("todos").select("*").order("date", { nullsFirst: false }).order("time"),
    db.from("homework").select("*").order("due", { nullsFirst: false }),
    db.from("schedule").select("*"),
    db.from("notices").select("*").order("created_at", { ascending: false }),
    db.from("events").select("*").order("start_at", { nullsFirst: false }),
    db.from("collections").select("*").order("due", { nullsFirst: false }),
    db.from("approvals").select("*"),
    db.from("rosters").select("*"),
    db.from("focus_sessions").select("*").order("finished_at", { ascending: false }).limit(200),
    db.from("prefs").select("*").maybeSingle()
  ]);
  DB.memberships = mem.data || [];
  DB.todos = td.data || []; DB.homework = hw.data || []; DB.schedule = sc.data || [];
  DB.notices = dedupe((no.data || []).filter((n) => !(n.audience && n.audience.deleted)), "title");
  DB.events = ev.data || [];
  DB.collections = dedupe((co.data || []).filter((c) => c.status !== "deleted"), "title");
  DB.approvals = (ap.data || []).filter((a) => a.state !== "deleted");
  DB.rosters = ro.data || []; DB.sessions = fs.data || [];
  DB.prefs = pf.data || {};
  if (DB.memberships.length && S.roleIdx >= DB.memberships.length) S.roleIdx = 0;
}
async function refresh() { await loadAll(); render(); }

/* ---------- seed (once, when empty) ---------- */
async function seedIfEmpty() {
  if (DB.todos.length || DB.homework.length) return;
  const classId = classOrg(), unionId = unionOrg();
  const ins = async (table, rows) => { if (!rows.length) return; try { const { error } = await db.from(table).insert(rows); if (error) console.warn(table, error.message); } catch (e) { console.warn(table, e); } };
  const D = DEMO;
  await ins("todos", D.todos.map((t) => ({ user_id: user.id, scope: "personal", title: t.title, date: t.date, time: t.time || null, category: t.cat, important: !!t.important, done: !!t.done })));
  await ins("homework", D.homework.map((h) => ({ user_id: user.id, course: h.course, title: h.title, due: h.due.replace(" ", "T") + ":00", note: h.note || "", state: h.state })));
  await ins("schedule", D.courses.map((c) => ({ user_id: user.id, name: c.name, weekday: c.day, period_start: c.s, period_end: c.e, location: c.room, weeks: c.weeks, color: null })));
  if (classId) {
    await ins("notices", D.notices.map((n) => ({ org_id: classId, publisher: user.id, title: n.title, body: n.body, source: n.source, read: !!n.read })));
    await ins("collections", D.collections.map((c) => ({ org_id: classId, title: c.title, fields: c.fields, due: c.due, total: c.total, status: c.got >= c.total ? "done" : "open" })));
    await ins("approvals", D.approvals.map((a) => ({ org_id: classId, kind: a.kind, title: a.title, applicant: a.applicant, state: a.state })));
    await ins("rosters", [{ org_id: classId, name: "班级名单", members: D.roster.class }]);
  }
  if (unionId) {
    await ins("events", D.events.map((e) => ({ org_id: unionId, user_id: user.id, name: e.name, start_at: e.start.replace(" ", "T") + ":00", location: e.place, kind: e.kind })));
  }
  await ins("focus_sessions", [{ user_id: user.id, method: "番茄工作法", minutes: 25, rounds: 1 }]);
  try { await db.from("prefs").upsert({ user_id: user.id, focus_method: "pomodoro", music_on: false, playlist_id: "3098275264" }, { onConflict: "user_id" }); } catch (e) {}
  await loadAll();
}

/* ---------- auth ---------- */
async function initAuth() {
  const { data } = await db.auth.getSession();
  if (data.session && data.session.user) { user = data.session.user; await afterLogin(); }
  else showLogin();
}
function showLogin() { $("#login").style.display = "grid"; $("#app").style.visibility = "hidden"; }
window.__doLogin = async function () {
  const email = ($("#lg-email").value || "").trim(), pw = $("#lg-pw").value;
  const btn = $("#lg-btn"); const err = $("#lg-err"); err.textContent = "";
  btn.disabled = true; btn.innerHTML = '<span class="spin"></span>登录中…';
  const { data, error } = await db.auth.signInWithPassword({ email, password: pw });
  if (error) { btn.disabled = false; btn.textContent = "登录"; const m = /invalid login|invalid credentials/i.test(error.message || "") ? "账号或密码错误" : (error.message || "登录失败"); err.textContent = "登录失败：" + m; return; }
  user = data.user; await afterLogin();
};
window.__doLogout = async function () { await db.auth.signOut(); location.reload(); };
function skeletonHTML() { return `<div class="sk-wrap"><div class="sk-line w40"></div><div class="sk-block"></div><div class="sk-line w60"></div><div class="sk-block"></div></div>`; }
async function afterLogin() {
  $("#login").style.display = "none"; $("#app").style.visibility = "visible";
  $("#content").innerHTML = skeletonHTML();
  await loadAll();
  await seedIfEmpty();
  S.ready = true;
  const m0 = DB.memberships[0];
  const idn = $("#idName"), ids = $("#idSub");
  if (idn) idn.textContent = user.email || "演示用户";
  if (ids && m0) ids.textContent = (m0.orgs?.name || "") + " · " + (m0.roles?.name || "");
  render();
  bindGlobal();
}

/* ---------- nav/shell ---------- */
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
const visibleViews = () => VIEWS.filter((v) => !v.capAny || v.capAny.some(has));
function counts() {
  const t = todayStr();
  return {
    today: DB.todos.filter((x) => !x.done && (!x.date || x.date <= t)).length,
    homework: DB.homework.filter((h) => h.state !== "已提交").length,
    notices: DB.notices.filter((n) => !n.read).length
  };
}
function renderNav() {
  const c = counts(); const vs = visibleViews();
  $("#nav").innerHTML = '<div class="nav-label">工作台</div>' + vs.filter((v) => v.id !== "settings").map((v) =>
    `<button class="nav-item" data-act="view" data-id="${v.id}" aria-current="${S.view === v.id ? "page" : "false"}">${ico(v.icon)}<span>${v.name}</span>${c[v.id] ? `<span class="count num">${c[v.id]}</span>` : ""}</button>`
  ).join("") + '<div class="nav-label">系统</div>' +
    `<button class="nav-item" data-act="view" data-id="settings" aria-current="${S.view === "settings" ? "page" : "false"}">${ico("settings")}<span>设置</span></button>`;
  // mobile bar
  const mb = $("#mobilebar");
  if (mb) mb.innerHTML = ["today", "homework", "schedule", "affairs", "focus"].map((id) => { const v = VIEWS.find((x) => x.id === id); return v && visibleViews().some((y) => y.id === id) ? `<button data-act="view" data-id="${id}">${v.name}</button>` : ""; }).join("");
}
function renderTop() {
  const v = VIEWS.find((x) => x.id === S.view) || VIEWS[0];
  $("#crumb").innerHTML = `<h1>${v.name}</h1><span class="week">第 ${weekNo(DB.user?.termStart || DEMO.user.termStart)} 周 · ${esc(DB.identity?.campus || DEMO.user.campus)}</span>`;
  const memOpts = DB.memberships.map((m, i) => [String(i), (m.roles?.name || "角色") + " · " + (m.orgs?.name || "")]);
  $("#rolewrap").innerHTML = `<span class="rl">身份</span>` + dd("roleSel", memOpts.length ? memOpts : [["0", "普通学生"]], String(S.roleIdx), "dd-role");
}
function countUp(el) {
  const t = el.textContent.trim(); const m = t.match(/^(\d+)$/); if (!m) return;
  const to = +m[1]; if (!to || to > 9999) return;
  const start = performance.now(); const dur = 620;
  const step = (now) => { const p = Math.min(1, (now - start) / dur); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); else el.textContent = to; };
  requestAnimationFrame(step);
}
function animateEntrance() {
  if (matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const kids = [...document.querySelectorAll("#content > *")];
  kids.forEach((el, i) => { el.style.animation = "fadeUp .34s var(--ease) both"; el.style.animationDelay = Math.min(i * 40, 200) + "ms"; });
  const items = [...document.querySelectorAll("#content .row, #content .hw-card, #content .ov-i, #content .stat")];
  items.forEach((el, i) => { el.style.animation = "fadeUp .3s var(--ease) both"; el.style.animationDelay = Math.min(i * 26, 220) + "ms"; });
  document.querySelectorAll("#content .ov-i b, #content .stat .num").forEach(countUp);
}
function decorateIcons() {
  const map = [["时间轴", "clock"], ["日程", "clock"], ["待处理", "inbox"], ["收件", "inbox"], ["作业", "homework"], ["课表", "grid"], ["收集", "inbox"], ["审批", "check"], ["名单", "users"], ["统计", "chart"], ["通知", "bell"], ["活动", "calendar"], ["专注", "timer"], ["账号", "user"], ["AI", "spark"], ["外观", "sun"], ["数据", "db"], ["我的角色", "users"], ["本周课表", "grid"], ["添加课程", "grid"], ["发布通知", "bell"], ["专注音乐", "music"], ["今日专注记录", "timer"]];
  const pick = (t) => { for (const [k, v] of map) if (t.includes(k)) return v; return "dot"; };
  document.querySelectorAll("#content .panel-head h3, #content .section-head h2, #content .set-block h3").forEach((h) => { if (h.querySelector(".hd-ic")) return; const s = document.createElement("span"); s.className = "hd-ic"; s.innerHTML = ico(pick(h.textContent), "sm"); h.prepend(s); });
  document.querySelectorAll("#content .empty").forEach((el) => { if (el.querySelector(".em-ic")) return; const d = document.createElement("div"); d.className = "em-ic"; d.innerHTML = ico("inbox"); el.prepend(d); });
}
function render() {
  if (!S.ready) return;
  DB.identity = DB.identity || { campus: DEMO.user.campus, termStart: DEMO.user.termStart };
  renderNav(); renderTop();
  const fn = ({ today: vToday, homework: vHomework, schedule: vSchedule, affairs: vAffairs, notices: vNotices, events: vEvents, focus: vFocus, settings: vSettings })[S.view] || vToday;
  const changed = S._lastView !== S.view;
  $("#content").innerHTML = fn();
  bindView();
  decorateIcons();
  if (changed) animateEntrance();
  S._lastView = S.view;
}
function setView(id) { S.view = id; history.replaceState(null, "", "#" + id); render(); window.scrollTo({ top: 0 }); }

/* ---------- next-thing banner ---------- */
function nextThing() {
  const items = [];
  DB.todos.filter((t) => !t.done && t.date).forEach((t) => items.push({ at: `${t.date}T${t.time || "23:59"}`, title: t.title, kind: "待办" }));
  DB.homework.filter((h) => h.state !== "已提交" && h.due).forEach((h) => items.push({ at: h.due.replace(" ", "T").slice(0, 16), title: h.title, kind: "作业" }));
  items.sort((a, b) => a.at.localeCompare(b.at));
  const next = items.find((x) => new Date(x.at) >= new Date(Date.now() - 86400000)) || items[0];
  return next;
}

/* ---------- view: today ---------- */
function todayCourses() { const wd = todayWeekday(); return DB.schedule.filter((c) => c.weekday === wd); }
function flowItems() {
  const t = todayStr(); const items = [];
  DB.todos.filter((x) => !x.done && (!x.date || x.date <= t)).forEach((x) => items.push({ kind: "todo", id: x.id, title: x.title, date: x.date, time: x.time, cat: x.category, ref: x }));
  DB.homework.filter((h) => h.state !== "已提交" && h.due && dayDiff(h.due) <= 2).forEach((h) => items.push({ kind: "homework", id: h.id, title: h.title, sub: h.course, date: h.due.slice(0, 10), time: fmtHM(h.due), cat: "作业", ref: h }));
  return items.sort((a, b) => ((a.date || "") + (a.time || "")).localeCompare((b.date || "") + (b.time || "")));
}
function vToday() {
  const ds = selDate(); const cs = DB.schedule.filter((c) => c.weekday === wdOf(ds)); const now = new Date();
  let rows = "";
  DEMO.periods.forEach(([n, s], i) => {
    const block = cs.filter((c) => c.period_start <= n && c.period_end >= n)
      .map((c) => `<div class="course"><b>${esc(c.name)}</b>${c.location ? `<span class="room">${ico("pin", "xs")}${esc(c.location)}</span>` : ""}${c.period_end > c.period_start ? `<span class="room">第${c.period_start}-${c.period_end}节</span>` : ""}</div>`).join("");
    rows += `<div class="axis-row"><div class="axis-time num">${esc(s)}</div><div class="axis-slot">${block}</div></div>`;
  });
  const flow = flowItems(); const nt = nextThing();
  const flowHtml = flow.length ? flow.map((it) =>
    `<div class="row"><button class="check" data-act="todo-toggle" data-id="${it.kind === "todo" ? it.id : ""}" aria-pressed="false" aria-label="完成" ${it.kind === "homework" ? 'data-kind="hw" data-hwid="' + it.id + '"' : ""}>${ico("check", "sm")}</button>
      <div class="grow"><div class="title">${esc(it.title)}</div><div class="meta"><span class="tag ${dayDiff(it.date) < 0 ? "red" : dayDiff(it.date) <= 1 ? "amber" : ""}">${esc(relDue(it.date))}${it.time ? " · " + it.time : ""}</span>${it.sub ? `<span class="sub">${esc(it.sub)}</span>` : ""}${it.cat ? `<span class="tag">${esc(it.cat)}</span>` : ""}</div></div>
      <button class="link-btn" data-act="view" data-id="${it.kind === "homework" ? "homework" : "today"}">${it.kind === "homework" ? "去提交" : "查看"}</button>${it.kind === "todo" ? `<button class="link-btn del" data-act="todo-del" data-id="${it.id}" title="删除">${ico("trash", "sm")}</button>` : ""}</div>`).join("")
    : `<div class="empty"><b>今天没有临近截止</b>可以松一口气。</div>`;
  const banner = nt ? `<div class="nextband"><span class="nb-k">下一件事</span><span class="nb-t">${esc(nt.title)}</span><span class="nb-d">${esc(relDue(nt.at.slice(0, 10)))}${fmtHM(nt.at) ? " · " + fmtHM(nt.at) : ""}</span></div>` : "";
  const c = counts();
  const overview = `<div class="ov"><div class="ov-i"><b class="num">${c.today}</b><span>今日待办</span></div><div class="ov-i"><b class="num">${c.homework}</b><span>作业待交</span></div><div class="ov-i"><b class="num">${c.notices}</b><span>未读通知</span></div></div>`;
  return `${banner}${overview}
  <div class="today-grid">
    <div class="section">
      <div class="section-head"><h2>日程</h2><div class="daynav"><button class="dv" data-act="day-prev" aria-label="前一天">${ico("chevron", "xs")}</button><span class="dv-date">${new Date(ds + "T00:00:00").toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" })}</span><button class="dv next" data-act="day-next" aria-label="后一天">${ico("chevron", "xs")}</button><button class="dv-today" data-act="day-today">今天</button></div></div>
      ${cs.length
        ? `<div class="panel"><div class="panel-body"><div class="axis" id="axis">${rows}<div class="nowline" id="nowline"><span>现在 ${pad(now.getHours())}:${pad(now.getMinutes())}</span></div></div></div></div>`
        : `<div class="panel"><div class="panel-body"><div class="empty" style="padding:28px"><b>今天没有课</b>${["周日", "周六"].includes(weekdayName[todayWeekday()]) ? "周末，安心处理待办与复习。" : "空档的一天。"}</div></div></div>`}
    </div>
    <div class="section">
      <div class="section-head"><h2>待处理</h2><span class="sub">${flow.length} 项</span></div>
      <div class="panel"><div class="panel-body">
        <div class="addrow"><input class="grow" id="tq-title" placeholder="加一条待办，回车保存"><button class="btn sm" data-act="todo-add">${ico("plus", "sm")}</button></div>
        <div id="flow">${flowHtml}</div>
      </div></div>
    </div>
  </div>
  <div class="section">
    <div class="panel">
      <div class="panel-head"><h3>AI 整理信息</h3><span class="sub">粘贴一段群消息，自动拆成待办（不填 key 走内置规则）</span></div>
      <div class="panel-body">
        <div class="addrow"><input class="grow" id="ai-input" placeholder="例：线代习题四 2-5 下周三前交；周五班会汇总名单"><button class="btn primary sm" data-act="ai-parse">${ico("search", "sm")}解析</button></div>
        <div id="ai-out"></div>
      </div>
    </div>
  </div>`;
}
function positionNowline() {
  const el = $("#nowline"); if (!el) return;
  const now = new Date(); const mn = now.getHours() * 60 + now.getMinutes(); const ps = DEMO.periods;
  let idx = -1, frac = 0;
  for (let i = 0; i < ps.length; i++) { const a = toMin(ps[i][1]); const b = a + 45; if (mn >= a && mn <= b) { idx = i; frac = (mn - a) / 45; break; } }
  const rows = $$("#axis .axis-row"); if (!rows.length) return;
  const H = rows[0].offsetHeight || 42; let y;
  if (mn < toMin(ps[0][1]) || mn > toMin(ps[ps.length - 1][1]) + 45) { el.style.display = "none"; return; }
  el.style.display = ""; y = idx < 0 ? rows.length * H : idx * H + frac * H; el.style.top = y + "px";
}

/* ---------- rule engine + BYOK ---------- */
function parseRule(text) {
  const out = [];
  String(text).split(/[；;。\n]+/).map((s) => s.trim()).filter(Boolean).forEach((seg) => {
    let due = null; const now = new Date();
    if (/今天/.test(seg)) due = ymd(now);
    else if (/明天/.test(seg)) { const d = new Date(now); d.setDate(d.getDate() + 1); due = ymd(d); }
    else if (/后天/.test(seg)) { const d = new Date(now); d.setDate(d.getDate() + 2); due = ymd(d); }
    const wk = seg.match(/周([一二三四五六日天])/);
    if (!due && wk) { const map = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 }; const t = map[wk[1]]; const d = new Date(now); let add = (t - d.getDay() + 7) % 7; if (add === 0) add = 7; d.setDate(d.getDate() + add); due = ymd(d); }
    const md = seg.match(/(\d{1,2})\s*[\/月-]\s*(\d{1,2})/); if (!due && md) due = `${now.getFullYear()}-${pad(md[1])}-${pad(md[2])}`;
    const tm = seg.match(/(\d{1,2})[:：点](\d{2})?/); const time = tm ? `${pad(tm[1])}:${tm[2] || "00"}` : "";
    let title = seg.replace(/[，,。；;].*$/, "").trim(); if (title.length > 26) title = title.slice(0, 26);
    out.push({ title: title || seg.slice(0, 26), due: due || "", time, conf: due ? 0.86 : 0.55 });
  });
  return out;
}
async function aiParseByKey(text) {
  const key = DB.prefs?.ai_key || localStorage.getItem("scut.aikey") || "";
  if (!key) return null;
  const model = DB.prefs?.ai_model || "deepseek-chat";
  const sys = "你是校园事务信息抽取器。把用户文本拆成待办数组，只输出 JSON 数组，每项 {title,due(YYYY-MM-DD 或空),time(HH:mm 或空)}。不要编造日期。";
  try {
    const r = await fetch("https://api.deepseek.com/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key }, body: JSON.stringify({ model, temperature: 0.2, messages: [{ role: "system", content: sys }, { role: "user", content: text }] }) });
    if (!r.ok) return null;
    const j = await r.json(); const c = (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || "";
    const m = c.match(/\[[\s\S]*\]/); if (!m) return null; const arr = JSON.parse(m[0]);
    return Array.isArray(arr) ? arr.map((x) => ({ title: String(x.title || "").slice(0, 40), due: x.due || "", time: x.time || "", conf: 0.92 })) : null;
  } catch (e) { return null; }
}
window.__aiParse = async function () {
  const txt = ($("#ai-input").value || "").trim(); if (!txt) { toast("先粘一段文字"); return; }
  $("#ai-out").innerHTML = `<div class="muted" style="padding:8px 0">解析中…</div>`;
  let cands = null, byAi = false;
  cands = await aiParseByKey(txt); byAi = !!cands;
  if (!cands) cands = parseRule(txt);
  S._ai = cands;
  $("#ai-out").innerHTML = `<div class="ai-res"><div class="muted" style="font-size:12px;margin:6px 0">${cands.length} 条候选 · ${byAi ? "AI 模型" : "规则引擎（未配置 key 自动降级）"}</div>` +
    cands.map((c, i) => `<div class="row"><span class="tag ${c.conf > .8 ? "green" : "amber"} num">${Math.round(c.conf * 100)}%</span><div class="grow"><div class="title">${esc(c.title)}</div><div class="meta">${c.due ? "截止 " + esc(c.due) + (c.time ? " " + c.time : "") : "未识别截止"}</div></div><button class="btn sm primary" data-act="ai-adopt" data-idx="${i}">采纳</button></div>`).join("") + `</div>`;
};

/* ---------- view: homework ---------- */
function vHomework() {
  const list = DB.homework.filter((h) => S.hwFilter === "all" || h.state !== "已提交");
  const rows = list.length ? list.map((h) => `
    <div class="hw-card">
      <div class="top"><div style="flex:1;min-width:0">
        <span class="course">${esc(h.course || "未分类")}</span>
        <div class="h">${esc(h.title)}</div>
        <div class="foot">
          <span class="tag ${dayDiff(h.due) < 0 ? "red" : dayDiff(h.due) <= 1 ? "amber" : "blue"}">${esc(relDue(h.due))}${h.due ? " · " + fmtMD(h.due) + " " + fmtHM(h.due) : ""}</span>
          ${dd("hwstate-" + h.id, [["未提交", "未提交"], ["进行中", "进行中"], ["已提交", "已提交"]], h.state, "dd-sm")}
          ${h.note ? `<span class="sub">${esc(h.note)}</span>` : ""}
        </div>
      </div><button class="link-btn" data-act="hw-del" data-id="${h.id}" title="删除">${ico("trash", "sm")}</button></div>
    </div>`).join("") : `<div class="empty"><b>没有符合条件的作业</b>换个筛选看看。</div>`;
  return `<div class="section">
    <div class="filters" style="margin-bottom:14px">
      <button class="chip" data-act="hw-filter" data-id="undone" aria-pressed="${S.hwFilter === "undone"}">未完成</button>
      <button class="chip" data-act="hw-filter" data-id="all" aria-pressed="${S.hwFilter === "all"}">全部</button>
      <span class="spacer"></span>
    </div>
    <div class="panel"><div class="panel-head"><h3>课程作业</h3><span class="sub">${list.length} 条</span></div><div class="panel-body">
      <div class="addrow"><input class="hw_course" placeholder="课程" style="width:150px"><input class="hw_title grow" placeholder="作业标题"><input class="hw_due" type="datetime-local"><button class="btn primary sm" data-act="hw-add">${ico("plus", "sm")}添加</button></div>
      <div id="hw-list">${rows}</div>
    </div></div></div>`;
}

/* ---------- view: schedule ---------- */
function vSchedule() {
  const todayW = todayWeekday();
  let head = `<div class="hd corner"></div>` + [1, 2, 3, 4, 5, 6, 7].map((d) => `<div class="hd ${d === todayW ? "today" : ""}">${weekdayName[d]}</div>`).join("");
  let body = "";
  DEMO.periods.forEach(([n, s], i) => {
    body += `<div class="tm num">${esc(s)}<span>第${n}节</span></div>`;
    for (let d = 1; d <= 7; d++) {
      const startCs = DB.schedule.filter((c) => c.weekday === d && c.period_start === n);
      const contCs = DB.schedule.filter((c) => c.weekday === d && c.period_start < n && c.period_end >= n);
      const block = startCs.map((c) => `<div class="ev" data-act="sc-del" data-id="${c.id}" title="${esc(c.name)}${c.location ? " · " + esc(c.location) : ""}（点击删除）"><b>${esc(c.name)}</b>${c.location ? `<span>${esc(c.location)}</span>` : ""}${c.period_end > c.period_start ? `<em>第${c.period_start}-${c.period_end}节</em>` : ""}</div>`).join("");
      const cont = contCs.map((c) => `<div class="ev cont" data-act="sc-del" data-id="${c.id}" title="续 ${esc(c.name)}"></div>`).join("");
      body += `<div class="cell ${d === todayW ? "today" : ""}">${block}${cont}</div>`;
    }
  });
  return `<div class="section">
    <div class="panel"><div class="panel-head"><h3>本周课表</h3><span class="sub">第 ${weekNo(DEMO.user.termStart)} 周</span></div>
      <div class="panel-body" style="overflow-x:auto"><div class="week">${head}${body}</div></div>
    </div>
    <div class="panel" style="margin-top:16px"><div class="panel-head"><h3>添加课程</h3></div><div class="panel-body">
      <div class="addrow">
        <input class="sc_name grow" placeholder="课程名">
        ${dd("sc_day", weekdayName.slice(1).map((w, i) => [String(i + 1), w]), "1", "dd-sm")}
        ${dd("sc_s", DEMO.periods.map(([n]) => [String(n), "第" + n + "节"]), "1", "dd-sm")}
        ${dd("sc_e", DEMO.periods.map(([n]) => [String(n), "到第" + n + "节"]), "2", "dd-sm")}
        <input class="sc_room" placeholder="地点 如 A2-203" style="width:140px">
        <button class="btn primary sm" data-act="sc-add">${ico("plus", "sm")}</button>
      </div></div></div></div>`;
}

/* ---------- view: affairs ---------- */
function affairTabs() { const t = []; if (has("collect")) t.push(["collect", "收集"]); if (has("approve")) t.push(["approve", "审批"]); if (has("roster")) t.push(["roster", "名单"]); if (has("stats")) t.push(["stats", "统计"]); if (has("assign")) t.push(["assign", "任务"]); return t; }
function vAffairs() {
  const tabs = affairTabs(); const cur = S.affairTab && tabs.some((x) => x[0] === S.affairTab) ? S.affairTab : (tabs[0] || ["collect"])[0]; S.affairTab = cur;
  const tabHtml = tabs.map(([k, n]) => `<button class="chip" data-act="affair-tab" data-id="${k}" aria-pressed="${cur === k}">${n}</button>`).join("");
  let body = cur === "collect" ? tabCollect() : cur === "approve" ? tabApprove() : cur === "roster" ? tabRoster() : cur === "stats" ? tabStats() : tabAssign();
  return `<div class="section"><div class="section-head"><h2>${esc(curM().roles?.name || "")} · ${esc(curM().orgs?.name || "")}</h2><span class="sub">当前身份拥有的能力</span></div>
    <div class="filters" style="margin-bottom:14px">${tabHtml}</div>
    <div class="panel"><div class="panel-body">${body}</div></div></div>`;
}
function tabCollect() {
  const rows = DB.collections.length ? DB.collections.map((c) => { const pct = c.total ? Math.round((c.got || 0) / c.total * 100) : 0; return `<div class="row"><div class="grow"><div class="title">${esc(c.title)}</div><div class="meta"><span>截止 ${esc(c.due || "—")}</span><span>${esc((c.fields || []).join(" / "))}</span></div>
    <div class="progress-line" style="margin-top:6px"><b class="num">${c.got || 0}/${c.total}</b><div class="progress-track"><i style="width:${pct}%"></i></div>${(c.got || 0) >= c.total ? '<span class="tag green">已收齐</span>' : `<span class="tag red">还差 ${c.total - (c.got || 0)}</span>`}</div></div>
    <button class="link-btn" data-act="collect-remind" data-id="${c.id}">生成催办</button></div>`; }).join("") : `<div class="empty"><b>暂无收集任务</b></div>`;
  return `<div class="addrow"><input class="co_title grow" placeholder="收集任务名"><input class="co_total" type="number" placeholder="总人数" style="width:110px"><button class="btn primary sm" data-act="collect-add">${ico("plus", "sm")}发起收集</button></div><div>${rows}</div>`;
}
function tabApprove() {
  const rows = DB.approvals.length ? DB.approvals.map((a) => `<div class="row"><div class="grow"><div class="title">${esc(a.title)}</div><div class="meta"><span class="tag">${esc(a.kind)}</span><span>${esc(a.applicant)}</span></div></div>
    <span class="tag ${a.state === "已通过" ? "green" : "amber"}">${esc(a.state)}</span>${a.state !== "已通过" ? `<button class="link-btn" data-act="approve-ok" data-id="${a.id}">通过</button>` : ""}</div>`).join("") : `<div class="empty"><b>没有待审批</b></div>`;
  return rows;
}
function tabRoster() {
  const ros = DB.rosters; if (!ros.length) return `<div class="empty"><b>还没有名单</b></div>`;
  return ros.map((r) => `<div class="section"><div class="section-head"><h2 style="font-size:13px">${esc(r.name)} · ${(r.members || []).length} 人</h2></div><div class="chips">${(r.members || []).map((n) => `<span class="tag">${esc(n)}</span>`).join("")}</div></div>`).join("");
}
function tabStats() {
  const hw = DB.homework.length, hwDone = DB.homework.filter((h) => h.state === "已提交").length;
  const td = DB.todos.length, tdDone = DB.todos.filter((t) => t.done).length;
  const cg = DB.collections.reduce((s, c) => s + (c.got || 0), 0), ct = DB.collections.reduce((s, c) => s + (c.total || 0), 0);
  const cell = (n, l, ic) => `<div class="stat"><div class="st-ic">${ico(ic, "sm")}</div><div class="num">${n}</div><div class="stat-l">${l}</div></div>`;
  return `<div class="stats">${cell(hwDone + "/" + hw, "作业已交", "homework")}${cell(tdDone + "/" + td, "待办完成", "check")}${cell(cg + "/" + ct, "收集回执", "inbox")}${cell(DB.events.length, "活动总数", "calendar")}</div>`;
}
function tabAssign() {
  const rows = DB.todos.filter((t) => !t.done).map((t) => `<div class="row"><div class="grow"><div class="title">${esc(t.title)}</div><div class="meta"><span class="tag">${esc(t.category || "")}</span><span>${esc(t.date || "")}</span></div></div></div>`).join("");
  return `<div class="sub" style="margin-bottom:8px">派给部门成员的待办（演示）</div>${rows || '<div class="empty"><b>暂无</b></div>'}`;
}

/* ---------- view: notices ---------- */
function vNotices() {
  const rows = DB.notices.length ? DB.notices.map((n) => `<div class="row ${n.read ? "done" : ""}"><span class="tag ${n.read ? "" : "blue"}">${esc(n.source || "")}</span><div class="grow"><div class="title">${esc(n.title)}</div><div class="meta"><span>${esc((n.created_at || "").slice(5, 16).replace("T", " "))}</span><span>${esc(n.body || "")}</span></div></div><button class="link-btn" data-act="notice-read" data-id="${n.id}">${n.read ? "已读" : "标已读"}</button></div>`).join("") : `<div class="empty"><b>没有通知</b></div>`;
  const add = has("notice") ? `<div class="panel" style="margin-bottom:16px"><div class="panel-head"><h3>发布通知</h3><span class="sub">${esc(curM().roles?.name || "")}</span></div><div class="panel-body"><div class="addrow"><input class="no_title grow" placeholder="通知标题"><input class="no_body grow" placeholder="正文摘要"><button class="btn primary sm" data-act="notice-add">${ico("plus", "sm")}发布</button></div></div></div>` : "";
  return `<div class="section">${add}<div class="panel"><div class="panel-head"><h3>通知</h3><span class="sub">${DB.notices.filter((n) => !n.read).length} 条未读</span></div><div class="panel-body">${rows}</div></div></div>`;
}

/* ---------- view: events ---------- */
function vEvents() {
  const list = DB.events.slice().sort((a, b) => String(a.start_at).localeCompare(String(b.start_at)));
  const kn = { exam: "考试", activity: "活动", deadline: "截止", course: "课程" };
  const rows = list.map((e) => `<div class="row"><span class="tag ${e.kind === "exam" || e.kind === "deadline" ? "red" : "blue"}">${kn[e.kind] || "活动"}</span><div class="grow"><div class="title">${esc(e.name)}</div><div class="meta"><span>${esc((e.start_at || "").slice(5, 16).replace("T", " "))}</span><span>${esc(e.location || "")}</span></div></div><span class="tag">${esc(relDue(e.start_at))}</span><button class="link-btn del" data-act="event-del" data-id="${e.id}" title="删除">${ico("trash", "sm")}</button></div>`).join("");
  const canAdd = has("publish") || has("assign") || has("notice");
  const add = canAdd ? `<div class="addrow"><input class="ev_name grow" placeholder="活动名"><input class="ev_start" type="datetime-local"><input class="ev_place" placeholder="地点" style="width:130px">${dd("ev_kind", [["activity", "活动"], ["exam", "考试"], ["deadline", "截止"], ["course", "课程"]], "activity", "dd-sm")}<button class="btn primary sm" data-act="ev-add">${ico("plus", "sm")}</button></div>` : "";
  return `<div class="section"><div class="panel"><div class="panel-head"><h3>日程与活动</h3><span class="sub">${list.length} 项</span></div><div class="panel-body">${add}${rows || '<div class="empty"><b>暂无活动</b></div>'}</div></div></div>`;
}

/* ---------- view: focus ---------- */
const FT = { running: false, endAt: 0, remain: 0, rounds: 0, tick: null };
function focusPresets() { return [{ key: "pomodoro", name: "番茄工作法", focus: 25, short: 5 }, { key: "52_17", name: "52/17 法则", focus: 52, short: 17 }, { key: "90", name: "90 分钟法", focus: 90, short: 20 }]; }
function vFocus() {
  const ps = focusPresets(); const cur = ps.find((x) => x.key === (DB.prefs?.focus_method || "pomodoro")) || ps[0];
  const total = cur.focus * 60; const rem = FT.running ? Math.max(0, Math.round((FT.endAt - Date.now()) / 1000)) : (FT.remain || total);
  const mm = Math.floor(rem / 60), ss = rem % 60;
  const presetHtml = ps.map((x) => `<button class="chip" data-act="focus-preset" data-id="${x.key}" aria-pressed="${(DB.prefs?.focus_method || "pomodoro") === x.key}">${esc(x.name)} · ${x.focus}min</button>`).join("");
  const todays = DB.sessions.filter((s) => (s.finished_at || "").slice(0, 10) === todayStr());
  const recHtml = todays.length ? todays.map((s) => `<div class="row"><span class="tag green">${esc(s.method)}</span><span class="sub">${esc(s.minutes)} 分钟</span></div>`).join("") : '<div class="empty"><b>还没有记录</b>开始第一个番茄吧。</div>';
  const musicOn = !!DB.prefs?.music_on; const pl = DB.prefs?.playlist_id || "3098275264";
  const music = musicOn ? `<iframe style="border:0;width:100%;height:88px;border-radius:10px" src="https://music.163.com/outchain/player?type=0&id=${encodeURIComponent(pl)}&auto=0&height=66"></iframe>` : `<div class="sub">音乐已关闭</div>`;
  return `<div class="focus-wrap">
    <div class="focus-clock ${FT.running ? "running" : ""}"><div class="phase">专 注</div><div class="time num" id="focus-time">${pad(mm)}:${pad(ss)}</div><div class="rounds">已完成 ${FT.rounds} 轮 · ${esc(cur.name)}</div>
      <div class="presets">${presetHtml}</div>
      <div class="focus-ctrl"><button class="btn primary" data-act="focus-toggle">${FT.running ? ico("pause") : ico("play")} ${FT.running ? "暂停" : "开始"}</button><button class="btn" data-act="focus-reset">${ico("reset")}复位</button></div></div>
    <div>
      <div class="panel" style="margin-bottom:16px"><div class="panel-head"><h3>专注音乐</h3><div class="spacer"></div><button class="chip" data-act="music-toggle" aria-pressed="${musicOn}">${musicOn ? "开" : "关"}</button></div><div class="panel-body">${music}</div></div>
      <div class="panel"><div class="panel-head"><h3>今日专注记录</h3></div><div class="panel-body">${recHtml}</div></div>
    </div></div>`;
}
function focusTick() { const el = $("#focus-time"); if (!el) return; const rem = Math.max(0, Math.round((FT.endAt - Date.now()) / 1000)); el.textContent = `${pad(Math.floor(rem / 60))}:${pad(rem % 60)}`; if (rem <= 0) focusDone(); }
async function focusDone() {
  clearInterval(FT.tick); FT.running = false; FT.remain = 0; FT.rounds++;
  const cur = focusPresets().find((x) => x.key === (DB.prefs?.focus_method || "pomodoro")) || focusPresets()[0];
  try { await db.from("focus_sessions").insert({ user_id: user.id, method: cur.name, minutes: cur.focus, rounds: 1 }); } catch (e) {}
  await refresh(); toast("专注完成一轮", null, null, "ok");
}

/* ---------- view: settings ---------- */
function vSettings() {
  const aiKey = DB.prefs?.ai_key || localStorage.getItem("scut.aikey") || "";
  return `<div class="set-block"><h3>账号</h3><div class="bd"><div>当前账号：<b>${esc(user?.email || "")}</b></div><div class="sub">数据存于 Supabase 云端，多设备登录同一账号即同步。</div><div><button class="btn sm" onclick="__doLogout()">退出登录</button></div></div></div>
  <div class="set-block"><h3>AI 设置（BYOK）</h3><div class="bd"><label>API Key（只存本机浏览器）</label><input id="st-aikey" placeholder="sk-..." value="${esc(aiKey)}"><label>模型</label><input id="st-model" value="${esc(DB.prefs?.ai_model || "deepseek-chat")}"><div class="sub">不填 key 时「AI 整理」走内置规则引擎，照样能用。</div><div><button class="btn sm primary" data-act="save-ai">保存</button></div></div></div>
  <div class="set-block"><h3>外观</h3><div class="bd"><div class="filters"><button class="chip" data-act="theme" data-id="light" aria-pressed="${(localStorage.getItem("scut.theme") || "light") === "light"}">浅色</button><button class="chip" data-act="theme" data-id="dark" aria-pressed="${localStorage.getItem("scut.theme") === "dark"}">深色</button></div></div></div>
  <div class="set-block"><h3>数据</h3><div class="bd"><div class="filters"><button class="btn sm" data-act="export">导出 JSON</button><button class="btn sm danger" data-act="reset">重置本账号演示数据</button></div></div></div>
  <div class="set-block"><h3>我的角色</h3><div class="bd">${DB.memberships.map((m) => `<div class="row"><div class="grow"><div class="title">${esc(m.roles?.name || "")} · ${esc(m.orgs?.name || "")}</div><div class="meta">${(m.roles?.capabilities || []).map((c) => `<span class="tag">${c}</span>`).join("")}</div></div></div>`).join("")}</div></div>`;
}

/* ---------- mutations ---------- */
async function mutate(label, fn, undo) {
  try {
    const res = await fn();
    await refresh();
    if (undo) toast(label, "撤销", async () => { try { await undo(res); await refresh(); toast("已撤销", null, null, "ok"); } catch (e) { toast("撤销失败：" + (e.message || e), null, null, "err"); } }, "ok");
    else toast(label, null, null, "ok");
    return res;
  } catch (e) { toast("操作失败：" + (e.message || e), null, null, "err"); throw e; }
}
function bindView() {
  if (S.view === "today") { setTimeout(positionNowline, 30); const i = $("#tq-title"); if (i) i.onkeydown = (e) => { if (e.key === "Enter") addTodo(); }; }

  applyTheme(localStorage.getItem("scut.theme") || "light");
}
function addTodo() { const i = $("#tq-title"); const v = i && i.value.trim(); if (!v) return; mutate("已添加待办", async () => { const { data } = await db.from("todos").insert({ user_id: user.id, scope: "personal", title: v, date: todayStr(), category: "学习", done: false }).select().single(); return data; }, (row) => db.from("todos").delete().eq("id", row.id)); }
async function onClick(e) {
  const ddt = e.target.closest("[data-dd-trigger]");
  if (ddt) { const w = ddt.closest(".dd-wrap"); const open = w.classList.contains("open"); document.querySelectorAll(".dd-wrap.open").forEach((x) => x.classList.remove("open")); if (!open) w.classList.add("open"); return; }
  const ddo = e.target.closest(".dd-opt");
  if (ddo) { const w = ddo.closest(".dd-wrap"); w.dataset.value = ddo.dataset.v; w.querySelector(".dd-val").textContent = ddo.querySelector("span").textContent; w.querySelectorAll(".dd-opt").forEach((x) => x.setAttribute("aria-selected", x === ddo)); w.classList.remove("open"); handleDD(w.dataset.dd, ddo.dataset.v); return; }
  const t = e.target.closest("[data-act]"); if (!t) return; const act = t.dataset.act; const id = t.dataset.id;
  if (act === "open-cmd") { openCmd(); return; }
  if (act === "theme-toggle") { const nt = (localStorage.getItem("scut.theme") === "dark") ? "light" : "dark"; localStorage.setItem("scut.theme", nt); applyTheme(nt); render(); return; }
  if (act === "view") { setView(id); return; }
  if (act === "todo-toggle") { if (t.dataset.kind === "hw") { const h = DB.homework.find((x) => x.id === t.dataset.hwid); if (h) { mutate("作业标记已提交", () => db.from("homework").update({ state: "已提交" }).eq("id", h.id), () => db.from("homework").update({ state: h.state }).eq("id", h.id)); } return; } const todo = DB.todos.find((x) => x.id === id); if (!todo) return; mutate("已更新", () => db.from("todos").update({ done: !todo.done }).eq("id", id), () => db.from("todos").update({ done: todo.done }).eq("id", id)); return; }
  if (act === "todo-add") { addTodo(); return; }
  if (act === "todo-del") { const x = DB.todos.find((t2) => t2.id === id); if (!x) return; mutate("已删除待办", () => db.from("todos").delete().eq("id", id), () => db.from("todos").insert({ user_id: user.id, scope: x.scope || "personal", title: x.title, date: x.date, time: x.time, category: x.category, important: x.important, done: x.done })); return; }
  if (act === "sc-del") { const c = DB.schedule.find((s) => s.id === id); if (!c) return; mutate("已删除课程", () => db.from("schedule").delete().eq("id", id), () => db.from("schedule").insert({ user_id: user.id, name: c.name, weekday: c.weekday, period_start: c.period_start, period_end: c.period_end, location: c.location, weeks: c.weeks, color: c.color })); return; }
  if (act === "event-del") { const ev = DB.events.find((x) => x.id === id); if (!ev) return; mutate("已删除活动", () => db.from("events").delete().eq("id", id), () => db.from("events").insert({ org_id: ev.org_id, user_id: ev.user_id, name: ev.name, start_at: ev.start_at, location: ev.location, kind: ev.kind })); return; }
  if (act === "ai-parse") { window.__aiParse(); return; }
  if (act === "ai-adopt") { const c = (S._ai || [])[+t.dataset.idx]; if (c) mutate("已采纳为待办", async () => { const { data } = await db.from("todos").insert({ user_id: user.id, scope: "personal", title: c.title, date: c.due || todayStr(), time: c.time || null, category: "学习", done: false }).select().single(); return data; }, (row) => db.from("todos").delete().eq("id", row.id)); return; }
  if (act === "day-prev") { S.dayOffset = (S.dayOffset || 0) - 1; render(); return; }
  if (act === "day-next") { S.dayOffset = (S.dayOffset || 0) + 1; render(); return; }
  if (act === "day-today") { S.dayOffset = 0; render(); return; }
  if (act === "hw-filter") { S.hwFilter = id; render(); return; }
  if (act === "hw-add") { const course = $(".hw_course").value.trim(), title = $(".hw_title").value.trim(), due = $(".hw_due").value; if (!title) { toast("填标题"); return; } mutate("已添加作业", async () => { const { data } = await db.from("homework").insert({ user_id: user.id, course: course || "未分类", title, due: due ? due + ":00" : (todayStr() + "T23:59:00"), state: "未提交" }).select().single(); return data; }, (row) => db.from("homework").delete().eq("id", row.id)); return; }
  if (act === "hw-del") { const h = DB.homework.find((x) => x.id === id); if (!h) return; mutate("已删除作业", () => db.from("homework").delete().eq("id", id), () => db.from("homework").insert({ user_id: user.id, course: h.course, title: h.title, due: h.due, note: h.note, state: h.state })); return; }
  if (act === "sc-add") { const name = $(".sc_name").value.trim(); if (!name) { toast("填课程名"); return; } const s = +(ddv("sc_s") || 1), en = Math.max(s, +(ddv("sc_e") || s)), wd = +(ddv("sc_day") || 1); mutate("已添加课程", () => db.from("schedule").insert({ user_id: user.id, name, weekday: wd, period_start: s, period_end: en, location: $(".sc_room").value.trim() || "待定", weeks: "3-16" }), null); return; }
  if (act === "affair-tab") { S.affairTab = id; render(); return; }
  if (act === "collect-add") { const title = $(".co_title").value.trim(); if (!title) { toast("填任务名"); return; } const total = +($(".co_total").value || 0) || 50; mutate("已发起收集", () => db.from("collections").insert({ org_id: orgWithCap("collect"), title, fields: ["姓名"], due: todayStr(), total, status: "open" }), null); return; }
  if (act === "collect-remind") { const c = DB.collections.find((x) => x.id === id); toast("催办：" + (c ? c.title : "") + " 还差 " + (c ? (c.total - (c.got || 0)) : 0) + " 人，请尽快提交"); return; }
  if (act === "approve-ok") { const a = DB.approvals.find((x) => x.id === id); if (!a) return; mutate("已通过审批", () => db.from("approvals").update({ state: "已通过" }).eq("id", id), () => db.from("approvals").update({ state: a.state }).eq("id", id)); return; }
  if (act === "notice-read") { const n = DB.notices.find((x) => x.id === id); if (!n) return; mutate("已标记", () => db.from("notices").update({ read: !n.read }).eq("id", id), () => db.from("notices").update({ read: n.read }).eq("id", id)); return; }
  if (act === "notice-add") { const title = $(".no_title").value.trim(); if (!title) { toast("填标题"); return; } mutate("已发布通知", () => db.from("notices").insert({ org_id: orgWithCap("notice"), publisher: user.id, title, body: $(".no_body").value.trim(), source: curM().roles?.name || "班委", read: false }), null); return; }
  if (act === "ev-add") { const name = $(".ev_name").value.trim(); if (!name) { toast("填活动名"); return; } mutate("已添加活动", () => db.from("events").insert({ org_id: orgWithCap("assign") || orgWithCap("publish"), user_id: user.id, name, start_at: ($(".ev_start").value || (todayStr() + "T19:00")) + ":00", location: $(".ev_place").value.trim() || "待定", kind: ddv("ev_kind") || "activity" }), null); return; }
  if (act === "focus-preset") { persistPrefs({ focus_method: id }); DB.prefs = DB.prefs || {}; DB.prefs.focus_method = id; FT.running = false; FT.remain = 0; clearInterval(FT.tick); render(); return; }
  if (act === "focus-toggle") { if (FT.running) { clearInterval(FT.tick); FT.remain = Math.max(0, Math.round((FT.endAt - Date.now()) / 1000)); FT.running = false; render(); return; } const cur = focusPresets().find((x) => x.key === (DB.prefs?.focus_method || "pomodoro")) || focusPresets()[0]; const base = FT.remain > 0 ? FT.remain : cur.focus * 60; FT.endAt = Date.now() + base * 1000; FT.running = true; clearInterval(FT.tick); FT.tick = setInterval(focusTick, 250); render(); return; }
  if (act === "focus-reset") { clearInterval(FT.tick); FT.running = false; FT.remain = 0; render(); return; }
  if (act === "music-toggle") { const v = !(DB.prefs?.music_on); persistPrefs({ music_on: v }); DB.prefs = DB.prefs || {}; DB.prefs.music_on = v; render(); return; }
  if (act === "save-ai") { const k = $("#st-aikey").value.trim(); const m = $("#st-model").value.trim() || "deepseek-chat"; localStorage.setItem("scut.aikey", k); persistPrefs({ ai_model: m }); DB.prefs = DB.prefs || {}; DB.prefs.ai_model = m; toast("已保存", null, null, "ok"); return; }
  if (act === "theme") { localStorage.setItem("scut.theme", id); applyTheme(id); render(); return; }
  if (act === "export") { const blob = new Blob([JSON.stringify({ todos: DB.todos, homework: DB.homework, schedule: DB.schedule, notices: DB.notices, events: DB.events }, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "scut-workbench-data.json"; a.click(); return; }
  if (act === "reset") { if (confirm("重置本账号演示数据？会清空当前 todos/homework/schedule 等个人数据并重新灌入。")) { await resetData(); } return; }
}
async function persistPrefs(patch) {
  const allow = ["focus_method", "focus_min", "music_on", "playlist_id", "ai_model"];
  const p = {}; for (const k of allow) if (k in patch) p[k] = patch[k];
  if (!Object.keys(p).length) return;
  try { await db.from("prefs").upsert({ user_id: user.id, ...p }, { onConflict: "user_id" }); } catch (e) { console.warn(e); }
}
async function resetData() {
  try {
    await db.from("todos").delete().eq("user_id", user.id);
    await db.from("homework").delete().eq("user_id", user.id);
    await db.from("schedule").delete().eq("user_id", user.id);
    await db.from("focus_sessions").delete().eq("user_id", user.id);
    await loadAll(); await seedIfEmpty(); render(); toast("已重置", null, null, "ok");
  } catch (e) { toast("重置失败：" + (e.message || e), null, null, "err"); }
}

/* ---------- theme ---------- */
function applyTheme(t) { document.documentElement.dataset.theme = t === "dark" ? "dark" : "light"; }

/* ---------- command palette ---------- */
function openCmd() { $("#cmd").classList.add("show"); const i = $("#cmd input"); i.value = ""; renderCmd(""); i.focus(); }
function closeCmd() { $("#cmd").classList.remove("show"); }
function cmdItems() { return VIEWS.filter((v) => visibleViews().some((y) => y.id === v.id)).map((x) => ({ label: "前往 " + x.name, act: () => setView(x.id) })).concat(DB.todos.filter((t) => !t.done).slice(0, 6).map((t) => ({ label: "待办：" + t.title, act: () => setView("today") }))); }
function renderCmd(q) { const all = cmdItems().filter((x) => x.label.includes(q)); S._cmd = all; $("#cmd .list").innerHTML = all.map((x, i) => `<div class="item ${i === 0 ? "sel" : ""}" data-i="${i}">${esc(x.label)}</div>`).join("") || `<div class="item">没有匹配</div>`; $$("#cmd .item[data-i]").forEach((el) => (el.onclick = () => { all[+el.dataset.i].act(); closeCmd(); })); }

/* ---------- boot ---------- */
let bound = false;
function bindGlobal() {
  if (bound) return; bound = true;
  document.addEventListener("click", onClick);
  document.addEventListener("click", (e) => { if (!e.target.closest(".dd-wrap")) document.querySelectorAll(".dd-wrap.open").forEach((x) => x.classList.remove("open")); });
  document.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); openCmd(); } if (e.key === "Escape") closeCmd(); });
  document.addEventListener("input", (e) => { if (e.target.matches("#cmd input")) renderCmd(e.target.value); });
  setInterval(() => { if (S.view === "today") positionNowline(); }, 30000);
}
applyTheme(localStorage.getItem("scut.theme") || "light");
initAuth();
