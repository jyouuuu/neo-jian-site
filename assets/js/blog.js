/* ==========================================================================
   jiansketch BLOG — renders posts from data/posts.js.
   blog: full feed with year sections + #post-id anchors.
   home: 3 newest in UPDATES.EXE + the NOW line.
   ========================================================================== */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  function esc(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* body-text links: only http(s) and same-site relatives get through, so a
     bad url in a post can never become a javascript: href */
  function safeHref(url) {
    return /^(https?:\/\/|\/|[\w.-]+(\/|$)|#)/i.test(url) && !/^javascript:/i.test(url)
      ? url
      : "#";
  }

  /* a paragraph value is either a plain string (most posts) or a run list
     from build_posts.py: [["t", text], ["a", label, url], ...] */
  function fillPara(el, val) {
    if (typeof val === "string") {
      el.textContent = val;
      return;
    }
    val.forEach((run) => {
      if (run[0] === "a") {
        const a = document.createElement("a");
        a.href = safeHref(run[2]);
        a.textContent = run[1];
        if (/^https?:\/\//i.test(a.getAttribute("href"))) {
          a.target = "_blank";
          a.rel = "noopener";
        }
        el.appendChild(a);           // classless on purpose - dark mode styles it
      } else {
        el.appendChild(document.createTextNode(run[1]));
      }
    });
  }

  function postArticle(p) {
    const art = document.createElement("article");
    art.className = "winbox post";
    art.id = p.id;
    const bar = document.createElement("div");
    bar.className = "winbox__bar post__bar";
    bar.innerHTML = `<span class="post__date">${p.date}</span><a class="post__anchor" href="#${p.id}" title="link to this post">#</a>`;
    art.appendChild(bar);
    const body = document.createElement("div");
    body.className = "winbox__body";
    const h = document.createElement("h2");
    h.className = "post__title";
    h.innerHTML = `<a href="#${p.id}">${esc(p.title)}</a>`;
    body.appendChild(h);
    p.body.forEach(([kind, val]) => {
      if (kind === "p") {
        const el = document.createElement("p");
        el.className = "post__p";
        fillPara(el, val);
        body.appendChild(el);
      } else {
        const a = document.createElement("a");
        a.href = val;
        a.target = "_blank";
        a.rel = "noopener";
        a.className = "post__imglink";
        const img = document.createElement("img");
        img.src = val;
        img.alt = p.title;
        img.loading = "lazy";
        a.appendChild(img);
        body.appendChild(a);
      }
    });
    art.appendChild(body);
    return art;
  }

  ready(function () {
    const posts = window.JIAN_POSTS || [];
    const SFX = () => window.JIAN_SFX;

    /* ---------------- home teaser: 3 newest + NOW line ------------------ */
    const homeBox = document.getElementById("homeUpdates");
    if (homeBox) {
      const now = window.JIAN_NOW;
      if (now) {
        const n = document.createElement("div");
        n.className = "now-line";
        n.innerHTML = `<b>NOW ★</b> ${esc(now)}`;
        homeBox.appendChild(n);
      }
      posts.slice(0, 3).forEach((p) => {
        const a = document.createElement("a");
        a.className = "update-item update-item--link";
        a.href = `blog#${p.id}`;
        const ex = p.excerpt.length > 110 ? p.excerpt.slice(0, 110).trimEnd() + "…" : p.excerpt;
        a.innerHTML = `<b>${p.date}</b> — <u>${esc(p.title)}</u><br><span>${esc(ex)}</span>`;
        homeBox.appendChild(a);
      });
      const more = document.createElement("a");
      more.className = "update-item update-item--link";
      more.href = "blog";
      more.innerHTML = `<b>READ THE BLOG →</b>`;
      homeBox.appendChild(more);
    }

    /* ---------------- blog page: full feed ------------------------------- */
    const feed = document.getElementById("blogFeed");
    if (feed && posts.length) {
      let year = null;
      posts.forEach((p) => {
        const y = p.date.slice(0, 4);
        if (y !== year) {
          year = y;
          const div = document.createElement("div");
          div.className = "wall-year";
          div.innerHTML = `${year} <span>posts</span>`;
          feed.appendChild(div);
        }
        feed.appendChild(postArticle(p));
      });
      // anchor deep-link: scroll + flash
      if (location.hash) {
        const t = document.getElementById(location.hash.slice(1));
        if (t) {
          setTimeout(() => {
            t.scrollIntoView({ behavior: "smooth", block: "start" });
            t.classList.add("is-flash");
            setTimeout(() => t.classList.remove("is-flash"), 1800);
          }, 200);
        }
      }
      // little tick when copying a post anchor
      document.querySelectorAll(".post__anchor").forEach((a) => {
        a.addEventListener("click", () => { SFX() && SFX().tick(); });
      });
    }
  });
})();
