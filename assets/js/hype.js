// ===========================================================================
//  hype.js — the dopamine layer.
//  (Sep 5 2026, Justin: "Make it dopamanergic and encourage clicks on shop
//  links and other things".) Four small things, none of them load-bearing —
//  pull this file and every page still works, it's just stiller:
//    1. COUNTDOWN  — any [data-countdown="ISO date"] ticks down live
//                    ("18D 07H 22M"), flips to "CLOSED" when it passes.
//    2. REVEAL     — cards, tiles and posters pop in as they scroll into view.
//    3. DOCK       — on phones, a fixed SHOP / COMMS / CLUB bar (markup is in
//                    the page; this only keeps it out of the way of the footer).
//    4. ZAP        — a sparkle burst from wherever a button is pressed.
//  Everything animated checks prefers-reduced-motion first.
// ===========================================================================
(function () {
  "use strict";
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- 1. countdown ---------------------------------------------------------
  const cds = Array.from(document.querySelectorAll("[data-countdown]"));
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function tick() {
    const now = Date.now();
    cds.forEach((el) => {
      const end = Date.parse(el.getAttribute("data-countdown"));
      if (isNaN(end)) return;
      let ms = end - now;
      if (ms <= 0) { el.textContent = el.getAttribute("data-countdown-over") || "CLOSED"; el.classList.add("is-over"); return; }
      const d = Math.floor(ms / 864e5); ms -= d * 864e5;
      const h = Math.floor(ms / 36e5); ms -= h * 36e5;
      const m = Math.floor(ms / 6e4); ms -= m * 6e4;
      const s = Math.floor(ms / 1e3);
      const fmt = el.getAttribute("data-countdown-format") || "dhm";
      el.innerHTML = fmt === "dhms"
        ? "<b>" + d + "D</b> " + pad(h) + "H " + pad(m) + "M " + pad(s) + "S"
        : "<b>" + d + "D</b> " + pad(h) + "H " + pad(m) + "M";
    });
  }
  if (cds.length) { tick(); setInterval(tick, 1000); }

  // ---- 2. reveal on scroll -------------------------------------------------
  const targets = document.querySelectorAll(".box, .postr, .commsad, .drop-tile, .bundle, .winbox, .price-card, .post, .tooth, .sign, .shelf__item, .plushgal, .signs__head");
  if (!reduce && "IntersectionObserver" in window && targets.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    targets.forEach((el, k) => {
      // anything already on screen at load stays put — only what scrolls in pops
      const r = el.getBoundingClientRect();
      if (r.top < innerHeight * 0.9) return;
      el.classList.add("reveal");
      if (el.classList.contains("drop-tile") || el.classList.contains("bundle")) {
        el.classList.add("reveal--pop");
        el.style.transitionDelay = ((k % 6) * 45) + "ms";
      }
      io.observe(el);
    });
  }

  // ---- 3. dock — hide while the footer is in view so it never covers it ---
  const dock = document.querySelector(".dock");
  const footer = document.querySelector(".footer");
  if (dock && footer && "IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      dock.style.transform = entries[0].isIntersecting ? "translateY(110%)" : "";
      dock.style.transition = "transform 0.25s ease";
    }, { threshold: 0.15 }).observe(footer);
  }

  // ---- 4. zap — the burst under the thumb ----------------------------------
  if (!reduce) {
    document.addEventListener("pointerdown", (e) => {
      const btn = e.target.closest(".btn, .nav-btn, .link-btn, .drop-tile, .bundle, .dock a, .deck__tab, .comms-btn, .sign, .shelf__item, .plushgal__thumb, .plushgal__arrow, .comms-promo__item, .price-card__shot, .chip");
      if (!btn) return;
      for (let i = 0; i < 7; i++) {
        const z = document.createElement("span");
        z.className = "zap";
        z.textContent = i % 2 ? "✦" : "★";
        const a = (i / 7) * Math.PI * 2 + Math.random() * 0.5;
        const r = 34 + Math.random() * 30;
        z.style.left = e.clientX + "px";
        z.style.top = e.clientY + "px";
        z.style.setProperty("--dx", Math.cos(a) * r + "px");
        z.style.setProperty("--dy", Math.sin(a) * r + "px");
        document.body.appendChild(z);
        setTimeout(() => z.remove(), 600);
      }
    }, { passive: true });
  }

  // ---- 5. touch — a tick under the pointer, a thock under the thumb --------
  // (Sep 5 2026, Justin: "Make it fun and dopamanergic to click around the
  // site".) main.js already ticks the nav, the chips and .btn on hover; this
  // covers the cards and tiles it never knew about, and adds a press-down
  // thock + a 140ms squash to everything that sells. Sound only plays while
  // the SOUND toggle is on; the squash only while motion is allowed.
  const HOVER = ".drop-tile, .bundle, .sign, .shelf__item, .comms-promo__item, .price-card__shot, .plushgal__thumb, .plushgal__arrow, .deck__tab, .deck__arrow, .link-btn, .postr__art, .free-card .media, .dock a";
  const PRESS = ".btn, .nav-btn--shop, .nav-btn--comms, .sign, .shelf__item, .drop-tile, .bundle, .dock a, .comms-promo__item, .price-card__shot, .link-btn, .comms-btn, .plushgal__thumb";
  function sfx() { return window.JIAN_SFX; }
  document.addEventListener("pointerover", (e) => {
    if (e.pointerType === "touch") return;
    const el = e.target.closest(HOVER);
    if (!el || (e.relatedTarget && el.contains(e.relatedTarget))) return;   // still inside the same card
    if (sfx() && sfx().isEnabled()) sfx().tick();
  });
  document.addEventListener("pointerdown", (e) => {
    const el = e.target.closest(PRESS);
    if (!el) return;
    if (sfx() && sfx().isEnabled()) sfx().thock();
    if (!reduce) { el.classList.add("is-pressed"); setTimeout(() => el.classList.remove("is-pressed"), 140); }
  }, { passive: true });
})();
