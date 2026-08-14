/* ==========================================================================
   ORDER.EXE — the on-site commission order form (Aug 2026)

   Justin: "i want clients to order directly from my website by pressing the
   buttons ... and then sending all the info via the site to my email; as an
   alternative to filling out the google form; we can have both."

   The site is static (GitHub Pages) so it cannot send mail on its own. The
   order is POSTed as JSON to Web3Forms, which relays it to the inbox tied to
   the access key below. The email address itself is never in this file.

   The key below is the "jiansketch commissions" form on the web3forms account
   under jiansketch@gmail.com (added Aug 14 2026, verified end to end). It is a
   public key by design — it only points at an inbox, it can't read anything.
   To move where orders land, change the inbox on web3forms.com, not this file.
   If the key is ever blanked the form hands people to the Google Form and a
   prefilled mailto instead, so an order can never fall down a hole.
   ========================================================================== */
(function () {
  "use strict";

  const ACCESS_KEY = "21f1bec3-0914-4dd1-99fc-5242222cf04d";
  const ENDPOINT = "https://api.web3forms.com/submit";
  const GFORM = "https://docs.google.com/forms/d/e/1FAIpQLSd_TVxQN-CVny4EXwiGT_ZRrNbWeU30MzIs_uunjqlF-aWA8Q/viewform";
  const FALLBACK_MAIL = "jiansketch@gmail.com";

  const KEY_READY = /^[0-9a-f-]{30,}$/i.test(ACCESS_KEY);

  /* ---- the price list. must agree with the cards above it on the page ---- */
  const TIERS = {
    sticker:  { label: "Sticker design",                 base: 55  },
    icon:     { label: "Icon / PFP",                     base: 65  },
    emote3:   { label: "Emote pack — 3 emotes",          base: 75  },
    emote5:   { label: "Emote pack — 5 emotes",          base: 120 },
    lineless: { label: "Lineless",                       base: 120, fullbody: 50 },
    halfbody: { label: "Halfbody",                       base: 145 },
    fullbody: { label: "Fullbody",                       base: 195 },
    sheet:    { label: "Character design sheet",         base: 495 },
    animicon: { label: "Animated icon",                  base: 115 },
    keyart:   { label: "Key art / poster / album cover", base: 650, from: true },
    other:    { label: "Something else",                 base: 0,   quote: true },
  };

  const BACKGROUNDS = {
    simple:   { label: "Simple background — flat, gradient or pattern", add: 0   },
    detailed: { label: "Detailed background",                          add: 85  },
    scene:    { label: "Full painted scene",                           add: 170 },
  };

  const EXTRAS = {
    alt_outfit: { label: "Alt outfit or colorway",    add: 45 },
    props:      { label: "Props, weapons, mech detail", add: 30 },
  };

  const money = (n) => "$" + n.toLocaleString("en-US");

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    const form = document.querySelector("#order-form");
    if (!form) return;

    const SFX = window.JIAN_SFX || { tick() {}, pop() {}, party() {}, unpop() {} };
    const el = (id) => form.querySelector("#" + id);

    const tierSel = el("f-tier");
    const linelessRow = form.querySelector("[data-only='lineless']");
    const linelessFull = el("f-lineless-full");
    const charsSel = el("f-chars");
    const commercial = el("f-commercial");
    const commercialRow = form.querySelector("[data-only='commercial']");
    const receipt = form.querySelector("#order-receipt");
    const totalOut = form.querySelector("#order-total");
    const totalNote = form.querySelector("#order-total-note");
    const status = form.querySelector("#order-status");
    const sendBtn = form.querySelector("#order-send");

    /* -------------------------------------------------------------------
       the quote. every line is itemised so nobody is surprised by the
       invoice — and the same breakdown is what lands in the email.
       ------------------------------------------------------------------- */
    function quote() {
      const tier = TIERS[tierSel.value] || TIERS.other;
      const lines = [];
      let total = 0;
      let byHand = !!(tier.quote || tier.from);

      if (tier.quote) {
        lines.push([tier.label, "quoted by hand"]);
      } else {
        lines.push([tier.label, (tier.from ? "from " : "") + money(tier.base)]);
        total += tier.base;
      }

      if (tier.fullbody && linelessFull.checked) {
        lines.push(["Head to toe instead of waist up", "+" + money(tier.fullbody)]);
        total += tier.fullbody;
      }

      const chars = parseInt(charsSel.value, 10) || 0;
      if (chars > 0 && tier.base) {
        const each = Math.round(tier.base * 0.7);
        lines.push([
          chars + " extra character" + (chars > 1 ? "s" : "") + " (+70% each)",
          "+" + money(each * chars),
        ]);
        total += each * chars;
      } else if (chars > 0) {
        lines.push([chars + " extra character" + (chars > 1 ? "s" : ""), "quoted by hand"]);
        byHand = true;
      }

      const bgKey = (form.querySelector("input[name='bg']:checked") || {}).value || "simple";
      const bg = BACKGROUNDS[bgKey];
      if (bg.add) {
        lines.push([bg.label, "+" + money(bg.add)]);
        total += bg.add;
      } else {
        lines.push([bg.label, "free"]);
      }

      Object.keys(EXTRAS).forEach((k) => {
        const box = el("f-" + k.replace(/_/g, "-"));
        if (box && box.checked) {
          lines.push([EXTRAS[k].label, "+" + money(EXTRAS[k].add)]);
          total += EXTRAS[k].add;
        }
      });

      /* the page says "base x 2.5", so the multiplier lands on the base only */
      if (commercial.checked && tier.base && !tier.quote) {
        const bump = Math.round(tier.base * 1.5);
        lines.push(["Commercial use (base × 2.5)", "+" + money(bump)]);
        total += bump;
      } else if (commercial.checked) {
        byHand = true;
      }

      return { lines, total, byHand, tier };
    }

    function render() {
      const q = quote();

      receipt.innerHTML = "";
      q.lines.forEach(([name, value]) => {
        const row = document.createElement("div");
        row.className = "receipt__row";
        const a = document.createElement("span");
        a.textContent = name;
        const b = document.createElement("b");
        b.textContent = value;
        if (value === "free") b.className = "is-free";
        if (value === "quoted by hand") b.className = "is-ask";
        row.append(a, b);
        receipt.appendChild(row);
      });

      if (q.byHand && !q.total) {
        totalOut.textContent = "—";
        totalNote.textContent = "I'll quote this one by hand and send it with your invoice.";
      } else if (q.byHand) {
        totalOut.textContent = "from " + money(q.total);
        totalNote.textContent = "Parts of this need a hand-quote — the real number comes in your invoice.";
      } else {
        totalOut.textContent = money(q.total);
        totalNote.textContent = q.total >= 150
          ? "Over $150, so it's half now and half when you approve the sketch."
          : "Under $150, so it's paid in full up front.";
      }

      linelessRow.hidden = !q.tier.fullbody;
      if (!q.tier.fullbody) linelessFull.checked = false;
      commercialRow.hidden = !commercial.checked;
    }

    form.addEventListener("change", render);
    form.addEventListener("input", (e) => {
      if (e.target.matches("select, input[type='checkbox'], input[type='radio']")) render();
    });

    /* -------------------------------------------------------------------
       the price cards above: "ORDER THIS" fills the tier in and walks the
       page down to the form.
       ------------------------------------------------------------------- */
    document.querySelectorAll("[data-order-tier]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const t = btn.getAttribute("data-order-tier");
        if (TIERS[t]) tierSel.value = t;
        render();
        SFX.pop();
        document.querySelector("#order").scrollIntoView({ behavior: "smooth", block: "start" });

        /* When the batch is full the order form is hidden and the waitlist is
           in its place — carry the tier they pressed across, so a full month
           still tells us what people were coming for. */
        const wait = document.querySelector("#waitlist-form");
        if (wait && !wait.hidden) {
          const want = document.querySelector("#w-want");
          if (want) want.value = t;
          wait.classList.add("is-flash");
          setTimeout(() => wait.classList.remove("is-flash"), 900);
          setTimeout(() => document.querySelector("#w-email").focus({ preventScroll: true }), 700);
          return;
        }

        form.classList.add("is-flash");
        setTimeout(() => form.classList.remove("is-flash"), 900);
        setTimeout(() => el("f-brief").focus({ preventScroll: true }), 700);
      });
    });

    /* -------------------------------------------------------------------
       what actually gets mailed. readable keys — Web3Forms prints them
       verbatim as the labels in the email.
       ------------------------------------------------------------------- */
    function payload() {
      const q = quote();
      const v = (id) => (el(id) ? el(id).value.trim() : "");
      const breakdown = q.lines.map(([n, p]) => "  " + n + " ......... " + p).join("\n");
      const totalLine = q.byHand
        ? (q.total ? "from " + money(q.total) + " (needs a hand-quote)" : "quoted by hand")
        : money(q.total);

      return {
        access_key: ACCESS_KEY,
        /* (Aug 14 2026) The first test landed in Gmail's spam. Shouty all-caps
           plus a bare dollar figure is a spam signal, so the subject reads like
           a normal email now. It still always contains "commission order" —
           that exact phrase is what Justin's Gmail filter matches on to force
           these out of spam and into the COMMISSIONS label. Don't reword it. */
        subject: "New commission order: " + q.tier.label +
                 " (" + totalLine + ") — " + (v("f-name") || "no name given"),
        from_name: "jiansketch.com order form",
        replyto: v("f-email"),

        "Tier": q.tier.label,
        "Estimate": totalLine,
        "Breakdown": "\n" + breakdown,
        "What they want": v("f-brief"),
        "Reference links": v("f-refs"),
        "Deadline": v("f-deadline") || "none given",
        "NSFW": el("f-nsfw").checked ? "YES — wants to talk about it first" : "No",
        "Name or handle": v("f-name"),
        "Email": v("f-email"),
        "Best way to reach them": v("f-pref"),
        "PayPal email for the invoice": v("f-paypal"),
        "Can I post it": (form.querySelector("input[name='post']:checked") || {}).value || "not answered",
        "Commercial use": commercial.checked ? (v("f-commercial-what") || "yes, not described") : "No — personal use",
      };
      /* NOTE: no `botcheck` key. Web3Forms treats a NON-EMPTY botcheck as spam,
         so sending the string "false" would bin every real order. The honeypot
         is enforced in the submit handler instead — if it's ticked we never
         send at all. */
    }

    function asText(p) {
      return Object.keys(p)
        .filter((k) => !["access_key", "botcheck", "from_name", "replyto", "subject"].includes(k))
        .map((k) => k.toUpperCase() + ": " + p[k])
        .join("\n");
    }

    function say(kind, html) {
      status.className = "order-status is-" + kind;
      status.innerHTML = html;
      status.hidden = false;
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (form.querySelector("input[name='botcheck']").checked) return;
      if (!form.reportValidity()) return;

      const p = payload();

      if (!KEY_READY) {
        say("warn",
          "<b>The direct sender isn't switched on yet.</b> Nothing was lost — " +
          "<a href='" + GFORM + "' target='_blank' rel='noopener'>send it through the Google Form</a> " +
          "or mail it to <a href='mailto:" + FALLBACK_MAIL + "?subject=" +
          encodeURIComponent(p.subject) + "&body=" + encodeURIComponent(asText(p)) +
          "'>" + FALLBACK_MAIL + "</a> — both are already filled in with what you typed.");
        return;
      }

      sendBtn.disabled = true;
      sendBtn.textContent = "SENDING…";
      say("busy", "Sending your order…");

      /* Sent as FormData, NOT as JSON. A JSON body sets an unusual
         Content-Type, which makes the browser fire a CORS preflight first —
         one more round trip that can fail on its own. FormData is a "simple"
         request: no preflight, and it's the shape Web3Forms' own HTML
         examples use. The email that arrives is identical either way. */
      const fd = new FormData();
      Object.keys(p).forEach((k) => fd.append(k, p[k]));

      fetch(ENDPOINT, { method: "POST", body: fd })
        .then((r) => r.json())
        .then((data) => {
          if (!data.success) throw new Error(data.message || "rejected");
          SFX.party();
          form.querySelector("#order-fields").hidden = true;
          form.querySelector("#order-actions").hidden = true;
          say("ok",
            "<b>ORDER SENT ✓</b><br>" +
            "You asked for a <b>" + p.Tier + "</b> — estimate <b>" + p.Estimate + "</b>.<br>" +
            "I read every one of these myself and reply within 24 hours with your invoice " +
            "and your spot in the queue. Check your spam folder if it's quiet.");
          form.querySelector("#order-total-wrap").scrollIntoView({ behavior: "smooth", block: "center" });
        })
        .catch(() => {
          SFX.unpop();
          sendBtn.disabled = false;
          sendBtn.textContent = "SEND MY ORDER →";
          say("bad",
            "<b>That didn't go through.</b> Don't retype it — " +
            "<a href='mailto:" + FALLBACK_MAIL + "?subject=" + encodeURIComponent(p.subject) +
            "&body=" + encodeURIComponent(asText(p)) + "'>send it as an email instead</a> " +
            "(everything you typed is already in it), or use the " +
            "<a href='" + GFORM + "' target='_blank' rel='noopener'>Google Form</a>.");
        });
    });

    render();

    /* -------------------------------------------------------------------
       Arriving from the front page's commission block: commissions?tier=X
       lands here with that tier already chosen, so nobody has to pick the
       same thing twice.
       ------------------------------------------------------------------- */
    try {
      const asked = new URLSearchParams(window.location.search).get("tier");
      if (asked && TIERS[asked]) {
        tierSel.value = asked;
        render();
        const wait = document.querySelector("#waitlist-form");
        if (wait && !wait.hidden) {
          const want = document.querySelector("#w-want");
          if (want) want.value = asked;
        }
        /* the #order hash does the scrolling; just make it obvious we heard */
        setTimeout(function () {
          const target = wait && !wait.hidden ? wait : form;
          target.classList.add("is-flash");
          setTimeout(() => target.classList.remove("is-flash"), 900);
        }, 400);
      }
    } catch (err) { /* no URLSearchParams, no preselect — the form still works */ }
  });

  /* =====================================================================
     THE WAITLIST — shown by slots.js instead of the order form when the
     batch is full. Lives in this file, not slots.js, so the Web3Forms key
     is written down exactly once.
     ===================================================================== */
  ready(function () {
    const wl = document.querySelector("#waitlist-form");
    if (!wl) return;

    const SFX = window.JIAN_SFX || { party() {}, unpop() {} };
    const btn = wl.querySelector("#waitlist-send");
    const status = wl.querySelector("#waitlist-status");
    const email = wl.querySelector("#w-email");
    const want = wl.querySelector("#w-want");

    function say(kind, html) {
      status.className = "order-status is-" + kind;
      status.innerHTML = html;
      status.hidden = false;
    }

    wl.addEventListener("submit", function (e) {
      e.preventDefault();
      if (wl.querySelector("#w-botcheck").checked) return;
      if (!wl.reportValidity()) return;

      const when = (window.JIAN_SLOT_STATE || {}).nextBatch || "the 1st";
      const wants = want.options[want.selectedIndex].text;
      const p = {
        access_key: ACCESS_KEY,
        subject: "Waitlist signup — " + email.value.trim(),
        from_name: "jiansketch.com waitlist",
        replyto: email.value.trim(),
        "Waitlist": "Someone wants a slot in the " + when + " batch",
        "Email": email.value.trim(),
        "After": want.value ? wants : "not sure yet",
      };

      btn.disabled = true;
      btn.textContent = "SENDING…";
      say("busy", "Adding you…");

      const fd = new FormData();
      Object.keys(p).forEach((k) => fd.append(k, p[k]));

      fetch(ENDPOINT, { method: "POST", body: fd })
        .then((r) => r.json())
        .then((data) => {
          if (!data.success) throw new Error(data.message || "rejected");
          SFX.party();
          wl.querySelector("#waitlist-fields").hidden = true;
          wl.querySelector("#waitlist-actions").hidden = true;
          say("ok",
            "<b>YOU'RE ON THE LIST ✓</b><br>" +
            "I'll email you when the <b>" + when + "</b> batch opens. One message, that's it.");
        })
        .catch(() => {
          SFX.unpop();
          btn.disabled = false;
          btn.textContent = "TELL ME WHEN →";
          say("bad",
            "<b>That didn't go through.</b> " +
            "<a href='mailto:" + FALLBACK_MAIL + "?subject=" + encodeURIComponent("Waitlist please") +
            "&body=" + encodeURIComponent("Add me to the waitlist for the " + when + " batch.\n\nAfter: " + wants) +
            "'>Email me instead</a> and I'll add you by hand.");
        });
    });
  });
})();
