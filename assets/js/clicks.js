/* Which links people click on jiansketch.com (Oct 7 2026, Justin: "track ... the links they click on").
   One Google Analytics event per click, NAMED for where the link goes (site_click_shop,
   site_click_patreon, ...), because event names show up in reports with no extra Analytics setup.
   The link itself rides along as link_url / link_text. Clicks that stay on the same page (#drop)
   are not counted; links to other pages here count as site_click_page. */
(function () {
  var GROUPS = [
    ["jiansketch.bigcartel.com", "shop"], ["patreon.com", "patreon"], ["vgen.co", "vgen"],
    ["ko-fi.com", "kofi"], ["x.com", "x"], ["twitter.com", "x"], ["instagram.com", "instagram"],
    ["tiktok.com", "tiktok"], ["youtube.com", "youtube"], ["youtu.be", "youtube"], ["bsky.app", "bluesky"],
    ["newgrounds.com", "newgrounds"], ["justinyou.art", "portfolio"]
  ];
  var here = location.hostname.replace(/^www\./, "");
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a || typeof window.gtag !== "function") return;
    var u;
    try { u = new URL(a.getAttribute("href"), location.href); } catch (err) { return; }
    var group;
    if (u.protocol === "mailto:") group = "email";
    else if (u.protocol !== "http:" && u.protocol !== "https:") return;
    else {
      var host = u.hostname.replace(/^www\./, "");
      if (host === here) {
        if (u.pathname === location.pathname) return; // a jump within this page
        group = "page";
      } else {
        group = "other";
        for (var i = 0; i < GROUPS.length; i++) {
          var d = GROUPS[i][0];
          if (host === d || host.slice(-(d.length + 1)) === "." + d) { group = GROUPS[i][1]; break; }
        }
      }
    }
    // Google forbids email addresses in Analytics, even his own, so an email link is just "email"
    window.gtag("event", "site_click_" + group, {
      link_url: group === "email" ? "mailto" : u.origin + u.pathname,
      link_text: group === "email" ? "email" : (a.textContent || a.getAttribute("aria-label") || (a.querySelector("img") || {}).alt || "").replace(/\s+/g, " ").trim().slice(0, 100),
      transport_type: "beacon"
    });
  }, true);
})();
