/* ═══════════ THREE STARS — motion engine ═══════════
   Scroll-film: one continuous raid. Pinned scenes are created
   in order FIRST; ambient/entrance triggers AFTER (refresh order). */

(() => {
  "use strict";

  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const JUMP = new URLSearchParams(location.search).get("jump");
  const DEBUG = new URLSearchParams(location.search).has("debug");
  if (JUMP !== null) history.scrollRestoration = "manual";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ── Divy's real base stats (TH15, lvl 189, almost maxed) ── */
  const LOOT_GOLD = 18359231;
  const LOOT_ELIXIR = 17580218;
  const fmt = n => Math.round(n).toLocaleString("en-US");

  /* ─────────── content: the army camp ─────────── */
  const TROOPS = [
    { name: "Go",             lvl: 9, max: true,  c: "#00ADD8", t: "#04303B", desc: "Daily driver. Gin APIs, IAM platforms, concurrency without tears." },
    { name: "Kubernetes",     lvl: 9, max: true,  c: "#326CE5", t: "#0E2358", desc: "Doesn't just deploy it — patches Minikube upstream." },
    { name: "Svelte",         lvl: 9, max: true,  c: "#FF3E00", t: "#5A1600", desc: "SvelteKit ships Gradr's entire product surface." },
    { name: "Python",         lvl: 8, max: false, c: "#3776AB", t: "#123A5C", desc: "Django, FastAPI, data pipelines of suspicious efficiency." },
    { name: "JavaScript",     lvl: 8, max: false, c: "#F7DF1E", t: "#4A4206", desc: "The good parts. Also the parts animating this raid." },
    { name: "PostgreSQL",     lvl: 8, max: false, c: "#336791", t: "#12293D", desc: "Schema sieges, query raids, zero loot lost." },
    { name: "Docker",         lvl: 8, max: false, c: "#2496ED", t: "#0A3A63", desc: "The troops ship in containers. All of them." },
    { name: "Redis",          lvl: 7, max: false, c: "#D82C20", t: "#57100A", desc: "The fast loot cache. Sub-millisecond raids." },
    { name: "Prisma",         lvl: 7, max: false, c: "#5A67D8", t: "#1F2557", desc: "The ORM of the realm at Gradr." },
    { name: "Grafana",        lvl: 7, max: false, c: "#F46800", t: "#5C2800", desc: "Watchtowers — literal observability. Loki & Prometheus enlisted." },
    { name: "GH Actions",     lvl: 7, max: false, c: "#2088FF", t: "#0A3163", desc: "Automated war drums. CI that fails less since he showed up." },
    { name: "Flutter",        lvl: 6, max: false, c: "#02569B", t: "#01223E", desc: "Mobile sorties, with Java & Dart in the ranks." },
  ];

  function buildTroops() {
    const track = $("#troopTrack");
    track.innerHTML = TROOPS.map(t => `
      <div class="troop-card${t.max ? " is-max" : ""}">
        <span class="tc-lvl">LVL ${t.lvl}${t.max ? " · MAX" : ""}</span>
        <div class="tc-portrait" style="background:linear-gradient(180deg,${t.c},${t.t})">${t.name[0]}</div>
        <div class="tc-name">${t.name}</div>
        <div class="tc-desc">${t.desc}</div>
        <div class="tc-bar"><i style="width:${t.lvl * 10}%"></i></div>
      </div>`).join("");
  }

  function buildWallGrid() {
    const grid = $("#wallGrid");
    const piece = `<svg class="wall-piece" viewBox="0 0 120 120"><use href="#sym-wall2"/></svg>`;
    grid.innerHTML = `
      <div class="wall-scene" id="wallScene">
        <div class="wall-grass"></div>
        <div class="wall-line wall-line-back">${piece.repeat(9)}</div>
        <div class="wall-line wall-line-front">${piece.repeat(8)}</div>
        <div class="impact-flash" id="impactFlash"></div>
      </div>`;
  }

  function buildStarfield() {
    const layer = $("#starfield");
    let html = "";
    for (let i = 0; i < 90; i++) {
      const s = (Math.random() * 1.8 + 0.7).toFixed(1);
      html += `<span class="star-dot" style="left:${(Math.random() * 100).toFixed(2)}%;top:${(Math.random() * 70).toFixed(2)}%;width:${s}px;height:${s}px;opacity:${(Math.random() * .6 + .25).toFixed(2)}"></span>`;
    }
    layer.innerHTML = html;
  }

  /* ─────────── HUD: damage, stars, loot ─────────── */
  let damage = 0;
  const stars = [false, false, false];
  const starDefs = [
    { at: 50,  label: "FIRST STAR" },
    { at: 75,  label: "SECOND STAR" },
    { at: 100, label: "VILLAGE DESTROYED" },
  ];

  function setDamage(v) {
    v = Math.max(0, Math.min(100, v));
    if (v <= damage) return;
    damage = v;
    $("#damagePct").textContent = Math.round(damage);
    $("#goldCount").textContent = fmt(LOOT_GOLD * damage / 100);
    $("#elixirCount").textContent = fmt(LOOT_ELIXIR * damage / 100);
    starDefs.forEach((s, i) => { if (!stars[i] && damage >= s.at) earnStar(i); });
  }

  function earnStar(i) {
    stars[i] = true;
    const el = $("#star" + (i + 1));
    el.classList.add("earned");
    if (REDUCED) return;
    gsap.fromTo(el, { scale: 2.6, rotation: -30 }, { scale: 1, rotation: 0, duration: .6, ease: "back.out(2.5)" });
    const toast = $("#starToast");
    toast.innerHTML = `<svg viewBox="0 0 60 58"><use href="#sym-star"/></svg><div class="st-label">★ ${starDefs[i].at}% — ${starDefs[i].label}</div>`;
    gsap.timeline()
      .set(toast, { opacity: 0, scale: 2.2 })
      .to(toast, { opacity: 1, scale: 1, duration: .45, ease: "back.out(2)" })
      .to(toast, { opacity: 0, scale: .9, duration: .5, ease: "power2.in" }, "+=1.1");
    addToast("⭐", `${starDefs[i].label} earned`);
  }

  function addToast(icon, text) {
    const zone = $("#toastZone");
    const t = document.createElement("div");
    t.className = "toast";
    t.innerHTML = `<span class="t-icon">${icon}</span><span>${text}</span>`;
    zone.appendChild(t);
    if (!REDUCED) gsap.from(t, { x: 140, opacity: 0, duration: .5, ease: "back.out(1.8)" });
    setTimeout(() => {
      if (REDUCED) { t.remove(); return; }
      gsap.to(t, { x: 140, opacity: 0, duration: .4, ease: "power2.in", onComplete: () => t.remove() });
    }, 3600);
  }

  const setChapter = name => { $("#chapterLabel").textContent = name; };
  const setChapterBar = p => { $("#chapterBar").style.width = (p * 100).toFixed(1) + "%"; };

  /* ─────────── boot ─────────── */
  buildStarfield();
  buildWallGrid();
  buildTroops();

  /* console easter egg */
  console.log(
    "%c🛡 DIVY SINGHVI — TH15 · LVL 189 %c\nYou inspect element like a true engineer.\nThe real loot: divysinghvi5@gmail.com · github.com/divysinghvi",
    "font-size:16px;font-weight:900;color:#FFC53D;background:#10173A;padding:8px 14px;border-radius:8px",
    "font-size:12px;color:#7E90B4"
  );

  if (REDUCED) {
    /* static, dignified fallback: everything readable, no scrub */
    document.body.classList.add("reduced");
    $("#hud").classList.add("on");
    $("#damagePct").textContent = "100";
    $("#goldCount").textContent = fmt(LOOT_GOLD);
    $("#elixirCount").textContent = fmt(LOOT_ELIXIR);
    $$(".hud-star").forEach(s => s.classList.add("earned"));
    $$(".count").forEach(c => { c.textContent = (+c.dataset.count).toLocaleString("en-US"); });
    $("#destroyStamp").style.opacity = 1;
    window.addEventListener("load", () => { window.__ready = true; });
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* Lenis — skipped under ?jump (dev contract) */
  let lenis = null;
  if (JUMP === null) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ══════════ LOADING SCREEN (CoC-style clouds-and-tips) ══════════ */
  {
    const loader = $("#loader");
    if (JUMP !== null || navigator.webdriver) loader.remove();
    else {
      const TIPS = [
        "Tip: real chiefs know the code. ↑↑↓↓←→←→BA",
        "Tip: the Town Hall hates being clicked three times.",
        "Tip: type “hogrider” anywhere. You know you want to.",
        "Tip: this village was built with 0 gems and 1 keyboard.",
        "Tip: scroll = raid. No troops required.",
        "Tip: type “barbarian” if you need to yell.",
      ];
      $("#loaderTip").textContent = TIPS[Math.floor(Math.random() * TIPS.length)];
      if (lenis) lenis.stop();
      gsap.timeline()
        .to("#loaderBar", { width: "100%", duration: 1.4, ease: "power1.inOut" })
        .to(loader, {
          yPercent: -100, duration: .6, ease: "power3.inOut",
          onComplete: () => { loader.remove(); if (lenis) lenis.start(); },
        }, "+=.15");
    }
  }

  /* ══════════ SCENE 1 · THE APPROACH ══════════ */
  {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "#approach", start: "top top", end: "+=170%",
        pin: true, pinSpacing: true, scrub: true,
        onUpdate: st => {
          setChapterBar(st.progress);
          if (st.progress > .35) $("#hud").classList.add("on");
        },
        onToggle: st => st.isActive && setChapter("THE APPROACH"),
      },
    });
    tl.to(".cloud-far.cloud-left",  { xPercent: -55, yPercent: 12 }, 0)
      .to(".cloud-far.cloud-right", { xPercent: 55,  yPercent: 12 }, 0)
      .to(".cloud-mid.cloud-left",  { xPercent: -75, yPercent: 18 }, 0)
      .to(".cloud-mid.cloud-right", { xPercent: 75,  yPercent: 18 }, 0)
      .to(".cloud-near.cloud-left", { xPercent: -105, yPercent: 26 }, 0)
      .to(".cloud-near.cloud-right",{ xPercent: 105,  yPercent: 26 }, 0)
      .to(".cloud-far, .cloud-mid", { opacity: 0, ease: "power1.in", duration: .45 }, .35)
      .to(".cloud-center", { yPercent: 120, opacity: 0, ease: "power1.in", duration: .5 }, .1)
      .to(".scroll-hint", { opacity: 0, duration: .1 }, 0)
      .to(".hero-copy", { yPercent: -60, opacity: 0, ease: "power1.in" }, .05)
      .fromTo(".village-reveal", { scale: .84, yPercent: 46 }, { scale: 1, yPercent: 0, ease: "power1.out" }, 0)
      .to(".moon", { yPercent: -40, opacity: .5 }, .3)
      .fromTo("#raidStamp", { opacity: 0, scale: 2.8, rotation: -7 }, { opacity: 1, scale: 1, rotation: -7, duration: .12, ease: "back.out(2)" }, .74)
      /* camera dives into the village → scene 1 exits as empty sky, no visible seam */
      .to(".village-reveal", { scale: 1.6, yPercent: 26, opacity: 0, ease: "power2.in", duration: .18 }, .82)
      .to([".moon", "#balloon", ".stars-layer"], { opacity: 0, duration: .12 }, .86)
      .to("#raidStamp", { opacity: 0, scale: 1.2, duration: .1, ease: "power2.in" }, .92);
  }

  /* ══════════ SCENE 2 · THE WALLS → ARMY CAMP ══════════ */
  {
    const track = $("#troopTrack");
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "#walls", start: "top top", end: "+=300%",
        pin: true, scrub: true, invalidateOnRefresh: true,
        onUpdate: st => { setChapterBar(st.progress); setDamage(st.progress * 28); },
        onToggle: st => st.isActive && setChapter("THE WALLS"),
      },
    });
    tl.fromTo("#walls .chapter-plate", { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: .07 }, .01)
      .to("#walls .chapter-plate", { opacity: 0, y: -80, duration: .06 }, .16)
      .to("#impactFlash", { keyframes: [{ opacity: .85 }, { opacity: 0 }], duration: .05 }, .2)
      .to("#wallScene", { keyframes: [{ x: -14 }, { x: 12 }, { x: -8 }, { x: 6 }, { x: 0 }], duration: .08 }, .2)
      .to(".wall-piece", {
        xPercent: () => gsap.utils.random(-320, 320),
        y: () => gsap.utils.random(-70, -16) + "vh",
        rotation: () => gsap.utils.random(-420, 420),
        opacity: 0,
        duration: .24,
        ease: "power2.in",
        stagger: { amount: .08, from: "center" },
      }, .22)
      .to(".wall-grass", { yPercent: 130, opacity: 0, duration: .14 }, .3)
      .fromTo(".troop-head", { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: .08 }, .3)
      .fromTo(".troop-card", { opacity: 0, y: 90, rotation: 3 }, { opacity: 1, y: 0, rotation: 0, duration: .1, stagger: .012, ease: "back.out(1.6)" }, .34)
      .to(track, {
        x: () => -(track.scrollWidth - innerWidth + innerWidth * .12),
        ease: "none",
        duration: .52,
      }, .46);
  }

  /* ══════════ SCENE 3 · THE DEFENSES ══════════ */
  {
    const col = $("#defenseCol");
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "#defenses", start: "top top", end: "+=300%",
        pin: true, scrub: true, invalidateOnRefresh: true,
        onUpdate: st => { setChapterBar(st.progress); setDamage(28 + st.progress * 28); },
        onToggle: st => st.isActive && setChapter("THE DEFENSES"),
      },
    });
    tl.fromTo("#defenses .chapter-plate", { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: .06 }, .01)
      .to("#defenses .chapter-plate", { opacity: 0, y: -80, duration: .05 }, .13)
      .to(col, { y: () => -(col.scrollHeight - innerHeight), ease: "none", duration: .84 }, .14);
    $$("#defenseCol .defense").forEach((d, i) => {
      tl.fromTo(d, { opacity: .15, scale: .92 }, { opacity: 1, scale: 1, duration: .1 }, .16 + i * .19);
    });
  }

  /* ══════════ SCENE 4 · THE STORAGES ══════════ */
  {
    const counters = $$("#storages .count").map(el => ({ el, target: +el.dataset.count, proxy: { v: 0 } }));
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "#storages", start: "top top", end: "+=240%",
        pin: true, scrub: true,
        onUpdate: st => { setChapterBar(st.progress); setDamage(56 + st.progress * 26); },
        onToggle: st => st.isActive && setChapter("THE STORAGES"),
      },
    });
    tl.fromTo("#storages .chapter-plate", { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: .07 }, .01)
      .to("#storages .chapter-plate", { opacity: 0, y: -80, duration: .06 }, .14)
      .fromTo("#storeGold",   { opacity: 0, y: 110, rotation: -3 }, { opacity: 1, y: 0, rotation: 0, duration: .1, ease: "back.out(1.7)" }, .2)
      .fromTo("#storeElixir", { opacity: 0, y: 110, rotation: 3 },  { opacity: 1, y: 0, rotation: 0, duration: .1, ease: "back.out(1.7)" }, .26)
      /* the crack: shake + flash */
      .to("#storeGold .store-svg",   { keyframes: [{ rotation: -6 }, { rotation: 6 }, { rotation: -4 }, { rotation: 0 }], duration: .08 }, .38)
      .to("#storeGold .crack-flash", { keyframes: [{ opacity: 1 }, { opacity: 0 }], duration: .1 }, .38)
      .to("#storeElixir .store-svg",   { keyframes: [{ rotation: 6 }, { rotation: -6 }, { rotation: 4 }, { rotation: 0 }], duration: .08 }, .44)
      .to("#storeElixir .crack-flash", { keyframes: [{ opacity: 1 }, { opacity: 0 }], duration: .1 }, .44)
      .fromTo("#lootStrip", { opacity: 0, y: 80 }, { opacity: 1, y: 0, duration: .1, ease: "back.out(1.6)" }, .5);
    counters.forEach(c => {
      tl.to(c.proxy, {
        v: c.target, duration: .4, ease: "power1.out",
        onUpdate: () => { c.el.textContent = fmt(c.proxy.v); },
      }, .42);
    });
  }

  /* ══════════ SCENE 5 · THE TOWN HALL ══════════ */
  {
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "#townhall", start: "top top", end: "+=260%",
        pin: true, scrub: true,
        onUpdate: st => { setChapterBar(st.progress); setDamage(82 + st.progress * 18.5); },
        onToggle: st => st.isActive && setChapter("THE TOWN HALL"),
      },
    });
    tl.fromTo("#townhall .chapter-plate", { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: .06 }, .01)
      .to("#townhall .chapter-plate", { opacity: 0, y: -80, duration: .05 }, .8)
      .fromTo("#thWrap", { opacity: 0, scale: .85, y: 60 }, { opacity: 1, scale: 1, y: 0, duration: .08, ease: "back.out(1.5)" }, .06)
      .fromTo("#townhall .th-about", { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: .08 }, .14)
      /* the siege: shake builds */
      .to("#thSvg", { keyframes: [{ x: -3 }, { x: 3 }, { x: -5 }, { x: 5 }, { x: -3 }, { x: 0 }], duration: .12 }, .3)
      .to("#thDust", { opacity: .5, duration: .08 }, .34)
      .to("#thSvg", { keyframes: [{ x: -7 }, { x: 7 }, { x: -8 }, { x: 8 }, { x: 0 }], duration: .12 }, .46)
      /* the fall */
      .to("#thSvg", { scaleY: .58, scaleX: 1.08, y: "12%", rotation: 2.5, duration: .1, ease: "power3.in" }, .6)
      .to("#thDust", { opacity: 1, scale: 1.4, duration: .08 }, .62)
      .to("#thDust", { opacity: 0, duration: .12 }, .78)
      .fromTo("#destroyStamp", { opacity: 0, scale: 2.6, rotation: -6 }, { opacity: 1, scale: 1, rotation: -6, duration: .1, ease: "back.out(2)" }, .72);
  }

  /* ══════════ SCENE 6 · THE REBUILD ══════════ */
  {
    const stage = $("#rebuild .stage");
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: "#rebuild", start: "top top", end: "+=220%",
        pin: true, scrub: true,
        onUpdate: st => setChapterBar(st.progress),
        onToggle: st => st.isActive && setChapter("THE REBUILD"),
      },
    });
    tl.to(stage, { "--reb-top": "#FFB877", "--reb-bot": "#FFE9CF", duration: .6, ease: "none" }, .1)
      .to(".sun", { opacity: 1, y: -30, duration: .3 }, .15)
      .fromTo(".rebuild-title", { opacity: 0, y: 50 }, { opacity: 1, y: 0, duration: .1 }, .05)
      .fromTo(".rebuild-sub", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: .1 }, .12)
      .to([".rebuild-title", ".rebuild-sub"], { color: "#382913", textShadow: "0 3px 0 rgba(255,255,255,.4)", duration: .3 }, .35)
      .fromTo("#rebuildVillage .v-b", { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: .16, stagger: .045, ease: "back.out(2)" }, .25)
      .fromTo("#rebuildVillage .v-walls", { opacity: 0 }, { opacity: 1, duration: .15, stagger: .1 }, .55)
      .fromTo("#builderSprite", { x: 0 }, { x: () => innerWidth * .4, ease: "none", duration: .7 }, .25);
  }

  /* ══════════ AMBIENT + ENTRANCES (created AFTER all pins) ══════════ */

  /* star twinkle (not scroll-driven) */
  $$("#starfield .star-dot").slice(0, 28).forEach(s => {
    gsap.to(s, { opacity: .1, duration: gsap.utils.random(1.2, 3), repeat: -1, yoyo: true, delay: Math.random() * 2, ease: "sine.inOut" });
  });

  /* builder hammer swing (infinite) — clickable for a morale boost */
  const hammer = gsap.to("#builderSprite .builder-arm", { rotation: -38, transformOrigin: "10% 80%", duration: .4, repeat: -1, yoyo: true, ease: "power1.inOut" });
  $("#builderSprite").addEventListener("click", () => {
    addToast("🔨", "+1 morale — the builder hammers faster");
    hammer.timeScale(3);
    gsap.delayedCall(3, () => hammer.timeScale(1));
    gsap.fromTo("#builderSprite", { y: 0 }, { y: -18, duration: .18, yoyo: true, repeat: 1, ease: "power2.out" });
  });

  /* hero entrance (load anim, chars) — skipped under ?jump so shots land settled */
  {
    const h = $("#heroTitle");
    h.innerHTML = [...h.textContent].map(c => `<span class="ch">${c === " " ? "&nbsp;" : c}</span>`).join("");
    if (JUMP === null) {
      gsap.from("#heroTitle .ch", { yPercent: 130, opacity: 0, duration: .9, stagger: .045, ease: "back.out(1.8)", delay: 2.1 });
      gsap.from(".hero-kicker, .hero-sub, .hero-tag", { opacity: 0, y: 24, duration: .8, stagger: .12, delay: 2.8, ease: "power2.out" });
    }
  }

  /* balloon drifting across the hero sky */
  gsap.fromTo("#balloon", { x: "-14vw" }, { x: "114vw", duration: 70, repeat: -1, ease: "none", delay: 5 });
  gsap.to("#balloon", { y: 26, duration: 3.2, repeat: -1, yoyo: true, ease: "sine.inOut" });

  /* alliance entrances */
  gsap.from(".alliance-inner > *", {
    scrollTrigger: { trigger: "#alliance", start: "top 72%" },
    opacity: 0, y: 50, duration: .8, stagger: .09, ease: "power2.out",
  });
  ScrollTrigger.create({
    trigger: "#alliance",
    start: "top 60%",
    onToggle: st => st.isActive && setChapter("REQUEST ALLIANCE"),
  });

  /* bottom-of-page achievement (once) */
  ScrollTrigger.create({
    trigger: ".footer", start: "top 95%", once: true,
    onEnter: () => addToast("🏅", "3-STARRED THE PORTFOLIO — true chief status"),
  });

  /* ══════════ EASTER EGGS ══════════ */
  const eggLayer = $("#eggLayer");

  function goblinRaid() {
    addToast("👀", "GOBLIN RAID! They're going for the loot!");
    for (let i = 0; i < 10; i++) {
      const g = document.createElement("div");
      g.className = "egg-sprite";
      g.style.cssText = `width:${gsap.utils.random(44, 74)}px;left:-90px;top:${gsap.utils.random(45, 86)}vh`;
      g.innerHTML = `<svg viewBox="0 0 90 90"><use href="#sym-goblin"/></svg>`;
      eggLayer.appendChild(g);
      gsap.to(g, { x: innerWidth + 200, duration: gsap.utils.random(1.6, 2.8), delay: i * .12, ease: "none", onComplete: () => g.remove() });
      gsap.to(g, { y: "-=18", duration: .22, repeat: 12, yoyo: true, ease: "sine.inOut", delay: i * .12 });
    }
  }

  function hogRide() {
    const h = document.createElement("div");
    h.className = "egg-sprite";
    h.style.cssText = "width:180px;left:-220px;bottom:16vh";
    h.innerHTML = `<svg viewBox="0 0 150 110"><use href="#sym-hog"/></svg>`;
    eggLayer.appendChild(h);
    const yell = document.createElement("div");
    yell.className = "egg-yell";
    yell.textContent = "HOG RIDERRRR!";
    eggLayer.appendChild(yell);
    gsap.fromTo(yell, { opacity: 0, scale: 2.4 }, { opacity: 1, scale: 1, duration: .3, ease: "back.out(2)" });
    gsap.to(yell, { opacity: 0, duration: .4, delay: 1.2, onComplete: () => yell.remove() });
    gsap.to(h, { x: innerWidth + 460, duration: 1.5, ease: "power1.in", onComplete: () => h.remove() });
    gsap.to(h, { y: "-=26", duration: .18, repeat: 8, yoyo: true, ease: "sine.inOut" });
  }

  function gemRain() {
    const total = 24;
    const bank = (+localStorage.getItem("ds_gems") || 0) + total;
    localStorage.setItem("ds_gems", bank);
    addToast("💎", `+${total} gems — vault: ${fmt(bank)}`);
    for (let i = 0; i < total; i++) {
      const g = document.createElement("div");
      g.className = "egg-sprite";
      g.style.cssText = `width:${gsap.utils.random(18, 34)}px;left:${gsap.utils.random(4, 94)}vw;top:-60px`;
      g.innerHTML = `<svg viewBox="0 0 40 40"><use href="#sym-gem"/></svg>`;
      eggLayer.appendChild(g);
      gsap.to(g, { y: innerHeight + 120, rotation: gsap.utils.random(-260, 260), duration: gsap.utils.random(1.2, 2.4), delay: Math.random() * .5, ease: "power1.in", onComplete: () => g.remove() });
    }
  }

  function barbCharge() {
    const b = document.createElement("div");
    b.className = "egg-sprite";
    b.style.cssText = "width:110px;left:-140px;bottom:14vh";
    b.innerHTML = `<svg viewBox="0 0 90 100"><use href="#sym-barb"/></svg>`;
    eggLayer.appendChild(b);
    const yell = document.createElement("div");
    yell.className = "egg-yell";
    yell.textContent = "AAAAAAAH!";
    eggLayer.appendChild(yell);
    gsap.fromTo(yell, { opacity: 0, scale: 2 }, { opacity: 1, scale: 1, duration: .25, ease: "back.out(2)" });
    gsap.to(yell, { opacity: 0, duration: .35, delay: 1, onComplete: () => yell.remove() });
    gsap.to(b, { x: innerWidth + 300, duration: 1.8, ease: "power1.in", onComplete: () => b.remove() });
    gsap.to(b, { y: -20, duration: .16, repeat: 10, yoyo: true, ease: "sine.inOut" });
  }

  /* ambient scurries: every so often a troop crosses the bottom of the screen */
  function scurryOnce() {
    const kind = gsap.utils.random(["goblin", "hog", "barb"]);
    const size = kind === "hog" ? 120 : 68;
    const vb = kind === "hog" ? "0 0 150 110" : kind === "goblin" ? "0 0 90 90" : "0 0 90 100";
    const el = document.createElement("div");
    el.className = "egg-sprite";
    el.style.cssText = `width:${size}px;left:-150px;bottom:${gsap.utils.random(3, 9).toFixed(1)}vh`;
    el.innerHTML = `<svg viewBox="${vb}"><use href="#sym-${kind}"/></svg>`;
    eggLayer.appendChild(el);
    gsap.to(el, { x: innerWidth + 320, duration: gsap.utils.random(5, 9), ease: "none", onComplete: () => el.remove() });
    gsap.to(el, { y: -14, duration: .3, repeat: 20, yoyo: true, ease: "sine.inOut" });
    gsap.delayedCall(gsap.utils.random(40, 85), scurryOnce);
  }
  gsap.delayedCall(18, scurryOnce);

  /* key sequences */
  const KONAMI = ["arrowup","arrowup","arrowdown","arrowdown","arrowleft","arrowright","arrowleft","arrowright","b","a"];
  let keyBuf = [];
  let letterBuf = "";
  addEventListener("keydown", e => {
    keyBuf.push(e.key.toLowerCase());
    if (keyBuf.length > 14) keyBuf.shift();
    if (KONAMI.every((k, i) => keyBuf[keyBuf.length - KONAMI.length + i] === k)) { keyBuf = []; goblinRaid(); }
    if (/^[a-z]$/.test(e.key)) {
      letterBuf = (letterBuf + e.key).slice(-24);
      if (letterBuf.endsWith("hogrider")) { letterBuf = ""; hogRide(); }
      if (letterBuf.endsWith("mentalasylum")) { letterBuf = ""; addToast("🏰", "Clan recognized. Welcome home, chief."); }
      if (letterBuf.endsWith("barbarian")) { letterBuf = ""; barbCharge(); }
      if (letterBuf.endsWith("gradr")) { letterBuf = ""; addToast("🇸🇪", "Hej chief! Shipping for Gradr from the north."); }
    }
  });

  /* town-hall triple click → gem rain */
  {
    let clicks = 0, timer = null;
    $("#thWrap").addEventListener("click", () => {
      clicks++;
      clearTimeout(timer);
      timer = setTimeout(() => { clicks = 0; }, 650);
      if (clicks >= 3) { clicks = 0; gemRain(); }
    });
  }

  /* ══════════ DEV CONTRACT + JANK METER ══════════ */
  if (DEBUG) {
    const meter = document.createElement("div");
    meter.style.cssText = "position:fixed;left:10px;bottom:10px;z-index:99;font:11px 'JetBrains Mono';color:#0f0;background:rgba(0,0,0,.6);padding:4px 8px;border-radius:6px";
    document.body.appendChild(meter);
    let last = performance.now(), max = 0;
    const tick = () => {
      const now = performance.now();
      max = Math.max(max, now - last); last = now;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setInterval(() => { meter.textContent = `rAF max ${max.toFixed(1)}ms`; console.log("[jank] max", max.toFixed(1)); max = 0; }, 2000);
  }

  window.addEventListener("load", async () => {
    try { await document.fonts.ready; } catch {}
    ScrollTrigger.refresh();
    if (JUMP !== null) {
      /* enforce the jump position through any late refresh/restore, then settle */
      const y = +JUMP || 0;
      const until = performance.now() + 1500;
      const enforce = () => { if (Math.abs(scrollY - y) > 2) scrollTo(0, y); };
      ScrollTrigger.addEventListener("refresh", enforce);
      (function loop() {
        enforce();
        if (performance.now() < until) { requestAnimationFrame(loop); return; }
        ScrollTrigger.update();
        /* force-settle every scrubbed animation at its trigger's progress */
        ScrollTrigger.getAll().forEach(st => { if (st.animation) st.animation.totalProgress(st.progress); });
        requestAnimationFrame(() => requestAnimationFrame(() => { window.__ready = true; }));
      })();
    } else {
      requestAnimationFrame(() => { window.__ready = true; });
    }
  });
})();
