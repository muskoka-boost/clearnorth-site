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

## Photos

Job photos were refreshed on 2026-08-03. All images are re-encoded with no
EXIF metadata, sized for their slot, and kept roughly 100-200 KB each.

| file | where it appears |
|---|---|
| `residential-front.jpg` | home hero, Residential card, **and the social/OG preview image on every page** |
| `residential-backyard.jpg` | Residential card (services), gallery tile |
| `work-1.jpg` | home hero portrait, About "at work" |
| `work-2.jpg` | gallery tile |
| `work-3.jpg` | "Our promise" pair (home), About |
| `work-4.jpg` | "Our promise" pair (home), gallery tile |
| `work-5.jpg` | Services + About hero |
| `work-6.jpg` | Commercial card (home + services) |
| `work-7.jpg` | Custom Packages card (home + services) |
| `team-kyden.jpg`, `team-charles.jpg` | About — staff headshots |

Spares, in the repo but not yet placed on any page — swap one in by changing
an `src`, or ask for a section to show them off:

| file | what it is |
|---|---|
| `work-8.jpg` | Popeyes storefront (commercial) |
| `work-9.jpg` | green cottage in the woods (residential) |
| `before-after-gutters.jpg` | gutter clean-out, before/after split |
| `before-after-storefront.jpg` | storefront glass, before/after split |

Replacing a photo: keep the **same filename** and the site picks it up with no
HTML edits. Landscape slots are 4:3, portrait slots are 3:4; anything else gets
centre-cropped by `object-fit: cover`.
