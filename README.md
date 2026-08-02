# ClearNorth Window Cleaning — website

Static copy of the live site at https://clear.muskokadigitalboost.ca/
captured 2026-08-02 (site last modified 2026-07-29).

## Structure

```
index.html              home
services/index.html     services
service-areas/index.html
about-us/index.html
faq/index.html
contact/index.html
booking/index.html
privacy-policy/index.html
assets/img/            photos + logo
assets/fonts/          Manrope + Space Grotesk (self-hosted woff2)
assets/js/site.*.js    nav toggle, FAQ accordion, scroll animations
robots.txt sitemap.xml site.webmanifest
```

Every page is self-contained HTML with inline `<style>` blocks — there is no
build step and no CSS framework. To change text or styling, edit the `.html`
file directly.

## Previewing locally

Links are root-relative (`/assets/...`), so open it through a web server
rather than double-clicking the file:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Notes

- Pages carry `<meta name="robots" content="noindex,nofollow">` and
  `robots.txt` disallows all crawlers — this mirrors the live staging setup.
  Remove both when the site goes to production.
- The contact form has no `action` attribute, so it does not submit anywhere.
- Booking embeds an external Google Form.
- Google Tag Manager (`GTM-M3J9CBV4`) loads on every page.
