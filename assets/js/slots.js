/* ==========================================================================
   SLOT STATE — one number in data/slots.js drives the whole site (Aug 2026)

   Justin edits `taken` and nothing else. This paints it everywhere:

     - the scrolling strip at the top of the commissions page
     - the 2 / 5 starburst badge
     - the COMMS button in the nav, on every page
     - the card buttons on the commissions page, when the batch is full
     - the next-batch date, which is computed, never typed

   Why: the counts and the date used to be hand-typed in three places on
   commissions.html. A page still advertising a date that has passed reads
   as abandoned, and a page saying OPEN when it's full makes buyers angry —
   both were one forgotten edit away, permanently.
   ========================================================================== */
(function () {
  "use strict";

  var S = window.JIAN_SLOTS || {};
  var TOTAL = Math.max(1, parseInt(S.total, 10) || 5);
  var TAKEN = Math.min(TOTAL, Math.max(0, parseInt(S.taken, 10) || 0));
  var LEFT = TOTAL - TAKEN;
  var FULL = LEFT <= 0;

  /* Slots open the 1st, so the next batch is the 1st of the coming month.
     Always in the future by construction — it can never go stale. */
  var MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUNE",
                "JULY", "AUG", "SEPT", "OCT", "NOV", "DEC"];
  var now = new Date();
  var next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  var NEXT_BATCH = MONTHS[next.getMonth()] + " 1";

  /* expose it — order.js words the waitlist confirmation with these */
  window.JIAN_SLOT_STATE = { total: TOTAL, taken: TAKEN, left: LEFT, full: FULL, nextBatch: NEXT_BATCH };

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    /* ---- the COMMS button in the nav, on every page ---------------------- */
    document.querySelectorAll(".nav-btn--comms").forEach(function (b) {
      b.textContent = FULL ? "COMMS FULL" : "COMMS OPEN";
      b.classList.toggle("is-full", FULL);
    });
    /* home page's big LINKS.SYS button is the same promise */
    document.querySelectorAll(".comms-btn").forEach(function (b) {
      if (b.textContent.trim() === "COMMS OPEN" || b.textContent.trim() === "COMMS FULL") {
        b.textContent = FULL ? "COMMS FULL" : "COMMS OPEN";
        b.classList.toggle("is-full", FULL);
      }
    });

    /* ---- the scrolling strip ---------------------------------------------
       OPT-IN ONLY, via data-slots-track. Every page has its own marquee with
       its own words ("FREE STUFF ★ YOU HEARD THAT RIGHT", "404 · NOTHING
       HERE") — grabbing .marquee__track blindly overwrote all of them. Same
       story for the starburst badge below. */
    var track = document.querySelector("[data-slots-track]");
    if (track) {
      var line = FULL
        ? "COMMISSIONS <b>FULL</b> · NEXT BATCH " + NEXT_BATCH +
          " · ORDER ON VGEN · YCH FROM $20 · "
        : "COMMISSIONS <b>OPEN</b> · " + LEFT + " OF " + TOTAL + " SLOTS LEFT · NEXT BATCH " +
          NEXT_BATCH + " · ORDER ON VGEN · YCH FROM $20 · ";
      /* twice, so the loop meets itself with no seam */
      track.innerHTML = line + line.slice(0, -1) + "&nbsp;";
    }

    /* ---- the starburst badge (opt-in, same reason) ------------------------ */
    var burst = document.querySelector("[data-slots-burst]");
    if (burst) burst.innerHTML = FULL ? "SLOTS<br>FULL" : LEFT + " / " + TOTAL + "<br>SLOTS";

    /* ---- the front page's commissions block -------------------------------
       Same one number, so the home page can never promise something the
       commissions page has already stopped offering. */
    document.querySelectorAll("[data-slots-headline]").forEach(function (h) {
      h.textContent = FULL ? "FULL" : "OPEN";
    });
    document.querySelectorAll("[data-slots-flag]").forEach(function (f) {
      f.textContent = FULL
        ? "COMMISSIONS FULL · NEXT BATCH " + NEXT_BATCH
        : "COMMISSIONS OPEN · " + LEFT + " OF " + TOTAL + " SLOTS LEFT";
      f.classList.toggle("is-full", FULL);
    });
    document.querySelectorAll("[data-slots-line]").forEach(function (n) {
      n.textContent = FULL
        ? "this month is taken. the next batch opens " + NEXT_BATCH + "."
        : LEFT + " of " + TOTAL + " slots left this month. next batch " + NEXT_BATCH + ".";
    });
    document.querySelectorAll("[data-slots-sheet]").forEach(function (a) {
      a.textContent = "SEE THE FULL SHEET →";
      a.classList.toggle("is-full", FULL);
    });

    /* ---- commissions page ------------------------------------------------
       (Sep 24 2026, Justin: "scrap the START YOUR ORDER category all comms now
       done through vgen".) The order form and the waitlist are gone, so there
       is nothing to swap. When the batch is full the card buttons still open
       VGen, they just stop promising an order. */
    if (FULL) {
      document.querySelectorAll(".price-card__order, .price-card__tag").forEach(function (b) { b.textContent = "SEE IT ON VGEN →"; });
    }
  });
})();
