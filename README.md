# ClearNorth Window Cleaning — website

Static HTML, no build step, no CSS framework. Every page is self-contained with
its own inline `<style>` blocks, and header, footer and styling are duplicated
into each file. To change text or styling, edit the `.html` file directly.

The one exception is a delimited block in each `<head>` — see
[Domains and environments](#domains-and-environments) — which is generated and
must not be hand-edited.

## Domains and environments

`site.config.json` is the single source of truth for every absolute URL the site
emits and for whether it may be indexed. Three environments:

| name | origin | indexable |
|---|---|---|
| `github-pages` | `https://muskoka-boost.github.io/clearnorth-site` | no |
| `client-preview` | `https://clear.muskokadigitalboost.ca` | no |
| `production` | `https://www.clearnorthwc.com` | **yes** |

Both preview hosts are **preview only** — do not hand them out, link to them or
put them on anything printed.

```sh
node scripts/apply-site-config.mjs                    # use config.active
node scripts/apply-site-config.mjs --env=production
node scripts/apply-site-config.mjs --check            # exit 1 if the HTML is stale
```

The script owns everything between `<!-- cn:generated:start -->` and
`<!-- cn:generated:end -->` in each `<head>`: the canonical, the Open Graph and
Twitter tags, the robots meta tag and all JSON-LD. It also writes `robots.txt`
and `sitemap.xml`, and rewrites the forms' hidden `_next` fields. **Editing
inside those markers is pointless — the next run overwrites it.**

Each page declares what it is in a small JSON island just above the markers:

```html
<script type="application/json" id="cn-page-meta">{"page":"location","breadcrumbs":[…],"service":{…}}</script>
```

That is where a new page's type, breadcrumbs and Service schema come from. A
page without one is skipped with a warning.

Going live is documented step by step in [DEPLOYMENT-CHECKLIST.md](DEPLOYMENT-CHECKLIST.md).

## Structure

```
index.html                          home
services/index.html                 services hub
services/<slug>/index.html          one page per service (7)
service-areas/index.html            hub — links to all 36 area pages
service-areas/<slug>/index.html     one landing page per service area (36)
about-us/  faq/  contact/  privacy-policy/
request-a-quote/index.html          the quote form
quote-submitted/index.html          confirmation after the quote form
message-sent/index.html             confirmation after the contact form
404.html

data/locations.json                 the record behind the 36 area pages
site.config.json                    origins, indexing, business details
scripts/                            tooling (below)
assets/img/                         photos, logo, favicons, OG image
assets/fonts/                       Manrope + Space Grotesk (self-hosted woff2)
assets/js/site.*.js                 nav toggle, FAQ accordion, scroll reveal
assets/js/quote-form.*.js           quote form — validation + background submit
assets/js/contact-form.js           contact form — validation + inline success
assets/js/quote-submitted.*.js      confirmation page — countdown + conversion event
assets/js/message-sent.js           same, for the contact form
```

JS filenames carry a content hash. Editing one means renaming it to match and
updating the `<script src>` that points at it, otherwise browsers serve the old
copy. (`contact-form.js` and `message-sent.js` are unhashed — hash them if they
start changing often.)

## Tooling

```sh
node scripts/apply-site-config.mjs [--env=NAME] [--check]
node scripts/check-pages.mjs [--env=NAME]        # crawl: links, metadata, a11y, schema
node scripts/check-location-uniqueness.mjs [--json] [--strict]
```

`check-pages.mjs` is the pre-launch gate. It checks internal links and assets
resolve, one H1 and one `<main>` per page, the skip link, unique self-referencing
canonicals, unique titles and descriptions, one viewport tag, alt text and
intrinsic dimensions on images, `type` on every button, forms with an action and
every field labelled, no placeholder text, JSON-LD that parses and stays
on-origin, no orphan pages, and that robots/sitemap match the environment. Pass
it the same `--env` you passed to `apply-site-config.mjs`.

`check-location-uniqueness.mjs` compares the main content of all 36 area pages
using six-word shingles and reports each page's closest match, its share of
corpus-wide template copy, repeated paragraphs and repeated runs of consecutive
sentences. It is a warning system, not a verdict — read the pages it flags.

The GitHub Pages workflow runs `apply-site-config.mjs --env=github-pages` and
both checks before publishing, so the preview can never inherit a production
config.

## Service-area pages

Each community has its own page at `/service-areas/<slug>/`, reachable from the
boxes on `/service-areas/` and deliberately not from the nav bar.

`data/locations.json` is the record behind them: place type, parent and child
relationships, the service mix that page links to, the per-area copy, the local
questions, the sources the geography was checked against, and
`needsConfirmation` — the operational claims each page deliberately does **not**
make. Do not turn one of those into page copy without an answer from the
business; see [OWNER-CONFIRMATIONS.md](OWNER-CONFIRMATIONS.md).

The 36 areas, in the order they appear on the hub page:

| group | areas |
|---|---|
| GTA | `toronto` `scarborough` `markham` `mississauga` `york-region` |
| Durham | `durham-region` `pickering` `ajax` `whitby` `oshawa` `courtice` `bowmanville` `clarington` `hampton` |
| Northumberland & Quinte | `port-hope` `cobourg` `brighton` `trenton` `hastings-county` |
| Peterborough, the Kawarthas & Haliburton | `peterborough` `kawartha-lakes` `haliburton` |
| Muskoka & the big three lakes | `muskoka` `lake-muskoka` `lake-rosseau` `lake-joseph` `bracebridge` `gravenhurst` `huntsville` `muskoka-lakes` `lake-of-bays` `georgian-bay-township` `port-carling` `bala` |
| Parry Sound District | `parry-sound` `rosseau` |

Muskoka is broken down two ways, because cottage owners and homeowners search
differently. By municipality: the district's six — the towns of Bracebridge,
Gravenhurst and Huntsville, and the townships of Muskoka Lakes, Lake of Bays and
Georgian Bay — plus Port Carling and Bala, villages inside Muskoka Lakes that
people search for by name. And by water: `lake-muskoka`, `lake-rosseau` and
`lake-joseph`, which is how a cottage owner thinks of their own place. Each page
says which it is and links to its counterpart, so the two sets complement rather
than compete; `muskoka` is the hub for both.

Rosseau sits at the north end of Lake Rosseau but is in Seguin Township,
**Parry Sound District** — not Muskoka. Both `rosseau` and `lake-rosseau` open by
saying so and linking to the other. It is also the closest served community to
Parry Sound itself.

Each page ends with a **Nearby areas** block, and child pages link back up to
their region hub. Both are geographic claims — check a map before changing
either. Haliburton and Parry Sound are the easy mistake: both are cottage
country, but Muskoka sits between them, so they are neither neighbours nor a
group. Parry Sound belongs with Muskoka; Haliburton belongs with Kawartha Lakes,
which it borders, and its closest towns are Dorset, Lake of Bays and Huntsville.

Adding an area means copying an existing folder, changing the copy, adding a
record to `data/locations.json`, adding a box to the grid on `/service-areas/`,
and running `apply-site-config.mjs` (which adds it to the sitemap).

## Previewing locally

Links are relative, so open it through a web server rather than double-clicking
the file:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Notes

- **The service list is duplicated in four places** and they have to agree,
  because a page that advertises something the business does not do is the
  expensive kind of mistake: the ten cards on `/services/`, the seven dedicated
  service pages, the per-area service block on all 36 area pages (drawn from
  `serviceMix` in `data/locations.json`), and the *Services for quote*
  checkboxes on `/request-a-quote/`. The current list is residential, commercial
  and cottage window cleaning, screen & track cleaning, screen repair, gutter
  cleaning, soft washing, pressure washing, post-construction cleaning and
  maintenance plans.
- **Both forms post to Formspree** (`https://formspree.io/f/moeaaqly`), told
  apart by their `_subject` field. Field names on the quote form are the question
  text so the notification email reads like the form, and the email field is
  named exactly `email` so Formspree sets the reply-to from it.
  - With JavaScript, the quote form validates its "pick at least one" checkbox
    groups, posts in the background and sends the browser to `/quote-submitted/`.
    The contact form stays put and shows an inline success state.
  - Without JavaScript both post normally and Formspree redirects to the hidden
    `_next` field — `/quote-submitted/` and `/message-sent/` respectively. Those
    values are generated per environment; do not hand-edit them.
  - Both confirmation pages return to the home page after 10 seconds via
    `<meta http-equiv="refresh">`, so it works with JavaScript off; the matching
    script replaces it with a visible countdown a "Stay on this page" button can
    cancel.
- Google Tag Manager (`GTM-M3J9CBV4`) loads on every page. It receives
  `cn_phone_click`, `cn_email_click` and `cn_quote_click` from `site.js`,
  `cn_quote_submit` from the quote confirmation page, and `cn_contact_submit`
  from either the contact form (JavaScript path) or `/message-sent/` (no-JS
  path) — never both, so submissions are counted once.
- Claims on this site are deliberately narrow. Where something is not confirmed
  — out-of-hours commercial work, water access, absent-owner visits, product
  safety, guarantees, hours — the copy asks the visitor to raise it rather than
  answering on the business's behalf. See
  [OWNER-CONFIRMATIONS.md](OWNER-CONFIRMATIONS.md) before making any of them
  more definite.
- No `AggregateRating` or `Review` structured data anywhere, and no review count
  or star average in the copy. No public review profile could be located to
  substantiate one.

## Photos

Job photos were refreshed on 2026-08-03. All images are re-encoded with no EXIF
metadata and sized for their slot. Derivatives only ship when they earn their
place: a WebP sibling where WebP actually beats the JPEG, and a narrower step
(480px for the portraits, 760px and up for the landscapes) where the render slot
is materially smaller than the original. Pages use `<picture>` with
`display: contents`, so the `<img>` keeps its position in the surrounding
flex/grid layout and its inline styles keep working.

Two encodes exist purely for the scrimmed heroes on Services and About
(`work-5-hero-*`). Those sit under a 55–90% black gradient, so a lower quality is
invisible there — the unobscured gallery use of `work-5` on the home page keeps
the original file.

Only the true above-the-fold image on each page loads eagerly; everything else is
`loading="lazy"`. Getting this wrong is expensive: four eagerly-loaded cards on
`/services/` were pulling 900 KB in competition with the hero and cost that page
20 Lighthouse points.

| file | where it appears |
|---|---|
| `residential-front.jpg` | home hero, Residential card |
| `og-clearnorth.jpg` | the 1200×630 social preview image on every page |
| `residential-backyard.jpg` | Residential card (services), gallery tile |
| `work-1.jpg` | home hero portrait, About "at work" |
| `work-2.jpg` | gallery tile |
| `work-3.jpg` | "Our promise" pair (home), About |
| `work-4.jpg` | "Our promise" pair (home), gallery tile |
| `work-5.jpg` | Services + About hero |
| `work-6.jpg` | Commercial card (home + services) |
| `work-7.jpg` | Maintenance card (home + services) |
| `before-after-gutters.jpg` | Exterior Cleaning card (services) |
| `team-kyden.jpg`, `team-charles.jpg` | About — staff headshots |
| `favicon-32/192/512.png`, `apple-touch-icon.png`, `favicon.ico` | square icons cut from the logo |

Spares, in the repo but not placed on any page: `work-8.jpg` (Popeyes
storefront), `work-9.jpg` (green cottage in the woods),
`before-after-storefront.jpg`.

Replacing a photo: keep the **same filename**, then regenerate its WebP and
760px siblings. Landscape slots are 4:3, portrait slots are 3:4; anything else
gets centre-cropped by `object-fit: cover`. The service-area pages carry no
photography on purpose — there are no region-specific photos, and a general
photo captioned as a local job would be a lie.
