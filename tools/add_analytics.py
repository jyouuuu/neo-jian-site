"""Adds Google Analytics and link click counting to every page of jiansketch.com (Oct 7 2026).

(Justin: "track the amount of visitors on the sites, the links they click on".) The site uses the
SAME Analytics property as the Big Cartel shop (G-NRPNK1EVQ2, set up by Astra on Oct 7), so the
Post Scheduler's Visitors page reads both sites from one place.

  * every page gets the gtag snippet and assets/js/clicks.js before </head>
  * every footer gets a "privacy" link, and privacy.html explains the analytics
  * the sitemap lists /privacy

Safe to run again: anything already in place is left alone. Run it after adding a new page.
"""
import re
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
GA_ID = "G-NRPNK1EVQ2"
MARK = "<!-- analytics (Oct 7 2026)"

SNIPPET = f"""  {MARK}: counts visits and which links people click. Same Google Analytics
       property as the shop, read by the Post Scheduler's Visitors page. Explained on /privacy. -->
  <script async src="https://www.googletagmanager.com/gtag/js?id={GA_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){{dataLayer.push(arguments);}}gtag("js",new Date());gtag("config","{GA_ID}");</script>
  <script defer src="assets/js/clicks.js"></script>
"""

PRIVACY_BODY = """
      <div class="tooth">
        <div class="tooth__tab">PRIVACY<span class="accent">!</span></div>
        <div class="tooth__bar"></div>
      </div>

      <div class="box">
        <p>I respect your privacy and I do not sell your personal information.</p>

        <h3>Site analytics</h3>
        <p>jiansketch.com uses Google Analytics to understand how many people visit, which pages they view, which links they click (like the shop, Patreon or VGen), and which websites and posts bring them here. Analytics may use cookies, browser and device information, referral and campaign information, and page activity. I do not send names, email addresses or other contact details to Google Analytics.</p>
        <p>Read how Google uses information from sites that use its services: <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener"><b>policies.google.com/technologies/partner-sites</b></a><br />
        Google's privacy policy: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener"><b>policies.google.com/privacy</b></a></p>

        <h3>Commission requests</h3>
        <p>The commission form on this site sends what you type to my inbox through Web3Forms. I use it only to reply to you and to do the work.</p>

        <h3>The shop</h3>
        <p>Orders happen on <a href="https://jiansketch.bigcartel.com/" target="_blank" rel="noopener"><b>jiansketch.bigcartel.com</b></a>, which has its own <a href="https://jiansketch.bigcartel.com/policies/privacy" target="_blank" rel="noopener"><b>privacy policy</b></a>.</p>

        <h3>Your choices</h3>
        <p>You can block or delete cookies in your browser settings. Google also offers an Analytics opt out add on for your browser: <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener"><b>tools.google.com/dlpage/gaoptout</b></a></p>
        <p style="margin-bottom:0;">Questions, or want something you sent me deleted? Email <a href="mailto:justin@justinyou.art"><b>justin@justinyou.art</b></a>.</p>
      </div>
"""


def add_snippet(html):
    if MARK in html:
        return html, False
    i = html.index("</head>")
    return html[:i] + SNIPPET + html[i:], True


def add_footer_link(html):
    if 'href="privacy"' in html or "<footer" not in html:
        return html, False
    kofi = '<a href="https://ko-fi.com/N4N426AHW">ko-fi</a>'
    if kofi in html.split("<footer", 1)[1]:
        head, foot = html.split("<footer", 1)
        foot = foot.replace(kofi, kofi + '\n        <a href="privacy">privacy</a>', 1)
        return head + "<footer" + foot, True
    return html, False


def build_privacy():
    about = (SITE / "about.html").read_text(encoding="utf-8")
    start = about.index('<div class="container">') + len('<div class="container">')
    end = about.index("  <footer")
    end = about.rindex("    </div>", start, end)
    page = about[:start] + "\n" + PRIVACY_BODY + "\n" + about[end:]
    page = page.replace("<title>ABOUT — jiansketch</title>", "<title>PRIVACY — jiansketch</title>")
    page = page.replace('<a class="nav-btn is-here" href="about">ABOUT</a>', '<a class="nav-btn" href="about">ABOUT</a>')
    page = re.sub(r"ABOUT · WHO IS THIS GREMLIN · FAST FOOD FOR YOUR EYES ·",
                  "PRIVACY · WHAT THIS SITE COUNTS · FAST FOOD FOR YOUR EYES ·", page)
    return page


def main():
    changed = []
    privacy = SITE / "privacy.html"
    if not privacy.exists():
        privacy.write_text(build_privacy(), encoding="utf-8", newline="\n")
        changed.append("privacy.html (new)")
    for f in sorted(SITE.glob("*.html")):
        html = f.read_text(encoding="utf-8")
        html2, a = add_snippet(html)
        html2, b = add_footer_link(html2)
        if a or b:
            f.write_text(html2, encoding="utf-8", newline="\n")
            changed.append(f"{f.name} ({'tag' if a else ''}{' + ' if a and b else ''}{'footer link' if b else ''})")
    sm = SITE / "sitemap.xml"
    xml = sm.read_text(encoding="utf-8")
    if "jiansketch.com/privacy" not in xml:
        xml = xml.replace("  <url><loc>https://jiansketch.com/feed.xml</loc></url>",
                          "  <url><loc>https://jiansketch.com/privacy</loc></url>\n  <url><loc>https://jiansketch.com/feed.xml</loc></url>")
        sm.write_text(xml, encoding="utf-8", newline="\n")
        changed.append("sitemap.xml")
    print("\n".join(changed) or "nothing to change")


if __name__ == "__main__":
    main()
