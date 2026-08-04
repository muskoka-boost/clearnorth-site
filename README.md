# ClearNorth Window Cleaning — website

Static copy of the live site at https://clear.muskokadigitalboost.ca/
captured 2026-08-02 (site last modified 2026-07-29).

## Structure

```
index.html              home
services/index.html     services
service-areas/index.html            hub — links to all 36 area pages
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
