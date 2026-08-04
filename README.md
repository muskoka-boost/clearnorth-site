# ClearNorth Window Cleaning — website

## Domains

- **Production — https://www.clearnorthwc.com/** — the final live site. This is the
  real address of the business.
- **Staging — https://clear.muskokadigitalboost.ca/** — a preview host only. It is
  **not** the live site: don't hand it out, link to it, or put it on anything
  printed.

Every host named in the repo still points at **staging**: the `<link rel="canonical">`
and `og:url` on each page, the `og:image`/`twitter:image` URLs, and every `<loc>` in
`sitemap.xml`. Going live means replacing `clear.muskokadigitalboost.ca` with
`www.clearnorthwc.com` across those, together with the noindex removal under
[Notes](#notes).

The single deliberate exception is `_next` in the booking form, which already points
at production — see [Notes](#notes) for why.

## Structure

```
index.html              home
services/index.html     services
service-areas/index.html            hub — links to all 36 area pages
service-areas/<area>/index.html     one landing page per service area
about-us/index.html
faq/index.html
contact/index.html
booking/index.html      the quote form
quote-submitted/index.html          confirmation after the form, redirects home
privacy-policy/index.html
assets/img/            photos + logo
assets/fonts/          Manrope + Space Grotesk (self-hosted woff2)
assets/js/site.*.js              nav toggle, FAQ accordion, scroll animations
assets/js/quote-form.*.js        booking form — validation + background submit
assets/js/quote-submitted.*.js   confirmation page — countdown + conversion event
robots.txt sitemap.xml site.webmanifest
```

JS filenames carry a content hash. Editing one means renaming it to match and
updating the `<script src>` that points at it, otherwise browsers serve the old copy.

Every page is self-contained HTML with inline `<style>` blocks — there is no
build step and no CSS framework. To change text or styling, edit the `.html`
file directly.

## Service-area pages

Each community has its own page at `/service-areas/<slug>/`, with copy written
for that area — property types, the kind of grime that turns up there, and how
bookings work locally. They are reachable only from the boxes on
`/service-areas/`, deliberately **not** from the nav bar.

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
Gravenhurst and Huntsville, and the townships of Muskoka Lakes, Lake of Bays
and Georgian Bay — plus Port Carling and Bala, villages inside Muskoka Lakes
that people search for by name. And by water: `lake-muskoka`, `lake-rosseau`
and `lake-joseph`, the big three, which is how a cottage owner thinks of their
own place. The `muskoka` page leads with the lakes and links down to both sets.

Rosseau sits at the north end of Lake Rosseau but is in Seguin Township,
**Parry Sound District** — not Muskoka. It is grouped and linked accordingly,
and it is the closest served community to Parry Sound itself.

Each page ends with a **Nearby areas** block, and the hub groups areas by
region. Both are geographic claims — check a map before changing either.
Haliburton and Parry Sound are the easy mistake: both are cottage country, but
Muskoka sits between them, so they are neither neighbours nor a group. Parry
Sound belongs with Muskoka; Haliburton belongs with Kawartha Lakes, which it
borders, and its closest towns are Dorset, Lake of Bays and Huntsville.

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

## Notes

- Pages carry `<meta name="robots" content="noindex,nofollow">` and
  `robots.txt` disallows all crawlers — this is the staging host keeping itself out
  of search results, and it is also why the staging URL must not be shared. Remove
  both when the site moves to **https://www.clearnorthwc.com/**. The one page that
  keeps its noindex is `/quote-submitted/` — it is a confirmation page, which is also
  why it is deliberately absent from `sitemap.xml`.
- **The service list is duplicated in three places** and they have to agree, because
  a page that advertises something the business does not do is the expensive kind of
  mistake: the nine cards on `/services/`, the "Beyond the glass" snippet on all 36
  service-area pages, and the *Services for quote* checkboxes on `/booking/`. The
  current list is residential and commercial window cleaning, screen &amp; track
  cleaning, screen repair, gutter cleaning, soft washing, pressure washing,
  post-construction cleaning and maintenance plans. Screen repair, gutter cleaning,
  soft washing and pressure washing are the newest, and carry a red **New** badge on
  the `/services/` exterior row and on every area-page snippet — those badges are one
  `<span>` each and should come off once the services stop being news.
- The home page and the FAQ still describe the window-cleaning services only; neither
  mentions the four newer ones.
- The contact form has no `action` attribute, so it does not submit anywhere.
- **The booking form** is plain HTML posting to Formspree
  (`https://formspree.io/f/moeaaqly`) — it replaced an embedded Google Form, question
  for question. Field names are the question text so the notification email reads like
  the form, and the email field is named exactly `email` so Formspree sets the
  reply-to from it.
  - With JavaScript, `quote-form.js` validates the two "pick at least one" checkbox
    groups, posts in the background and sends the browser to `/quote-submitted/`.
  - Without JavaScript the browser posts the form itself and Formspree redirects to
    the hidden `_next` field. That field is hard-coded to
    `https://www.clearnorthwc.com/quote-submitted/`, since production is the only host
    a real visitor ever submits from; `quote-form.js` rewrites it to whatever origin
    is actually serving the page, so a normal staging visit stays on staging. **When
    the site goes live this value is already correct — leave it on the production
    host.**
  - `/quote-submitted/` confirms the request and returns to the home page after 10
    seconds. The redirect is a `<meta http-equiv="refresh">` so it happens with
    JavaScript off; `quote-submitted.js` replaces it with a visible countdown that a
    "Stay on this page" button can cancel.
- Google Tag Manager (`GTM-M3J9CBV4`) loads on every page. It receives
  `cn_phone_click`, `cn_email_click` and `cn_quote_click` from `site.js`, and
  `cn_quote_submit` from the confirmation page — fired there rather than on submit so
  it is not racing a page navigation, and so both submit routes count once.

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
