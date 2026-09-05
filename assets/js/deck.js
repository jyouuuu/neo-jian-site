// ===========================================================================
//  deck.js — the hero as a slideshow.
//  (Sep 4 2026, Justin: "the mini news on the hero is too small, make it a
//  slide show of all the latest news".) The hero and the three small NOW
//  cards under it became one hero-sized deck: slide 1 is still the Sticker
//  Club (it's what loads), and the drop, the plush and VGen each get the
//  same footprint instead of a 68px thumbnail.
//
//  Markup is in home.html (.deck > .deck__track > .deck__slide). Everything
//  below is optional on top of it: with no JS at all, slide 1 shows and the
//  page is fine. What this adds —
//    * arrows, the numbered tabs, ←/→ on the keyboard, swipe on touch
//    * a 7s auto-advance with a progress bar along the top; it PAUSES while
//      the pointer or focus is on the deck, while the tab is hidden, and it
//      never runs at all under prefers-reduced-motion
//    * a page-turn swish (SFX.swish) on MANUAL changes only — the auto-advance
//      stays silent, a sound every seven seconds would be a nightmare
//  No lambdas-in-state, no libraries — same as the rest of the site.
// ===========================================================================
(function () {
  "use strict";

  const deck = document.getElementById("deck");
  if (!deck) return;
  const slides = Array.from(deck.querySelectorAll(".deck__slide"));
  const tabs = Array.from(deck.querySelectorAll(".deck__tab"));
  const track = deck.querySelector(".deck__track");
  const bar = deck.querySelector(".deck__bar");
  if (slides.length < 2) return;

  const HOLD = 7000;                       // ms a slide sits before advancing
  const SWIPE = 44;                        // px of horizontal travel that counts
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  let at = slides.findIndex((s) => s.classList.contains("is-on"));
  if (at < 0) at = 0;
  let timer = null;
  let hovering = false;
  let focused = false;

  function sfxOn() {
    return window.SFX && typeof SFX.isEnabled === "function" && SFX.isEnabled();
  }

  function paint() {
    slides.forEach((s, k) => {
      s.classList.toggle("is-on", k === at);
      s.setAttribute("aria-hidden", k === at ? "false" : "true");
    });
    const cnt = deck.querySelector("[data-deck-count]");
    if (cnt) cnt.textContent = (at + 1 < 10 ? "0" : "") + (at + 1);
    tabs.forEach((t, k) => {
      t.classList.toggle("is-on", k === at);
      t.setAttribute("aria-selected", k === at ? "true" : "false");
      t.tabIndex = k === at ? 0 : -1;
    });
  }

  function show(i, manual) {
    const next = ((i % slides.length) + slides.length) % slides.length;
    const dir = next === (at + 1) % slides.length ? 1 : -1;
    if (next !== at) {
      at = next;
      paint();
      if (manual && sfxOn()) SFX.swish(dir);
    }
    arm();
  }

  // the auto-advance — one timer, re-armed from scratch after ANY change so a
  // manual click always buys a full 7s before the next turn
  function arm() {
    clearTimeout(timer);
    timer = null;
    const idle = reduce || hovering || focused || document.hidden;
    deck.classList.toggle("is-auto", !idle);
    if (idle) return;
    if (bar) {                             // restart the bar's CSS animation
      bar.style.animation = "none";
      void bar.offsetWidth;
      bar.style.animation = "";
    }
    timer = setTimeout(() => show(at + 1, false), HOLD);
  }

  // ---- controls -----------------------------------------------------------
  deck.querySelectorAll(".deck__arrow--prev").forEach((b) => b.addEventListener("click", () => show(at - 1, true)));
  deck.querySelectorAll(".deck__arrow--next").forEach((b) => b.addEventListener("click", () => show(at + 1, true)));
  tabs.forEach((t, k) => t.addEventListener("click", () => show(k, true)));

  deck.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); show(at - 1, true); }
    else if (e.key === "ArrowRight") { e.preventDefault(); show(at + 1, true); }
  });

  // ---- pause while the reader is ON it ------------------------------------
  deck.addEventListener("pointerenter", (e) => { if (e.pointerType !== "touch") { hovering = true; arm(); } });
  deck.addEventListener("pointerleave", (e) => { if (e.pointerType !== "touch") { hovering = false; arm(); } });
  deck.addEventListener("focusin", () => { focused = true; arm(); });
  deck.addEventListener("focusout", (e) => {
    if (!deck.contains(e.relatedTarget)) { focused = false; arm(); }
  });
  document.addEventListener("visibilitychange", arm);

  // ---- swipe --------------------------------------------------------------
  // horizontal travel past SWIPE turns the page; a plain tap still hits the
  // buttons underneath because we only ever act on movement, never on down/up
  let sx = null, sy = null;
  track.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    sx = e.clientX; sy = e.clientY;
  });
  track.addEventListener("pointerup", (e) => {
    if (sx === null) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    sx = sy = null;
    if (Math.abs(dx) < SWIPE || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    show(at + (dx < 0 ? 1 : -1), true);
  });
  track.addEventListener("pointercancel", () => { sx = sy = null; });

  paint();
  arm();
})();
