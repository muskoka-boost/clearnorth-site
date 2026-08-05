# Open questions for the owner

Everything here is a fact the site does not currently claim, because nobody has
confirmed it. None of it blocks launch — the pages read fine without these
answers. Each one is written so it can be answered yes, no, or with a sentence,
and the "what changes" column says what the answer would let the site say.

Nothing on this list should be turned into page copy without an answer.

---

## 1. Reviews and ratings — the one that matters most

The three testimonials on the home page are **preserved** and quoted verbatim.
Two were restored to the wording as originally published; the current site had
tidied them, which a quotation should not be.

**Where the trail led.** All three appear on the existing WordPress site at
`clearnorthwc.com/services/`, under a heading that says *"Check out our google
reviews and hear from our satisfied customers across the Greater Toronto Area"*.
So the business's own site describes them as Google reviews. No public Google
Business Profile, Google Maps listing or other review profile could be located
for ClearNorth Window Cleaning from the outside — searching the business name,
the phone number, the reviewer names and distinctive phrases from each quote all
came back to the business's own website. The Facebook page exists
(`facebook.com/profile.php?id=61577981040005`) but shows no public
recommendations without signing in.

**What the site does now, in the absence of a source.** The reviews stay. The
heading no longer calls the business "trusted experts" on the strength of its
own testimonials, and a line says these are general reviews about the work
rather than proof about any particular town. The hero badge keeps its five stars
— the three reviews below are all five-star, so that much is supported — and
lost "Trusted across the GTA", which nothing backs. The "5★ Rated by clients"
stat is gone entirely: it read as an aggregate rating from a review platform,
and there is no verifiable star average or review count behind it. No
`AggregateRating` or `Review` structured data has been added anywhere.

**What we need:**

| question | what changes |
|---|---|
| Is there a public Google Business Profile? What is its URL? | Rating badge and reviews heading link to it; "Google review" becomes an accurate label |
| Can you confirm the reviewer names and the platform for each of Julie B., Rohit (Our Laundry Haven) and Melissa P.? | Each quote gets an accurate source label |
| What is the current star average and review count? | Only if it is live-sourced or refreshed on a schedule — a hard-coded count goes stale within weeks and is worse than none |

Until there is a public profile with eligible review data, review structured
data stays off the site. Marking up reviews that a search engine cannot verify
is a spam-policy problem, not an SEO win.

---

## 2. Service scope

| question | why it is being asked |
|---|---|
| **Screen repair** — confirmed as offered? | It is on the quote form and on `/services/screen-track-cleaning/` as re-meshing into the existing frame. Confirm that is what is offered, and whether bent or corroded frames are turned away |
| **Pressure washing** — confirmed, and on which surfaces? | The site says driveways, walkways, patios and concrete, and that painted or finished surfaces get soft washing instead. Confirm the boundary |
| **Soft washing** — what solution, and is it safe around planting? | The site currently says nothing about the solution. Answer this and the pages can be specific instead of general |
| **Gutter cleaning** — is debris removed from site, or bagged and left? | The exterior page says removed from site. Confirm |
| **Roof cleaning** — correct that it is *not* offered? | `/services/exterior-cleaning/` states plainly that roofs are not something we take on. If that is wrong, it needs changing |
| **Maintenance plans** — real, recurring, and quoted per property? | The page says there is no fixed menu of plans and no published pricing, only an interval you agree. Confirm that is right |
| **Above three storeys** — what actually happens? | The quote form stops at three. Every service page says taller is "quoted case by case". Is there a real ceiling, and is lift or rope access ever used? |

---

## 3. Operational limits the location pages deliberately do not claim

Several service-area pages previously stated these as facts. They now ask the
visitor to raise it instead. `data/locations.json` records which page needed
which confirmation, under `needsConfirmation`.

| question | pages affected |
|---|---|
| **Water-access-only properties** — accepted? On what terms, and is there a surcharge? | Lake Joseph, Georgian Bay Township, Parry Sound, Muskoka Lakes, Lake Muskoka, Lake Rosseau, Muskoka, Haliburton, Hastings County, Kawartha Lakes |
| **Absent-owner visits** — will you work with nobody on site? Key/code handling? Photos afterwards? Invoicing after the fact? | Haliburton, Lake of Bays, Lake Rosseau, Muskoka, Muskoka Lakes, Brighton, Hastings County |
| **Commercial work outside normal hours** — early morning or after close, genuinely available? | Toronto, Scarborough, Bracebridge, and the FAQ |
| **Travel rules by distance** — how far ahead must Muskoka, Haliburton, Parry Sound, Hastings and Mississauga be booked? Is there a minimum job size for the far ones? | All distant areas; the pages currently say "planned trip, give notice" without a number |
| **Same-day or emergency work** — offered anywhere? | Nowhere claims it. Confirm it should stay that way |

---

## 4. Products, pets and safety

The previous copy said cleaning products were "non-toxic and pet-safe once dry",
on the home page, About and the FAQ. That is an absolute safety claim about
products nobody has named, so it has been replaced by the precaution a customer
can act on: keep pets off wet surfaces until they dry, and tell us about
sensitivities or planting under a window.

| question | what changes |
|---|---|
| Which products are actually used? | The FAQ can name them and point at the real safety data |
| What do the manufacturers' instructions say about pets, children and planting? | The precaution wording can match the instructions exactly instead of being generic |
| Are alternatives genuinely available on request? | The old copy promised this; it is not currently claimed |

---

## 5. Business facts not currently on the site

| question | what changes |
|---|---|
| **Business hours** | Added visibly and to `openingHoursSpecification` in the schema. Currently absent from both, deliberately |
| **Years in business / jobs completed** | About said "years of experience" with no number; that is gone. A real founding year could go back |
| **Guarantee** — is there one, and what is the remedy? | "Streak-free, hassle-free, guaranteed" is gone from the home page. A documented guarantee with a stated remedy could return |
| **Insurance / WSIB** | Not mentioned anywhere. Only worth adding if the owner wants it shown and can substantiate it |
| **Team size** | The site says two people who do the work themselves, based on the About page. Confirm that is still accurate |
| **Weather policy** | Pages say to agree it when booking rather than stating a policy. A real policy would be better copy |

---

## 6. Technical

| question | why |
|---|---|
| **www or bare domain** as the canonical? | `site.config.json` assumes `www.clearnorthwc.com`. One field to change |
| **Separate Formspree endpoint for the contact form?** | Both forms currently post to `moeaaqly` and are distinguished by the `_subject` field. It works; a second endpoint would be tidier |
| **The Muskoka Digital Boost footer credit** | Kept, now with `rel="nofollow"`. Confirm it should stay after launch |

---

## Pages held back or recommended for consolidation

**None.** All 36 service-area pages are indexable. After the rebuild the average
page carries 575 words of main content and 92% of its six-word sequences appear
on fewer than half the other pages; the closest match for any page is 15%. Every
page answers something the others do not.

Two hierarchy points worth knowing, both handled by linking rather than merging:

- **Muskoka is cut two ways on purpose.** By municipality (Bracebridge,
  Gravenhurst, Huntsville, Muskoka Lakes, Lake of Bays, Georgian Bay, plus Port
  Carling and Bala) and by water (Lake Muskoka, Lake Rosseau, Lake Joseph),
  because a cottage owner and a homeowner search differently. Each page says
  which it is and links to its counterpart, so the two sets complement rather
  than compete. `/service-areas/muskoka/` is the hub for both.
- **Rosseau and Lake Rosseau are different places.** The village is in Seguin
  Township, Parry Sound District — not Muskoka. Both pages open by saying so and
  linking to the other.

Nine pages sit a little under the 550-word target (Courtice 525, Hampton 537,
Pickering 544, Bala 545, Whitby 543, Trenton 533, Cobourg 539, Bowmanville 550,
Durham Region 548). They are short because there is genuinely less to say about
them, not because material was cut — a shorter honest page beats a padded one.
