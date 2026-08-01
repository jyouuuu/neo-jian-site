/* ==========================================================================
   FANART REEL — film-strip gallery. Continuous rightward roll, drag to
   fling it faster either way, arrow buttons accelerate, click a frame to
   enlarge. Respects the SUGGESTIVE toggle.
   ========================================================================== */
(function () {
  "use strict";

  const SUG_KEY = "jian_suggestive";
  const BASE_SPEED = 46;   // px/s rightward
  const ARROW_BOOST = 380; // px/s while an arrow is held
  const MAX_FLING = 900;

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    const data = window.JIAN_FANART;
    const host = document.getElementById("fanReel");
    if (!data || !data.length || !host) return;
    const SFX = () => window.JIAN_SFX;
    const isSFW = () => localStorage.getItem(SUG_KEY) === "off";

    let track, view;
    let offset = 0, half = 0;
    let vel = 0;              // fling velocity, decays to 0
    let arrowVel = 0;         // held-arrow velocity
    let dragging = false, dragX = 0, dragDist = 0, dragVel = 0;
    let hovering = false;

    /* ------------------------------------------------ enlarge overlay ---- */
    let ob = null;
    function enlarge(p) {
      if (!ob) {
        ob = document.createElement("div");
        ob.className = "reelbox";
        ob.innerHTML = `<img alt=""><div class="reelbox__cap"></div>`;
        document.body.appendChild(ob);
        ob.addEventListener("click", closeBox);
        window.addEventListener("keydown", (e) => { if (e.key === "Escape") closeBox(); });
      }
      ob.querySelector("img").src = p.img;
      ob.querySelector("img").alt = `fanart by ${p.by}`;
      ob.querySelector(".reelbox__cap").textContent = "by @" + p.by;
      ob.classList.add("is-open");
      SFX() && SFX().pop();
    }
    function closeBox() {
      if (ob && ob.classList.contains("is-open")) {
        ob.classList.remove("is-open");
        SFX() && SFX().unpop();
      }
    }

    /* ------------------------------------------------ build -------------- */
    function build() {
      const items = data.filter((p) => !(isSFW() && p.sug));
      offset = 0; half = 0; vel = 0;
      host.innerHTML = `
        <div class="reel">
          <button class="reel__arrow reel__arrow--l" type="button" aria-label="Scroll left">&lt;</button>
          <div class="reel__view"><div class="reel__track"></div></div>
          <button class="reel__arrow reel__arrow--r" type="button" aria-label="Scroll right">&gt;</button>
        </div>
        <p class="wall-hint" style="margin-top:10px;">the reel rolls on its own — <kbd>drag</kbd> to fling it, hold the <kbd>&lt; &gt;</kbd> arrows, <kbd>click</kbd> a frame to enlarge.</p>`;
      view = host.querySelector(".reel__view");
      track = host.querySelector(".reel__track");

      const mk = (p) => {
        const b = document.createElement("button");
        b.className = "reel__item";
        b.type = "button";
        b.setAttribute("aria-label", `enlarge fanart by ${p.by}`);
        b._piece = p; // click resolution happens in the drag handlers (pointer capture steals real clicks)
        const img = document.createElement("img");
        img.src = p.img;
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        img.addEventListener("load", measure);
        b.appendChild(img);
        return b;
      };
      // two copies back-to-back → seamless wrap
      items.concat(items).forEach((p) => track.appendChild(mk(p)));

      wireDrag();
      wireArrows();
      measure();
    }

    function measure() {
      if (track) half = track.scrollWidth / 2;
    }

    /* ------------------------------------------------ drag to fling ------ */
    function wireDrag() {
      let downItem = null;
      view.addEventListener("pointerdown", (e) => {
        dragging = true; dragX = e.clientX; dragDist = 0; dragVel = 0;
        downItem = e.target.closest(".reel__item");
        try { view.setPointerCapture(e.pointerId); } catch (err) { /* synthetic/edge pointers */ }
      });
      view.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        const dx = e.clientX - dragX;
        dragX = e.clientX;
        offset += dx;
        dragDist += Math.abs(dx);
        dragVel = dragVel * 0.75 + dx * 60 * 0.25;
      });
      const end = () => {
        if (!dragging) return;
        dragging = false;
        if (dragDist < 8 && downItem && downItem._piece) {
          // it was a tap, not a drag → enlarge the frame that was tapped
          vel = 0;
          enlarge(downItem._piece);
        } else {
          vel = Math.max(-MAX_FLING, Math.min(MAX_FLING, dragVel));
        }
        downItem = null;
      };
      view.addEventListener("pointerup", end);
      view.addEventListener("pointercancel", end);
      view.addEventListener("pointerenter", () => { hovering = true; });
      view.addEventListener("pointerleave", () => { hovering = false; });
    }

    /* ------------------------------------------------ arrows ------------- */
    function wireArrows() {
      const bind = (sel, v) => {
        const btn = host.querySelector(sel);
        const on = (e) => { e.preventDefault(); arrowVel = v; SFX() && SFX().thock(); };
        const off = () => { arrowVel = 0; };
        btn.addEventListener("pointerdown", on);
        btn.addEventListener("pointerup", off);
        btn.addEventListener("pointerleave", off);
        btn.addEventListener("pointercancel", off);
      };
      bind(".reel__arrow--l", -ARROW_BOOST);
      bind(".reel__arrow--r", ARROW_BOOST);
    }

    /* ------------------------------------------------ main loop ---------- */
    let last = performance.now();
    function tick(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      vel -= vel * Math.min(1, dt * 2.6); // fling decays
      let v = BASE_SPEED + vel + arrowVel;
      if (hovering && !dragging) v *= 0.3;
      offset += v * dt;
      if (half > 0) {
        while (offset >= 0) offset -= half;
        while (offset <= -half) offset += half;
        track.style.transform = `translate3d(${offset}px,0,0)`;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);

    window.addEventListener("load", measure);
    document.addEventListener("jian:sfw", build);

    build();
  });
})();
