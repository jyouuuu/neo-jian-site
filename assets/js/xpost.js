/* ==========================================================================
   LIVE FROM X.EXE / BSKY.EXE — renders the latest post from data/xpost.js
   (self-hosted card, refreshed by tools/update_x.py from X or Bluesky,
   whichever has the newer post — no widgets required)
   ========================================================================== */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    const host = document.getElementById("xPost");
    const p = window.JIAN_XPOST;
    if (!host || !p) return;

    // the post can come from X or Bluesky (whichever is newer) — rebrand
    // the window chrome to match the source
    const isBsky = p.net === "bsky";
    const box = host.closest(".winbox");
    const bar = box && box.querySelector(".winbox__bar");
    if (bar && isBsky) {
      bar.style.background = "#0085ff";
      bar.childNodes[0].nodeValue = "LIVE FROM BSKY.EXE ";
    }

    const card = document.createElement("div");
    card.className = "x-card";

    const av = document.createElement("img");
    av.className = "x-card__avatar";
    av.src = p.avatar || "assets/img/logo.png";
    av.alt = "avatar";
    card.appendChild(av);

    const meta = document.createElement("div");
    meta.className = "x-card__meta";

    const head = document.createElement("div");
    head.className = "x-card__head";
    head.innerHTML = `<b>JIAN</b> <span class="x-card__at">@${p.user}</span> · <span class="x-card__date">${p.date}</span>`;
    meta.appendChild(head);

    const text = document.createElement("p");
    text.className = "x-card__text";
    text.textContent = p.text || "(new post — no caption)";
    meta.appendChild(text);

    if (p.media) {
      const a = document.createElement("a");
      a.href = p.link;
      a.target = "_blank";
      a.rel = "noopener";
      const img = document.createElement("img");
      img.className = "x-card__media";
      img.src = p.media;
      img.alt = "post image";
      img.loading = "lazy";
      a.appendChild(img);
      meta.appendChild(a);
    }

    const link = document.createElement("a");
    link.className = "x-card__link";
    link.href = p.link;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = isBsky ? "VIEW ON BLUESKY →" : "VIEW ON X →";
    meta.appendChild(link);

    card.appendChild(meta);
    host.appendChild(card);
  });
})();
