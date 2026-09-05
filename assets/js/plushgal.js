// ===========================================================================
//  plushgal.js — the plush section's gallery.
//  (Sep 5 2026, Justin: "Show examples of the plush on the plush section,
//  theres large empty space for a slideshow".) The photos are CraftifyX's
//  own shots of the JESTER SKULLS sample, pulled off the live product page
//  and framed square on cream (assets/img/plush/). Markup is in home.html
//  (#plushgal); with no JS the first photo shows and the thumbs are still
//  pictures, nothing breaks. This adds:
//    * click a thumb / the arrows / ←→ while it has focus, swipe on touch
//    * a 4.2s auto-advance that stops while the pointer is on it, while it
//      is off screen, while the tab is hidden, and never under reduced-motion
//    * a small pop on MANUAL changes only (the auto turn is silent)
//  No lambdas in state, no libraries — same as the rest of the site.
// ===========================================================================
(function () {
  "use strict";

  const gal = document.getElementById("plushgal");
  if (!gal) return;
  const main = gal.querySelector(".plushgal__img");
  const cap = gal.querySelector(".plushgal__cap");
  const thumbs = Array.from(gal.querySelectorAll(".plushgal__thumb"));
  if (!main || thumbs.length < 2) return;

  const HOLD = 4200;
  const SWIPE = 40;
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let at = 0;
  let timer = null;
  let hovering = false;
  let seen = true;

  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function sfx() { return window.JIAN_SFX; }

  function show(i, how) {
    const next = ((i % thumbs.length) + thumbs.length) % thumbs.length;
    if (next !== at || how === "init") {
      at = next;
      const t = thumbs[at];
      main.src = t.getAttribute("data-full");
      main.alt = t.getAttribute("data-alt") || "";
      main.classList.toggle("is-fit", t.getAttribute("data-fit") === "contain");
      if (cap) cap.innerHTML = "<b>" + pad(at + 1) + "/" + pad(thumbs.length) + "</b>" + (t.getAttribute("data-cap") || "");
      thumbs.forEach((x, k) => {
        x.classList.toggle("is-on", k === at);
        x.setAttribute("aria-pressed", k === at ? "true" : "false");
      });
      if (!reduce && how !== "init") {
        main.classList.remove("is-pop");
        void main.offsetWidth;
        main.classList.add("is-pop");
      }
      if (how === "manual" && sfx() && sfx().isEnabled()) sfx().unpop();
    }
    arm();
  }

  function arm() {
    clearTimeout(timer);
    timer = null;
    if (reduce || hovering || !seen || document.hidden) return;
    timer = setTimeout(() => show(at + 1, "auto"), HOLD);
  }

  thumbs.forEach((t, k) => t.addEventListener("click", () => show(k, "manual")));
  gal.querySelectorAll(".plushgal__arrow--prev").forEach((b) => b.addEventListener("click", () => show(at - 1, "manual")));
  gal.querySelectorAll(".plushgal__arrow--next").forEach((b) => b.addEventListener("click", () => show(at + 1, "manual")));

  gal.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") { e.preventDefault(); show(at - 1, "manual"); }
    else if (e.key === "ArrowRight") { e.preventDefault(); show(at + 1, "manual"); }
  });
  gal.addEventListener("pointerenter", (e) => { if (e.pointerType !== "touch") { hovering = true; arm(); } });
  gal.addEventListener("pointerleave", (e) => { if (e.pointerType !== "touch") { hovering = false; arm(); } });
  document.addEventListener("visibilitychange", arm);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((en) => { seen = en[0].isIntersecting; arm(); }, { threshold: 0.2 }).observe(gal);
  }

  // swipe on the big frame — only ever on movement, so a tap still hits the arrows
  const frame = gal.querySelector(".plushgal__frame");
  let sx = null, sy = null;
  if (frame) {
    frame.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse" && e.button !== 0) return; sx = e.clientX; sy = e.clientY; });
    frame.addEventListener("pointerup", (e) => {
      if (sx === null) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      sx = sy = null;
      if (Math.abs(dx) < SWIPE || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      show(at + (dx < 0 ? 1 : -1), "manual");
    });
    frame.addEventListener("pointercancel", () => { sx = sy = null; });
  }

  // fetch the rest once the page is idle, so the first click doesn't wait
  const pre = () => thumbs.forEach((t) => { const im = new Image(); im.src = t.getAttribute("data-full"); });
  if ("requestIdleCallback" in window) requestIdleCallback(pre); else setTimeout(pre, 1500);

  show(0, "init");
})();
