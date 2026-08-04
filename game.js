/* ═════════════════════════════════════════════════════════════════
   THREE STARS — a playable real-time raid. Divy Singhvi's base.
   Vanilla canvas + Web Audio. No libraries. No external assets.
   You are the attacker: deploy the army, three-star the village,
   loot the engineer. The content lives inside the buildings.
   ═════════════════════════════════════════════════════════════════ */
(() => {
"use strict";

/* ───────────────────── utilities ───────────────────── */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp  = (a, b, t) => a + (b - a) * t;
const rand  = (a = 1, b) => b === undefined ? Math.random() * a : a + Math.random() * (b - a);
const rint  = (a, b) => Math.floor(rand(a, b));
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx*dx + dy*dy; };
const dist  = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const TAU = Math.PI * 2;
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const fmt = n => Math.round(n).toLocaleString("en-US");
const now = () => performance.now();

/* ───────────────────── config / constants ───────────────────── */
const GRID = 22;                 // village grid dimension
const MARGIN = 4;                // deployable grass margin around the village
const LO = -MARGIN, HI = GRID + MARGIN;
const TW = 64, TH = 32;          // tile diamond (full width / full height)
const TW2 = TW / 2, TH2 = TH / 2;
const BATTLE_TIME = 180;          // seconds
const LOOT_GOLD   = 18359231;     // Divy's real gold
const LOOT_ELIXIR = 17580218;     // Divy's real elixir

const PARAMS = new URLSearchParams(location.search);
const DEBUG  = PARAMS.has("debug");
const AUTO   = PARAMS.has("auto");
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ───────────────────── DOM refs ───────────────────── */
const canvas = $("#world");
const ctx = canvas.getContext("2d", { alpha: true });
const loader = $("#loader"), loaderBar = $("#loaderBar"), loaderTip = $("#loaderTip"), loaderPct = $("#loaderPct");
const hud = $("#hud");
const phaseLabel = $("#phaseLabel"), timerEl = $("#timer");
const goldEl = $("#goldCount"), elixirEl = $("#elixirCount"), damageEl = $("#damagePct"), gemEl = $("#gemCount");
const starEls = [$("#star1"), $("#star2"), $("#star3")];
const tray = $("#tray"), trayTroops = $("#trayTroops"), housingUsedEl = $("#housingUsed"), housingCapEl = $("#housingCap"), housingBar = $("#housingBar");
const endBtn = $("#endBtn");
const scoutEl = $("#scout");
const infoEl = $("#info"), infoScroll = $("#infoScroll"), infoClose = $("#infoClose");
const profileEl = $("#profile"), profileScroll = $("#profileScroll"), profileClose = $("#profileClose");
const resultEl = $("#result"), resultStars = $("#resultStars"), resultTitle = $("#resultTitle"), resultSub = $("#resultSub");
const rGold = $("#rGold"), rElixir = $("#rElixir"), rTrophies = $("#rTrophies"), rDamage = $("#rDamage"), resultHint = $("#resultHint");
const raidAgain = $("#raidAgain"), resultAlly = $("#resultAlly");
const warlogEl = $("#warlog"), warlogBody = $("#warlogBody"), warlogClose = $("#warlogClose");
const wlRaids = $("#wlRaids"), wlStars = $("#wlStars"), wlThree = $("#wlThree"), wlGems = $("#wlGems"), wlReset = $("#wlReset");
const allyEl = $("#alliance"), allyBtn = $("#allyBtn"), logBtn = $("#logBtn");
const soundBtn = $("#soundBtn"), soundIcon = $("#soundIcon");
const toastZone = $("#toastZone"), starToast = $("#starToast"), eggLayer = $("#eggLayer"), flashEl = $("#flash");
const deployCursor = $("#deployCursor");
const cinemBars = $("#cinemBars"), cinemCap = $("#cinemCap"), cinemSkip = $("#cinemSkip");

/* ───────────────────── content registry (the portfolio, inside the buildings) ───────────────────── */
const CONTENT = {
  th: {
    title: "Town Hall 15", role: "The builder himself.", lvl: "TH15",
    dates: "LVL 189 · ALMOST MAXED", stack: "GOLD 18,359,231 · ELIXIR 17,580,218",
    body: "B.Tech, Electronics & Communication — CTAE Udaipur, 2023–2027. Started contributing to Kubernetes before his third year. Went from intern to product engineer at a Swedish startup in one season.",
    list: [
      "🏆 <b>WorldQuant IQC</b> — 2nd Prize, #98 worldwide · $1,000",
      "🐙 <b>Pull Shark ×2</b> · Pair Extraordinaire",
      "⚙️ <b>56 repositories</b> and counting",
      "🏰 The real base: <b>TH15 · Level 189</b> — almost maxed",
    ],
    quote: "“Strong walls. Stronger Wi-Fi.”",
  },
  cannon: {
    title: "EF Polymer Ltd.", role: "Software Engineering Intern", lvl: "LVL 5",
    dates: "MAY 2024 — JUL 2025 · HYBRID", stack: "AGRITECH · $70M+ VALUATION",
    body: "An AgriTech company. Built a Sales & Warehouse Management System for agri supply chains.",
    list: [
      "Inventory tracking, analytics dashboards, movement back-tracing",
      "<b>−40%</b> manual entries across the warehouse workflow",
      "<b>−20%</b> mis-products in production",
    ],
  },
  archer: {
    title: "Euro Technologies", role: "Golang Developer Intern", lvl: "LVL 7",
    dates: "AUG 2025 — NOV 2025 · ON-SITE", stack: "GO · GIN · REDIS",
    body: "Architected a full IAM platform — identity, access, and the keys to every gate.",
    list: [
      "<b>OIDC / OAuth2</b> · WebAuthn · magic links · TOTP MFA",
      "SSO for Slack, GitHub and LinkedIn",
      "Self-healing session layer on Redis",
    ],
  },
  xbow: {
    title: "Kubernetes (CNCF)", role: "Contributor — Minikube", lvl: "LVL 8",
    dates: "MAR 2025 — PRESENT · OPEN SOURCE", stack: "GO · CONTAINERD · GH ACTIONS",
    body: "He doesn't just deploy Kubernetes. He patches it. Upstream commits on Minikube.",
    list: [
      "Fixed critical bugs: driver provisioning, binary generation, container networking",
      "Hardened GitHub Actions CI — image tests fail less, builds break less",
      "CNCF contributor — patches shipped to real clusters everywhere",
    ],
  },
  beacon: {
    title: "Gradr", role: "Product Engineer", lvl: "LVL 9",
    dates: "DEC 2025 — PRESENT · REMOTE (SWEDEN)", stack: "SVELTEKIT · SVELTE · PRISMA",
    body: "Intern to full-time in three months. Shipping the entire product surface and watching it in production.",
    list: [
      "Full-stack features in <b>SvelteKit, Svelte &amp; Prisma</b>",
      "Designed the observability stack: <b>Grafana · Loki · Promtail · Sentry</b>",
      "Secure, performant APIs powering core product workflows",
    ],
  },
  gold: {
    title: "Price Comparator", role: "Chrome Extension", lvl: "STORAGE",
    dates: "5,000+ ACTIVE USERS", stack: "FASTAPI · SVELTE · POSTGRESQL",
    body: "Real-time price comparison with scalable scraping, proxy rotation and intelligent caching. People loot better prices with it every day.",
    list: [
      "<b>5,000+ active users</b> running it in their browser",
      "Proxy rotation + intelligent cache, scraping at scale",
      "Backend in FastAPI, UI in Svelte, data in Postgres",
    ],
  },
  elixir: {
    title: "Self-Healing Infrastructure", role: "Microservices", lvl: "STORAGE",
    dates: "KNOCK IT DOWN · IT STANDS BACK UP", stack: "DOCKER · KUBERNETES · DJANGO · PROMETHEUS · GRAFANA",
    body: "A base that repairs itself — automatic recovery, monitoring and alerting for production workloads. Knock a service down; watch it stand back up.",
    list: [
      "Automatic recovery for failing production services",
      "<b>Prometheus</b> metrics + <b>Grafana</b> dashboards + alerting",
      "Dockerized Django services orchestrated on Kubernetes",
    ],
  },
  hut: {
    title: "Builder's Hut", role: "B.Tech, Electronics & Communication", lvl: "EDU",
    dates: "2023 — 2027 · CTAE UDAIPUR", stack: "ECE · CTAE (MPUAT)",
    body: "Where the chief learned to build. Electronics & Communication engineering at the College of Technology & Engineering, Udaipur.",
    list: [
      "Started contributing to Kubernetes before his third year",
      "Went from intern to product engineer in a single season",
      "The builder hammers faster every raid.",
    ],
  },
  cc: {
    title: "Clan Castle", role: "The clan that has his back", lvl: "LVL 6",
    dates: "FULLY LOADED · REINFORCEMENTS INCOMING", stack: "BARBARIANS · ARCHERS · A WIZARD",
    body: "Every chief needs a clan. The moment you cross the walls, the Castle wakes and pours out reinforcements to defend the base. The stack fights back — it doesn't just sit there getting looted.",
    list: [
      "Triggers when your troops enter its radius",
      "Drops <b>barbarians, archers and a wizard</b> to intercept the raid",
      "Destroy it first or eat the counter-attack",
    ],
    quote: "“No chief raids alone.”",
  },
};

/* ───────────────────── troop definitions (each troop = one of Divy's skills) ───────────────────── */
const TROOP_DEFS = [
  { key:"barb",    name:"Barbarian", skill:"JavaScript",  lvl:8, housing:1,  count:20, hp:80,  dps:18, speed:1.7, range:0.7, atk:0.7,  kind:"ground", pref:"any",     color:"#F7DF1E", dark:"#7A6B12", desc:"The daily driver. The good parts. Also the parts animating this raid.", size:0.9 },
  { key:"archer",  name:"Archer",   skill:"Go",           lvl:9, housing:1,  count:14, hp:54,  dps:13, speed:1.7, range:5,   atk:0.85, kind:"ground", pref:"any",     color:"#00ADD8", dark:"#04303B", desc:"Goroutines with bows. Concurrency without tears.", ranged:true },
  { key:"giant",   name:"Giant",    skill:"Kubernetes",   lvl:9, housing:5,  count:5,  hp:420, dps:24, speed:1.1, range:0.7, atk:1.2,  kind:"ground", pref:"defense", color:"#326CE5", dark:"#0E2358", desc:"Doesn't just deploy the base — it tanks it. Patches the wall.", size:1.18 },
  { key:"goblin",  name:"Goblin",   skill:"Python",       lvl:8, housing:1,  count:12, hp:62,  dps:28, speed:1.95,range:0.7, atk:0.6,  kind:"ground", pref:"storage", color:"#4FB24A", dark:"#1F5E1C", desc:"Goes straight for the loot. Pipelines of suspicious efficiency.", size:0.86 },
  { key:"wizard",  name:"Wizard",   skill:"Svelte",       lvl:9, housing:4,  count:6,  hp:96,  dps:34, speed:1.3, range:5,   atk:1.0,  kind:"ground", pref:"any",     color:"#FF3E00", dark:"#5A1600", desc:"Ships the entire product surface in a fireball.", ranged:true, splash:1.1 },
  { key:"balloon", name:"Balloon",  skill:"Docker",       lvl:8, housing:5,  count:4,  hp:240, dps:42, speed:1.0, range:0.8, atk:1.3,  kind:"air",     pref:"defense", color:"#2496ED", dark:"#0A3A63", desc:"The troops ship in containers. All of them. Now bombing.", size:1.0 },
  { key:"healer",  name:"Healer",   skill:"Prisma",       lvl:7, housing:14, count:2,  hp:70,  heal:26, speed:1.4, range:5,  atk:0.7,  kind:"air",     pref:"heal",    color:"#5A67D8", dark:"#1F2557", desc:"The ORM of the realm. Mends schema wounds.", size:0.95 },
  { key:"dragon",  name:"Dragon",   skill:"Redis",        lvl:7, housing:20, count:2,  hp:260, dps:38, speed:1.1, range:3.2, atk:1.1, kind:"air",     pref:"any",     color:"#D82C20", dark:"#57100A", desc:"Sub-millisecond raid damage. The fast loot cache, airborne.", ranged:true, splash:1.3, size:1.1 },
];
const SECRET_TROOPS = {
  pekka:  { key:"pekka",  name:"P.E.K.K.A", skill:"Minikube Core", lvl:"MAX", housing:25, count:1, hp:900,  dps:120, speed:1.2, range:0.8, atk:1.1, kind:"ground", pref:"any",  color:"#B8C5E0", dark:"#4A5568", desc:"Steel. Patches upstream like a machine.", size:1.3, secret:true },
  hog:    { key:"hog",    name:"Hog Rider",skill:"Gin",            lvl:9,     housing:5,  count:6, hp:320, dps:60,  speed:2.2, range:0.8, atk:1.0, kind:"ground", pref:"defense", color:"#B9773F", dark:"#5E3D20", desc:"HOG RIDERRRR! Jumps the walls. Distillery-fast.", size:1.1, secret:true, jumps:true },
};

/* ───────────────────── building definitions (layout + stats) ───────────────────── */
const DEF_HP = { th:1500, cannon:800, archer:700, xbow:750, beacon:650, gold:600, elixir:600, hut:300, camp:450, tree:60, cc:700, torch:50 };
const DEF_DMG = { cannon:26, archer:20, xbow:16, beacon:9 };  // beacon ramps
const VILLAGE_PLAN = [
  { id:"th",     type:"th",     gx:9,  gy:9,  w:4, h:4 },
  { id:"gold",   type:"gold",   gx:7,  gy:7,  w:2, h:2 },
  { id:"cannon", type:"cannon", gx:13, gy:7,  w:2, h:2 },
  { id:"archer", type:"archer", gx:7,  gy:13, w:2, h:2 },
  { id:"elixir", type:"elixir", gx:13, gy:13, w:2, h:2 },
  { id:"xbow",   type:"xbow",   gx:7,  gy:11, w:2, h:2 },
  { id:"beacon", type:"beacon", gx:13, gy:11, w:2, h:2 },
  { id:"cc",     type:"cc",     gx:10, gy:7,  w:2, h:2 },
  { id:"hut",    type:"hut",    gx:3,  gy:10, w:2, h:2 },
  { id:"camp",   type:"camp",   gx:17, gy:9,  w:3, h:3 },
  { id:"tree1",  type:"tree",   gx:2,  gy:4,  w:1, h:1, decor:true },
  { id:"tree2",  type:"tree",   gx:20, gy:2,  w:1, h:1, decor:true },
  { id:"tree3",  type:"tree",   gx:4,  gy:20, w:1, h:1, decor:true },
  { id:"tree4",  type:"tree",   gx:19, gy:18, w:1, h:1, decor:true },
  { id:"tree5",  type:"tree",   gx:21, gy:9,  w:1, h:1, decor:true },
  { id:"tree6",  type:"tree",   gx:1,  gy:14, w:1, h:1, decor:true },
  { id:"torch1", type:"torch",  gx:5,  gy:5,  w:1, h:1, decor:true },
  { id:"torch2", type:"torch",  gx:17, gy:5,  w:1, h:1, decor:true },
  { id:"torch3", type:"torch",  gx:5,  gy:17, w:1, h:1, decor:true },
  { id:"torch4", type:"torch",  gx:17, gy:17, w:1, h:1, decor:true },
];

/* loot allocation across buildings (shares of the real gold/elixir totals) */
const GOLD_SHARE  = { th:0.30, gold:0.55, cannon:0.025, archer:0.025, xbow:0.025, beacon:0.025, hut:0.025, elixir:0, camp:0.025, cc:0.02 };
const ELIX_SHARE  = { th:0.30, elixir:0.55, cannon:0.025, archer:0.025, xbow:0.025, beacon:0.025, hut:0.025, gold:0, camp:0.025, cc:0.02 };

/* ═════════════════════════════ AUDIO — synthesized, no files ═════════════════════ */
const Audio = (() => {
  let actx = null, master = null, muted = false, ready = false;
  const drums = { next: 0, on: false };
  function init() {
    if (actx) return;
    try {
      actx = new (window.AudioContext || window.webkitAudioContext)();
      master = actx.createGain();
      master.gain.value = 0.5;
      master.connect(actx.destination);
      ready = true;
    } catch (e) { ready = false; }
  }
  function resume() { if (actx && actx.state === "suspended") actx.resume(); }
  function env(node, peak, attack, decay) {
    const t = actx.currentTime;
    node.gain.setValueAtTime(0.0001, t);
    node.gain.exponentialRampToValueAtTime(peak, t + attack);
    node.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }
  function tone(freq, type, peak, attack, decay, dest) {
    if (!ready || muted) return;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq;
    o.connect(g); g.connect(dest || master);
    env(g, peak, attack, decay);
    o.start(); o.stop(actx.currentTime + attack + decay + 0.02);
  }
  function noise(dur, peak, filterFreq, type="lowpass") {
    if (!ready || muted) return;
    const len = Math.floor(actx.sampleRate * dur);
    const buf = actx.createBuffer(1, len, actx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = actx.createBufferSource(); src.buffer = buf;
    const f = actx.createBiquadFilter(); f.type = type; f.frequency.value = filterFreq;
    const g = actx.createGain(); g.gain.value = peak;
    src.connect(f); f.connect(g); g.connect(master);
    src.start();
  }
  const SFX = {
    deploy()  { if(!ready||muted)return; tone(220,"sine",0.18,0.01,0.12); noise(0.08,0.12,800); },
    barb()    { tone(180,"square",0.12,0.01,0.08); },
    cannon()  { if(!ready||muted)return; tone(90,"sawtooth",0.22,0.005,0.18); noise(0.12,0.18,500); },
    arrow()   { if(!ready||muted)return; tone(880,"triangle",0.08,0.005,0.06); noise(0.04,0.06,3000,"highpass"); },
    bolt()    { if(!ready||muted)return; tone(1200,"square",0.05,0.002,0.03); },
    beam()    { if(!ready||muted)return; tone(440,"sawtooth",0.06,0.01,0.05); },
    hit()     { if(!ready||muted)return; noise(0.04,0.07,2000); },
    die()     { if(!ready||muted)return; tone(160,"sawtooth",0.1,0.01,0.14); noise(0.1,0.08,600); },
    crumble() { if(!ready||muted)return; noise(0.4,0.22,400); tone(80,"sine",0.12,0.01,0.3); },
    star()    { if(!ready||muted)return; [660,880,1320].forEach((f,i)=>setTimeout(()=>tone(f,"triangle",0.2,0.01,0.4),i*90)); },
    win()     { if(!ready||muted)return; [523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,"triangle",0.22,0.02,0.5),i*130)); },
    lose()    { if(!ready||muted)return; [392,330,262].forEach((f,i)=>setTimeout(()=>tone(f,"sine",0.18,0.02,0.5),i*160)); },
    gem()     { if(!ready||muted)return; tone(1760,"triangle",0.14,0.005,0.2); tone(2349,"sine",0.1,0.01,0.25); },
    rage()    { if(!ready||muted)return; tone(330,"sawtooth",0.16,0.02,0.3); tone(550,"square",0.1,0.02,0.3); },
  };
  function startDrums() {
    if (!ready || muted || drums.on) return;
    drums.on = true;
    const step = () => {
      if (!drums.on) return;
      const t = actx.currentTime;
      if (drums.next <= t) {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = "sine"; o.frequency.value = 70;
        o.connect(g); g.connect(master);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.12, t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        o.start(t); o.stop(t + 0.14);
        drums.next = t + 0.5;
      }
      setTimeout(step, 200);
    };
    step();
  }
  function stopDrums() { drums.on = false; }
  function setMute(m) { muted = m; if (master) master.gain.value = m ? 0 : 0.5; if (!m && drums.on) {} if (m) stopDrums(); }
  function isMuted() { return muted; }
  return { init, resume, SFX, setMute, isMuted, startDrums, stopDrums, get ready() { return ready; } };
})();

/* keep Audio referenced so minifiers don't drop it; used globally below */
window.__audio = Audio;
/* ═════════════════════════════ SPRITE FACTORY — all art drawn on offscreen canvases ═════════════════════════════ */
const SPR_RES = 2;   // sprites are prerendered at 2x so they stay crisp on retina
function makeSprite(w, h, drawFn, scale = SPR_RES) {
  const c = document.createElement("canvas");
  c.width = Math.ceil(w * scale); c.height = Math.ceil(h * scale);
  const cx = c.getContext("2d");
  cx.scale(scale, scale);
  cx.lineJoin = "round"; cx.lineCap = "round";
  drawFn(cx, w, h);
  return c;
}
const SPR = {};   // sprite atlas

/* helpers shared by drawing fns */
function stoneBase(cx, x, y, w, h, top) {
  cx.fillStyle = "#6B7793"; cx.strokeStyle = "#39435C"; cx.lineWidth = 3;
  roundRect(cx, x, y, w, h, 9); cx.fill(); cx.stroke();
  cx.fillStyle = "#9AA6BC";
  roundRect(cx, x + 3, y + 3, w - 6, h * 0.32, 6); cx.fill();
  // block seams
  cx.strokeStyle = "rgba(57,67,92,.5)"; cx.lineWidth = 1.5;
  cx.beginPath(); cx.moveTo(x + w * 0.5, y + 3); cx.lineTo(x + w * 0.5, y + h - 3); cx.stroke();
  cx.beginPath(); cx.moveTo(x + 3, y + h * 0.55); cx.lineTo(x + w - 3, y + h * 0.55); cx.stroke();
}
function roundRect(cx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  cx.beginPath();
  cx.moveTo(x + r, y);
  cx.arcTo(x + w, y, x + w, y + h, r);
  cx.arcTo(x + w, y + h, x, y + h, r);
  cx.arcTo(x, y + h, x, y, r);
  cx.arcTo(x, y, x + w, y, r);
  cx.closePath();
}
function shadow(cx, x, y, rx, ry) {
  cx.save();
  cx.fillStyle = "rgba(0,0,0,0.28)";
  cx.beginPath(); cx.ellipse(x, y, rx, ry, 0, 0, TAU); cx.fill();
  cx.restore();
}
function goldCap(cx, x, y, w, h) {
  const g = cx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, "#FFDE7A"); g.addColorStop(1, "#D89A1B");
  cx.fillStyle = g; cx.strokeStyle = "#9A6A0E"; cx.lineWidth = 2.5;
  roundRect(cx, x, y, w, h, 6); cx.fill(); cx.stroke();
}

/* ── grass tile (two-tone iso diamond) ── */
function drawTile(cx, w, h, tone) {
  const cxp = w / 2, cyp = h / 2;
  cx.fillStyle = tone ? "#3F7A4C" : "#346242";
  cx.strokeStyle = "#1F3D27"; cx.lineWidth = 1.5;
  cx.beginPath();
  cx.moveTo(cxp, 1); cx.lineTo(w - 1, cyp); cx.lineTo(cxp, h - 1); cx.lineTo(1, cyp); cx.closePath();
  cx.fill(); cx.stroke();
  // little grass tufts
  cx.strokeStyle = tone ? "#4E8C5A" : "#3C7248"; cx.lineWidth = 1;
  for (let i = 0; i < 3; i++) {
    const gx = 12 + i * 14, gy = h * 0.55;
    cx.beginPath(); cx.moveTo(gx, gy); cx.lineTo(gx + 1, gy - 3); cx.stroke();
  }
}
SPR.tileA = makeSprite(TW, TH, (cx, w, h) => drawTile(cx, w, h, true));
SPR.tileB = makeSprite(TW, TH, (cx, w, h) => drawTile(cx, w, h, false));
SPR.tileEdge = makeSprite(TW, TH, (cx, w, h) => {
  drawTile(cx, w, h, true);
  cx.strokeStyle = "#2A5233"; cx.lineWidth = 2;
  cx.beginPath();
  cx.moveTo(w / 2, 1); cx.lineTo(w - 1, h / 2); cx.lineTo(w / 2, h - 1); cx.lineTo(1, h / 2); cx.closePath();
  cx.stroke();
});

/* ── wall (crystal-capped stone block, iso-facing) ── */
SPR.wall = makeSprite(64, 60, (cx, w, h) => {
  shadow(cx, w / 2, h - 6, 22, 7);
  // base block
  const g = cx.createLinearGradient(0, 16, 0, 52);
  g.addColorStop(0, "#B7C2D6"); g.addColorStop(1, "#6B7793");
  cx.fillStyle = g; cx.strokeStyle = "#39435C"; cx.lineWidth = 3;
  roundRect(cx, 8, 14, 48, 38, 8); cx.fill(); cx.stroke();
  // crystal caps
  const cg = cx.createLinearGradient(0, 2, 0, 18);
  cg.addColorStop(0, "#DFF3FF"); cg.addColorStop(1, "#6FA4F8");
  cx.fillStyle = cg; cx.strokeStyle = "#274B9C"; cx.lineWidth = 2;
  cx.beginPath(); cx.moveTo(16, 16); cx.lineTo(20, 2); cx.lineTo(24, 16); cx.closePath(); cx.fill(); cx.stroke();
  cx.beginPath(); cx.moveTo(44, 16); cx.lineTo(48, 2); cx.lineTo(52, 16); cx.closePath(); cx.fill(); cx.stroke();
  cx.beginPath(); cx.moveTo(30, 16); cx.lineTo(38, 0); cx.lineTo(46, 16); cx.closePath(); cx.fill(); cx.stroke();
  // sheen
  cx.strokeStyle = "rgba(234,246,255,.8)"; cx.lineWidth = 2;
  cx.beginPath(); cx.moveTo(34, 4); cx.lineTo(38, 0); cx.stroke();
  // block seam
  cx.strokeStyle = "rgba(57,67,92,.5)"; cx.lineWidth = 1.5;
  cx.beginPath(); cx.moveTo(8, 33); cx.lineTo(56, 33); cx.stroke();
});
SPR.wallRubble = makeSprite(64, 36, (cx, w, h) => {
  cx.fillStyle = "rgba(0,0,0,0.25)";
  cx.beginPath(); cx.ellipse(w / 2, h - 4, 22, 6, 0, 0, TAU); cx.fill();
  cx.fillStyle = "#7E8AA6";
  [[10,24,8],[22,28,10],[36,26,9],[48,24,7],[18,20,6]].forEach(([x,y,r])=>{
    cx.beginPath(); cx.arc(x, y, r, 0, TAU); cx.fill();
  });
  cx.fillStyle = "#9FE8FF";
  [[14,22,3],[30,24,3],[44,22,2]].forEach(([x,y,r])=>{ cx.beginPath(); cx.arc(x,y,r,0,TAU); cx.fill(); });
});

/* ── town hall (TH15) — drawn with real volume: lit front faces, shaded sides, shingles ── */
SPR.th = makeSprite(150, 180, (cx, w, h) => {
  shadow(cx, w / 2, h - 8, 60, 13);
  // stone base: front face + darker right side face (fake iso volume)
  const g = cx.createLinearGradient(0, 96, 0, 160);
  g.addColorStop(0, "#C4CEE0"); g.addColorStop(1, "#75819D");
  cx.fillStyle = g; cx.strokeStyle = "#39435C"; cx.lineWidth = 3.5;
  roundRect(cx, 18, 96, 114, 64, 9); cx.fill(); cx.stroke();
  cx.fillStyle = "rgba(38,46,68,.28)";
  roundRect(cx, 104, 96, 28, 64, 9); cx.fill();
  // masonry seams
  cx.strokeStyle = "rgba(57,67,92,.45)"; cx.lineWidth = 1.5;
  for (let yy = 112; yy < 156; yy += 15) { cx.beginPath(); cx.moveTo(21, yy); cx.lineTo(129, yy); cx.stroke(); }
  for (let xx = 40; xx < 130; xx += 22) { cx.beginPath(); cx.moveTo(xx, 99); cx.lineTo(xx, 111); cx.stroke(); }
  // corner blocks
  cx.fillStyle = "#8D99B4"; cx.strokeStyle = "#39435C"; cx.lineWidth = 2.5;
  roundRect(cx, 14, 92, 16, 70, 5); cx.fill(); cx.stroke();
  roundRect(cx, 120, 92, 16, 70, 5); cx.fill(); cx.stroke();
  // door
  cx.fillStyle = "#241340"; cx.strokeStyle = "#FFC53D"; cx.lineWidth = 3;
  cx.beginPath(); cx.moveTo(63, 160); cx.lineTo(63, 132); cx.arc(75, 132, 12, Math.PI, 0); cx.lineTo(87, 160); cx.closePath(); cx.fill(); cx.stroke();
  cx.strokeStyle = "rgba(255,197,61,.5)"; cx.lineWidth = 1.5;
  cx.beginPath(); cx.moveTo(75, 122); cx.lineTo(75, 158); cx.stroke();
  // glowing windows
  const win = (wx) => {
    const wg = cx.createRadialGradient(wx + 9, 117, 1, wx + 9, 117, 12);
    wg.addColorStop(0, "#FFF3C4"); wg.addColorStop(1, "#E8B84B");
    cx.fillStyle = wg; cx.strokeStyle = "#7A5000"; cx.lineWidth = 2.2;
    roundRect(cx, wx, 110, 18, 14, 4); cx.fill(); cx.stroke();
    cx.strokeStyle = "rgba(122,80,0,.6)"; cx.lineWidth = 1.2;
    cx.beginPath(); cx.moveTo(wx + 9, 110); cx.lineTo(wx + 9, 124); cx.stroke();
  };
  win(32); win(100);
  // purple keep with side shade + banner pair
  const pg = cx.createLinearGradient(0, 62, 0, 100);
  pg.addColorStop(0, "#9770DE"); pg.addColorStop(1, "#5A34A0");
  cx.fillStyle = pg; cx.strokeStyle = "#31184F"; cx.lineWidth = 3;
  roundRect(cx, 30, 62, 90, 38, 8); cx.fill(); cx.stroke();
  cx.fillStyle = "rgba(30,15,58,.3)"; roundRect(cx, 96, 62, 24, 38, 8); cx.fill();
  cx.fillStyle = "#FFDE7A"; cx.strokeStyle = "#9A6A0E"; cx.lineWidth = 2.2;
  roundRect(cx, 66, 70, 18, 17, 4); cx.fill(); cx.stroke();
  // hanging banners
  cx.fillStyle = "#FF4D5E"; cx.strokeStyle = "#B02737"; cx.lineWidth = 2;
  cx.beginPath(); cx.moveTo(40, 64); cx.lineTo(52, 64); cx.lineTo(52, 88); cx.lineTo(46, 82); cx.lineTo(40, 88); cx.closePath(); cx.fill(); cx.stroke();
  cx.beginPath(); cx.moveTo(98, 64); cx.lineTo(110, 64); cx.lineTo(110, 88); cx.lineTo(104, 82); cx.lineTo(98, 88); cx.closePath(); cx.fill(); cx.stroke();
  cx.fillStyle = "#FFDE7A"; cx.beginPath(); cx.arc(46, 71, 2.6, 0, TAU); cx.fill(); cx.beginPath(); cx.arc(104, 71, 2.6, 0, TAU); cx.fill();
  // crystal roof: lit left face + shaded right face + shingle lines
  cx.strokeStyle = "#31184F"; cx.lineWidth = 3.5;
  const rgL = cx.createLinearGradient(0, 6, 0, 66);
  rgL.addColorStop(0, "#8FB0FF"); rgL.addColorStop(1, "#5A50D8");
  cx.fillStyle = rgL;
  cx.beginPath(); cx.moveTo(75, 4); cx.lineTo(75, 4); cx.lineTo(140, 66); cx.lineTo(10, 66); cx.closePath(); cx.fill(); cx.stroke();
  cx.fillStyle = "rgba(26,18,80,.35)";
  cx.beginPath(); cx.moveTo(75, 4); cx.lineTo(140, 66); cx.lineTo(75, 66); cx.closePath(); cx.fill();
  cx.strokeStyle = "rgba(30,24,90,.5)"; cx.lineWidth = 1.6;
  for (let i = 1; i <= 3; i++) {
    const t = i / 4;
    cx.beginPath(); cx.moveTo(75 - 65 * t, 66 - 62 * (1 - t) * 0 - (1 - t) * 0 + (t - 1) * 0); cx.moveTo(75 - 65 * t, 66); cx.lineTo(75, 4 + 62 * t); cx.lineTo(75 + 65 * t, 66); cx.stroke();
  }
  // gold ridge trim
  cx.strokeStyle = "#FFC53D"; cx.lineWidth = 3.5;
  cx.beginPath(); cx.moveTo(75, 4); cx.lineTo(10, 66); cx.moveTo(75, 4); cx.lineTo(140, 66); cx.stroke();
  // finial + pennant
  cx.fillStyle = "#FF4D5E"; cx.strokeStyle = "#B02737"; cx.lineWidth = 2;
  cx.beginPath(); cx.moveTo(78, 3); cx.lineTo(100, 9); cx.lineTo(78, 16); cx.closePath(); cx.fill(); cx.stroke();
  cx.fillStyle = "#FFDE7A"; cx.strokeStyle = "#9A6A0E"; cx.lineWidth = 2.2;
  cx.beginPath(); cx.arc(75, 6, 5.5, 0, TAU); cx.fill(); cx.stroke();
});
SPR.thRubble = makeSprite(150, 70, (cx, w, h) => {
  cx.fillStyle = "rgba(0,0,0,0.3)";
  cx.beginPath(); cx.ellipse(w / 2, h - 4, 56, 11, 0, 0, TAU); cx.fill();
  cx.fillStyle = "#8A63D2"; cx.strokeStyle = "#31184F"; cx.lineWidth = 2;
  [[20,40,16],[50,46,20],[80,42,18],[110,44,15],[36,30,10],[90,32,12]].forEach(([x,y,r])=>{
    cx.beginPath(); cx.moveTo(x, y - r); cx.lineTo(x + r, y); cx.lineTo(x, y + r*.4); cx.lineTo(x - r, y); cx.closePath(); cx.fill(); cx.stroke();
  });
  cx.fillStyle = "#9FE8FF";
  [[30,36,3],[60,40,4],[100,38,3]].forEach(([x,y,r])=>{ cx.beginPath(); cx.arc(x,y,r,0,TAU); cx.fill(); });
});

/* ── cannon tower ── */
function defenseSprite(fn) { return makeSprite(96, 110, fn); }
SPR.cannon = defenseSprite((cx, w, h) => {
  shadow(cx, w / 2, h - 6, 36, 9);
  // stone ring platform with brick seams
  const pg = cx.createLinearGradient(0, 66, 0, 104);
  pg.addColorStop(0, "#AAB6CC"); pg.addColorStop(1, "#5F6B87");
  cx.fillStyle = pg; cx.strokeStyle = "#39435C"; cx.lineWidth = 3;
  cx.beginPath(); cx.ellipse(48, 92, 38, 14, 0, 0, TAU); cx.fill(); cx.stroke();
  cx.fillStyle = "#8D99B4";
  cx.beginPath(); cx.ellipse(48, 86, 34, 12, 0, 0, TAU); cx.fill(); cx.stroke();
  cx.strokeStyle = "rgba(57,67,92,.5)"; cx.lineWidth = 1.4;
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; cx.beginPath(); cx.moveTo(48 + Math.cos(a) * 24, 86 + Math.sin(a) * 8); cx.lineTo(48 + Math.cos(a) * 34, 86 + Math.sin(a) * 12); cx.stroke(); }
  // wooden carriage + spoked wheel
  cx.fillStyle = "#6B4A2B"; cx.strokeStyle = "#33210E"; cx.lineWidth = 3;
  roundRect(cx, 30, 64, 38, 16, 5); cx.fill(); cx.stroke();
  cx.fillStyle = "#8A5B33"; cx.strokeStyle = "#4A3116"; cx.lineWidth = 3;
  cx.beginPath(); cx.arc(36, 80, 11, 0, TAU); cx.fill(); cx.stroke();
  cx.strokeStyle = "#33210E"; cx.lineWidth = 2;
  for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI; cx.beginPath(); cx.moveTo(36 - Math.cos(a) * 9, 80 - Math.sin(a) * 9); cx.lineTo(36 + Math.cos(a) * 9, 80 + Math.sin(a) * 9); cx.stroke(); }
  cx.fillStyle = "#3B4254"; cx.beginPath(); cx.arc(36, 80, 3, 0, TAU); cx.fill();
  // barrel: big, banded, up-tilted
  cx.save(); cx.translate(40, 62); cx.rotate(-0.55);
  const bg = cx.createLinearGradient(0, -12, 0, 12);
  bg.addColorStop(0, "#59647E"); bg.addColorStop(.5, "#39435C"); bg.addColorStop(1, "#232A3E");
  cx.fillStyle = bg; cx.strokeStyle = "#181E2E"; cx.lineWidth = 3;
  cx.beginPath(); cx.moveTo(0, -9); cx.lineTo(40, -12); cx.quadraticCurveTo(48, 0, 40, 12); cx.lineTo(0, 9); cx.quadraticCurveTo(-8, 0, 0, -9); cx.closePath(); cx.fill(); cx.stroke();
  // muzzle lip + bands
  cx.fillStyle = "#232A3E"; cx.strokeStyle = "#181E2E"; cx.lineWidth = 2.5;
  roundRect(cx, 38, -14, 9, 28, 4); cx.fill(); cx.stroke();
  cx.strokeStyle = "#6B7793"; cx.lineWidth = 2.5;
  cx.beginPath(); cx.moveTo(12, -10.5); cx.lineTo(12, 10.5); cx.moveTo(26, -11.4); cx.lineTo(26, 11.4); cx.stroke();
  // top sheen
  cx.strokeStyle = "rgba(255,255,255,.28)"; cx.lineWidth = 2.5;
  cx.beginPath(); cx.moveTo(4, -6); cx.lineTo(36, -8.4); cx.stroke();
  cx.restore();
});
SPR.archer = defenseSprite((cx, w, h) => {
  shadow(cx, w / 2, h - 6, 32, 8);
  // wood post
  const wg = cx.createLinearGradient(0, 30, 0, 100);
  wg.addColorStop(0, "#9A6A3C"); wg.addColorStop(1, "#5E3D20");
  cx.fillStyle = wg; cx.strokeStyle = "#33210E"; cx.lineWidth = 3;
  roundRect(cx, 38, 28, 20, 70, 6); cx.fill(); cx.stroke();
  stoneBase(cx, 28, 18, 40, 20, true);
  // archer head
  cx.fillStyle = "#F2C89B"; cx.strokeStyle = "#8A5B33"; cx.lineWidth = 2;
  cx.beginPath(); cx.arc(48, 10, 7, 0, TAU); cx.fill(); cx.stroke();
  // bow
  cx.strokeStyle = "#E8EFFA"; cx.lineWidth = 2.5; cx.noFill = true;
  cx.beginPath(); cx.arc(60, 14, 9, -1.2, 1.2); cx.stroke();
  cx.beginPath(); cx.moveTo(48, 12); cx.lineTo(62, 14); cx.stroke();
});
SPR.xbow = defenseSprite((cx, w, h) => {
  shadow(cx, w / 2, h - 6, 34, 9);
  stoneBase(cx, 26, 50, 44, 44, true);
  // bow arms
  cx.strokeStyle = "#8A5B33"; cx.lineWidth = 6;
  cx.beginPath(); cx.moveTo(16, 40); cx.quadraticCurveTo(48, 14, 80, 40); cx.stroke();
  cx.strokeStyle = "#E8EFFA"; cx.lineWidth = 2;
  cx.beginPath(); cx.moveTo(18, 41); cx.lineTo(78, 41); cx.stroke();
  // stock
  cx.fillStyle = "#5E3D20"; cx.strokeStyle = "#33210E"; cx.lineWidth = 2.5;
  roundRect(cx, 42, 26, 12, 28, 4); cx.fill(); cx.stroke();
  cx.fillStyle = "#9A6A3C";
  cx.beginPath(); cx.arc(48, 40, 5, 0, TAU); cx.fill();
});
SPR.beacon = defenseSprite((cx, w, h) => {
  shadow(cx, w / 2, h - 6, 32, 9);
  stoneBase(cx, 30, 50, 36, 50, true);
  // crystal cluster
  const eg = cx.createLinearGradient(0, 4, 0, 56);
  eg.addColorStop(0, "#D68CFF"); eg.addColorStop(1, "#7E2BC8");
  cx.fillStyle = eg; cx.strokeStyle = "#5E1B96"; cx.lineWidth = 2.5;
  cx.beginPath(); cx.moveTo(48, 4); cx.lineTo(64, 44); cx.lineTo(48, 56); cx.lineTo(32, 44); cx.closePath(); cx.fill(); cx.stroke();
  cx.beginPath(); cx.moveTo(34, 12); cx.lineTo(44, 42); cx.lineTo(34, 50); cx.lineTo(26, 40); cx.closePath(); cx.fill(); cx.stroke();
  cx.beginPath(); cx.moveTo(62, 12); cx.lineTo(72, 42); cx.lineTo(62, 50); cx.lineTo(54, 40); cx.closePath(); cx.fill(); cx.stroke();
  // glow
  const rg = cx.createRadialGradient(48, 30, 2, 48, 30, 30);
  rg.addColorStop(0, "rgba(214,140,255,0.7)"); rg.addColorStop(1, "rgba(214,140,255,0)");
  cx.fillStyle = rg; cx.beginPath(); cx.arc(48, 30, 30, 0, TAU); cx.fill();
});
SPR.beaconFire = defenseSprite((cx, w, h) => {
  const rg = cx.createRadialGradient(48, 34, 2, 48, 34, 40);
  rg.addColorStop(0, "rgba(255,150,80,0.8)"); rg.addColorStop(0.5, "rgba(255,80,40,0.4)"); rg.addColorStop(1, "rgba(255,40,20,0)");
  cx.fillStyle = rg; cx.beginPath(); cx.arc(48, 34, 40, 0, TAU); cx.fill();
});

/* ── storages ── */
SPR.gold = makeSprite(96, 100, (cx, w, h) => {
  shadow(cx, w / 2, h - 6, 34, 9);
  cx.fillStyle = "#9A6A3C"; cx.strokeStyle = "#33210E"; cx.lineWidth = 3;
  roundRect(cx, 18, 74, 60, 18, 6); cx.fill(); cx.stroke();
  const g = cx.createLinearGradient(0, 20, 0, 76);
  g.addColorStop(0, "#FFDE7A"); g.addColorStop(1, "#D89A1B");
  cx.fillStyle = g; cx.strokeStyle = "#9A6A0E"; cx.lineWidth = 3;
  roundRect(cx, 24, 56, 48, 22, 7); cx.fill(); cx.stroke();
  roundRect(cx, 30, 36, 36, 22, 7); cx.fill(); cx.stroke();
  roundRect(cx, 36, 16, 24, 22, 7); cx.fill(); cx.stroke();
  cx.fillStyle = "rgba(255,255,255,.5)";
  cx.fillRect(40, 18, 4, 18); cx.fillRect(34, 38, 4, 16); cx.fillRect(28, 58, 4, 16);
});
SPR.elixir = makeSprite(96, 100, (cx, w, h) => {
  shadow(cx, w / 2, h - 6, 30, 8);
  cx.fillStyle = "#2A1840"; cx.strokeStyle = "#5E1B96"; cx.lineWidth = 3;
  cx.beginPath(); cx.moveTo(30, 88); cx.arc(48, 88, 18, Math.PI, 0); cx.lineTo(66, 30); cx.quadraticCurveTo(48, 8, 30, 30); cx.closePath(); cx.fill(); cx.stroke();
  const g = cx.createLinearGradient(0, 30, 0, 88);
  g.addColorStop(0, "#D68CFF"); g.addColorStop(1, "#7E2BC8");
  cx.fillStyle = g;
  cx.beginPath(); cx.moveTo(33, 84); cx.arc(48, 84, 15, Math.PI, 0); cx.lineTo(63, 32); cx.quadraticCurveTo(48, 14, 33, 32); cx.closePath(); cx.fill();
  cx.fillStyle = "#9A6A3C"; cx.strokeStyle = "#33210E"; cx.lineWidth = 2.5;
  roundRect(cx, 40, 12, 16, 14, 4); cx.fill(); cx.stroke();
  cx.fillStyle = "rgba(255,255,255,.4)";
  cx.beginPath(); cx.arc(42, 60, 5, 0, TAU); cx.fill();
});

/* ── builder's hut ── */
SPR.hut = makeSprite(96, 90, (cx, w, h) => {
  shadow(cx, w / 2, h - 6, 30, 8);
  cx.fillStyle = "#9A6A3C"; cx.strokeStyle = "#33210E"; cx.lineWidth = 3;
  roundRect(cx, 26, 44, 44, 38, 6); cx.fill(); cx.stroke();
  const rg = cx.createLinearGradient(0, 12, 0, 48);
  rg.addColorStop(0, "#FF9D4D"); rg.addColorStop(1, "#D96A1E");
  cx.fillStyle = rg; cx.strokeStyle = "#8A3D0F"; cx.lineWidth = 3;
  cx.beginPath(); cx.moveTo(48, 10); cx.lineTo(78, 48); cx.lineTo(18, 48); cx.closePath(); cx.fill(); cx.stroke();
  cx.fillStyle = "#33210E"; cx.strokeStyle = "#5E3D20"; cx.lineWidth = 2;
  roundRect(cx, 40, 58, 16, 24, 3); cx.fill(); cx.stroke();
  // window glow
  cx.fillStyle = "#FFDE7A";
  cx.fillRect(31, 54, 7, 7); cx.fillRect(58, 54, 7, 7);
});

/* ── clan castle (stone keep + battlements + banner) ── */
SPR.cc = makeSprite(104, 108, (cx, w, h) => {
  shadow(cx, w / 2, h - 6, 36, 9);
  // stone base block
  const g = cx.createLinearGradient(0, 40, 0, 92);
  g.addColorStop(0, "#B7C2D6"); g.addColorStop(1, "#6B7689");
  cx.fillStyle = g; cx.strokeStyle = "#3A4254"; cx.lineWidth = 3;
  roundRect(cx, 24, 46, 56, 44, 5); cx.fill(); cx.stroke();
  // masonry lines
  cx.strokeStyle = "rgba(40,48,64,.35)"; cx.lineWidth = 1.4;
  for (let r = 0; r < 3; r++) {
    const yy = 56 + r * 12;
    cx.beginPath(); cx.moveTo(24, yy); cx.lineTo(80, yy); cx.stroke();
    const off = r % 2 ? 6 : 0;
    for (let bx = 30 + off; bx < 80; bx += 18) { cx.beginPath(); cx.moveTo(bx, yy); cx.lineTo(bx, yy + 12); cx.stroke(); }
  }
  // battlements (crenellated top)
  cx.fillStyle = "#9AA6BC"; cx.strokeStyle = "#3A4254"; cx.lineWidth = 2.5;
  for (let i = 0; i < 5; i++) {
    const bx = 26 + i * 11;
    roundRect(cx, bx, 40, 8, 10, 2); cx.fill(); cx.stroke();
  }
  // door arch
  cx.fillStyle = "#1A1208"; cx.strokeStyle = "#5E3D20"; cx.lineWidth = 2.5;
  cx.beginPath(); cx.moveTo(44, 90); cx.lineTo(44, 70); cx.arc(52, 70, 8, Math.PI, 0); cx.lineTo(60, 90); cx.closePath(); cx.fill(); cx.stroke();
  // gate bars
  cx.strokeStyle = "#5E3D20"; cx.lineWidth = 1.6;
  cx.beginPath(); cx.moveTo(52, 70); cx.lineTo(52, 90); cx.stroke();
  // banner pole + flag (the clan's colors)
  cx.strokeStyle = "#9A6A0E"; cx.lineWidth = 2.5; cx.beginPath(); cx.moveTo(52, 40); cx.lineTo(52, 14); cx.stroke();
  cx.fillStyle = "#FF4D5E"; cx.beginPath(); cx.moveTo(52, 14); cx.lineTo(70, 19); cx.lineTo(52, 24); cx.closePath(); cx.fill();
  cx.fillStyle = "#FFDE7A"; cx.beginPath(); cx.arc(56, 19, 2.4, 0, TAU); cx.fill();
  // glowing portcullis gem (signals it's armed)
  cx.fillStyle = "#FFC53D"; cx.shadowColor = "#FFC53D"; cx.shadowBlur = 8;
  cx.beginPath(); cx.arc(52, 80, 2.6, 0, TAU); cx.fill(); cx.shadowBlur = 0;
});

/* ── clan castle — destroyed (broken keep) ── */
SPR.ccRubble = makeSprite(104, 60, (cx, w, h) => {
  shadow(cx, w / 2, h - 4, 34, 7);
  cx.fillStyle = "#6B7689"; cx.strokeStyle = "#3A4254"; cx.lineWidth = 2.5;
  for (let i = 0; i < 4; i++) {
    const bx = 22 + i * 14 + (i % 2 ? 3 : 0);
    const bw = 10 + (i % 2 ? 4 : 0), bh = 8 + (i % 3) * 4;
    roundRect(cx, bx, h - 8 - bh, bw, bh, 2); cx.fill(); cx.stroke();
  }
  cx.fillStyle = "#1A1208"; cx.fillRect(40, h - 14, 18, 10);
  // tattered flag on the ground
  cx.fillStyle = "rgba(255,77,94,.5)"; cx.beginPath(); cx.moveTo(30, h - 10); cx.lineTo(44, h - 12); cx.lineTo(44, h - 6); cx.closePath(); cx.fill();
});

/* ── army camp (tent + fire) ── */
SPR.camp = makeSprite(120, 96, (cx, w, h) => {
  shadow(cx, w / 2, h - 6, 40, 9);
  cx.fillStyle = "#9A6A3C"; cx.strokeStyle = "#33210E"; cx.lineWidth = 3;
  cx.beginPath(); cx.moveTo(60, 24); cx.lineTo(104, 84); cx.lineTo(16, 84); cx.closePath(); cx.fill(); cx.stroke();
  cx.strokeStyle = "#5E3D20"; cx.lineWidth = 2;
  cx.beginPath(); cx.moveTo(60, 24); cx.lineTo(60, 84); cx.stroke();
  cx.beginPath(); cx.moveTo(38, 54); cx.lineTo(82, 54); cx.stroke();
  // flag
  cx.strokeStyle = "#9A6A0E"; cx.lineWidth = 2.5; cx.beginPath(); cx.moveTo(60, 24); cx.lineTo(60, 6); cx.stroke();
  cx.fillStyle = "#FF4D5E"; cx.beginPath(); cx.moveTo(60, 6); cx.lineTo(74, 11); cx.lineTo(60, 16); cx.closePath(); cx.fill();
  // campfire
  cx.fillStyle = "#5E3D20"; cx.beginPath(); cx.ellipse(60, 86, 10, 4, 0, 0, TAU); cx.fill();
  cx.fillStyle = "#FF7A3D"; cx.beginPath(); cx.moveTo(60, 84); cx.lineTo(54, 78); cx.lineTo(60, 70); cx.lineTo(66, 78); cx.closePath(); cx.fill();
  cx.fillStyle = "#FFDE7A"; cx.beginPath(); cx.moveTo(60, 80); cx.lineTo(57, 76); cx.lineTo(60, 70); cx.lineTo(63, 76); cx.closePath(); cx.fill();
});

/* ── tree (decoration) ── */
SPR.tree = makeSprite(64, 86, (cx, w, h) => {
  shadow(cx, w / 2, h - 6, 20, 6);
  cx.fillStyle = "#5E3D20"; cx.fillRect(28, 60, 8, 18);
  const g1 = cx.createLinearGradient(0, 6, 0, 50); g1.addColorStop(0, "#387144"); g1.addColorStop(1, "#2F6039");
  cx.fillStyle = g1; cx.strokeStyle = "#1F3D27"; cx.lineWidth = 2;
  cx.beginPath(); cx.moveTo(32, 4); cx.lineTo(52, 44); cx.lineTo(12, 44); cx.closePath(); cx.fill(); cx.stroke();
  cx.fillStyle = "#387144";
  cx.beginPath(); cx.moveTo(32, 26); cx.lineTo(56, 70); cx.lineTo(8, 70); cx.closePath(); cx.fill(); cx.stroke();
});
/* ── corner torch (always lit — the village feels inhabited) ── */
SPR.torch = makeSprite(40, 78, (cx, w, h) => {
  shadow(cx, w / 2, h - 4, 10, 4);
  cx.fillStyle = "#6B4A2B"; cx.strokeStyle = "#33210E"; cx.lineWidth = 2.5;
  roundRect(cx, 16, 26, 8, 48, 3); cx.fill(); cx.stroke();
  cx.fillStyle = "#4A3116";
  roundRect(cx, 13, 30, 14, 5, 2); cx.fill();
  // iron cup
  cx.fillStyle = "#3B4254"; cx.strokeStyle = "#22283A"; cx.lineWidth = 2;
  cx.beginPath(); cx.moveTo(12, 26); cx.lineTo(28, 26); cx.lineTo(25, 18); cx.lineTo(15, 18); cx.closePath(); cx.fill(); cx.stroke();
  // flame
  cx.fillStyle = "#FF7A3D";
  cx.beginPath(); cx.moveTo(20, 2); cx.quadraticCurveTo(28, 10, 24, 17); cx.quadraticCurveTo(20, 20, 16, 17); cx.quadraticCurveTo(12, 10, 20, 2); cx.closePath(); cx.fill();
  cx.fillStyle = "#FFDE7A";
  cx.beginPath(); cx.moveTo(20, 7); cx.quadraticCurveTo(24, 12, 21, 16); cx.quadraticCurveTo(20, 17, 19, 16); cx.quadraticCurveTo(16, 12, 20, 7); cx.closePath(); cx.fill();
});

SPR.treeStump = makeSprite(64, 30, (cx, w, h) => {
  shadow(cx, w / 2, h - 4, 16, 5);
  cx.fillStyle = "#5E3D20"; cx.strokeStyle = "#33210E"; cx.lineWidth = 2;
  cx.beginPath(); cx.ellipse(w/2, h-8, 12, 6, 0, 0, TAU); cx.fill(); cx.stroke();
  cx.fillStyle = "#9A6A3C"; cx.beginPath(); cx.ellipse(w/2, h-12, 10, 4, 0, 0, TAU); cx.fill();
});

/* generic rubble for small buildings */
SPR.rubble = makeSprite(96, 44, (cx, w, h) => {
  cx.fillStyle = "rgba(0,0,0,0.28)";
  cx.beginPath(); cx.ellipse(w / 2, h - 4, 30, 7, 0, 0, TAU); cx.fill();
  cx.fillStyle = "#7E8AA6";
  [[16,26,8],[34,30,10],[52,28,9],[70,26,8],[26,20,6],[58,20,6]].forEach(([x,y,r])=>{
    cx.beginPath(); cx.arc(x, y, r, 0, TAU); cx.fill();
  });
  cx.fillStyle = "#9AA6BC";
  [[20,24,3],[44,26,3],[64,24,3]].forEach(([x,y,r])=>{ cx.beginPath(); cx.arc(x,y,r,0,TAU); cx.fill(); });
});

/* ── troops (small figures, prerendered idle) ── */
function troopSprite(def, pose) {
  return makeSprite(48, 56, (cx, w, h) => {
    shadow(cx, w / 2, h - 4, 13, 4);
    drawTroopFigure(cx, def, pose);
  });
}
function drawTroopFigure(cx, def, pose) {
  const cx0 = 24, baseY = 52;
  const s = def.size || 1;
  if (def.key === "balloon") return drawBalloon(cx, def);
  if (def.key === "dragon")  return drawDragon(cx, def);
  if (def.key === "healer")  return drawHealer(cx, def);
  if (def.key === "hog")     return drawHog(cx, def);
  // generic humanoid
  const bodyH = 20 * s, headR = 7 * s;
  // legs — pose 1 swaps stride for a two-frame walk
  const stride = pose ? -1 : 1;
  cx.fillStyle = def.dark; cx.strokeStyle = "rgba(0,0,0,.4)"; cx.lineWidth = 1.5;
  cx.fillRect(cx0 - 6 * s + stride * 2 * s, baseY - 8 * s, 4 * s, 8 * s - stride * 1.5 * s);
  cx.fillRect(cx0 + 2 * s - stride * 2 * s, baseY - 8 * s, 4 * s, 8 * s + stride * 1.5 * s);
  // body
  cx.fillStyle = def.color; cx.strokeStyle = def.dark; cx.lineWidth = 2;
  roundRect(cx, cx0 - 9 * s, baseY - bodyH, 18 * s, bodyH - 6, 5 * s); cx.fill(); cx.stroke();
  // belt
  cx.fillStyle = "#9A6A0E"; cx.fillRect(cx0 - 9 * s, baseY - 10 * s, 18 * s, 3 * s);
  // head
  cx.fillStyle = "#F2C89B"; cx.strokeStyle = "#8A5B33"; cx.lineWidth = 1.5;
  cx.beginPath(); cx.arc(cx0, baseY - bodyH - 2, headR, 0, TAU); cx.fill(); cx.stroke();
  // hair / hat
  cx.fillStyle = def.color; cx.strokeStyle = def.dark; cx.lineWidth = 1.5;
  cx.beginPath(); cx.arc(cx0, baseY - bodyH - 4, headR, Math.PI, 0); cx.fill(); cx.stroke();
  // eyes
  cx.fillStyle = "#131A12";
  cx.beginPath(); cx.arc(cx0 - 2.5, baseY - bodyH - 2, 1.2, 0, TAU); cx.fill();
  cx.beginPath(); cx.arc(cx0 + 2.5, baseY - bodyH - 2, 1.2, 0, TAU); cx.fill();
  // weapon
  cx.strokeStyle = "#5E3D20"; cx.lineWidth = 2.5;
  if (def.key === "barb") { cx.beginPath(); cx.moveTo(cx0 + 10 * s, baseY - 22 * s); cx.lineTo(cx0 + 10 * s, baseY - 6 * s); cx.stroke(); cx.fillStyle = "#C9D6EE"; cx.fillRect(cx0 + 8 * s, baseY - 24 * s, 4 * s, 8 * s); }
  else if (def.key === "archer") { cx.strokeStyle = "#E8EFFA"; cx.lineWidth = 2; cx.beginPath(); cx.arc(cx0 + 12 * s, baseY - 14 * s, 8 * s, -1.4, 1.4); cx.stroke(); }
  else if (def.key === "giant") { cx.fillStyle = "#C9D6EE"; cx.strokeStyle = "#525E78"; cx.lineWidth = 2; roundRect(cx, cx0 + 6 * s, baseY - 30 * s, 8 * s, 24 * s, 3); cx.fill(); cx.stroke(); }
  else if (def.key === "goblin") { cx.fillStyle = "#FFDE7A"; cx.strokeStyle = "#9A6A0E"; cx.lineWidth = 1.5; roundRect(cx, cx0 + 9 * s, baseY - 16 * s, 10 * s, 7 * s, 2); cx.fill(); cx.stroke(); cx.fillStyle = "#F2C89B"; cx.beginPath(); cx.arc(cx0, baseY - bodyH - 2, headR * 1.1, 0, TAU); cx.fill(); cx.fillStyle = "#4FB24A"; cx.beginPath(); cx.arc(cx0, baseY - bodyH - 5, headR * 1.1, Math.PI, 0); cx.fill(); }
  else if (def.key === "wizard") { cx.fillStyle = "#FF3E00"; cx.beginPath(); cx.moveTo(cx0, baseY - bodyH - 10); cx.lineTo(cx0 + 9, baseY - bodyH); cx.lineTo(cx0 - 9, baseY - bodyH); cx.closePath(); cx.fill(); cx.fillStyle = "#FFDE7A"; cx.beginPath(); cx.arc(cx0 + 11, baseY - 16, 4, 0, TAU); cx.fill(); }
  else if (def.key === "pekka") { cx.fillStyle = "#B8C5E0"; cx.strokeStyle = "#4A5568"; cx.lineWidth = 2.5; roundRect(cx, cx0 - 11, baseY - bodyH, 22, bodyH - 6, 4); cx.fill(); cx.stroke(); cx.fillStyle = "#4A5568"; cx.fillRect(cx0 - 11, baseY - bodyH + 4, 22, 3); cx.fillStyle = "#FF4D5E"; cx.fillRect(cx0 - 3, baseY - bodyH + 1, 6, 4); cx.strokeStyle = "#C9D6EE"; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(cx0 + 12, baseY - 26); cx.lineTo(cx0 + 12, baseY - 6); cx.stroke(); }
}
function drawBalloon(cx, def) {
  cx.fillStyle = def.color; cx.strokeStyle = def.dark; cx.lineWidth = 2.5;
  cx.beginPath(); cx.ellipse(24, 20, 16, 18, 0, 0, TAU); cx.fill(); cx.stroke();
  cx.strokeStyle = "rgba(255,255,255,.4)"; cx.lineWidth = 2;
  cx.beginPath(); cx.moveTo(24, 2); cx.quadraticCurveTo(16, 20, 24, 38); cx.stroke();
  cx.strokeStyle = "#33210E"; cx.lineWidth = 1.5;
  cx.beginPath(); cx.moveTo(18, 38); cx.lineTo(20, 48); cx.moveTo(30, 38); cx.lineTo(28, 48); cx.stroke();
  cx.fillStyle = "#9A6A3C"; cx.strokeStyle = "#33210E"; cx.lineWidth = 2;
  roundRect(cx, 18, 46, 12, 8, 2); cx.fill(); cx.stroke();
}
function drawDragon(cx, def) {
  cx.fillStyle = def.color; cx.strokeStyle = def.dark; cx.lineWidth = 2;
  cx.beginPath(); cx.ellipse(24, 28, 14, 11, 0, 0, TAU); cx.fill(); cx.stroke();
  // wings
  cx.fillStyle = "#FF7A3D";
  cx.beginPath(); cx.moveTo(24, 22); cx.lineTo(4, 12); cx.lineTo(14, 28); cx.closePath(); cx.fill(); cx.stroke();
  cx.beginPath(); cx.moveTo(24, 22); cx.lineTo(44, 12); cx.lineTo(34, 28); cx.closePath(); cx.fill(); cx.stroke();
  // head
  cx.fillStyle = def.color; cx.beginPath(); cx.arc(36, 22, 7, 0, TAU); cx.fill(); cx.stroke();
  cx.fillStyle = "#FFDE7A"; cx.beginPath(); cx.arc(39, 21, 1.5, 0, TAU); cx.fill();
  // tail
  cx.strokeStyle = def.dark; cx.lineWidth = 3;
  cx.beginPath(); cx.moveTo(12, 30); cx.quadraticCurveTo(2, 36, 6, 44); cx.stroke();
}
function drawHealer(cx, def) {
  cx.fillStyle = def.color; cx.strokeStyle = def.dark; cx.lineWidth = 2;
  cx.beginPath(); cx.ellipse(24, 18, 14, 16, 0, 0, TAU); cx.fill(); cx.stroke();
  cx.fillStyle = "#F2C89B"; cx.beginPath(); cx.arc(24, 36, 5, 0, TAU); cx.fill();
  cx.strokeStyle = "#E8EFFA"; cx.lineWidth = 1.5;
  cx.beginPath(); cx.arc(24, 18, 9, 0, TAU); cx.stroke();
  cx.fillStyle = "#FFDE7A"; cx.beginPath(); cx.moveTo(24, 14); cx.lineTo(28, 18); cx.lineTo(24, 22); cx.lineTo(20, 18); cx.closePath(); cx.fill();
}
function drawHog(cx, def) {
  // hog body
  cx.fillStyle = "#8A5B33"; cx.strokeStyle = "#5E3D20"; cx.lineWidth = 2;
  cx.beginPath(); cx.ellipse(24, 40, 16, 11, 0, 0, TAU); cx.fill(); cx.stroke();
  cx.fillStyle = "#9A6A3C"; cx.beginPath(); cx.arc(36, 36, 7, 0, TAU); cx.fill(); cx.stroke();
  cx.fillStyle = "#C98F5B"; cx.beginPath(); cx.ellipse(40, 38, 3, 2, 0, 0, TAU); cx.fill();
  cx.strokeStyle = "#5E3D20"; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(33, 30); cx.lineTo(30, 24); cx.lineTo(36, 27); cx.closePath(); cx.stroke();
  // rider
  cx.fillStyle = "#F2C89B"; cx.beginPath(); cx.arc(22, 22, 6, 0, TAU); cx.fill();
  cx.fillStyle = "#3B4254"; cx.strokeStyle = "#22283A"; cx.lineWidth = 2;
  roundRect(cx, 16, 26, 12, 10, 3); cx.fill(); cx.stroke();
  cx.strokeStyle = "#5E3D20"; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(30, 24); cx.lineTo(34, 12); cx.stroke();
}
// prerender every troop: two walk frames (idle alias = frame 0)
[...TROOP_DEFS, ...Object.values(SECRET_TROOPS)].forEach(t => {
  SPR["troop_" + t.key + "_0"] = troopSprite(t, 0);
  SPR["troop_" + t.key + "_1"] = troopSprite(t, 1);
  SPR["troop_" + t.key] = SPR["troop_" + t.key + "_0"];
});

/* ── projectiles ── */
SPR.projCannon = makeSprite(14, 14, (cx, w, h) => {
  cx.fillStyle = "#3B4254"; cx.strokeStyle = "#22283A"; cx.lineWidth = 1.5;
  cx.beginPath(); cx.arc(7, 7, 6, 0, TAU); cx.fill(); cx.stroke();
  cx.fillStyle = "rgba(255,255,255,.4)"; cx.beginPath(); cx.arc(5, 5, 2, 0, TAU); cx.fill();
});
SPR.projArrow = makeSprite(20, 8, (cx, w, h) => {
  cx.strokeStyle = "#9A6A3C"; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(2, 4); cx.lineTo(16, 4); cx.stroke();
  cx.fillStyle = "#E8EFFA"; cx.beginPath(); cx.moveTo(16, 4); cx.lineTo(12, 1); cx.lineTo(12, 7); cx.closePath(); cx.fill();
  cx.strokeStyle = "#5E3D20"; cx.beginPath(); cx.moveTo(2, 4); cx.lineTo(4, 1); cx.moveTo(2, 4); cx.lineTo(4, 7); cx.stroke();
});
SPR.projBolt = makeSprite(16, 6, (cx, w, h) => {
  cx.strokeStyle = "#E8EFFA"; cx.lineWidth = 1.5; cx.beginPath(); cx.moveTo(1, 3); cx.lineTo(14, 3); cx.stroke();
  cx.fillStyle = "#FFDE7A"; cx.beginPath(); cx.moveTo(14, 3); cx.lineTo(10, 1); cx.lineTo(10, 5); cx.closePath(); cx.fill();
});

/* ── misc: gem, star burst ── */
SPR.gem = makeSprite(40, 40, (cx, w, h) => {
  cx.fillStyle = "#59E4E0"; cx.strokeStyle = "#1E9C99"; cx.lineWidth = 2.5;
  cx.beginPath(); cx.moveTo(20, 2); cx.lineTo(36, 14); cx.lineTo(28, 38); cx.lineTo(12, 38); cx.lineTo(4, 14); cx.closePath(); cx.fill(); cx.stroke();
  cx.strokeStyle = "#BFF8F6"; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(4, 14); cx.lineTo(20, 20); cx.lineTo(36, 14); cx.moveTo(20, 20); cx.lineTo(20, 38); cx.stroke();
});
SPR.starBig = makeSprite(60, 58, (cx, w, h) => {
  const g = cx.createLinearGradient(0, 0, 0, 58); g.addColorStop(0, "#FFDE7A"); g.addColorStop(1, "#D89A1B");
  cx.fillStyle = g; cx.strokeStyle = "#9A6A0E"; cx.lineWidth = 2.5;
  cx.beginPath();
  const pts = 5, ox = 30, oy = 28, R = 26, r = 11;
  for (let i = 0; i < pts * 2; i++) {
    const ang = -Math.PI / 2 + i * Math.PI / pts;
    const rad = i % 2 ? r : R;
    const x = ox + Math.cos(ang) * rad, y = oy + Math.sin(ang) * rad;
    i ? cx.lineTo(x, y) : cx.moveTo(x, y);
  }
  cx.closePath(); cx.fill(); cx.stroke();
});


/* ═════════════════════════════ WORLD STATE ═════════════════════════════ */
const STATE = {
  phase: "boot",          // boot → scout → battle → result → alliance
  buildings: [],          // building objects
  walls: [],              // wall tiles
  troops: [],             // deployed troops
  projectiles: [],
  particles: [],
  floaters: [],
  totalBuildingHP: 0,
  destroyedHP: 0,
  gold: 0, elixir: 0,
  gems: +(localStorage.getItem("ds3_gems") || 0),
  damage: 0,
  stars: [false, false, false],
  thDestroyed: false,
  cc: null,                 // clan castle building quick-ref
  timer: BATTLE_TIME,
  timerRunning: false,
  selected: null,         // selected troop def for deploy
  housingUsed: 0,
  housingCap: 0,
  countdown: [],          // per-troop-type remaining counts
  shake: 0,
  godmode: false,
  rageTimer: 0,
  freezeTimer: 0,         // FREEZE spell: defenses stunned
  timeOfDay: 0,           // 0..1 across battle
  cam: { ox: 0, oy: 0, z: 1, shakeX: 0, shakeY: 0 },
  pointer: { x: 0, y: 0, down: false, gx: 0, gy: 0, over: false },
  hoverBuilding: null,
  log: [],
  cinem: { active: false, t: 0, dur: 7, kf: [], cap: "" },  // cinematic approach
};

/* camera projection */
function iso(gx, gy) {
  const c = STATE.cam;
  return { x: c.ox + (gx - gy) * TW2 * c.z, y: c.oy + (gx + gy) * TH2 * c.z };
}
function screenToGrid(sx, sy) {
  const c = STATE.cam;
  const dx = (sx - c.ox) / (TW2 * c.z), dy = (sy - c.oy) / (TH2 * c.z);
  return { gx: (dx + dy) / 2, gy: (dy - dx) / 2 };
}
/* position camera so grid (gx,gy) lands at screen center, at zoom z */
function camLookAt(gx, gy, z) {
  STATE.cam.z = z;
  STATE.cam.ox = VW / 2 - (gx - gy) * TW2 * z;
  STATE.cam.oy = VH / 2 - (gx + gy) * TH2 * z;
}

/* occupancy grid: 0 empty, 1 building, 2 wall, 3 wall-destroyed(rubble) */
let OCC;            // 2D array indexed [gx][gy]
let DEPLOY_OK;      // 2D boolean
function inBounds(gx, gy) { return gx >= LO && gx < HI && gy >= LO && gy < HI; }
function occAt(gx, gy) {
  const ix = Math.round(gx), iy = Math.round(gy);
  if (!inBounds(ix, iy)) return 0;
  return OCC[ix][iy] || 0;
}
function setOcc(gx, gy, v) {
  if (inBounds(gx, gy)) OCC[gx][gy] = v;
}

/* ───────────────────── build the village ───────────────────── */
function buildVillage() {
  STATE.buildings = []; STATE.walls = []; STATE.troops = []; STATE.projectiles = []; STATE.particles = []; STATE.floaters = [];
  STATE.totalBuildingHP = 0; STATE.destroyedHP = 0;
  STATE.gold = 0; STATE.elixir = 0; STATE.damage = 0; STATE.stars = [false, false, false];
  STATE.thDestroyed = false; STATE.timer = BATTLE_TIME; STATE.timerRunning = false;
  STATE.housingUsed = 0; STATE.godmode = false; STATE.rageTimer = 0; STATE.timeOfDay = 0; STATE.shake = 0;

  // occupancy
  OCC = []; DEPLOY_OK = [];
  for (let x = LO; x < HI; x++) { OCC[x] = []; DEPLOY_OK[x] = []; for (let y = LO; y < HI; y++) { OCC[x][y] = 0; DEPLOY_OK[x][y] = 1; } }

  // buildings
  for (const p of VILLAGE_PLAN) {
    const hp = DEF_HP[p.type];
    const b = {
      id: p.id, type: p.type, gx: p.gx, gy: p.gy, w: p.w, h: p.h,
      cx: p.gx + p.w / 2, cy: p.gy + p.h / 2,
      hp, maxHp: hp, destroyed: false, decor: !!p.decor,
      isDefense: ["cannon", "archer", "xbow", "beacon"].includes(p.type),
      isStorage: p.type === "gold" || p.type === "elixir",
      goldLoot: Math.round(LOOT_GOLD * (GOLD_SHARE[p.type] || 0)),
      elixLoot: Math.round(LOOT_ELIXIR * (ELIX_SHARE[p.type] || 0)),
      // defense runtime
      target: null, cooldown: 0, beamTarget: null, beamRamp: 0, retargetT: 0,
      buildT: 0, // for rebuild animation
      // clan castle runtime
      ccTriggered: false, ccTimer: 0, ccQueue: [],
    };
    STATE.buildings.push(b);
    if (p.type === "cc") STATE.cc = b;   // quick ref
    if (!p.decor) STATE.totalBuildingHP += hp;
    for (let x = p.gx; x < p.gx + p.w; x++) for (let y = p.gy; y < p.gy + p.h; y++) setOcc(x, y, 1);
  }

  // walls — outer rectangle + corner stubs
  const addWall = (x, y) => {
    if (!inBounds(x, y)) return;
    if (OCC[x][y]) return;
    STATE.walls.push({ gx: x, gy: y, hp: 220, maxHp: 220, destroyed: false, buildT: 0 });
    OCC[x][y] = 2;
  };
  // outer rectangle border at 6 and 16
  for (let i = 6; i <= 16; i++) { addWall(6, i); addWall(16, i); addWall(i, 6); addWall(i, 16); }
  // corner compartment stubs
  for (let i = 7; i <= 8; i++) { addWall(11, i); addWall(11, 16 - (i - 6)); }
  for (let i = 7; i <= 8; i++) { addWall(i, 11); addWall(16 - (i - 6), 11); }

  // deploy legality: flood-fill from the map edge — only exterior grass is deployable,
  // so troops can't spawn inside wall compartments (CoC rules)
  for (let x = LO; x < HI; x++) for (let y = LO; y < HI; y++) DEPLOY_OK[x][y] = 0;
  {
    const q = [];
    const pushIf = (x, y) => {
      if (inBounds(x, y) && !OCC[x][y] && !DEPLOY_OK[x][y]) { DEPLOY_OK[x][y] = 1; q.push([x, y]); }
    };
    for (let x = LO; x < HI; x++) { pushIf(x, LO); pushIf(x, HI - 1); }
    for (let y = LO; y < HI; y++) { pushIf(LO, y); pushIf(HI - 1, y); }
    while (q.length) { const [x, y] = q.pop(); pushIf(x + 1, y); pushIf(x - 1, y); pushIf(x, y + 1); pushIf(x, y - 1); }
  }

  // troop counts + housing
  STATE.housingCap = TROOP_DEFS.reduce((s, t) => s + t.housing * t.count, 0);
  STATE.countdown = {}; TROOP_DEFS.forEach(t => STATE.countdown[t.key] = t.count);

  buildTray();
  updateHUD();
}

/* ───────────────────── tray (army bar) ───────────────────── */
function buildTray() {
  housingCapEl.textContent = STATE.housingCap;
  trayTroops.innerHTML = "";
  TROOP_DEFS.forEach((t, i) => {
    const btn = document.createElement("button");
    btn.className = "troop-btn";
    btn.dataset.key = t.key;
    btn.innerHTML = `
      <canvas width="42" height="42"></canvas>
      <div class="troop-name">${t.name.toUpperCase()}</div>
      <div class="troop-cost">${t.dps ? "⚔" + t.dps : "✚" + t.heal}</div>
      <div class="troop-count" data-c="${t.key}">${t.count}</div>`;
    const c = btn.querySelector("canvas");
    const cx = c.getContext("2d");
    cx.drawImage(SPR["troop_" + t.key], 3, -2, 42, 50);
    btn.addEventListener("click", (e) => { e.stopPropagation(); selectTroop(t.key); });
    trayTroops.appendChild(btn);
  });
  selectTroop(TROOP_DEFS[0].key);
}
function selectTroop(key) {
  STATE.selected = key;
  $$(".troop-btn", trayTroops).forEach(b => {
    b.classList.toggle("selected", b.dataset.key === key);
  });
  const def = TROOP_DEFS.find(t => t.key === key);
  if (def && STATE.countdown[key] > 0 && STATE.housingUsed + def.housing <= STATE.housingCap) {
    deployCursor.classList.add("on");
  } else {
    deployCursor.classList.remove("on");
  }
}
function refreshTray() {
  $$(".troop-btn", trayTroops).forEach(b => {
    const key = b.dataset.key;
    const def = TROOP_DEFS.find(t => t.key === key);
    const n = STATE.countdown[key] || 0;
    b.querySelector("[data-c]").textContent = n;
    const can = n > 0 && STATE.housingUsed + def.housing <= STATE.housingCap;
    b.classList.toggle("empty", !can);
  });
  housingUsedEl.textContent = STATE.housingUsed;
  housingBar.style.width = (STATE.housingUsed / STATE.housingCap * 100) + "%";
  // re-evaluate cursor
  const sel = STATE.selected && TROOP_DEFS.find(t => t.key === STATE.selected);
  if (sel && (STATE.countdown[sel.key] <= 0 || STATE.housingUsed + sel.housing > STATE.housingCap)) deployCursor.classList.remove("on");
}

/* ───────────────────── HUD ───────────────────── */
function updateHUD() {
  goldEl.textContent = fmt(STATE.gold);
  elixirEl.textContent = fmt(STATE.elixir);
  damageEl.textContent = Math.round(STATE.damage);
  gemEl.textContent = fmt(STATE.gems);
  const m = Math.floor(STATE.timer / 60), s = Math.floor(STATE.timer % 60);
  timerEl.textContent = `${m}:${s.toString().padStart(2, "0")}`;
  timerEl.classList.toggle("warn", STATE.timer <= 30 && STATE.timerRunning);
  starEls.forEach((el, i) => el.classList.toggle("earned", STATE.stars[i]));
}
function setPhase(name) { phaseLabel.textContent = name; }
function earnStar(i, label) {
  if (STATE.stars[i]) return;
  STATE.stars[i] = true;
  Audio.SFX.star();
  showStarToast(label);
  addToast("⭐", label + " earned");
  updateHUD();
}
function showStarToast(label) {
  starToast.innerHTML = `<svg viewBox="0 0 60 58" width="100" height="96"><path d="M30 2 L37.8 20.5 L57.8 22.2 L42.6 35.4 L47.1 55 L30 44.6 L12.9 55 L17.4 35.4 L2.2 22.2 L22.2 20.5 Z" fill="#FFC53D" stroke="#9A6A0E" stroke-width="2.5"/></svg><div class="st-label">${label}</div>`;
  starToast.style.opacity = "0";
  starToast.animate([
    { opacity: 0, transform: "scale(2.2)" }, { opacity: 1, transform: "scale(1)", offset: 0.4 },
    { opacity: 1, transform: "scale(1)", offset: 0.7 }, { opacity: 0, transform: "scale(.9)" },
  ], { duration: 1600, easing: "cubic-bezier(.2,.9,.3,1.4)" });
}
/* drawn toast icons — OS emoji is the uniform of slop */
const _ic = (inner) => `<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">${inner}</svg>`;
const _g = 'fill="#D89A1B" stroke="#7A5000" stroke-width="1.6" stroke-linejoin="round"';
const ICON_SVG = {
  star:  _ic(`<path d="M12 2l2.9 6.2 6.6.7-5 4.4 1.4 6.6L12 16.7 6.1 19.9l1.4-6.6-5-4.4 6.6-.7z" ${_g}/>`),
  medal: _ic(`<path d="M8 2h3l1 5 1-5h3l-2.5 7h-4z" fill="#B03A2E" stroke="#5C1610" stroke-width="1.4"/><circle cx="12" cy="15" r="6" ${_g}/><circle cx="12" cy="15" r="2.6" fill="#FFDE7A" stroke="none"/>`),
  warn:  _ic(`<path d="M12 3 22 20H2z" fill="#E8A21B" stroke="#7A5000" stroke-width="1.6" stroke-linejoin="round"/><rect x="11" y="9" width="2" height="6" rx="1" fill="#33210E"/><circle cx="12" cy="17.4" r="1.3" fill="#33210E"/>`),
  coin:  _ic(`<circle cx="12" cy="12" r="9" ${_g}/><circle cx="12" cy="12" r="5.4" fill="none" stroke="#7A5000" stroke-width="1.4"/>`),
  flask: _ic(`<path d="M10 3h4v5l5 10a2 2 0 0 1-1.8 3H6.8A2 2 0 0 1 5 18l5-10z" fill="#C06CF5" stroke="#5E1B96" stroke-width="1.6" stroke-linejoin="round"/><path d="M7.4 14h9.2" stroke="#5E1B96" stroke-width="1.4"/>`),
  gem:   _ic(`<path d="M12 2l7 6-7 14L5 8z" fill="#59E4E0" stroke="#1E9C99" stroke-width="1.6" stroke-linejoin="round"/><path d="M5 8h14" stroke="#BFF8F6" stroke-width="1.3"/>`),
  castle:_ic(`<path d="M5 21V9h2V6h2v3h2V6h2v3h2V6h2v3h2v12z" fill="#9AA6BC" stroke="#39435C" stroke-width="1.5" stroke-linejoin="round"/><path d="M10 21v-5h4v5" fill="#33210E" stroke="none"/>`),
  burst: _ic(`<path d="M12 1l1.8 6L19 4l-3 5.2 6 .8-5.4 3 3.4 5-6-1.8L12 23l-2-6.8L4 18l3.4-5L2 10l6-.8L5 4l5.2 3z" fill="#FF7A3D" stroke="#B03A2E" stroke-width="1.3" stroke-linejoin="round"/>`),
  fire:  _ic(`<path d="M12 2c1 4-4 5-3 9 .5 2 2 3 3 3s5-1.5 4-6c2 1 4 4 3 8-.8 3.4-4 5-7 5s-6.6-2-7-6c-.6-5 5-7 7-13z" fill="#FF7A3D" stroke="#B03A2E" stroke-width="1.4" stroke-linejoin="round"/>`),
  snow:  _ic(`<path d="M12 2v20M4 6l16 12M20 6L4 18M6 12h12" fill="none" stroke="#A8E6FF" stroke-width="1.8" stroke-linecap="round"/>`),
  shield:_ic(`<path d="M12 2l8 3v7c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V5z" fill="#5D8DF6" stroke="#16306B" stroke-width="1.6" stroke-linejoin="round"/>`),
  swords:_ic(`<path d="M4 4l11 11M20 4L9 15" stroke="#C9D6EE" stroke-width="2.2" stroke-linecap="round"/><path d="M13 17l4-4 3 3-4 4zM11 17l-4-4-3 3 4 4z" fill="#8A5B33" stroke="#4A3116" stroke-width="1.2"/>`),
  gear:  _ic(`<circle cx="12" cy="12" r="5" fill="#9AA6BC" stroke="#39435C" stroke-width="1.6"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" stroke="#39435C" stroke-width="1.8" stroke-linecap="round"/>`),
  scroll:_ic(`<path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="#F4E7C3" stroke="#8A6A2E" stroke-width="1.6"/><path d="M8 9h8M8 12.5h8M8 16h5" stroke="#8A6A2E" stroke-width="1.4" stroke-linecap="round"/>`),
  lock:  _ic(`<rect x="5" y="10" width="14" height="10" rx="2" fill="#9AA6BC" stroke="#39435C" stroke-width="1.6"/><path d="M8 10V7a4 4 0 0 1 8 0v3" fill="none" stroke="#39435C" stroke-width="1.8"/>`),
  note:  _ic(`<path d="M9 18V5l10-2v12" fill="none" stroke="#C9D6EE" stroke-width="1.8" stroke-linejoin="round"/><circle cx="6.6" cy="18" r="2.6" fill="#C9D6EE"/><circle cx="16.6" cy="15" r="2.6" fill="#C9D6EE"/>`),
  flag:  _ic(`<path d="M5 21V3" stroke="#8A5B33" stroke-width="2" stroke-linecap="round"/><path d="M5 4h13l-3 4 3 4H5z" fill="#4E9CD8" stroke="#1F5E8C" stroke-width="1.4" stroke-linejoin="round"/><path d="M9 6.5h5M11.5 4v8" stroke="#F5D63C" stroke-width="1.6"/>`),
};
const TOAST_MAP = {
  "⭐":"star","🏅":"medal","⚠️":"warn","🪙":"coin","🧪":"flask","💎":"gem","🏰":"castle","💥":"burst",
  "🔥":"fire","❄️":"snow","🛡️":"shield","⚔️":"swords","🤖":"gear","📜":"scroll","🔒":"lock",
  "🔇":"note","🔊":"note","🗑️":"warn","👀":"warn","💪":"swords","🐗":"swords","🇸🇪":"flag",
};
function addToast(icon, text) {
  const t = document.createElement("div");
  t.className = "toast";
  const key = TOAST_MAP[icon];
  t.innerHTML = `<span class="t-icon">${key ? ICON_SVG[key] : icon}</span><span>${text}</span>`;
  toastZone.appendChild(t);
  setTimeout(() => { t.classList.add("out"); setTimeout(() => t.remove(), 360); }, 3400);
}

/* ═════════════════════════════ DEPLOY ═════════════════════════════ */
function deployTroop(def, gx, gy, secret = false) {
  if (!def) return false;
  const key = def.key;
  if (!secret) {
    if (STATE.countdown[key] <= 0) { addToast("⚠️", "No " + def.name + "s left"); return false; }
    if (STATE.housingUsed + def.housing > STATE.housingCap) { addToast("⚠️", "Army camp full"); return false; }
  }
  const ix = Math.round(gx), iy = Math.round(gy);
  if (!inBounds(ix, iy) || OCC[ix][iy]) { addToast("⚠️", "Can't deploy on a building"); return false; }
  // spawn slightly randomized
  const t = {
    def, key, gx: gx + rand(-0.3, 0.3), gy: gy + rand(-0.3, 0.3),
    hp: def.hp, maxHp: def.hp, dead: false,
    target: null, wallTarget: null, cooldown: rand(0, def.atk),
    retargetT: 0, bob: rand(0, TAU), facing: 1, attackAnim: 0,
    air: def.kind === "air", jumps: !!def.jumps, secret,
    rageT: 0, deployT: 0.4, team: "atk",
  };
  STATE.troops.push(t);
  if (!secret) { STATE.countdown[key]--; STATE.housingUsed += def.housing; refreshTray(); }
  Audio.SFX.deploy();
  spawnParticles(gx, gy, 8, "#D8C99A", 0.55, "puff");
  spawnDustRing(gx, gy);
  return true;
}

/* ═════════════════════════════ CLAN CASTLE — the base fights back ═════════════════════════════ */
/* Divy's clan donated defenders. The moment your troops cross the trigger radius,
   the Castle pours out barbarians, archers and a wizard to intercept the raid.
   Defenders are troops with team:"def"; they hunt attacker troops, not buildings. */
const CC_TRIGGER_R = 6.5;     // tiles from castle center
const CC_LEASH = 11;          // defenders won't chase beyond this from the castle
const CC_DONATION = ["barb","barb","barb","archer","archer","wizard"];
function spawnDefender(key, gx, gy) {
  const def = TROOP_DEFS.find(t => t.key === key);
  if (!def) return;
  // defenders are a touch weaker — a donation, not a standing army
  const t = {
    def, key, gx, gy,
    hp: Math.round(def.hp * 0.8), maxHp: Math.round(def.hp * 0.8), dead: false,
    target: null, wallTarget: null, cooldown: rand(0, def.atk), retargetT: 0,
    bob: rand(0, TAU), facing: 1, attackAnim: 0,
    air: def.kind === "air", jumps: !!def.jumps, secret: false,
    rageT: 0, deployT: 0.3, team: "def", home: { gx: STATE.cc ? STATE.cc.cx : gx, gy: STATE.cc ? STATE.cc.cy : gy },
  };
  STATE.troops.push(t);
  spawnParticles(gx, gy, 10, "#FF4D5E", 0.6, "puff");
  spawnDustRing(gx, gy);
  Audio.SFX.deploy();
}
function updateClanCastle(dt) {
  const cc = STATE.cc;
  if (!cc || cc.destroyed) return;
  if (!cc.ccTriggered) {
    // scan for attacker troops within trigger radius
    for (const t of STATE.troops) {
      if (t.dead || t.team === "def" || t.deployT > 0) continue;
      if (dist2(t.gx, t.gy, cc.cx, cc.cy) <= CC_TRIGGER_R * CC_TRIGGER_R) {
        cc.ccTriggered = true;
        cc.ccQueue = CC_DONATION.slice();
        cc.ccTimer = 0.25;
        addToast("🏰", "Clan Castle triggered — reinforcements incoming!");
        Audio.SFX.star();
        break;
      }
    }
    return;
  }
  // pour out the donation on a timer
  if (cc.ccQueue.length) {
    cc.ccTimer -= dt;
    if (cc.ccTimer <= 0) {
      const key = cc.ccQueue.shift();
      // spawn at a free tile on the castle's edge
      const ang = rand(0, TAU);
      const ex = cc.cx + Math.cos(ang) * 1.6, ey = cc.cy + Math.sin(ang) * 1.6;
      const ix = Math.round(ex), iy = Math.round(ey);
      if (inBounds(ix, iy) && !OCC[ix][iy]) spawnDefender(key, ex, ey);
      else spawnDefender(key, cc.cx, cc.cy);   // fallback on the roof
      cc.ccTimer = 0.7;
    }
  }
}

/* nearest enemy troop (opposite team). radius=Infinity means hunt any. */
function nearestEnemyTroop(t, maxR) {
  let best = null, bd = Infinity;
  const max2 = maxR * maxR;
  for (const o of STATE.troops) {
    if (o === t || o.dead || o.deployT > 0) continue;
    if (o.team === t.team) continue;
    const d = dist2(t.gx, t.gy, o.gx, o.gy);
    if (d <= max2 && d < bd) { bd = d; best = o; }
  }
  return best;
}

/* ═════════════════════════════ TARGET SELECTION ═════════════════════════════ */
function aliveBuildings(filter) {
  const out = [];
  for (const b of STATE.buildings) {
    if (b.destroyed) continue;
    if (filter && !filter(b)) continue;
    out.push(b);
  }
  return out;
}
function nearestBuilding(t, filter) {
  let best = null, bd = Infinity;
  for (const b of aliveBuildings(filter)) {
    const d = dist2(t.gx, t.gy, b.cx, b.cy);
    if (d < bd) { bd = d; best = b; }
  }
  return best;
}
function findTarget(t) {
  const def = t.def;
  if (def.pref === "heal") return null;          // healers handled separately
  // defenders hunt attacker troops; leash to the castle
  if (t.team === "def") {
    const enemy = nearestEnemyTroop(t, CC_LEASH);
    if (enemy) return enemy;
    return null;   // nothing in range — hold near the castle (handled in updateTroop)
  }
  // attackers: a nearby defending troop will draw aggro before buildings
  const aggro = nearestEnemyTroop(t, 2.9);
  if (aggro) return aggro;
  if (def.pref === "defense") {
    let b = nearestBuilding(t, b => b.isDefense);
    if (!b) b = nearestBuilding(t);
    return b;
  }
  if (def.pref === "storage") {
    let b = nearestBuilding(t, b => b.isStorage);
    if (!b) b = nearestBuilding(t);
    return b;
  }
  return nearestBuilding(t);
}

/* ═════════════════════════════ MOVEMENT + combat (per troop) ═════════════════════════════ */
function tryMove(t, nx, ny) {
  // returns true if moved into (nx,ny) freely; else sets wall block
  const ix = Math.floor(nx + 0.5), iy = Math.floor(ny + 0.5);
  const occ = occAt(ix, iy);
  if (t.air || t.jumps) { t.gx = nx; t.gy = ny; return true; }   // air/jumps ignore walls
  if (occ === 2) {
    // wall: attack it. find the wall object
    t.wallTarget = STATE.walls.find(w => !w.destroyed && w.gx === ix && w.gy === iy) || null;
    return false;
  }
  if (occ === 1) { return false; }   // building — handled by range check
  t.gx = nx; t.gy = ny; return true;
}

function updateTroop(t, dt) {
  if (t.dead) return;
  t.deployT = Math.max(0, t.deployT - dt);
  t.bob += dt * 6;
  t.cooldown -= dt;
  t.retargetT -= dt;
  t.attackAnim = Math.max(0, t.attackAnim - dt * 4);
  if (t.rageT > 0) t.rageT -= dt;
  const speedMul = (t.rageT > 0 ? 1.5 : 1) * (STATE.rageTimer > 0 ? 1.4 : 1);

  // healer logic
  if (t.def.pref === "heal") {
    updateHealer(t, dt, speedMul);
    return;
  }

  // retarget
  if (t.retargetT <= 0 || !t.target || t.target.destroyed || t.target.dead) {
    t.target = findTarget(t);
    t.wallTarget = null;
    t.retargetT = 0.35 + rand(0, 0.2);
  }

  let target = t.target;
  // if a wall is blocking us, attack the wall instead
  if (t.wallTarget && !t.wallTarget.destroyed) target = t.wallTarget;

  if (!target) {
    t.wallTarget = null;
    // defender with no quarry in leash: drift back toward the castle
    if (t.team === "def" && t.home) {
      const hx = t.home.gx, hy = t.home.gy, d = dist(t.gx, t.gy, hx, hy);
      if (d > 1.4) {
        const dx = (hx - t.gx) / d, dy = (hy - t.gy) / d;
        const step = t.def.speed * speedMul * dt;
        t.gx += dx * step; t.gy += dy * step; t.facing = dx >= 0 ? 1 : -1;
      }
    }
    return;
  }

  const isTroop = target.team !== undefined;
  const tx = isTroop ? target.gx : (target.cx !== undefined ? target.cx : target.gx + 0.5);
  const ty = isTroop ? target.gy : (target.cy !== undefined ? target.cy : target.gy + 0.5);
  const d = dist(t.gx, t.gy, tx, ty);
  const range = (t.def.range || 0.7) + (isTroop ? 0.5 : (target.w ? Math.max(target.w, target.h) * 0.25 : 0.3));

  // separation from nearby troops (boids)
  let sx = 0, sy = 0, sc = 0;
  for (const o of STATE.troops) {
    if (o === t || o.dead) continue;
    const dd = dist2(t.gx, t.gy, o.gx, o.gy);
    if (dd < 0.7 && dd > 0.001) {
      const ddx = (t.gx - o.gx), ddy = (t.gy - o.gy);
      const inv = 1 / Math.sqrt(dd);
      sx += ddx * inv; sy += ddy * inv; sc++;
    }
  }
  if (sc) { sx /= sc; sy /= sc; }

  if (d <= range) {
    // in range: attack
    t.facing = (tx - t.gx) >= 0 ? 1 : -1;
    if (t.cooldown <= 0) {
      t.cooldown = t.def.atk / (speedMul);
      t.attackAnim = 1;
      const dmgMul = (STATE.rageTimer > 0 || t.rageT > 0) ? 1.5 : 1;
      if (t.def.splash) { dealSplash(t, target, t.def.dps * t.def.atk * dmgMul, t.def.splash); Audio.SFX.barb(); }
      else dealDamage(t, target, t.def.dps * t.def.atk * dmgMul);
      if (t.def.ranged && !t.def.splash) spawnProjectile(t, target);
    }
  } else {
    // move toward target
    const dx = (tx - t.gx) / d, dy = (ty - t.gy) / d;
    let mvx = dx + sx * 0.6, mvy = dy + sy * 0.6;
    const ml = Math.hypot(mvx, mvy) || 1;
    mvx /= ml; mvy /= ml;
    t.facing = mvx >= 0 ? 1 : -1;
    const step = t.def.speed * speedMul * dt;
    const nx = t.gx + mvx * step, ny = t.gy + mvy * step;
    const moved = tryMove(t, nx, ny);
    if (!moved && !t.wallTarget) {
      // blocked by building edge: try sliding perpendicular
      const ax = t.gx + dx * step, ay = t.gy; if (tryMove(t, ax, ay)) return;
      const bx = t.gx, by = t.gy + dy * step; if (tryMove(t, bx, by)) return;
    }
  }
}

function updateHealer(t, dt, speedMul) {
  // find nearest injured friendly within sense range
  let best = null, bd = Infinity;
  for (const o of STATE.troops) {
    if (o === t || o.dead || o.def.pref === "heal") continue;
    if (o.hp >= o.maxHp) continue;
    const d = dist2(t.gx, t.gy, o.gx, o.gy);
    if (d < bd) { bd = d; best = o; }
  }
  if (!best) {
    // follow nearest friendly
    for (const o of STATE.troops) {
      if (o === t || o.dead || o.def.pref === "heal") continue;
      const d = dist2(t.gx, t.gy, o.gx, o.gy);
      if (d < bd) { bd = d; best = o; }
    }
  }
  if (!best) return;
  const d = dist(t.gx, t.gy, best.gx, best.gy);
  if (d > t.def.range) {
    const dx = (best.gx - t.gx) / d, dy = (best.gy - t.gy) / d;
    const step = t.def.speed * speedMul * dt;
    t.gx += dx * step; t.gy += dy * step; t.facing = dx >= 0 ? 1 : -1;
  } else if (best.hp < best.maxHp) {
    t.attackAnim = 1;
    if (t.cooldown <= 0) {
      t.cooldown = t.def.atk;
      best.hp = Math.min(best.maxHp, best.hp + t.def.heal);
      spawnParticles(best.gx, best.gy, 4, "#FFDE7A", 0.4, "heal");
      Audio.SFX.beam();
    }
  }
}

/* deal damage from a troop to a building, wall, or enemy troop */
function dealDamage(t, target, dmg) {
  if (STATE.godmode && t && t.team !== "def") dmg *= 2;   // godmode: your troops hit twice as hard
  if (target.team !== undefined) {
    // troop-vs-troop
    target.hp -= dmg;
    spawnParticles(target.gx, target.gy, 2, "#FF7A3D", 0.3, "spark");
    if (Math.random() < 0.5) Audio.SFX.hit();
    if (target.hp <= 0) killTroop(target);
    return;
  }
  if (target.isWall !== false && target.gx !== undefined && target.cx === undefined) {
    // wall
    target.hp -= dmg;
    spawnParticles(target.gx + 0.5, target.gy + 0.5, 2, "#B7C2D6", 0.3, "spark");
    Audio.SFX.hit();
    if (target.hp <= 0) { destroyWall(target); t.wallTarget = null; }
  } else {
    target.hp -= dmg;
    spawnParticles(target.cx, target.cy, 3, "#9AA6BC", 0.3, "spark");
    if (target.def !== false && Math.random() < 0.5) Audio.SFX.hit();
    if (target.hp <= 0) destroyBuilding(target);
  }
}

/* splash damage (wizard/dragon) — hits buildings, walls, and enemy troops in radius */
function dealSplash(t, target, dmg, radius) {
  const tx = target.cx !== undefined ? target.cx : target.gx;
  const ty = target.cy !== undefined ? target.cy : target.gy;
  const r2 = radius * radius;
  for (const b of STATE.buildings) {
    if (b.destroyed) continue;
    if (dist2(b.cx, b.cy, tx, ty) <= r2) {
      b.hp -= dmg * (b === target ? 1 : 0.5);
      if (b.hp <= 0) destroyBuilding(b);
    }
  }
  for (const w of STATE.walls) {
    if (w.destroyed) continue;
    if (dist2(w.gx + 0.5, w.gy + 0.5, tx, ty) <= r2) {
      w.hp -= dmg * 0.5;
      if (w.hp <= 0) destroyWall(w);
    }
  }
  // enemy troops caught in the blast
  for (const o of STATE.troops) {
    if (o === t || o.dead || o.team === t.team) continue;
    if (dist2(o.gx, o.gy, tx, ty) <= r2) {
      o.hp -= dmg * (o === target ? 1 : 0.6);
      if (o.hp <= 0) killTroop(o);
    }
  }
  spawnParticles(tx, ty, 8, t.def.color, 0.6, "blast");
}

/* ═════════════════════════════ DEFENSES ═════════════════════════════ */
function updateDefense(b, dt) {
  if (b.destroyed) return;
  if (b.recoil > 0) b.recoil = Math.max(0, b.recoil - dt * 4);
  if (STATE.freezeTimer > 0) return;   // FREEZE spell: defenses stood down
  b.cooldown -= dt; b.retargetT -= dt;
  const def = b.type;
  const range = { cannon: 6, archer: 8, xbow: 7, beacon: 6 }[def];
  const targetsAir = def !== "cannon";

  // retarget
  if (b.retargetT <= 0 || !b.target || b.target.dead) {
    b.target = null;
    let bd = Infinity;
    for (const t of STATE.troops) {
      if (t.dead || t.deployT > 0) continue;
      if (t.team === "def") continue;   // friendly clan troops — defenses don't shoot their own
      if (t.air && !targetsAir) continue;
      const d = dist2(b.cx, b.cy, t.gx, t.gy);
      if (d <= range * range && d < bd) { bd = d; b.target = t; }
    }
    b.retargetT = 0.25 + rand(0, 0.15);
    if (def === "beacon") { b.beamTarget = b.target; b.beamRamp = 0; }
  }

  const tgt = b.target;
  if (!tgt) {
    if (def === "beacon") b.beamRamp = 0;
    return;
  }

  if (def === "beacon") {
    // ramping beam
    if (tgt !== b.beamTarget) { b.beamTarget = tgt; b.beamRamp = 0; }
    b.beamRamp = Math.min(1, b.beamRamp + dt / 2.5);
    if (b.cooldown <= 0) {
      b.cooldown = 0.2;
      const dmg = DEF_DMG.beacon + b.beamRamp * 70;
      if (!STATE.godmode) {
        tgt.hp -= dmg;
        if (tgt.hp <= 0) killTroop(tgt);
      }
      spawnParticles(tgt.gx, tgt.gy, 1, "#D68CFF", 0.2, "spark");
      b.beamTick = (b.beamTick || 0) + 1;
      if (b.beamTick % 4 === 1) Audio.SFX.beam();
    }
    return;
  }

  const rate = { cannon: 1.1, archer: 1.0, xbow: 0.35 }[def];
  if (b.cooldown <= 0) {
    b.cooldown = rate;
    fireDefense(b, def, tgt);
  }
}
function fireDefense(b, def, tgt) {
  const proj = { gx: b.cx, gy: b.cy - 0.5, tx: tgt.gx, ty: tgt.gy, target: tgt, def, t: 0, dur: 0.25, kind: def };
  STATE.projectiles.push(proj);
  if (def === "cannon") {
    Audio.SFX.cannon();
    b.recoil = 1;
    spawnParticles(b.cx + 0.3, b.cy - 0.7, 4, "#FFD98A", 0.22, "blast");
    spawnParticles(b.cx + 0.3, b.cy - 0.7, 3, "#8C96AC", 0.4, "puff");
  }
  else if (def === "archer") Audio.SFX.arrow();
  else Audio.SFX.bolt();
}
function updateProjectiles(dt) {
  for (const p of STATE.projectiles) {
    if (p.dead) continue;
    p.t += dt;
    const k = p.t / p.dur;
    p.gx = lerp(p.gx, p.tx, Math.min(1, dt * 8));
    p.gy = lerp(p.gy, p.ty, Math.min(1, dt * 8));
    if (k >= 1) {
      p.dead = true;
      // troop-fired projectiles (arrows/bolts from your troops & defenders) are
      // visual delivery — the damage was already applied at attack time. Just spark.
      if (p.kind === "troop") {
        spawnParticles(p.tx, p.ty, 3, p.color || "#FFDE7A", 0.28, "spark");
        continue;
      }
      if (p.target && !p.target.dead) {
        if (!STATE.godmode) {
          p.target.hp -= DEF_DMG[p.def];
          if (p.target.hp <= 0) killTroop(p.target);
        }
        spawnParticles(p.target.gx, p.target.gy, 3, "#FF7A3D", 0.3, "spark");
      }
    }
  }
  STATE.projectiles = STATE.projectiles.filter(p => !p.dead);
}
function spawnProjectile(t, target) {
  const tx = target.cx !== undefined ? target.cx : target.gx + 0.5;
  const ty = target.cy !== undefined ? target.cy : target.gy + 0.5;
  const isSplash = !!t.def.splash;
  STATE.projectiles.push({ gx: t.gx, gy: t.gy - 0.3, tx, ty, target, def: t.def, t: 0, dur: 0.18, kind: "troop", splash: isSplash, color: t.def.color });
  if (t.def.key === "archer") Audio.SFX.arrow(); else if (t.def.key === "xbow") Audio.SFX.bolt();
}

/* ═════════════════════════════ DESTRUCTION / DEATH ═════════════════════════════ */
function destroyWall(w) {
  if (w.destroyed) return;
  w.destroyed = true;
  setOcc(w.gx, w.gy, 3);
  spawnParticles(w.gx + 0.5, w.gy + 0.5, 10, "#9AA6BC", 0.7, "puff");
  Audio.SFX.crumble();
}
function destroyBuilding(b) {
  if (b.destroyed) return;
  b.destroyed = true;
  for (let x = b.gx; x < b.gx + b.w; x++) for (let y = b.gy; y < b.gy + b.h; y++) setOcc(x, y, 0);
  if (!b.decor) {
    STATE.destroyedHP += b.maxHp;
    STATE.damage = STATE.destroyedHP / STATE.totalBuildingHP * 100;
  }
  // loot
  if (b.goldLoot) { STATE.gold += b.goldLoot; lootFloater(b, "gold", b.goldLoot); }
  if (b.elixLoot) { STATE.elixir += b.elixLoot; lootFloater(b, "elixir", b.elixLoot); }
  // big FX
  spawnParticles(b.cx, b.cy, 24, b.type === "th" ? "#FFC53D" : "#9AA6BC", 1.0, "blast");
  spawnParticles(b.cx, b.cy, 12, "#FF7A3D", 0.9, "blast");
  spawnDebris(b.cx, b.cy, b.type === "th" ? 22 : 12,
    b.type === "th" ? ["#FFC53D", "#9A6A0E", "#7A5000", "#FFEFD8"] : ["#9AA6BC", "#6B7689", "#4A5260", "#B7C2D6"]);
  Audio.SFX.crumble();
  STATE.shake = Math.max(STATE.shake, b.type === "th" ? 18 : 8);
  flash(b.type === "th" ? 0.6 : 0.35);
  if (b.type === "th") {
    STATE.thDestroyed = true;
    earnStar(0, "TOWN HALL DESTROYED");
    addToast("💥", "The Town Hall fell. One star.");
  }
  // mark content looted in info panel if open
  if (infoEl.classList.contains("on") && STATE._infoId === b.id) showInfo(b.id);
  // stars by damage
  checkDamageStars();
  updateHUD();
}
function killTroop(t) {
  if (t.dead) return;
  t.dead = true;
  spawnParticles(t.gx, t.gy, 8, t.def.color, 0.5, "puff");
  Audio.SFX.die();
}
function checkDamageStars() {
  if (STATE.damage >= 50 && !STATE.stars[1]) earnStar(1, "50% DESTRUCTION");
  if (STATE.damage >= 100 && !STATE.stars[2]) earnStar(2, "TOTAL DESTRUCTION");
}

/* ═════════════════════════════ PARTICLES & FLOATERS ═════════════════════════════ */
function spawnParticles(gx, gy, n, color, life, kind) {
  if (REDUCED) n = Math.min(n, 2);
  for (let i = 0; i < n; i++) {
    const ang = rand(0, TAU), spd = rand(0.5, 2.5) * (kind === "blast" ? 2 : 1);
    STATE.particles.push({
      gx: gx + rand(-0.2, 0.2), gy: gy + rand(-0.2, 0.2),
      vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd * 0.5 - (kind === "puff" ? 0.8 : 0.2),
      life, max: life, color, kind, size: rand(1.5, kind === "blast" ? 5 : 3),
    });
  }
}
function updateParticles(dt) {
  for (const p of STATE.particles) {
    p.gx += p.vx * dt; p.gy += p.vy * dt;
    p.vy += dt * (p.kind === "puff" || p.kind === "heal" ? -0.4 : p.kind === "smoke" ? -0.06 : 1.2);
    p.life -= dt;
    if (p.kind === "blast") p.vx *= 0.94, p.vy *= 0.94;
    if (p.kind === "chunk") p.vx *= 0.985;
  }
  STATE.particles = STATE.particles.filter(p => p.life > 0);
  if (STATE.particles.length > 480) STATE.particles.splice(0, STATE.particles.length - 480);
}
/* debris chunks flung from a destroyed building */
function spawnDebris(gx, gy, n, palette) {
  if (REDUCED) n = Math.min(n, 3);
  for (let i = 0; i < n; i++) {
    const ang = rand(0, TAU), spd = rand(1.6, 4.2);
    STATE.particles.push({
      gx: gx + rand(-0.3, 0.3), gy: gy + rand(-0.3, 0.3),
      vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd * 0.5 - rand(1.6, 3.2),
      life: rand(0.8, 1.4), max: 1.4, color: palette[i % palette.length], kind: "chunk",
      size: rand(2.6, 5.2), spin: rand(0.5, 2.2) * (Math.random() < 0.5 ? -1 : 1),
    });
  }
}
/* chimney smoke: the village breathes even before a single troop lands */
function tickSmoke(dt) {
  STATE.smokeT = (STATE.smokeT || 0) - dt;
  if (STATE.smokeT > 0 || REDUCED) return;
  STATE.smokeT = 0.8 + rand(0, 0.7);
  const src = STATE.buildings.filter(b => !b.destroyed && (b.type === "th" || b.type === "hut" || b.type === "camp"));
  if (!src.length) return;
  const b = pick(src);
  const oy = b.type === "th" ? 2.2 : 1.3;
  STATE.particles.push({
    gx: b.cx + rand(-.15, .15), gy: b.cy - oy,
    vx: rand(-.06, .14), vy: -rand(.25, .45),
    life: rand(1.8, 2.6), max: 2.6, color: "#C9CFDC", kind: "smoke", size: rand(2.5, 4),
  });
}

/* deploy dust ring — a quick expanding ellipse on the grass */
function spawnDustRing(gx, gy) {
  if (REDUCED) return;
  STATE.particles.push({ gx, gy, vx: 0, vy: 0, life: 0.5, max: 0.5, color: "#E8D9B0", kind: "ring", size: 7 });
}
function lootFloater(b, kind, amount) {
  STATE.floaters.push({ gx: b.cx, gy: b.cy, tx: kind === "gold" ? -0.9 : -0.85, ty: -0.9, t: 0, dur: 1.0, kind, amount });
  addToast(kind === "gold" ? "🪙" : "🧪", `+${fmt(amount)} ${kind}`);
}
function updateFloaters(dt) {
  for (const f of STATE.floaters) {
    f.t += dt;
    f.gy -= dt * 1.5;
  }
  STATE.floaters = STATE.floaters.filter(f => f.t < f.dur);
}
function flash(a) {
  if (REDUCED) return;
  /* never set inline opacity — the animation reverting to it left a stuck white wash */
  flashEl.animate([{ opacity: a }, { opacity: 0 }], { duration: 220, easing: "ease-out" });
}

/* ═════════════════════════════ GROUND (prerendered once) ═════════════════════════════ */
let groundCanvas = null, groundW = 0, groundH = 0;
let STARS = [];
function buildStars() {
  STARS = [];
  for (let i = 0; i < 70; i++) STARS.push({ fx: Math.random(), fy: Math.random() * 0.62, r: rand(0.4, 1.5), tw: rand(0, TAU) });
}
/* seeded rand — decor stays put across resizes instead of reshuffling */
let _seed = 0;
function srand() { _seed = (_seed * 1664525 + 1013904223) >>> 0; return _seed / 4294967296; }
function srng(a, b) { return a + srand() * (b - a); }
const insideRing = (x, y) => x > 5.2 && x < 17.8 && y > 5.2 && y < 17.8;

function buildGround() {
  // extent of village diamond over grid LO..HI
  const span = HI - LO;            // grid units across
  const gw = span * TW + 40;
  const gh = span * TH + 60;
  groundCanvas = document.createElement("canvas");
  groundCanvas.width = Math.ceil(gw * DPR); groundCanvas.height = Math.ceil(gh * DPR);
  const gx = groundCanvas.getContext("2d");
  gx.scale(DPR, DPR);
  gx.lineJoin = "round"; gx.lineCap = "round";
  // base grass field color
  gx.fillStyle = "#2A5233"; gx.fillRect(0, 0, gw, gh);
  const ox = gw / 2, oy = 30;      // screen origin of grid (0,0)
  const at = (x, y) => ({ x: ox + (x - y) * TW2, y: oy + (x + y) * TH2 });

  // iso tile checker with organic per-tile tone jitter (no two tiles identical)
  _seed = 987654321;
  for (let x = LO; x < HI; x++) {
    for (let y = LO; y < HI; y++) {
      const p = at(x, y);
      const out = x < 0 || y < 0 || x >= GRID || y >= GRID;
      const tone = (x + y) & 1;
      const base = out ? [42, 74, 50] : tone ? [63, 122, 76] : [52, 98, 66];
      const j = out ? 3 : 7;
      const r = Math.round(base[0] + srng(-j, j)), g = Math.round(base[1] + srng(-j, j)), b = Math.round(base[2] + srng(-j, j));
      gx.fillStyle = `rgb(${r},${g},${b})`;
      gx.strokeStyle = out ? "rgba(24,46,30,.7)" : "rgba(31,61,39,.75)";
      gx.lineWidth = 1.4;
      gx.beginPath();
      gx.moveTo(p.x, p.y - TH2 + 1); gx.lineTo(p.x + TW2 - 1, p.y); gx.lineTo(p.x, p.y + TH2 - 1); gx.lineTo(p.x - TW2 + 1, p.y);
      gx.closePath(); gx.fill(); gx.stroke();
    }
  }

  // worn dirt path: winds in from the south-east edge up to the walls
  _seed = 424242;
  gx.save();
  for (let t = 0; t <= 1; t += 0.035) {
    const px = 11.6 + Math.sin(t * 5.2) * 1.1 + t * 1.6;
    const py = 25.5 - t * 8.0;
    const p = at(px, py);
    const rr = 20 - t * 6 + srng(-2, 2);
    gx.fillStyle = `rgba(${138 + (srng(-8, 8) | 0)},${106 + (srng(-6, 6) | 0)},66,.92)`;
    gx.beginPath(); gx.ellipse(p.x, p.y, rr, rr * 0.5, 0, 0, TAU); gx.fill();
  }
  // path pebbles
  for (let i = 0; i < 14; i++) {
    const t = srand();
    const p = at(11.6 + Math.sin(t * 5.2) * 1.1 + t * 1.6 + srng(-.5, .5), 25.5 - t * 8.0 + srng(-.4, .4));
    gx.fillStyle = "rgba(112,86,54,.9)";
    gx.beginPath(); gx.ellipse(p.x, p.y, srng(1.5, 3), srng(1, 2), 0, 0, TAU); gx.fill();
  }
  gx.restore();

  // scattered life: grass tufts, flowers, stones, bushes — never inside the walls
  _seed = 13371337;
  for (let i = 0; i < 240; i++) {                     // tufts
    const x = srng(LO + .5, HI - .5), y = srng(LO + .5, HI - .5);
    if (insideRing(x, y)) continue;
    const p = at(x, y);
    gx.strokeStyle = srand() < .5 ? "rgba(84,150,98,.8)" : "rgba(38,74,48,.8)";
    gx.lineWidth = 1.3;
    const h = srng(3, 6);
    gx.beginPath(); gx.moveTo(p.x, p.y); gx.lineTo(p.x - 1.5, p.y - h); gx.moveTo(p.x + 2, p.y); gx.lineTo(p.x + 3, p.y - h * .8); gx.stroke();
  }
  for (let i = 0; i < 26; i++) {                      // flowers
    const x = srng(LO + 1, HI - 1), y = srng(LO + 1, HI - 1);
    if (insideRing(x, y)) continue;
    const p = at(x, y);
    const col = ["#F2E6B8", "#E8A8C8", "#F5F1E4"][(srand() * 3) | 0];
    for (let k = 0; k < 4; k++) { gx.fillStyle = col; gx.beginPath(); gx.arc(p.x + Math.cos(k * 1.57) * 2.4, p.y + Math.sin(k * 1.57) * 1.6, 1.5, 0, TAU); gx.fill(); }
    gx.fillStyle = "#D8A21B"; gx.beginPath(); gx.arc(p.x, p.y, 1.4, 0, TAU); gx.fill();
  }
  for (let i = 0; i < 12; i++) {                      // stones
    const x = srng(LO + 1, HI - 1), y = srng(LO + 1, HI - 1);
    if (insideRing(x, y)) continue;
    const p = at(x, y);
    const r = srng(3, 6.5);
    gx.fillStyle = "rgba(0,0,0,.18)"; gx.beginPath(); gx.ellipse(p.x + 1, p.y + 2, r, r * .45, 0, 0, TAU); gx.fill();
    gx.fillStyle = `rgb(${140 + (srng(-14, 14) | 0)},${150 + (srng(-14, 14) | 0)},${168 + (srng(-10, 10) | 0)})`;
    gx.strokeStyle = "#4A5468"; gx.lineWidth = 1.6;
    gx.beginPath(); gx.ellipse(p.x, p.y, r, r * .62, srng(-.4, .4), 0, 0, TAU); gx.fill(); gx.stroke();
    gx.fillStyle = "rgba(255,255,255,.25)"; gx.beginPath(); gx.ellipse(p.x - r * .3, p.y - r * .25, r * .3, r * .18, 0, 0, TAU); gx.fill();
  }
  for (let i = 0; i < 10; i++) {                      // bushes
    const x = srng(LO + 1, HI - 1), y = srng(LO + 1, HI - 1);
    if (insideRing(x, y)) continue;
    const p = at(x, y);
    const r = srng(6, 10);
    gx.fillStyle = "rgba(0,0,0,.2)"; gx.beginPath(); gx.ellipse(p.x, p.y + r * .5, r * 1.2, r * .4, 0, 0, TAU); gx.fill();
    gx.fillStyle = "#2F6039"; gx.strokeStyle = "#1F3D27"; gx.lineWidth = 2;
    gx.beginPath(); gx.arc(p.x - r * .5, p.y, r * .7, 0, TAU); gx.fill(); gx.stroke();
    gx.beginPath(); gx.arc(p.x + r * .45, p.y - r * .1, r * .62, 0, TAU); gx.fill(); gx.stroke();
    gx.fillStyle = "#3C7548"; gx.beginPath(); gx.arc(p.x - r * .1, p.y - r * .38, r * .58, 0, TAU); gx.fill(); gx.stroke();
    gx.fillStyle = "rgba(255,255,255,.12)"; gx.beginPath(); gx.arc(p.x - r * .25, p.y - r * .5, r * .28, 0, TAU); gx.fill();
  }

  // soft edge shading so the island doesn't end in a hard line
  const edgeG = gx.createRadialGradient(ox, oy + span * TH2, span * TW2 * .52, ox, oy + span * TH2, span * TW2 * 1.02);
  edgeG.addColorStop(0, "rgba(10,18,26,0)"); edgeG.addColorStop(1, "rgba(10,18,26,.5)");
  gx.fillStyle = edgeG; gx.fillRect(0, 0, gw, gh);

  groundW = gw; groundH = gh;
}
/* world origin offset within ground canvas (grid 0,0 screen pos) */
function groundOriginScreen() {
  // returns screen position (in canvas space) where ground's grid-origin sits, before camera
  return { x: groundW / 2, y: 30 };
}

/* ═════════════════════════════ CAMERA + RESIZE ═════════════════════════════ */
let DPR = Math.min(window.devicePixelRatio || 1, 2);
let VW = 0, VH = 0;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  VW = innerWidth; VH = innerHeight;
  canvas.width = Math.floor(VW * DPR); canvas.height = Math.floor(VH * DPR);
  canvas.style.width = VW + "px"; canvas.style.height = VH + "px";
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  buildGround();
  buildStars();
  fitCamera();
}
function fitCamera() {
  // fit the village diamond into the area between HUD and tray
  const topPad = 64, botPad = 150, sidePad = 30;
  const availW = VW - sidePad * 2, availH = VH - topPad - botPad;
  const span = GRID + 4;   // frame the village + a deploy apron, not the whole grass field
  const worldW = span * TW, worldH = span * TH + 90;   // +building height headroom
  let z = Math.min(availW / worldW, availH / worldH);
  z = clamp(z, 0.5, 1.35);
  // center village center grid (GRID/2, GRID/2) in available area
  const c = isoCenterScreen(z);
  STATE.cam.z = z;
  STATE.cam.ox = VW / 2 - (GRID / 2 - GRID / 2) * TW2 * z; // (gx-gy)=0 at center => ox positions grid(11,11)
  STATE.cam.ox = VW / 2 - c.x;
  STATE.cam.oy = topPad + availH / 2 - c.y - 20;
}
function isoCenterScreen(z) {
  // screen pos of grid (GRID/2, GRID/2) given ox=0,oy=0
  return { x: (GRID / 2 - GRID / 2) * TW2 * z, y: (GRID / 2 + GRID / 2) * TH2 * z };
}

/* ═════════════════════════════ RENDER ═════════════════════════════ */
function drawSprite(spr, sx, sy, anchorX = 0.5, anchorY = 1, scale = STATE.cam.z, alpha = 1) {
  if (!spr) return;
  const ow = spr.width / SPR_RES * scale, oh = spr.height / SPR_RES * scale;
  ctx.globalAlpha = alpha;
  ctx.drawImage(spr, 0, 0, spr.width, spr.height, sx - ow * anchorX, sy - oh * anchorY, ow, oh);
  ctx.globalAlpha = 1;
}
function spriteSize(spr) { return { w: spr.width / SPR_RES, h: spr.height / SPR_RES }; }

function render() {
  const c = STATE.cam;
  const sx = c.ox + c.shakeX, sy = c.oy + c.shakeY;
  ctx.clearRect(0, 0, VW, VH);

  // sky gradient shifts with time-of-day
  const tod = STATE.timeOfDay;
  const skyTop = blend("#0B1430", "#1A1230", tod);
  const skyMid = blend("#13204A", "#2A1840", tod);
  const skyBot = blend("#1A2C3E", "#3A1E2E", tod);
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, skyTop); g.addColorStop(0.5, skyMid); g.addColorStop(1, skyBot);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);

  // night sky: stars + moon rise as the raid drags into dusk
  if (tod > 0.35) {
    const na = clamp((tod - 0.35) / 0.35, 0, 1);
    ctx.save();
    for (const s of STARS) {
      const tw = 0.5 + 0.5 * Math.sin(now() / 600 + s.tw);
      ctx.globalAlpha = na * tw * 0.9;
      ctx.fillStyle = "#E8EFFA";
      ctx.beginPath(); ctx.arc(s.fx * VW, s.fy * VH, s.r, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = na;
    const mx = VW * 0.82, my = VH * 0.18 + (1 - na) * VH * 0.3;
    const mg = ctx.createRadialGradient(mx, my, 2, mx, my, 34);
    mg.addColorStop(0, "#F2F6FF"); mg.addColorStop(0.7, "#C9D4EE"); mg.addColorStop(1, "rgba(201,212,238,0)");
    ctx.fillStyle = mg;
    ctx.beginPath(); ctx.arc(mx, my, 32, 0, TAU); ctx.fill();
    ctx.restore();
  }

  ctx.save();
  /* iso() already carries cam.ox/oy — translate by shake ONLY, or everything doubles the offset */
  ctx.translate(c.shakeX, c.shakeY);

  // ground — its grid-origin pixel must land exactly on iso(0,0)
  const go = groundOriginScreen();
  const gs = c.z;
  const gw = groundW * gs, ghh = groundH * gs;
  ctx.drawImage(groundCanvas, 0, 0, groundCanvas.width, groundCanvas.height,
    c.ox - go.x * gs, c.oy - go.y * gs, gw, ghh);

  // defense range rings (faint)
  drawDefenseRanges();

  // deploy guide: while aiming, dim the forbidden interior so the legal apron reads instantly
  if ((STATE.phase === "battle" || STATE.phase === "scout") && STATE.selected && deployCursor.classList.contains("on")) {
    const a = iso(5, 5), b2 = iso(18, 5), c2 = iso(18, 18), d2 = iso(5, 18);
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = "#FF4D5E";
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b2.x, b2.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(d2.x, d2.y); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  // build the depth-sorted render list
  const list = [];
  for (const b of STATE.buildings) list.push({ d: b.cx + b.cy + 0.1, kind: "b", o: b });
  for (const w of STATE.walls) if (!w.destroyed) list.push({ d: w.gx + w.gy + 0.05, kind: "w", o: w });
  for (const t of STATE.troops) if (!t.dead) list.push({ d: t.gx + t.gy, kind: "t", o: t });
  list.sort((a, b) => a.d - b.d);

  for (const item of list) {
    if (item.kind === "b") drawBuilding(item.o);
    else if (item.kind === "w") drawWall(item.o);
    else drawTroop(item.o);
  }

  // projectiles
  for (const p of STATE.projectiles) drawProjectile(p);
  // particles
  for (const p of STATE.particles) drawParticle(p);
  // floaters (loot coins flying to HUD)
  for (const f of STATE.floaters) drawFloater(f);

  // rage zone
  if (STATE.rageTimer > 0) drawRageZone();

  ctx.restore();

  // deploy cursor hint handled by DOM element; nothing here
  // debug overlay
  if (DEBUG) drawDebug();
}

function drawDefenseRanges() {
  const c = STATE.cam;
  ctx.save();
  ctx.globalAlpha = 0.07;
  for (const b of STATE.buildings) {
    if (b.destroyed || !b.isDefense) continue;
    const range = { cannon: 6, archer: 8, xbow: 7, beacon: 6 }[b.type];
    const p = iso(b.cx, b.cy);
    ctx.strokeStyle = "#FFC53D"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, range * TW2 * c.z, range * TH2 * c.z, 0, 0, TAU); ctx.stroke();
  }
  ctx.restore();

  // clan castle trigger ring — red, dashed; pulses once the castle is pouring troops
  const cc = STATE.cc;
  if (cc && !cc.destroyed) {
    const p = iso(cc.cx, cc.cy);
    ctx.save();
    const pulse = 0.10 + Math.sin(now() / 380) * 0.05 + (cc.ccTriggered ? 0.12 : 0);
    ctx.globalAlpha = pulse;
    ctx.strokeStyle = cc.ccTriggered ? "#FF4D5E" : "#C96";
    ctx.lineWidth = 2 * c.z;
    ctx.setLineDash([8 * c.z, 7 * c.z]);
    ctx.beginPath(); ctx.ellipse(p.x, p.y, CC_TRIGGER_R * TW2 * c.z, CC_TRIGGER_R * TH2 * c.z, 0, 0, TAU); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

function drawBuilding(b) {
  const p = iso(b.cx, b.cy);
  if (b.destroyed) {
    const spr = b.type === "th" ? SPR.thRubble : b.type === "cc" ? SPR.ccRubble : b.decor ? SPR.treeStump : SPR.rubble;
    drawSprite(spr, p.x, p.y + 4, 0.5, 1);
    return;
  }
  // rebuild grow-in
  const grow = b.buildT > 0 ? clamp(1 - b.buildT / 0.8, 0, 1) : 1;
  let spr;
  if (b.type === "th") spr = SPR.th;
  else if (b.type === "cannon") spr = SPR.cannon;
  else if (b.type === "archer") spr = SPR.archer;
  else if (b.type === "xbow") spr = SPR.xbow;
  else if (b.type === "beacon") spr = SPR.beacon;
  else if (b.type === "gold") spr = SPR.gold;
  else if (b.type === "elixir") spr = SPR.elixir;
  else if (b.type === "cc") spr = SPR.cc;
  else if (b.type === "hut") spr = SPR.hut;
  else if (b.type === "camp") spr = SPR.camp;
  else if (b.type === "tree") spr = SPR.tree;
  else if (b.type === "torch") spr = SPR.torch;
  // shadow ellipse
  ctx.save(); ctx.globalAlpha = 0.3 * grow;
  ctx.fillStyle = "#000";
  const sz = spriteSize(spr);
  ctx.beginPath(); ctx.ellipse(p.x, p.y, sz.w * 0.4 * STATE.cam.z, sz.w * 0.14 * STATE.cam.z, 0, 0, TAU); ctx.fill();
  ctx.restore();
  // cannon recoil: quick squash-back on fire
  const kick = b.type === "cannon" && b.recoil > 0 ? b.recoil : 0;
  drawSprite(spr, p.x - kick * 3 * STATE.cam.z, p.y + kick * 1.5 * STATE.cam.z, 0.5, 1, STATE.cam.z * grow * (1 - kick * 0.05), grow);
  // FREEZE overlay: defenses locked in ice
  if (b.isDefense && STATE.freezeTimer > 0) {
    const sz = spriteSize(spr);
    ctx.save();
    ctx.globalAlpha = 0.42 + Math.sin(now() / 130) * 0.1;
    const gy = p.y - sz.h * STATE.cam.z * 0.45;
    const rg = ctx.createRadialGradient(p.x, gy, 1, p.x, gy, sz.w * 0.5 * STATE.cam.z);
    rg.addColorStop(0, "rgba(168,230,255,.95)"); rg.addColorStop(1, "rgba(168,230,255,0)");
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.ellipse(p.x, gy, sz.w * 0.5 * STATE.cam.z, sz.h * 0.6 * STATE.cam.z, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // corner torches flicker always — tiny life
  if (b.type === "torch") {
    const flick = 0.5 + Math.sin(now() / 90 + b.cx * 7) * 0.18 + Math.sin(now() / 310 + b.cy) * 0.12;
    const gy2 = p.y - 64 * STATE.cam.z;
    ctx.save();
    ctx.globalAlpha = clamp(flick, 0.25, 0.95);
    const rg2 = ctx.createRadialGradient(p.x, gy2, 1, p.x, gy2, 22 * STATE.cam.z);
    rg2.addColorStop(0, "rgba(255,190,90,.9)"); rg2.addColorStop(1, "rgba(255,140,50,0)");
    ctx.fillStyle = rg2;
    ctx.beginPath(); ctx.arc(p.x, gy2, 22 * STATE.cam.z, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // night torches: warm flickering glow as the raid runs into dusk
  if (STATE.timeOfDay > 0.32 && !b.decor) {
    const sz = spriteSize(spr);
    ctx.save();
    const flick = 0.65 + Math.sin(now() / 180 + b.cx * 3.1) * 0.35;
    ctx.globalAlpha = clamp((STATE.timeOfDay - 0.32) / 0.4, 0, 1) * flick;
    const gy = p.y - sz.h * STATE.cam.z * 0.72;
    const rg = ctx.createRadialGradient(p.x, gy, 1, p.x, gy, 16 * STATE.cam.z);
    rg.addColorStop(0, "rgba(255,176,74,.95)"); rg.addColorStop(1, "rgba(255,176,74,0)");
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(p.x, gy, 16 * STATE.cam.z, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // beacon fire overlay
  if (b.type === "beacon" && b.beamRamp > 0.1) drawSprite(SPR.beaconFire, p.x, p.y, 0.5, 1, STATE.cam.z, 0.4 + b.beamRamp * 0.4);
  // beam to target
  if (b.type === "beacon" && b.target && !b.target.dead) {
    const t = iso(b.target.gx, b.target.gy);
    ctx.save();
    ctx.strokeStyle = `rgba(214,140,255,${0.5 + b.beamRamp * 0.5})`;
    ctx.lineWidth = (1.5 + b.beamRamp * 3) * STATE.cam.z;
    ctx.shadowColor = "#D68CFF"; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(p.x, p.y - 30 * STATE.cam.z); ctx.lineTo(t.x, t.y); ctx.stroke();
    ctx.restore();
  }
  // HP bar
  if (b.hp < b.maxHp && !b.decor) {
    const w = 44 * STATE.cam.z, h = 5 * STATE.cam.z;
    const x = p.x - w / 2, y = p.y - sz.h * STATE.cam.z - 6 * STATE.cam.z;
    ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    const r = b.hp / b.maxHp;
    ctx.fillStyle = r > 0.5 ? "#67B94C" : r > 0.25 ? "#FFC53D" : "#FF4D5E";
    ctx.fillRect(x, y, w * r, h);
  }
}

function drawWall(w) {
  const p = iso(w.gx + 0.5, w.gy + 0.5);
  if (w.buildT > 0) {
    const grow = clamp(1 - w.buildT / 0.5, 0, 1);
    drawSprite(SPR.wall, p.x, p.y, 0.5, 1, STATE.cam.z, grow);
    return;
  }
  drawSprite(SPR.wall, p.x, p.y, 0.5, 1);
  if (w.hp < w.maxHp) {
    const s = spriteSize(SPR.wall);
    const ww = 26 * STATE.cam.z, h = 4 * STATE.cam.z;
    const x = p.x - ww / 2, y = p.y - s.h * STATE.cam.z - 4 * STATE.cam.z;
    ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(x - 1, y - 1, ww + 2, h + 2);
    const r = w.hp / w.maxHp;
    ctx.fillStyle = r > 0.5 ? "#67B94C" : r > 0.25 ? "#FFC53D" : "#FF4D5E";
    ctx.fillRect(x, y, ww * r, h);
  }
}

function drawTroop(t) {
  const p = iso(t.gx, t.gy);
  const frame = (!t.air && t.moving) ? (Math.floor(t.bob * 1.7) & 1) : 0;
  const spr = SPR["troop_" + t.key + "_" + frame] || SPR["troop_" + t.key];
  const air = t.air;
  const bobY = air ? Math.sin(t.bob) * 3 * STATE.cam.z : 0;
  const atk = t.attackAnim;
  const sx = p.x;
  const sy = p.y + bobY;
  // shadow
  ctx.save(); ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#000";
  ctx.beginPath(); ctx.ellipse(p.x, p.y, 9 * STATE.cam.z, 3 * STATE.cam.z, 0, 0, TAU); ctx.fill();
  ctx.restore();
  // team ring — defenders wear the clan's red, your troops wear the chief's teal
  if (t.team === "def" || t.team === "atk") {
    const ringCol = t.team === "def" ? "#FF4D5E" : "#3FD6C8";
    ctx.save(); ctx.globalAlpha = 0.55;
    ctx.strokeStyle = ringCol; ctx.lineWidth = 2 * STATE.cam.z;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, 10 * STATE.cam.z, 4.2 * STATE.cam.z, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  // deploy pop-in
  let scale = STATE.cam.z;
  if (t.deployT > 0) scale *= clamp(1 - t.deployT / 0.4, 0.2, 1);
  // facing flip
  ctx.save();
  ctx.translate(sx, sy);
  if (t.facing < 0) ctx.scale(-1, 1);
  const s = spriteSize(spr);
  const ow = s.w * scale, oh = s.h * scale;
  // attack lunge
  const lunge = atk * 3 * STATE.cam.z;
  ctx.drawImage(spr, 0, 0, spr.width, spr.height, -ow / 2 + lunge, -oh + (atk ? -2 : 0), ow, oh);
  ctx.restore();
  // rage aura
  if (t.rageT > 0 || STATE.rageTimer > 0) {
    ctx.save(); ctx.globalAlpha = 0.4;
    ctx.strokeStyle = "#FF4D5E"; ctx.lineWidth = 2 * STATE.cam.z;
    ctx.beginPath(); ctx.ellipse(p.x, p.y - 12 * STATE.cam.z, 10 * STATE.cam.z, 14 * STATE.cam.z, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  // hp bar (only if hurt)
  if (t.hp < t.maxHp) {
    const ww = 22 * STATE.cam.z, h = 3.5 * STATE.cam.z;
    const x = p.x - ww / 2, y = sy - s.h * scale - 4 * STATE.cam.z;
    ctx.fillStyle = "rgba(0,0,0,.6)"; ctx.fillRect(x - 1, y - 1, ww + 2, h + 2);
    const r = t.hp / t.maxHp;
    ctx.fillStyle = r > 0.5 ? "#67B94C" : r > 0.25 ? "#FFC53D" : "#FF4D5E";
    ctx.fillRect(x, y, ww * r, h);
  }
}

function drawProjectile(p) {
  const a = iso(p.gx, p.gy);
  let spr;
  if (p.kind === "cannon") spr = SPR.projCannon;
  else if (p.kind === "archer") spr = SPR.projArrow;
  else if (p.kind === "xbow") spr = SPR.projBolt;
  else if (p.kind === "troop") {
    // colored bolt
    ctx.save();
    ctx.fillStyle = p.color || "#FFDE7A";
    ctx.shadowColor = p.color || "#FFDE7A"; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(a.x, a.y, 3 * STATE.cam.z, 0, TAU); ctx.fill();
    ctx.restore();
    return;
  }
  drawSprite(spr, a.x, a.y, 0.5, 0.5, STATE.cam.z * 1.1);
}

function drawParticle(p) {
  const a = iso(p.gx, p.gy);
  const r = p.life / p.max;
  ctx.globalAlpha = r;
  if (p.kind === "spark") { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(a.x, a.y, p.size * STATE.cam.z * r, 0, TAU); ctx.fill(); }
  else if (p.kind === "puff") { ctx.fillStyle = p.color; ctx.globalAlpha = r * 0.6; ctx.beginPath(); ctx.arc(a.x, a.y, p.size * STATE.cam.z * (1.4 - r), 0, TAU); ctx.fill(); }
  else if (p.kind === "blast") { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(a.x, a.y, p.size * STATE.cam.z * (1.4 - r), 0, TAU); ctx.fill(); }
  else if (p.kind === "heal") { ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(a.x, a.y, p.size * STATE.cam.z * (1 - r), 0, TAU); ctx.stroke(); }
  else if (p.kind === "ring") {
    ctx.strokeStyle = p.color; ctx.lineWidth = 2.4 * STATE.cam.z * r;
    ctx.globalAlpha = r * 0.85;
    const rr = p.size * STATE.cam.z * (2.4 - r * 1.7);
    ctx.beginPath(); ctx.ellipse(a.x, a.y, rr, rr * 0.5, 0, 0, TAU); ctx.stroke();
  }
  else if (p.kind === "chunk") {
    ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(p.life * 6 * (p.spin || 1));
    ctx.fillStyle = p.color;
    const s = p.size * STATE.cam.z * (0.6 + r * 0.4);
    ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore();
  }
  else if (p.kind === "smoke") {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = r * 0.32;
    ctx.beginPath(); ctx.arc(a.x, a.y, p.size * STATE.cam.z * (2 - r), 0, TAU); ctx.fill();
  }
  else if (p.kind === "ice") {
    ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(p.life * 4);
    ctx.strokeStyle = p.color; ctx.lineWidth = 1.6 * STATE.cam.z; ctx.globalAlpha = r;
    const s = p.size * STATE.cam.z * (1.2 - r * 0.5);
    ctx.beginPath();
    for (let i = 0; i < 3; i++) { const ang = i * Math.PI / 3; ctx.moveTo(-Math.cos(ang) * s, -Math.sin(ang) * s); ctx.lineTo(Math.cos(ang) * s, Math.sin(ang) * s); }
    ctx.stroke(); ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawFloater(f) {
  const a = iso(f.gx, f.gy);
  const r = f.t / f.dur;
  ctx.globalAlpha = 1 - r;
  ctx.fillStyle = f.kind === "gold" ? "#FFC53D" : "#C06CF5";
  ctx.beginPath(); ctx.arc(a.x, a.y, 4 * STATE.cam.z, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawRageZone() {
  const c = STATE.cam;
  ctx.save();
  ctx.globalAlpha = 0.15 + Math.sin(now() / 200) * 0.05;
  const p = iso(GRID / 2, GRID / 2);
  const rg = ctx.createRadialGradient(p.x, p.y, 5, p.x, p.y, 120 * c.z);
  rg.addColorStop(0, "rgba(255,77,94,.5)"); rg.addColorStop(1, "rgba(255,77,94,0)");
  ctx.fillStyle = rg;
  ctx.beginPath(); ctx.ellipse(p.x, p.y, 120 * c.z, 70 * c.z, 0, 0, TAU); ctx.fill();
  ctx.restore();
}

/* color blend helper (hex) */
function blend(a, b, t) {
  const pa = hex2rgb(a), pb = hex2rgb(b);
  const r = Math.round(lerp(pa[0], pb[0], t)), g = Math.round(lerp(pa[1], pb[1], t)), bl = Math.round(lerp(pa[2], pb[2], t));
  return `rgb(${r},${g},${bl})`;
}
function hex2rgb(h) { h = h.replace("#", ""); return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]; }

function drawDebug() {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,.7)";
  ctx.fillRect(8, 64, 150, 24);
  ctx.fillStyle = "#0f0"; ctx.font = "11px 'JetBrains Mono', monospace";
  ctx.fillText(`fps ${fps.toFixed(0)}  t:${STATE.troops.length} p:${STATE.particles.length}`, 14, 80);
  ctx.restore();
}

/* ═════════════════════════════ INPUT ═════════════════════════════ */
function pointerPos(e) {
  const r = canvas.getBoundingClientRect();
  const x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
  const y = (e.touches ? e.touches[0].clientY : e.clientY) - r.top;
  return { x, y };
}
function buildingAt(gx, gy) {
  for (const b of STATE.buildings) {
    if (gx >= b.gx - 0.5 && gx < b.gx + b.w + 0.5 && gy >= b.gy - 0.5 && gy < b.gy + b.h + 0.5) return b;
  }
  return null;
}

let pointerDownAt = null, didDrag = false;
canvas.addEventListener("pointerdown", (e) => {
  Audio.resume();
  if (STATE.phase !== "battle" && STATE.phase !== "scout" && STATE.phase !== "result") return;
  const { x, y } = pointerPos(e);
  pointerDownAt = { x, y, t: now() };
  didDrag = false;
  const g = screenToGrid(x, y);
  STATE.pointer.gx = g.gx; STATE.pointer.gy = g.gy;
  // tap building -> info. During battle, intel is LOCKED until you destroy the building —
  // you loot the resume by raiding it. Scout phase & destroyed buildings always open.
  const b = buildingAt(g.gx, g.gy);
  if (b) {
    if (b.type === "th") thTap();
    if (STATE.phase === "battle" && !b.destroyed && !b.decor) {
      if (!STATE._intelHinted) { STATE._intelHinted = true; addToast("🔒", "Intel is inside the buildings — destroy them to loot it"); }
      return;
    }
    showInfo(b.id);
    return;
  }
});
canvas.addEventListener("pointermove", (e) => {
  const { x, y } = pointerPos(e);
  STATE.pointer.x = x; STATE.pointer.y = y; STATE.pointer.over = true;
  const g = screenToGrid(x, y);
  STATE.pointer.gx = g.gx; STATE.pointer.gy = g.gy;
  // deploy cursor follow + validity tint
  if (deployCursor.classList.contains("on")) {
    deployCursor.style.left = x + "px"; deployCursor.style.top = y + "px";
    const ix = Math.round(g.gx), iy = Math.round(g.gy);
    deployCursor.classList.toggle("invalid", !inBounds(ix, iy) || !DEPLOY_OK[ix][iy]);
  }
  if (pointerDownAt && dist(x, y, pointerDownAt.x, pointerDownAt.y) > 14) didDrag = true;
  if (pointerDownAt && didDrag && (STATE.phase === "battle" || STATE.phase === "scout")) {
    // drag-deploy: drop troops along the drag
    tryDeployAt(g.gx, g.gy, true);
  }
  // hover building
  STATE.hoverBuilding = buildingAt(g.gx, g.gy);
});
canvas.addEventListener("pointerup", (e) => {
  if (!pointerDownAt) return;
  const { x, y } = pointerPos(e);
  const g = screenToGrid(x, y);
  if (!didDrag && (STATE.phase === "battle" || STATE.phase === "scout")) tryDeployAt(g.gx, g.gy, false);
  pointerDownAt = null;
});
canvas.addEventListener("pointerleave", () => { STATE.pointer.over = false; deployCursor.classList.remove("on"); });

let lastDragDeploy = 0;
function tryDeployAt(gx, gy, drag) {
  /* deploys are legal in scout too — the first deploy IS what starts the battle */
  if (STATE.phase !== "battle" && STATE.phase !== "scout") return;
  const sel = STATE.selected && TROOP_DEFS.find(t => t.key === STATE.selected);
  if (!sel) return;
  if (STATE.countdown[sel.key] <= 0 || STATE.housingUsed + sel.housing > STATE.housingCap) return;
  if (drag && now() - lastDragDeploy < 140) return;
  const ix = Math.round(gx), iy = Math.round(gy);
  if (!inBounds(ix, iy) || !DEPLOY_OK[ix][iy]) {
    if (!drag && !OCC[ix] ?. [iy]) addToast("⚠️", "Deploy on the grass outside the walls, chief");
    return;
  }
  if (deployTroop(sel, gx, gy)) lastDragDeploy = now();
  if (!STATE.timerRunning) startBattle();
}

/* keyboard secrets */
const KONAMI = ["arrowup","arrowup","arrowdown","arrowdown","arrowleft","arrowright","arrowleft","arrowright","b","a"];
let keyBuf = [], letterBuf = "";
addEventListener("keydown", (e) => {
  Audio.resume();
  if (e.target && /input|textarea/i.test(e.target.tagName)) return;
  const k = e.key.toLowerCase();
  keyBuf.push(k); if (keyBuf.length > 14) keyBuf.shift();
  if (KONAMI.every((kk, i) => keyBuf[keyBuf.length - KONAMI.length + i] === kk)) { keyBuf = []; pekkaDrop(); }
  if (/^[a-z]$/.test(k)) {
    letterBuf = (letterBuf + k).slice(-24);
    const checks = {
      hogrider: hogRide, pekka: () => secretDrop("pekka", 1, "💪", "P.E.K.K.A deployed"),
      godmode: () => { STATE.godmode = !STATE.godmode; addToast("🛡️", STATE.godmode ? "GOD MODE — troops invulnerable" : "god mode off");
        if (STATE.godmode) for (const t of STATE.troops) t.hp = t.maxHp; },
      barbarian: () => barbCharge(), gradr: () => addToast("🇸🇪", "Hej chief! Shipping for Gradr from the north."),
      rage: () => castRage(), freeze: () => castFreeze(), clear: () => wipeBase(), three: () => { if (DEBUG) forceStars(); },
    };
    for (const key in checks) if (letterBuf.endsWith(key)) { letterBuf = ""; checks[key](); }
  }
  if (k === "escape") closeAllPanels();
  if (k === " " && STATE.phase === "scout") { e.preventDefault(); startBattle(); }
});

/* ── secrets ── */
function pekkaDrop() { secretDrop("pekka", 4, "💪", "KONAMI — four P.E.K.K.A deployed"); }
function secretDrop(key, n, icon, msg) {
  const def = SECRET_TROOPS[key] || TROOP_DEFS.find(t => t.key === key);
  if (!def) return;
  for (let i = 0; i < n; i++) {
    const gx = rand(1, GRID - 1), gy = rand(1, GRID - 1);
    const ix = Math.round(gx), iy = Math.round(gy);
    if (inBounds(ix, iy) && !OCC[ix][iy]) deployTroop(def, gx, gy, true);
  }
  addToast(icon, msg);
  if (!STATE.timerRunning && STATE.phase === "battle") startBattle();
}
function hogRide() {
  const yell = document.createElement("div"); yell.className = "egg-yell"; yell.textContent = "HOG RIDERRRR!"; eggLayer.appendChild(yell);
  yell.animate([{ opacity: 0, transform: "translate(-50%,-50%) scale(2.4)" }, { opacity: 1, transform: "translate(-50%,-50%) scale(1)" }, { opacity: 0 }], { duration: 1500 });
  setTimeout(() => yell.remove(), 1500);
  Audio.SFX.rage();
  secretDrop("hog", 6, "🐗", "Hog Riders — they jump the walls!");
}
function barbCharge() {
  const yell = document.createElement("div"); yell.className = "egg-yell"; yell.textContent = "AAAAAAAH!"; eggLayer.appendChild(yell);
  yell.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 1100 });
  setTimeout(() => yell.remove(), 1100);
  secretDrop("barb", 8, "⚔️", "Barbarian charge!");
}
function castRage() {
  STATE.rageTimer = 8;
  for (const t of STATE.troops) t.rageT = 8;
  addToast("🔥", "RAGE spell — speed + damage boost!");
  Audio.SFX.rage();
  flash(0.3);
}
function castFreeze() {
  STATE.freezeTimer = 3;
  addToast("❄️", "FREEZE spell — defenses frozen 3s!");
  Audio.SFX.beam();
  flash(0.35);
  for (const b of STATE.buildings) if (b.isDefense && !b.destroyed) spawnParticles(b.cx, b.cy, 10, "#A8E6FF", 0.9, "ice");
}
function wipeBase() {
  for (const b of STATE.buildings) if (!b.destroyed) { b.hp = 1; destroyBuilding(b); }
  for (const w of STATE.walls) if (!w.destroyed) destroyWall(w);
  addToast("💥", "wiped — debug clear");
}
function forceStars() { earnStar(0,"TH"); earnStar(1,"50%"); earnStar(2,"100%"); }

let thTaps = 0, thTimer = null;
function thTap() {
  thTaps++; clearTimeout(thTimer); thTimer = setTimeout(() => thTaps = 0, 650);
  if (thTaps >= 3) { thTaps = 0; gemRain(); }
}
function gemRain() {
  const gain = 24;
  STATE.gems += gain; localStorage.setItem("ds3_gems", STATE.gems);
  addToast("💎", `+${gain} gems — vault: ${fmt(STATE.gems)}`);
  updateHUD();
  for (let i = 0; i < gain; i++) {
    const g = document.createElement("div"); g.className = "egg-sprite";
    g.style.cssText = `width:${rand(18,34)|0}px;left:${rand(4,94).toFixed(1)}vw;top:-60px`;
    g.innerHTML = ""; const c = document.createElement("canvas"); c.width = 40; c.height = 40;
    c.getContext("2d").drawImage(SPR.gem, 0, 0, 40, 40); g.appendChild(c); eggLayer.appendChild(g);
    g.animate([{ transform: `translateY(0) rotate(0)`, opacity: 1 }, { transform: `translateY(${innerHeight + 120}px) rotate(${rand(-260,260)|0}deg)`, opacity: .9 }],
      { duration: rand(1200, 2400), delay: Math.random() * 0.5, easing: "cubic-bezier(.3,.1,.6,1)" });
    setTimeout(() => g.remove(), 2900);
  }
  Audio.SFX.gem();
}

/* ═════════════════════════════ INFO PANEL ═════════════════════════════ */
function showInfo(id) {
  const b = STATE.buildings.find(x => x.id === id);
  if (!b) return;
  STATE._infoId = id;
  if (b.type === "camp") { renderCampInfo(); }
  else {
    const c = CONTENT[b.type];
    if (!c) return;
    const lootLine = b.destroyed ? `<div class="info-looted">✓ LOOTED — content unlocked</div>` : (b.decor ? "" : `<div class="info-hp">STRUCTURE HP: <b>${Math.max(0, Math.ceil(b.hp))}</b> / ${b.maxHp}${b.isDefense ? " · fires on your troops" : ""}</div>`);
    const list = c.list ? `<ul class="info-list">${c.list.map(li => `<li>${li}</li>`).join("")}</ul>` : "";
    const quote = c.quote ? `<p class="info-desc" style="margin-top:16px;font-style:italic;color:var(--gold-glow)">${c.quote}</p>` : "";
    infoScroll.innerHTML = `
      <canvas class="info-art" width="120" height="120"></canvas>
      <div style="text-align:center"><span class="info-lvl">${c.lvl}</span></div>
      <h3 class="info-title" style="text-align:center">${c.title}</h3>
      <p class="info-role" style="text-align:center">${c.role}</p>
      <p class="info-dates" style="text-align:center">${c.dates}</p>
      ${c.stack ? `<p class="info-stack" style="text-align:center">${c.stack}</p>` : ""}
      <p class="info-desc">${c.body}</p>
      ${list}${quote}
      ${lootLine}
    `;
    const ac = infoScroll.querySelector(".info-art"); const ax = ac.getContext("2d");
    const spr = b.type === "th" ? SPR.th : b.type === "cannon" ? SPR.cannon : b.type === "archer" ? SPR.archer
      : b.type === "xbow" ? SPR.xbow : b.type === "beacon" ? SPR.beacon : b.type === "gold" ? SPR.gold
      : b.type === "elixir" ? SPR.elixir : b.type === "cc" ? SPR.cc : b.type === "hut" ? SPR.hut : b.type === "tree" ? SPR.tree : SPR.rubble;
    const s = spriteSize(spr);
    ax.drawImage(spr, 60 - s.w / 2 * 0.9, 120 - s.h * 0.9, s.w * 0.9, s.h * 0.9);
  }
  infoEl.classList.add("on");
}
function renderCampInfo() {
  const cards = TROOP_DEFS.map(t => `
    <div style="display:flex;gap:12px;align-items:center;padding:12px 0;border-bottom:1px solid rgba(255,255,255,.06)">
      <canvas width="48" height="56" data-tk="${t.key}"></canvas>
      <div style="flex:1">
        <div style="font-family:'Titan One';font-size:14px;color:var(--text)">${t.name} <span style="color:var(--gold);font-size:11px">· ${t.skill}</span></div>
        <div style="font-size:11px;color:var(--text-dim);line-height:1.5">${t.desc}</div>
      </div>
      <span class="info-badge" style="margin:0">LVL ${t.lvl}</span>
    </div>`).join("");
  infoScroll.innerHTML = `
    <h3 class="info-title" style="text-align:center">The Army Camp</h3>
    <p class="info-role" style="text-align:center">Divy's stack, mustered as troops.</p>
    <p class="info-dates" style="text-align:center">TAP A TROOP IN THE TRAY · TAP THE GRASS</p>
    <p class="info-desc" style="margin-top:10px">Each unit is a tool in rotation — levels earned in production, not practice mode. Deploy them and watch the base fall.</p>
    <div style="margin-top:14px">${cards}</div>
    <div class="info-looted" style="margin-top:18px">The army is you, chief. Every deploy is a commit.</div>
  `;
  $("[data-tk]", infoScroll) && $$(".info-scroll [data-tk]", infoScroll).forEach(c => {
    const key = c.dataset.tk; const ax = c.getContext("2d");
    ax.drawImage(SPR["troop_" + key], 2, -4, 48, 60);
  });
  // simpler: iterate
  $$(".info-scroll canvas[data-tk]").forEach(c => {
    const key = c.dataset.tk; const ax = c.getContext("2d");
    ax.clearRect(0,0,48,56); ax.drawImage(SPR["troop_" + key], 2, -4, 48, 60);
  });
}
infoClose.addEventListener("click", () => infoEl.classList.remove("on"));

/* ═════════════ FULL PROFILE — the entire résumé, zero gameplay required ═════════════ */
function buildProfile() {
  const job = (c) => `
    <div class="p-job">
      <div class="p-job-head">
        <div class="p-job-title">${c.title} <small>· ${c.role}</small></div>
        <div class="p-job-date">${c.dates}</div>
      </div>
      <ul>${(c.list || []).map(li => `<li>${li}</li>`).join("")}</ul>
    </div>`;
  const skills = TROOP_DEFS.map(t => `
    <span class="p-skill"><i style="background:${t.color}"></i>${t.skill}<small>LVL ${t.lvl}</small></span>`).join("");
  profileScroll.innerHTML = `
    <div class="p-head">
      <div class="p-name">DIVY SINGHVI</div>
      <div class="p-role">Product Engineer <b>@ Gradr</b> · Kubernetes Contributor</div>
      <div class="p-meta">B.TECH ECE · CTAE UDAIPUR · 2023–2027</div>
      <div class="p-links">
        <a class="p-link gold" href="mailto:divysinghvi5@gmail.com"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 7l9 6.5L21 7" fill="none" stroke="currentColor" stroke-width="2"/></svg>EMAIL</a>
        <a class="p-link" href="https://github.com/divysinghvi" target="_blank" rel="noopener"><svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8"/></svg>GITHUB</a>
        <a class="p-link" href="https://www.linkedin.com/in/divysinghvi/" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13M7.12 20.45H3.55V9h3.57zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0"/></svg>LINKEDIN</a>
        <a class="p-link" href="https://divysinghvi.vercel.app" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm4 18H6V4h7v5h5zM8 12h8v2H8zm0 4h8v2H8z"/></svg>RESUME</a>
      </div>
    </div>
    <div class="p-sect">EXPERIENCE</div>
    ${job(CONTENT.beacon)}
    ${job(CONTENT.xbow)}
    ${job(CONTENT.archer)}
    ${job(CONTENT.cannon)}
    <div class="p-sect">PROJECTS</div>
    ${job(CONTENT.gold)}
    ${job(CONTENT.elixir)}
    <div class="p-sect">ACHIEVEMENTS</div>
    <div class="p-job"><ul>${CONTENT.th.list.map(li => `<li>${li}</li>`).join("")}</ul></div>
    <div class="p-sect">SKILLS — THE ARMY</div>
    <div class="p-skills">${skills}</div>
    <div class="p-note">Happily shipping at Gradr — not job-hunting. For open source and genuinely hard problems, the gates are open.</div>
  `;
}
function openProfile() {
  if (!profileScroll.querySelector(".p-head")) buildProfile();
  profileEl.classList.add("on");
  profileEl.setAttribute("aria-hidden", "false");
}
$("#profileBtn").addEventListener("click", openProfile);
$("#scoutProfile").addEventListener("click", (e) => { e.stopPropagation(); openProfile(); });
$("#resultProfile").addEventListener("click", openProfile);
profileClose.addEventListener("click", () => profileEl.classList.remove("on"));

function closeAllPanels() {
  infoEl.classList.remove("on"); warlogEl.classList.remove("on"); resultEl.classList.remove("on");
  profileEl.classList.remove("on");
}

/* ═════════════════════════════ PHASE MACHINE ═════════════════════════════ */
function startScout() {
  STATE.phase = "scout";
  hud.classList.add("on"); hud.setAttribute("aria-hidden", "false");
  tray.classList.add("on"); tray.setAttribute("aria-hidden", "false");
  setPhase("SCOUTING THE BASE");
  scoutEl.classList.add("on"); scoutEl.setAttribute("aria-hidden", "false");
  updateHUD();
  if (AUTO) setTimeout(autoChief, 1200);
}
function startBattle() {
  if (STATE.phase === "battle") return;
  STATE.phase = "battle"; STATE.timerRunning = true;
  scoutEl.classList.remove("on"); scoutEl.setAttribute("aria-hidden", "true");
  setPhase("RAID IN PROGRESS");
  Audio.startDrums();
  updateHUD();
}
function endBattle(reason) {
  if (STATE.phase === "result") return;
  STATE.phase = "result"; STATE.timerRunning = false;
  Audio.stopDrums();
  const stars = STATE.stars.filter(Boolean).length;
  if (stars >= 3) Audio.SFX.win(); else if (stars >= 1) Audio.SFX.star(); else Audio.SFX.lose();
  // trophies
  const trophies = stars * 7 + Math.floor(STATE.damage / 10) - (3 - stars) * 2;
  const entry = { stars, damage: Math.round(STATE.damage), gold: STATE.gold, elixir: STATE.elixir, trophies, ts: Date.now(), win: stars >= 1 };
  STATE._lastEntry = entry;
  STATE.log.unshift(entry);
  if (STATE.log.length > 20) STATE.log.pop();
  saveLog();
  // gems for 3-star
  if (stars >= 3) { STATE.gems += 50; localStorage.setItem("ds3_gems", STATE.gems); }
  // render result
  resultStars.innerHTML = [0,1,2].map(i => `<svg viewBox="0 0 60 58"><path d="M30 2 L37.8 20.5 L57.8 22.2 L42.6 35.4 L47.1 55 L30 44.6 L12.9 55 L17.4 35.4 L2.2 22.2 L22.2 20.5 Z" fill="#FFC53D" stroke="#9A6A0E" stroke-width="2.5"/></svg>`).join("");
  resultStars.querySelectorAll("svg").forEach((s, i) => s.classList.toggle("earned", STATE.stars[i]));
  resultTitle.textContent = stars === 3 ? "VILLAGE DESTROYED" : stars >= 1 ? "RAID COMPLETE" : "DEFEAT";
  resultSub.textContent = stars === 3 ? "Three stars. The builder already has a clan — but the gates are open."
    : stars >= 1 ? `${stars} star${stars>1?"s":""}. He rebuilds. Faster, every time.`
    : "No stars. The base held. He rebuilds anyway.";
  rGold.textContent = fmt(STATE.gold); rElixir.textContent = fmt(STATE.elixir);
  rTrophies.textContent = (trophies >= 0 ? "+" : "") + trophies; rDamage.textContent = Math.round(STATE.damage) + "%";
  resultHint.textContent = stars >= 3 ? "raid again · or request alliance ↑" : "raid again — try giants on defenses, goblins on storages";
  resultEl.classList.add("on"); resultEl.setAttribute("aria-hidden", "false");
  resultAlly.style.display = stars >= 1 ? "" : "none";
  updateHUD();
}
function doRaidAgain() {
  resultEl.classList.remove("on"); resultEl.setAttribute("aria-hidden", "true");
  STATE.phase = "rebuild";
  buildVillage();
  // rebuild animation: stagger buildT
  STATE.buildings.forEach((b, i) => b.buildT = 0.8 + i * 0.04 + 0.4);
  STATE.walls.forEach((w, i) => w.buildT = 0.5 + i * 0.01);
  setPhase("REBUILDING");
  Audio.SFX.crumble();
  setTimeout(() => { STATE.buildings.forEach(b => b.buildT = 0); STATE.walls.forEach(w => w.buildT = 0); }, 1200);
  setTimeout(startScout, 900);
}
raidAgain.addEventListener("click", doRaidAgain);
resultAlly.addEventListener("click", () => openAlliance());

/* challenge-a-friend: encode the raid into a link; ?ch= shows a beat-that banner */
$("#shareBtn").addEventListener("click", async () => {
  const e = STATE._lastEntry;
  if (!e) return;
  const url = `${location.origin}${location.pathname}?ch=${e.stars}.${e.damage}.${Math.max(-99, e.trophies)}`;
  try {
    await navigator.clipboard.writeText(url);
    addToast("⚔️", "Challenge link copied — send it to a rival chief");
  } catch {
    prompt("Copy your challenge link:", url);
  }
});
function applyChallenge() {
  const ch = PARAMS.get("ch");
  if (!ch) return;
  const [s, d, tr] = ch.split(".").map(Number);
  if (!Number.isFinite(s) || !Number.isFinite(d)) return;
  const line = $(".scout-line");
  if (line) line.innerHTML =
    `<b style="color:var(--gold-glow)">A rival chief scored ${clamp(s,0,3)}★ · ${clamp(d,0,100)}% destruction${Number.isFinite(tr) ? ` · ${tr >= 0 ? "+" : ""}${clamp(tr,-99,99)}🏆` : ""}. Beat that.</b><br>` +
    line.innerHTML;
  addToast("📜", "Challenge received — three-star to answer it");
}
applyChallenge();

function openAlliance() {
  allyEl.classList.add("on"); allyEl.setAttribute("aria-hidden", "false");
}
allyBtn.addEventListener("click", () => { allyEl.classList.contains("on") ? allyEl.classList.remove("on") : openAlliance(); });
endBtn.addEventListener("click", () => { if (STATE.phase === "battle") endBattle("manual"); });

/* ═════════════════════════════ WAR LOG + PERSISTENCE ═════════════════════════════ */
function saveLog() {
  try { localStorage.setItem("ds3_warlog", JSON.stringify(STATE.log)); } catch (e) {}
  localStorage.setItem("ds3_gems", STATE.gems);
}
function loadLog() {
  try { STATE.log = JSON.parse(localStorage.getItem("ds3_warlog") || "[]"); } catch (e) { STATE.log = []; }
}
function renderWarLog() {
  if (!STATE.log.length) { warlogBody.innerHTML = `<div class="wl-empty">No raids yet, chief. Go three-star something.</div>`; }
  else {
    warlogBody.innerHTML = STATE.log.map(e => {
      const stars = [0,1,2].map(i => `<svg viewBox="0 0 60 58" class="${i<e.stars?'e':''}"><path d="M30 2 L37.8 20.5 L57.8 22.2 L42.6 35.4 L47.1 55 L30 44.6 L12.9 55 L17.4 35.4 L2.2 22.2 L22.2 20.5 Z" fill="#FFC53D" stroke="#9A6A0E" stroke-width="2"/></svg>`).join("");
      return `<div class="wl-row"><div class="wl-stars">${stars}</div><div class="wl-meta"><div class="wl-title">${e.stars>=3?'VILLAGE DESTROYED':e.stars>=1?'RAID COMPLETE':'DEFEAT'}</div><div class="wl-sub">${new Date(e.ts).toLocaleString()} · ${e.damage}%</div></div><div class="wl-loot"><i class="dot dot-gold"></i>${fmt(e.gold)}<br><i class="dot dot-elixir"></i>${fmt(e.elixir)}</div></div>`;
    }).join("");
  }
  wlRaids.textContent = STATE.log.length;
  wlStars.textContent = STATE.log.reduce((s, e) => s + e.stars, 0);
  wlThree.textContent = STATE.log.filter(e => e.stars >= 3).length;
  wlGems.textContent = fmt(STATE.gems);
}
logBtn.addEventListener("click", () => { renderWarLog(); warlogEl.classList.toggle("on"); });
warlogClose.addEventListener("click", () => warlogEl.classList.remove("on"));
wlReset.addEventListener("click", () => {
  STATE.log = []; STATE.gems = 0; localStorage.removeItem("ds3_warlog"); localStorage.setItem("ds3_gems", 0);
  renderWarLog(); updateHUD(); addToast("🗑️", "Vault reset");
});

/* ═════════════════════════════ AUTO-CHIEF (watch the chief raid himself / test harness) ═════════════════════════════ */
let autoT = 0, autoPhase = 0;
function autoChief() {
  if (!AUTO) return;
  startBattle();
  autoT = 0; autoPhase = 0;
  addToast("🤖", "Auto-Chief engaged — watch him raid");
}
function autoChiefStep(dt) {
  if (!AUTO || STATE.phase !== "battle") return;
  autoT += dt;
  // deploy in waves
  const waves = [
    { t: 0.2, key: "giant", n: 2, side: "tl" },
    { t: 1.0, key: "giant", n: 2, side: "br" },
    { t: 2.0, key: "healer", n: 1, side: "tl" },
    { t: 3.0, key: "archer", n: 5, side: "spread" },
    { t: 4.5, key: "barb", n: 8, side: "spread" },
    { t: 6.5, key: "wizard", n: 3, side: "bl" },
    { t: 8.5, key: "goblin", n: 6, side: "tr" },
    { t: 10.5, key: "balloon", n: 2, side: "tr" },
    { t: 13, key: "dragon", n: 1, side: "tl" },
    { t: 16, key: "barb", n: 5, side: "spread" },
  ];
  for (const w of waves) {
    if (autoPhase === waves.indexOf(w) && autoT >= w.t) {
      autoPhase++;
      const def = TROOP_DEFS.find(t => t.key === w.key);
      for (let i = 0; i < w.n; i++) {
        const pos = autoPos(w.side, i);
        if (def) deployTroop(def, pos.gx, pos.gy);
      }
    }
  }
}
function autoPos(side, i) {
  const spread = () => ({ gx: rand(1, GRID - 1), gy: rand(1, GRID - 1) });
  if (side === "spread") { let p; for (let k=0;k<30;k++){p=spread();const ix=Math.round(p.gx),iy=Math.round(p.gy);if(inBounds(ix,iy)&&DEPLOY_OK[ix][iy])return p;} return spread(); }
  // edge deploy just OUTSIDE the wall ring (walls sit at 6..16)
  const edges = { tl: [4.5, 4.5], tr: [17.5, 4.5], bl: [4.5, 17.5], br: [17.5, 17.5] };
  const e = edges[side] || edges.tl;
  return { gx: e[0] + rand(-1, 1), gy: e[1] + rand(-1, 1) };
}

/* ═════════════════════════════ MAIN LOOP ═════════════════════════════ */
let last = 0, fps = 60, fpsT = 0, fpsC = 0;
function loop(t) {
  if (!last) last = t;
  let dt = (t - last) / 1000; last = t;
  dt = Math.min(dt, 0.05);
  // fps
  fpsC++; fpsT += dt; if (fpsT >= 0.5) { fps = fpsC / fpsT; fpsT = 0; fpsC = 0; }

  if (STATE.phase === "cinem") updateCinematic(dt);
  else if (STATE.phase === "battle" || STATE.phase === "scout" || STATE.phase === "rebuild") update(dt);
  render();
  requestAnimationFrame(loop);
}
function update(dt) {
  // battle timer
  if (STATE.timerRunning && STATE.phase === "battle") {
    STATE.timer -= dt;
    STATE.timeOfDay = clamp(1 - STATE.timer / BATTLE_TIME, 0, 1) * 0.7;
    if (STATE.timer <= 0) { STATE.timer = 0; endBattle("time"); }
    else updateHUD();
  }
  if (STATE.rageTimer > 0) STATE.rageTimer -= dt;
  if (STATE.freezeTimer > 0) {
    STATE.freezeTimer -= dt;
    if (STATE.freezeTimer < 0) STATE.freezeTimer = 0;
    // ambient frost drifting off frozen defenses
    if (!REDUCED && Math.random() < 0.35) {
      const defs = STATE.buildings.filter(b => b.isDefense && !b.destroyed);
      if (defs.length) { const d = defs[Math.floor(Math.random() * defs.length)]; spawnParticles(d.cx, d.cy, 1, "#A8E6FF", 0.5, "ice"); }
    }
  }

  // build-in animation tick
  for (const b of STATE.buildings) if (b.buildT > 0) b.buildT -= dt;
  for (const w of STATE.walls) if (w.buildT > 0) w.buildT -= dt;

  tickSmoke(dt);

  // sim
  if (STATE.phase === "battle" || STATE.phase === "result" || (AUTO && STATE.phase === "battle")) {
    for (const t of STATE.troops) {
      const px = t.gx, py = t.gy;
      updateTroop(t, dt);
      t.moving = (t.gx - px) * (t.gx - px) + (t.gy - py) * (t.gy - py) > 1e-7;
    }
    for (const b of STATE.buildings) if (b.isDefense) updateDefense(b, dt);
    updateClanCastle(dt);
    updateProjectiles(dt);
    // remove dead troops
    STATE.troops = STATE.troops.filter(t => !t.dead);
    // check battle end: no ATTACKER troops and no remaining deploys (defenders alone don't prolong a raid)
    if (STATE.phase === "battle" && STATE.timerRunning) {
      const atkAlive = STATE.troops.some(t => t.team !== "def");
      const anyLeft = TROOP_DEFS.some(t => STATE.countdown[t.key] > 0 && STATE.housingUsed + t.housing <= STATE.housingCap);
      if (!atkAlive && !anyLeft) endBattle("wiped");
    }
    if (AUTO) autoChiefStep(dt);
  }
  updateParticles(dt);
  updateFloaters(dt);

  // camera shake
  if (STATE.shake > 0.1) {
    STATE.cam.shakeX = rand(-STATE.shake, STATE.shake);
    STATE.cam.shakeY = rand(-STATE.shake, STATE.shake);
    STATE.shake *= 0.86;
  } else { STATE.cam.shakeX = 0; STATE.cam.shakeY = 0; STATE.shake = 0; }
}

/* ═════════════════════════════ CINEMATIC APPROACH (one continuous shot) ═════════════════════════════ */
/* The signature scroll-film move, done in-engine: the camera flies from the clouds,
   dives past the walls, sweeps the army camp, pans the defenses, circles the Town Hall,
   then settles into battle position. The village is alive (ambient troops wander). */
const CINEM_KEYFRAMES = [
  { gx: 11,   gy: 11, z: 0.40, cap: "A VILLAGE APPEARS" },
  { gx: -2,   gy: 21, z: 0.92, cap: "THE APPROACH" },
  { gx: 6.5,  gy: 4.5, z: 1.12, cap: "OVER THE WALLS" },
  { gx: 18,   gy: 8,   z: 1.16, cap: "DEFENSES STANDING" },
  { gx: 11,   gy: 11,  z: 1.30, cap: "THE TOWN HALL" },
];
function startCinematic() {
  STATE.phase = "cinem";
  fitCamera();
  const fit = { ox: STATE.cam.ox, oy: STATE.cam.oy, z: STATE.cam.z };
  STATE.cinem.kf = CINEM_KEYFRAMES.map(k => ({
    ox: VW / 2 - (k.gx - k.gy) * TW2 * k.z,
    oy: VH / 2 - (k.gx + k.gy) * TH2 * k.z,
    z: k.z, cap: k.cap,
  }));
  STATE.cinem.kf.push({ ox: fit.ox, oy: fit.oy, z: fit.z, cap: "" });
  STATE.cinem.t = 0; STATE.cinem.active = true; STATE.cinem.cap = "__";
  // ambient village life: a few barbs milling near the camp
  spawnAmbient();
  // letterbox + caption + skip
  cinemBars.classList.add("on");
  cinemSkip.style.opacity = "1"; cinemSkip.style.pointerEvents = "auto";
  Audio.init();
}
function spawnAmbient() {
  const def = TROOP_DEFS[0]; // barbarian
  for (let i = 0; i < 5; i++) {
    const gx = rand(4, 8.5), gy = rand(4, 8.5);
    STATE.troops.push({
      def, key: def.key, gx, gy, hp: def.hp, maxHp: def.hp, dead: false,
      target: null, wallTarget: null, cooldown: 0, retargetT: 0,
      bob: rand(0, TAU), facing: 1, attackAnim: 0, air: false, jumps: false,
      secret: false, rageT: 0, deployT: 0, ambient: true, wanderT: 0, wx: gx, wy: gy,
    });
  }
}
function updateAmbient(t, dt) {
  t.bob += dt * 5;
  t.wanderT -= dt;
  if (t.wanderT <= 0) {
    t.wx = clamp(t.gx + rand(-3.5, 3.5), 2.5, GRID - 2.5);
    t.wy = clamp(t.gy + rand(-3.5, 3.5), 2.5, GRID - 2.5);
    t.wanderT = rand(1.6, 3.6);
  }
  const dx = t.wx - t.gx, dy = t.wy - t.gy, d = Math.hypot(dx, dy) || 1;
  t.moving = d > 0.3;
  if (d > 0.3) {
    const step = 1.25 * dt;
    t.gx += dx / d * step; t.gy += dy / d * step;
    t.facing = dx >= 0 ? 1 : -1;
  }
}
function updateCinematic(dt) {
  const C = STATE.cinem;
  C.t += dt;
  const p = clamp(C.t / C.dur, 0, 1);
  const n = C.kf.length - 1;
  let seg = Math.floor(p * n);
  if (seg >= n) seg = n - 1;
  if (seg < 0) seg = 0;
  const lp = (p * n) - seg;
  const e = lp * lp * (3 - 2 * lp);                 // smoothstep
  const a = C.kf[seg], b = C.kf[seg + 1];
  STATE.cam.ox = lerp(a.ox, b.ox, e);
  STATE.cam.oy = lerp(a.oy, b.oy, e);
  STATE.cam.z = lerp(a.z, b.z, e);
  const cap = e > 0.55 ? b.cap : a.cap;
  if (cap && cap !== C.cap) { C.cap = cap; cinemCap.textContent = cap; cinemCap.style.opacity = "1"; }
  else if (!cap && C.cap) { C.cap = ""; cinemCap.style.opacity = "0"; }
  // ambient life + torch flicker
  for (const t of STATE.troops) if (t.ambient) updateAmbient(t, dt);
  tickSmoke(dt);
  updateParticles(dt);
  if (p >= 1) endCinematic();
}
function endCinematic() {
  if (!STATE.cinem.active) return;
  STATE.cinem.active = false;
  fitCamera();
  STATE.troops = STATE.troops.filter(t => !t.ambient);
  STATE.particles = STATE.particles.filter(p => p.kind !== "dust");
  cinemBars.classList.remove("on");
  cinemCap.style.opacity = "0";
  cinemSkip.style.opacity = "0"; cinemSkip.style.pointerEvents = "none";
  startScout();
}
cinemSkip.addEventListener("click", endCinematic);

/* ═════════════════════════════ BOOT ═════════════════════════════ */
function boot() {
  // ensure sprites ready (they're synchronous)
  loadLog();
  resize();
  buildVillage();
  // loader
  const TIPS = [
    "Tip: real chiefs know the code. ↑↑↓↓←→←→BA",
    "Tip: the Town Hall hates being tapped three times.",
    "Tip: type hogrider, pekka, godmode, or freeze. Anywhere.",
    "Tip: Giants tank defenses. Goblins grab the loot.",
    "Tip: try ?auto and watch the chief raid himself.",
    "Tip: this base was built with 0 gems and 1 canvas.",
  ];
  loaderTip.textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
  let pct = 0;
  const tick = () => {
    pct = Math.min(100, pct + rand(8, 22));
    loaderBar.style.width = pct + "%"; loaderPct.textContent = Math.round(pct) + "%";
    if (pct >= 100) {
      setTimeout(() => {
        loader.style.transition = "opacity .5s ease, transform .5s ease";
        loader.style.opacity = "0"; loader.style.transform = "translateY(-100%)";
        setTimeout(() => loader.remove(), 500);
        if (AUTO || REDUCED) startScout(); else startCinematic();
      }, 250);
    } else setTimeout(tick, 120);
  };
  setTimeout(tick, 200);

  // console egg
  console.log(
    "%c🛡 DIVY SINGHVI — TH15 · LVL 189 %c\nYou inspect element like a true engineer.\nThe real loot: divysinghvi5@gmail.com · github.com/divysinghvi\nTry ?auto, ?debug — type hogrider, pekka, godmode, rage, freeze.",
    "font-size:16px;font-weight:900;color:#FFC53D;background:#10173A;padding:8px 14px;border-radius:8px",
    "font-size:12px;color:#7E90B4"
  );
}

/* sound toggle */
soundBtn.addEventListener("click", () => {
  Audio.init(); Audio.resume();
  const m = !Audio.isMuted(); Audio.setMute(m);
  soundIcon.textContent = m ? "✕" : "♪";
  if (!m) Audio.startDrums();
  addToast(m ? "🔇" : "🔊", m ? "muted" : "sound on");
});
// init audio on first interaction
["pointerdown","keydown"].forEach(ev => addEventListener(ev, () => { Audio.init(); }, { once: true }));

addEventListener("resize", () => { resize(); });
window.addEventListener("load", () => { /* sprites already built */ });

/* mark ready for the verify harness */
window.__ready = true;
/* debug/test access to internals */
window.__game = { STATE, iso, screenToGrid, fitCamera, get OCC() { return OCC; }, get DEPLOY_OK() { return DEPLOY_OK; }, deployTroop, TROOP_DEFS, endBattle, groundOriginScreen, get VW() { return VW; }, get groundW() { return groundW; } };

boot();
requestAnimationFrame(loop);
})();
