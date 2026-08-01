/* ==========================================================================
   THE WALL — jiansketch interactive gallery
   Sweep the cursor, it sings. Tiles pop, spark, and glow.
   Click a tile for the full piece. Year-separated, density-switchable.
   ========================================================================== */
(function () {
  "use strict";

  const SFX = () => window.JIAN_SFX;
  const GLOWS = ["#fb38cc", "#66f7ff", "#ffe45e", "#4bff88", "#ed64f5"];
  const YEAR_ORDER = ["2026", "2025", "2024", "2023", "2022", "2021", "2020", "PROJ"];
  const MIN_NOTE_GAP = 34; // ms — fast sweeps become glissando, not mush
  let lastNote = 0;
  let liveSparks = 0;
  const MAX_SPARKS = 150;

  /* ------------------------------------------------ particles ------------ */
  function burst(x, y, color, big) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const n = big ? 16 : 7;
    for (let k = 0; k < n; k++) {
      if (liveSparks > MAX_SPARKS) return;
      const s = document.createElement("div");
      s.className = "spark";
      const size = 4 + Math.random() * (big ? 10 : 6);
      const c = Math.random() < 0.25 ? "#ffffff" : color || GLOWS[(Math.random() * GLOWS.length) | 0];
      s.style.setProperty("--c", c);
      s.style.background = c;
      s.style.boxShadow = `0 0 6px ${c}`;
      s.style.width = s.style.height = size + "px";
      s.style.left = x + "px";
      s.style.top = y + "px";
      if (Math.random() < 0.3) s.style.borderRadius = "50%";
      document.body.appendChild(s);
      liveSparks++;

      const ang = Math.random() * Math.PI * 2;
      const dist = (big ? 90 : 46) + Math.random() * (big ? 130 : 55);
      const dx = Math.cos(ang) * dist;
      const dy = Math.sin(ang) * dist - (big ? 40 : 20);
      const rot = (Math.random() - 0.5) * 540;
      const dur = 450 + Math.random() * (big ? 600 : 350);

      const anim = s.animate(
        [
          { transform: "translate(-50%,-50%) rotate(0deg) scale(1)", opacity: 1 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 30}px)) rotate(${rot}deg) scale(0.1)`, opacity: 0 },
        ],
        { duration: dur, easing: "cubic-bezier(0.1, 0.8, 0.3, 1)" }
      );
      anim.onfinish = () => { s.remove(); liveSparks--; };
    }
  }

  /* ------------------------------------------------ lightbox ------------- */
  const lb = {
    el: null, img: null, cap: null, list: [], idx: 0,
    build() {
      if (this.el) return;
      const el = document.createElement("div");
      el.className = "lightbox";
      el.innerHTML = `
        <div class="lightbox__frame">
          <img class="lightbox__img" alt="">
          <div class="lightbox__cap"></div>
        </div>
        <button class="lb-btn lb-btn--prev" aria-label="Previous">&lt;</button>
        <button class="lb-btn lb-btn--next" aria-label="Next">&gt;</button>
        <button class="lb-btn lb-btn--close" aria-label="Close">X</button>`;
      document.body.appendChild(el);
      this.el = el;
      this.img = el.querySelector(".lightbox__img");
      this.cap = el.querySelector(".lightbox__cap");
      el.addEventListener("click", (e) => { if (e.target === el) this.close(); });
      el.querySelector(".lb-btn--close").addEventListener("click", () => this.close());
      el.querySelector(".lb-btn--prev").addEventListener("click", () => this.step(-1));
      el.querySelector(".lb-btn--next").addEventListener("click", () => this.step(1));
      window.addEventListener("keydown", (e) => {
        if (!this.el.classList.contains("is-open")) return;
        if (e.key === "Escape") this.close();
        if (e.key === "ArrowLeft") this.step(-1);
        if (e.key === "ArrowRight") this.step(1);
      });
    },
    open(list, idx) {
      this.build();
      this.list = list;
      this.idx = idx;
      this.show();
      this.el.classList.add("is-open");
      document.body.style.overflow = "hidden";
      SFX() && SFX().pop();
    },
    show() {
      const p = this.list[this.idx];
      this.img.src = p.f;
      this.img.alt = `jiansketch ${p.y} #${p.n}`;
      this.cap.innerHTML = `<b>${p.y}</b> &nbsp;·&nbsp; piece #${p.n} &nbsp;·&nbsp; ${this.idx + 1}/${this.list.length}`;
      [1, -1].forEach((d) => {
        const q = this.list[(this.idx + d + this.list.length) % this.list.length];
        if (q) new Image().src = q.f;
      });
    },
    step(d) {
      this.idx = (this.idx + d + this.list.length) % this.list.length;
      this.show();
      const r = this.img.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, null, false);
      SFX() && SFX().swish(d);
    },
    close() {
      this.el.classList.remove("is-open");
      document.body.style.overflow = "";
      SFX() && SFX().unpop();
      if (history.replaceState) history.replaceState(null, "", location.pathname);
    },
  };

  /* ------------------------------------------------ tiles ---------------- */
  function pop(tile, i, x, y, big) {
    const now = performance.now();
    if (now - lastNote >= MIN_NOTE_GAP) {
      lastNote = now;
      const r = tile.getBoundingClientRect();
      const pan = ((r.left + r.width / 2) / window.innerWidth) * 2 - 1;
      SFX() && SFX().plink(i, pan);
    }
    burst(x, y, tile.style.getPropertyValue("--glow"), big);
    tile.classList.remove("is-hot");
    void tile.offsetWidth;
    tile.classList.add("is-hot");
    clearTimeout(tile._hotT);
    tile._hotT = setTimeout(() => tile.classList.remove("is-hot"), big ? 900 : 450);
  }

  function makeTile(p, i, wall) {
    const b = document.createElement("button");
    b.className = "tile";
    b.type = "button";
    b.style.setProperty("--glow", GLOWS[i % GLOWS.length]);
    b.style.setProperty("--tilt", (Math.random() * 5 - 2.5).toFixed(2) + "deg");
    b.setAttribute("aria-label", `open ${p.y} piece ${p.n}`);
    const img = document.createElement("img");
    img.src = p.t;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    b.appendChild(img);

    b.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "touch") return;
      pop(b, i, e.clientX, e.clientY, false);
    });
    b.addEventListener("pointerdown", () => { SFX() && SFX().thock(); });
    b.addEventListener("click", () => {
      const visible = wall.visiblePieces();
      lb.open(visible, visible.indexOf(p));
    });
    return b;
  }

  /* ------------------------------------------------ wall (year sections) - */
  function initWall(container, pieces) {
    const tiles = [];
    const sections = {}; // year -> {divider, grid, count}
    let idx = 0;

    const empty = document.createElement("div");
    empty.className = "wall-empty";
    empty.style.display = "none";

    const api = {
      tiles,
      visiblePieces() {
        return tiles.filter((t) => t.el.style.display !== "none" && t.el.closest(".wall").style.display !== "none").map((t) => t.piece);
      },
      filter(year) {
        let shown = 0;
        Object.keys(sections).forEach((y) => {
          const on = year === "ALL" || y === year;
          sections[y].divider.style.display = on ? "" : "none";
          sections[y].grid.style.display = on ? "" : "none";
          if (on) shown += sections[y].count;
        });
        if (shown === 0 && year !== "ALL") {
          empty.style.display = "";
          empty.innerHTML = `${year} — nothing on the wall yet.<br><br>new pieces drop here first. stay tuned ★`;
        } else {
          empty.style.display = "none";
        }
      },
      setSfw(sfw) {
        tiles.forEach((t) => {
          t.el.style.display = sfw && t.piece.sug ? "none" : "";
        });
      },
      party() {
        const vis = tiles.filter((t) => t.el.style.display !== "none" && t.el.closest(".wall").style.display !== "none");
        SFX() && SFX().party();
        vis.forEach((t, k) => {
          const r = t.el.getBoundingClientRect();
          const delay = (r.left + r.top) * 0.3;
          setTimeout(() => {
            pop(t.el, k, r.left + r.width / 2, r.top + r.height / 2, true);
          }, Math.min(delay, 1500));
        });
        setTimeout(() => SFX() && SFX().chord(), 1600);
      },
    };

    YEAR_ORDER.forEach((year) => {
      const group = pieces.filter((p) => String(p.y) === year);
      if (!group.length) return;
      const divider = document.createElement("div");
      divider.className = "wall-year";
      divider.innerHTML = `${year === "PROJ" ? "PROJECTS" : year} <span>${group.length} pieces</span>`;
      const grid = document.createElement("div");
      grid.className = "wall";
      container.appendChild(divider);
      container.appendChild(grid);
      sections[year] = { divider, grid, count: group.length };
      group.forEach((p) => {
        const t = makeTile(p, idx, api);
        tiles.push({ el: t, piece: p, year });
        grid.appendChild(t);
        idx++;
      });
    });

    container.appendChild(empty);
    return api;
  }

  /* ------------------------------------------------ grid density --------- */
  const GRID_SIZES = { S: "76px", M: "110px", L: "158px" };
  function initGridCtl() {
    const saved = localStorage.getItem("jian_grid") || "S";
    const apply = (k) => {
      document.documentElement.style.setProperty("--tile", GRID_SIZES[k] || GRID_SIZES.S);
      document.querySelectorAll("[data-grid]").forEach((c) => c.classList.toggle("is-on", c.dataset.grid === k));
      localStorage.setItem("jian_grid", k);
    };
    document.querySelectorAll("[data-grid]").forEach((c) => {
      c.addEventListener("click", () => { apply(c.dataset.grid); SFX() && SFX().tick(); });
    });
    apply(saved);
  }

  /* ------------------------------------------------ boot ----------------- */
  function boot() {
    const data = window.JIAN_ART;
    if (!data || !data.length) return;

    const wallEl = document.getElementById("wall");
    if (wallEl) {
      const wall = initWall(wallEl, data);
      // SUGGESTIVE toggle — initial state + live changes
      wall.setSfw(localStorage.getItem("jian_suggestive") === "off");
      document.addEventListener("jian:sfw", (e) => wall.setSfw(e.detail.sfw));
      initGridCtl();
      const chips = document.querySelectorAll("[data-filter]");
      chips.forEach((c) => {
        c.addEventListener("click", () => {
          chips.forEach((o) => o.classList.remove("is-on"));
          c.classList.add("is-on");
          wall.filter(c.dataset.filter);
          SFX() && SFX().tick();
          wallEl.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      });
      const partyBtn = document.getElementById("partyBtn");
      if (partyBtn) partyBtn.addEventListener("click", () => wall.party());

      // sidebar index links drive the same filters
      document.querySelectorAll("[data-jump]").forEach((a) => {
        a.addEventListener("click", (e) => {
          e.preventDefault();
          const target = document.querySelector(`[data-filter="${a.dataset.jump}"]`);
          if (target) target.click();
        });
      });

      // deep link: art#p=2024/37 opens that piece
      if (location.hash.startsWith("#p=")) {
        const key = location.hash.slice(3);
        const idx = data.findIndex((p) => p.y + "/" + p.n === key);
        if (idx >= 0) lb.open(data, idx);
      }
      const hint = document.querySelector(".wall-hint");
      if (hint) window.addEventListener("pointermove", () => { hint.style.opacity = "0.4"; }, { once: true });
    }

    // mini teaser wall (home page) — manifest is newest-first
    const mini = document.getElementById("miniWall");
    if (mini) initMini(mini, data.slice(0, 14));
  }

  function initMini(container, pieces) {
    pieces.forEach((p, i) => {
      const a = document.createElement("a");
      a.className = "tile";
      a.href = `art#p=${p.y}/${p.n}`;
      a.style.setProperty("--glow", GLOWS[i % GLOWS.length]);
      a.style.setProperty("--tilt", (Math.random() * 5 - 2.5).toFixed(2) + "deg");
      const img = document.createElement("img");
      img.src = p.t;
      img.alt = "";
      img.loading = "lazy";
      a.appendChild(img);
      a.addEventListener("pointerenter", (e) => {
        if (e.pointerType === "touch") return;
        pop(a, i, e.clientX, e.clientY, false);
      });
      container.appendChild(a);
    });
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
