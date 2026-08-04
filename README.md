# ClearNorth Window Cleaning — website

Static copy of the live site at https://clear.muskokadigitalboost.ca/
captured 2026-08-02 (site last modified 2026-07-29).

## Structure

```
index.html              home
services/index.html     services
service-areas/index.html            hub — links to all 24 area pages
service-areas/<area>/index.html     one landing page per service area
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

## Service-area pages

Each community has its own page at `/service-areas/<slug>/`, with copy written
for that area — property types, the kind of grime that turns up there, and how
bookings work locally. They are reachable only from the boxes on
`/service-areas/`, deliberately **not** from the nav bar.

The 24 areas, in the order they appear on the hub page:

| group | areas |
|---|---|
| GTA | `toronto` `scarborough` `markham` `mississauga` `york-region` |
| Durham | `durham-region` `pickering` `ajax` `whitby` `oshawa` `courtice` `bowmanville` `clarington` `hampton` |
| Northumberland, Quinte & Kawarthas | `peterborough` `kawartha-lakes` `port-hope` `cobourg` `brighton` `trenton` `hastings-county` |
| Cottage country | `muskoka` `haliburton` `parry-sound` |

Adding another area means copying an existing folder, changing the copy, then
adding a box to the grid on `/service-areas/` and a `<url>` to `sitemap.xml`.
Header, footer and styling are duplicated into each page, the same as every
other page on the site — there is still no build step.

## Previewing locally

Links are root-relative (`/assets/...`), so open it through a web server
rather than double-clicking the file:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Branches

| branch | for | indexable |
|---|---|---|
| `main` | previews — GitHub Pages, and the temp customer preview at `clear.muskokadigitalboost.ca` | no |
| `production-launch` | the real launch at `https://www.clearnorthwc.com/` | yes |

The previews stay `noindex` on purpose. Two crawlable copies of the same site
compete with each other in search, and a temp preview URL is exactly the kind
of thing that ends up outranking the real domain if it is left open.

## Going live on www.clearnorthwc.com

This branch is the launch-ready copy. What differs from `main`:

| file | change |
|---|---|
| every `.html` except `404.html` | `noindex,nofollow` meta removed |
| `robots.txt` | `Disallow: /` → `Allow: /` plus a `Sitemap:` line |
| `404.html` | `<base href="/clearnorth-site/">` → `<base href="/">` |
| every absolute URL | `clear.muskokadigitalboost.ca` → `www.clearnorthwc.com` |

That last row covers the canonical tags, `og:url`, `og:image`,
`twitter:image`, the JSON-LD business schema and `sitemap.xml`. The "Made by
muskokadigitalboost.ca" footer credit is a different domain and is unchanged.

`404.html` keeps its own `noindex` — error pages should stay out of the index.

Deploying this branch depends on where the domain is served from:

- **Any ordinary web host** — upload the branch contents as-is. Nothing else
  needs changing.
- **GitHub Pages** — add a `CNAME` file at the repo root containing
  `www.clearnorthwc.com`, point the DNS record at GitHub, set the custom
  domain in the repo's Pages settings, and change the
  `.github/workflows/deploy.yml` trigger from `main` to this branch. Without
  the `CNAME` file, Pages will keep serving the project path.

Pick one hostname and redirect the other — serving the site at both
`www.clearnorthwc.com` and `clearnorthwc.com` splits the SEO between them.
The canonical tags here point at the `www.` form.

After launch, submit `https://www.clearnorthwc.com/sitemap.xml` in Google
Search Console so the 24 service-area pages get picked up.

## Notes

- **This is the production branch (`production-launch`), aimed at
  `https://www.clearnorthwc.com/`.** Unlike `main`, it is crawlable: the
  `noindex,nofollow` meta is gone from every page, `robots.txt` allows all
  crawlers and points at the sitemap, `404.html` uses `<base href="/">` for a
  domain root rather than the GitHub Pages project path, and every absolute
  URL points at the production domain. See "Going live" above.
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
