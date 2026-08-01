/* ==========================================================================
   jiansketch shared chrome — sound toggle, UI ticks, unlock toast
   ========================================================================== */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    const SFX = window.JIAN_SFX;

    // SUGGESTIVE toggle — site-wide SFW switch (persisted)
    const SUG_KEY = "jian_suggestive";
    const SFW_API = {
      isSFW() { return localStorage.getItem(SUG_KEY) === "off"; },
      setSFW(v) {
        localStorage.setItem(SUG_KEY, v ? "off" : "on");
        applySug();
        document.dispatchEvent(new CustomEvent("jian:sfw", { detail: { sfw: v } }));
      },
    };
    window.JIAN_SFW = SFW_API;
    function applySug() {
      const sfw = SFW_API.isSFW();
      document.documentElement.classList.toggle("sfw", sfw);
      document.querySelectorAll(".nav-btn--sug").forEach((b) => {
        b.textContent = sfw ? "SUGGESTIVE: OFF" : "SUGGESTIVE: ON";
        b.setAttribute("aria-pressed", sfw ? "false" : "true");
      });
    }
    document.querySelectorAll(".nav-btn--sug").forEach((b) => {
      b.addEventListener("click", () => {
        SFW_API.setSFW(!SFW_API.isSFW());
        SFX.tick();
      });
    });
    applySug();

    // mobile hamburger nav
    const menuBtn = document.querySelector(".nav-btn--menu");
    const navbar = document.querySelector(".navbar");
    if (menuBtn && navbar) {
      menuBtn.addEventListener("click", () => {
        const open = navbar.classList.toggle("is-open");
        menuBtn.textContent = open ? "CLOSE ✕" : "MENU ☰";
        SFX.tick();
      });
      navbar.querySelectorAll("a.nav-btn").forEach((a) => {
        a.addEventListener("click", () => {
          navbar.classList.remove("is-open");
          menuBtn.textContent = "MENU ☰";
        });
      });
    }

    // sound toggle button(s)
    document.querySelectorAll(".nav-btn--sound").forEach((btn) => {
      btn.setAttribute("aria-pressed", SFX.isEnabled() ? "true" : "false");
      btn.textContent = SFX.isEnabled() ? "SOUND: ON" : "SOUND: OFF";
      btn.addEventListener("click", () => {
        const on = SFX.toggle();
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        btn.textContent = on ? "SOUND: ON" : "SOUND: OFF";
      });
    });

    // quiet ticks on chunky UI
    document.querySelectorAll(".nav-btn:not(.nav-btn--sound), .chip, .home-link, .btn").forEach((el) => {
      el.addEventListener("pointerenter", (e) => {
        if (e.pointerType === "touch") return;
        SFX.tick();
      });
    });

    // "click for sound" toast — sticks around until audio is actually unlocked.
    // (skipped on the splash gate: the OK button there IS the first click)
    if (SFX.isEnabled() && !SFX.isUnlocked() && !document.body.classList.contains("splash")) {
      const toast = document.createElement("div");
      toast.className = "sfx-toast";
      toast.textContent = "SOUND IS ARMED — click anywhere once, the wall sings";
      document.body.appendChild(toast);
      setTimeout(() => toast.classList.add("is-in"), 500);
      document.addEventListener("jian:sfx-unlocked", () => {
        toast.textContent = "SOUND ON ✓";
        setTimeout(() => {
          toast.classList.remove("is-in");
          setTimeout(() => toast.remove(), 500);
        }, 1200);
      }, { once: true });
    }
  });
})();
