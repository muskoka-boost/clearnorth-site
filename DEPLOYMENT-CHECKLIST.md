# Deployment checklist

Three environments, one config file. Everything that differs between them —
canonicals, Open Graph and Twitter URLs, schema URLs, the robots meta tag,
`robots.txt`, `sitemap.xml` and the form's no-JavaScript return address — is
generated from `site.config.json` by `scripts/apply-site-config.mjs`. No page
should ever contain a hand-typed origin.

| environment | origin | indexable | sitemap |
|---|---|---|---|
| `github-pages` | `https://muskoka-boost.github.io/clearnorth-site` | no | empty |
| `client-preview` | `https://clear.muskokadigitalboost.ca` | no | empty |
| `production` | `https://www.clearnorthwc.com` | **yes** | generated |

```sh
node scripts/apply-site-config.mjs --env=production   # rewrite for an environment
node scripts/apply-site-config.mjs --check            # CI gate: is the HTML current?
node scripts/check-pages.mjs --env=production         # crawl and validate the result
node scripts/check-location-uniqueness.mjs            # 36-page uniqueness report
```

`--check` writes nothing and exits 1 if any committed file disagrees with the
config, so a stale build cannot reach a branch unnoticed.

---

## How each host is deployed

The two preview hosts are unrelated pieces of infrastructure, and each needs its
own workflow. Neither one updates the other.

| host | served by | workflow |
|---|---|---|
| `muskoka-boost.github.io/clearnorth-site` | GitHub Pages | `.github/workflows/deploy-pages.yml` |
| `clear.muskokadigitalboost.ca` | cPanel / LiteSpeed, over FTPS | `.github/workflows/deploy-client-preview.yml` |

Both run on every push to `main`, each building for its own environment, so the
two previews and the repo stay in step. Before `deploy-client-preview.yml`
existed the client-preview host was updated by hand and drifted ten commits
behind — missing all seven service pages and `/request-a-quote/`, and still
serving the `/booking/` page the repo had removed.

The client-preview host was first brought back into step on 2026-08-09. Besides
the missing pages, that deploy removed three things a hand-upload had left in the
document root: `booking/`, `README.md`, and `clearnorth-site-main.zip` — a
complete copy of the repository, publicly downloadable. `robots.txt` said
`Disallow: /`, which asks crawlers not to look; it does not stop anyone with the
URL. Deploying from CI is what keeps stray files from accumulating there.

### What the FTPS deploy needs

One repository secret, `FTP_PASSWORD` (Settings → Secrets and variables →
Actions). The host and the account name are not credentials, so they sit in the
workflow's `env:` block where they can be read alongside the code that uses them.

Optionally a repository *variable* `FTP_REMOTE_DIR` if the document root is not
`public_html`.

The upload is an `lftp mirror --reverse --delete`, so anything on the host that
is not in the build is removed — that is what retires pages like `/booking/`.
Host-managed files are excluded and never touched: `.htaccess`, `cgi-bin/`,
`.well-known/`, `error_log`, `php.ini`, `.user.ini`, `.ftpquota`. Because
`--delete` is destructive when aimed at the wrong directory, the job first lists
the target and refuses to run unless it finds `index.html` and `service-areas/`
there.

Run it manually from the Actions tab to preview a change: `dry_run` defaults to
**true** on `workflow_dispatch`, which lists every upload and deletion without
performing any. Push-triggered runs always deploy.

### Why the deploy connects to `rev6.web-dns1.com`

The FTPS certificate is issued for the shared hosting server's own name, not for
`ftp.clear.muskokadigitalboost.ca`, and the server sends only its leaf — no
intermediate. Connecting by the server's real name, with Let's Encrypt's YR1 and
Root YR supplied from `.github/ftps-trust/`, is what lets the deploy verify the
certificate properly rather than skip the check. Full reasoning, fingerprints and
the failure it fixes are in `.github/ftps-trust/README.md`.

---

## Before launch

### 1. Settle the canonical domain

`site.config.json` assumes **`https://www.clearnorthwc.com`**. Confirm with the
owner whether www or bare is the preferred form, then set `environments.production.siteUrl`
to match. Everything else follows from that one field.

### 2. Switch to production mode

```sh
node scripts/apply-site-config.mjs --env=production
node scripts/check-pages.mjs --env=production     # must report no errors
```

Then set `"active": "production"` in `site.config.json` so the default matches
what is deployed, and commit the result.

What this changes, so you can spot-check it:

- `<link rel="canonical">` on all 54 pages moves to the branded domain
- the `noindex,nofollow` meta tag is removed everywhere except `/quote-submitted/`,
  `/message-sent/` and `404.html`, which keep `noindex,follow`
- `robots.txt` switches from `Disallow: /` to `Allow: /` and gains a `Sitemap:` line
- `sitemap.xml` is generated with 51 URLs — canonical, indexable pages only
- the quote and contact forms' hidden `_next` fields point at the production host

### 3. Redirects at the host

- Bare domain and `www` must resolve to the chosen canonical in **one** 301 hop.
  Test both, plus `http://` on each — `curl -sIL` and count the `Location:` headers.
- HTTP must 301 to HTTPS, again in one hop.
- Trailing slashes: every internal link uses `/path/`. Make sure `/path` redirects
  to `/path/` rather than serving both.

### 4. Map the old WordPress URLs

The branded domain currently runs WordPress. Every URL that has been linked or
indexed needs a 301 to its replacement. Known ones:

| old | new |
|---|---|
| `/services/` | `/services/` (same path, new page) |
| `/about-us/` | `/about-us/` |
| `/privacy-policy/` | `/privacy-policy/` |
| the quotes/booking page | `/request-a-quote/` |

Crawl the live WordPress site before switching DNS and map anything else it
turns up. Anything without an obvious replacement should go to the closest
relevant page, not to the home page and not to a 404.

Note: this repo's quote page moved from `/booking/` to `/request-a-quote/`
during the rebuild. `/booking/` was never public on any host, so it needs no
redirect — but if the preview URL was shared with anyone, add one.

### 5. Crawl every production URL

```sh
node scripts/check-pages.mjs --env=production
```

Then, against the live host: request all 51 sitemap URLs and confirm each
returns 200 (or an intentional 301 that lands on a 200). Confirm no page in the
sitemap redirects at all — a redirecting URL should not be in a sitemap.

### 6. Confirm before submitting anything

- [ ] No production page contains `noindex` except the three named above
- [ ] `robots.txt` does not block any page, image, stylesheet or script
- [ ] Every canonical is self-referencing and on the final domain
- [ ] Every `og:url`, `og:image`, `twitter:image` and JSON-LD URL uses the final domain
- [ ] `sitemap.xml` lists only 200-returning, canonical, indexable pages
- [ ] The quote form delivers — submit a real test and check the Formspree inbox
- [ ] The contact form delivers — same, and check the `_subject` distinguishes it
- [ ] Both forms' no-JavaScript path lands on `/quote-submitted/` and `/message-sent/`
- [ ] `GTM-M3J9CBV4` fires, and `cn_quote_submit` / `cn_contact_submit` arrive

### 7. Submit the sitemap

Only after the above. Add the property in Google Search Console, verify it, and
submit `https://www.clearnorthwc.com/sitemap.xml`. Do **not** submit either
preview host's sitemap — both are empty by design, but they should not be
registered at all.

---

## Security headers

GitHub Pages cannot set response headers, so these apply once the site is on a
host that can (Cloudflare, Netlify, nginx, most managed hosting). Two things on
the page must keep working: the Google Tag Manager container, and the Google
Maps embed on `/contact/` and every service-area page.

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=(), interest-cohort=()
Content-Security-Policy: default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.googletagmanager.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https://www.googletagmanager.com https://*.google.com https://*.gstatic.com;
  font-src 'self';
  connect-src 'self' https://formspree.io https://www.google-analytics.com https://*.analytics.google.com;
  frame-src https://www.google.com https://www.googletagmanager.com;
  frame-ancestors 'self';
  base-uri 'self';
  form-action 'self' https://formspree.io
```

Notes on that policy:

- `'unsafe-inline'` in `script-src` is required: GTM's loader is an inline
  script, as is the head snippet that arms the animation failsafe. Removing it
  means nonces, which a static site with no build step cannot generate per
  request.
- `'unsafe-inline'` in `style-src` is required: every page styles its elements
  inline. This is how the site is built.
- `connect-src` must include `formspree.io` or the JavaScript form submission
  silently fails and falls back to a full page post.
- `form-action` must include `formspree.io` for the no-JavaScript path.
- Add `Strict-Transport-Security` **last**, once HTTPS is confirmed working on
  both apex and www. It is hard to undo.

If a full CSP is too much for the host, `frame-ancestors 'self'`,
`X-Content-Type-Options` and `Referrer-Policy` alone are worth having.

---

## After launch

- Watch Search Console coverage for the first fortnight; anything reported as
  "Excluded by 'noindex'" that is not one of the three utility pages is a bug.
- Re-run `node scripts/apply-site-config.mjs --check` before any deploy.
- `<lastmod>` in the sitemap comes from each file's last commit date, so it
  moves when a page actually changes rather than on every deploy. Nothing to
  maintain by hand.
