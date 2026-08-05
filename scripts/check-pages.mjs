#!/usr/bin/env node
// ClearNorth — pre-launch crawl of the built site.
//
// Everything here is checkable without a browser: links, metadata, landmarks, headings,
// images, forms and structured data, read straight out of the HTML. It is the list of
// things that are cheap to get wrong in a site with no build step and 50-odd
// self-contained pages, and expensive to notice after launch.
//
// Usage:
//   node scripts/check-pages.mjs                 # check against site.config.json's active env
//   node scripts/check-pages.mjs --env=production # check a build made for another env
//
// Pass the same --env you passed to apply-site-config.mjs, or the origin checks will
// compare the built pages against the wrong host and fail on every one of them.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));

const envArg = process.argv.find((a) => a.startsWith('--env='));
const ENV_NAME = envArg ? envArg.slice('--env='.length) : CONFIG.active;
const env = CONFIG.environments[ENV_NAME];
if (!env) {
  console.error(`Unknown environment "${ENV_NAME}". Known: ${Object.keys(CONFIG.environments).join(', ')}`);
  process.exit(2);
}
const SITE_URL = env.siteUrl.replace(/\/+$/, '');

const errors = [];
const warnings = [];
const err = (file, msg) => errors.push(`${file}: ${msg}`);
const warn = (file, msg) => warnings.push(`${file}: ${msg}`);

// ---------------------------------------------------------------- discovery

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '.git' || e.name === 'node_modules') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const allFiles = walk(ROOT);
const htmlFiles = allFiles.filter((f) => f.endsWith('.html')).sort();
const rel = (f) => path.relative(ROOT, f).split(path.sep).join('/');

// ---------------------------------------------------------------- helpers

const stripComments = (s) => s.replace(/<!--[\s\S]*?-->/g, '');
const textOf = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

function mainOf(html) {
  const m = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  return m ? m[1] : '';
}

/** Resolve an href from a page to a repo path, or null if it is not a local page. */
function resolveLocal(fromFile, href) {
  if (/^(https?:|mailto:|tel:|#|data:|javascript:)/i.test(href)) return null;
  const [pathPart] = href.split('#');
  if (!pathPart) return null;
  const base = path.dirname(fromFile);
  const abs = pathPart.startsWith('/')
    ? path.join(ROOT, pathPart)
    : path.resolve(base, pathPart);
  return abs;
}

function existsAsPage(abs) {
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return true;
  if (fs.existsSync(path.join(abs, 'index.html'))) return true;
  return false;
}

// ---------------------------------------------------------------- per-page checks

const titles = new Map();
const descriptions = new Map();
const canonicals = new Map();
const pages = [];

for (const file of htmlFiles) {
  const raw = fs.readFileSync(file, 'utf8');
  const html = stripComments(raw);
  const name = rel(file);
  const is404 = name === '404.html';
  pages.push(name);

  // --- one H1, one main, landmarks -------------------------------------------
  const h1s = html.match(/<h1\b/gi) || [];
  if (h1s.length !== 1) err(name, `${h1s.length} <h1> elements (expected exactly 1)`);

  if (!is404) {
    const mains = html.match(/<main\b/gi) || [];
    if (mains.length !== 1) err(name, `${mains.length} <main> landmarks (expected exactly 1)`);
    if (!/<main id="main-content"/.test(html)) err(name, '<main> is missing id="main-content"');
    if (!/class="cn-skip" href="#main-content"/.test(html)) err(name, 'no skip link to #main-content');
    if (!/<header\b/.test(html)) err(name, 'no <header> landmark');
    if (!/<footer\b/.test(html)) err(name, 'no <footer> landmark');
    if (!/<nav\b/.test(html)) warn(name, 'no <nav> landmark');
  }

  // --- heading order ----------------------------------------------------------
  const levels = [...html.matchAll(/<h([1-6])\b/gi)].map((m) => +m[1]);
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) {
      warn(name, `heading jumps h${levels[i - 1]} → h${levels[i]}`);
      break;
    }
  }

  // --- title and description --------------------------------------------------
  const title = (html.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1].trim();
  const desc = (html.match(/<meta name="description" content="([\s\S]*?)">/) || [, ''])[1].trim();
  if (!title) err(name, 'no <title>');
  if (!desc && !is404) err(name, 'no meta description');
  if (title) {
    if (titles.has(title)) err(name, `title duplicated with ${titles.get(title)}`);
    else titles.set(title, name);
    if (title.length > 65) warn(name, `title is ${title.length} chars (target ~45–60)`);
  }
  if (desc) {
    if (descriptions.has(desc)) err(name, `meta description duplicated with ${descriptions.get(desc)}`);
    else descriptions.set(desc, name);
    if (desc.length > 165) warn(name, `meta description is ${desc.length} chars (target ~140–160)`);
    if (desc.length < 70) warn(name, `meta description is only ${desc.length} chars`);
  }

  // --- viewport, lang ---------------------------------------------------------
  const viewports = html.match(/<meta name="viewport"/g) || [];
  if (viewports.length !== 1) err(name, `${viewports.length} viewport meta tags (expected 1)`);
  if (!/<html lang="en-CA"/.test(html)) err(name, 'missing lang="en-CA" on <html>');

  // --- canonical --------------------------------------------------------------
  const canonical = (html.match(/<link rel="canonical" href="([^"]+)">/) || [, ''])[1];
  if (!canonical) {
    err(name, 'no canonical');
  } else {
    if (!canonical.startsWith(SITE_URL)) err(name, `canonical is off-origin: ${canonical}`);
    const expected = SITE_URL + '/' + name.replace(/index\.html$/, '');
    if (canonical !== expected) err(name, `canonical ${canonical} is not self-referencing (expected ${expected})`);
    if (canonicals.has(canonical)) err(name, `canonical duplicated with ${canonicals.get(canonical)}`);
    else canonicals.set(canonical, name);
  }

  // --- robots -----------------------------------------------------------------
  const robots = (html.match(/<meta name="robots" content="([^"]+)">/) || [, ''])[1];
  const shouldNoindex = !env.indexable || CONFIG.noindexPaths.includes('/' + name.replace(/index\.html$/, '')) || is404;
  if (shouldNoindex && !robots) err(name, 'expected a noindex robots tag for this environment/page');
  if (!shouldNoindex && /noindex/.test(robots)) err(name, `unexpected noindex on an indexable page`);

  // --- images -----------------------------------------------------------------
  for (const tag of html.match(/<img\b[^>]*>/g) || []) {
    const src = (tag.match(/src="([^"]+)"/) || [, ''])[1];
    if (!/\balt=/.test(tag)) err(name, `<img src="${src}"> has no alt attribute`);
    if (!/\bwidth=/.test(tag) || !/\bheight=/.test(tag)) {
      if (!src.includes('logo')) warn(name, `<img src="${src}"> has no intrinsic width/height`);
    }
    const abs = resolveLocal(file, src);
    if (abs && !fs.existsSync(abs)) err(name, `image not found: ${src}`);
  }

  // every srcset / <source> candidate must exist too
  for (const set of html.match(/srcset="([^"]+)"/g) || []) {
    for (const cand of set.slice(8, -1).split(',')) {
      const url = cand.trim().split(/\s+/)[0];
      const abs = resolveLocal(file, url);
      if (abs && !fs.existsSync(abs)) err(name, `srcset image not found: ${url}`);
    }
  }

  // --- scripts, styles, links, icons ------------------------------------------
  for (const m of html.matchAll(/<(?:script|link)\b[^>]*(?:src|href)="([^"]+)"[^>]*>/g)) {
    const url = m[1];
    if (/rel="canonical"/.test(m[0])) continue;
    const abs = resolveLocal(file, url);
    if (abs && !existsAsPage(abs)) err(name, `asset not found: ${url}`);
  }

  // --- internal links ---------------------------------------------------------
  for (const m of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
    const href = m[1];
    if (/^tel:/.test(href) && !/^tel:\d{10,}$/.test(href)) warn(name, `odd tel: link ${href}`);
    if (/^mailto:/.test(href) && !href.includes('@')) err(name, `broken mailto: ${href}`);
    const abs = resolveLocal(file, href);
    if (abs && !existsAsPage(abs)) err(name, `broken internal link: ${href}`);
  }

  // --- buttons and accordions -------------------------------------------------
  for (const tag of html.match(/<button\b[^>]*>/g) || []) {
    if (!/type="(button|submit|reset)"/.test(tag)) {
      err(name, `<button> without an explicit type: ${textOf(tag).slice(0, 40)}`);
    }
  }

  // --- forms ------------------------------------------------------------------
  for (const form of html.match(/<form\b[^>]*>/g) || []) {
    if (!/action="/.test(form)) err(name, '<form> has no action — it cannot deliver anything');
  }
  const formBodies = raw.match(/<form[\s\S]*?<\/form>/g) || [];
  for (const body of formBodies) {
    // Which character ranges sit inside a <label>…</label>, so a wrapped control counts
    // as labelled even though it has no for= pointing at it.
    const wrapped = [...body.matchAll(/<label\b[\s\S]*?<\/label>/g)].map((m) => [m.index, m.index + m[0].length]);
    const inLabel = (i) => wrapped.some(([a, b]) => i >= a && i < b);

    for (const m of body.matchAll(/<(?:input|textarea|select)\b[^>]*>/g)) {
      const field = m[0];
      if (/type="(hidden|submit|button)"/.test(field)) continue;
      if (/aria-hidden="true"/.test(field)) continue; // the honeypot
      const id = (field.match(/\bid="([^"]+)"/) || [, ''])[1];
      const nm = (field.match(/\bname="([^"]+)"/) || [, ''])[1];
      if (!nm) err(name, `form field with no name: ${field.slice(0, 60)}`);

      const labelled =
        inLabel(m.index) ||
        (id && new RegExp(`<label[^>]*for="${id}"`).test(body)) ||
        /aria-label(?:ledby)?=/.test(field);
      if (!labelled) err(name, `form field "${nm || id}" has no associated label`);
    }
  }

  // --- placeholder text -------------------------------------------------------
  const main = mainOf(html);
  for (const marker of ['TODO', 'FIXME', 'Lorem ipsum', 'XXX', '{{', '[placeholder]']) {
    if (main.includes(marker)) err(name, `placeholder text in main content: ${marker}`);
  }
  if (/\\u[0-9a-f]{4}/i.test(main)) err(name, 'literal \\uXXXX escape in rendered content');

  // --- structured data --------------------------------------------------------
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    let data;
    try {
      data = JSON.parse(m[1]);
    } catch (e) {
      err(name, `JSON-LD does not parse: ${e.message}`);
      continue;
    }
    const nodes = data['@graph'] || [data];
    const json = JSON.stringify(data);
    for (const url of json.match(/https?:\/\/[^"]+/g) || []) {
      if (url.startsWith(SITE_URL)) continue;
      if (/schema\.org|instagram\.com|facebook\.com|tiktok\.com/.test(url)) continue;
      err(name, `JSON-LD points at an unexpected origin: ${url}`);
    }
    if (/AggregateRating|"@type":"Review"/.test(json)) {
      err(name, 'JSON-LD contains rating/review markup — not supported by a verifiable source');
    }
    for (const node of nodes) {
      if (!node['@type']) err(name, 'JSON-LD node without @type');
    }
  }

  // --- word count on service-area pages ---------------------------------------
  if (name.startsWith('service-areas/') && name !== 'service-areas/index.html') {
    const words = (textOf(main).match(/[a-z0-9][a-z0-9'’-]*/gi) || []).length;
    if (words < 300) err(name, `only ${words} words of main content`);
  }
}

// ---------------------------------------------------------------- site-wide

// sitemap
const sitemapPath = path.join(ROOT, 'sitemap.xml');
if (fs.existsSync(sitemapPath)) {
  const xml = fs.readFileSync(sitemapPath, 'utf8');
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (env.indexable) {
    if (!locs.length) err('sitemap.xml', 'production environment but the sitemap is empty');
    for (const loc of locs) {
      if (!loc.startsWith(SITE_URL)) err('sitemap.xml', `entry on the wrong origin: ${loc}`);
      const p = loc.slice(SITE_URL.length) || '/';
      const abs = path.join(ROOT, p);
      if (!existsAsPage(abs)) err('sitemap.xml', `entry has no page: ${loc}`);
      if (CONFIG.noindexPaths.includes(p)) err('sitemap.xml', `noindex page listed: ${loc}`);
    }
    if (/<priority>|<changefreq>/.test(xml)) warn('sitemap.xml', 'contains <priority>/<changefreq>, which Google ignores');
  } else if (locs.length) {
    err('sitemap.xml', `preview environment is publishing ${locs.length} URLs`);
  }
} else {
  warn('sitemap.xml', 'not present');
}

// robots
const robotsPath = path.join(ROOT, 'robots.txt');
if (fs.existsSync(robotsPath)) {
  const txt = fs.readFileSync(robotsPath, 'utf8');
  const blocksAll = /^\s*Disallow:\s*\/\s*$/m.test(txt);
  if (env.indexable && blocksAll) err('robots.txt', 'production environment but robots.txt disallows everything');
  if (!env.indexable && !blocksAll) err('robots.txt', 'preview environment but robots.txt does not block crawling');
  if (env.indexable && !/Sitemap:/i.test(txt)) err('robots.txt', 'production robots.txt has no Sitemap: line');
} else {
  err('robots.txt', 'missing');
}

// orphans: every page should be reachable from another page
const linked = new Set();
for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  for (const m of html.matchAll(/<a\b[^>]*href="([^"]+)"/g)) {
    const abs = resolveLocal(file, m[1]);
    if (!abs) continue;
    const target = fs.existsSync(path.join(abs, 'index.html')) ? path.join(abs, 'index.html') : abs;
    if (target !== file) linked.add(rel(target));
  }
}
for (const p of pages) {
  if (p === 'index.html' || p === '404.html') continue;
  if (CONFIG.noindexPaths.includes('/' + p.replace(/index\.html$/, ''))) continue;
  if (!linked.has(p)) err(p, 'orphan — no other page links to it');
}

// ---------------------------------------------------------------- report

console.log(`ClearNorth — page checks (${pages.length} pages, environment "${ENV_NAME}")\n`);

if (warnings.length) {
  console.log(`WARNINGS (${warnings.length})`);
  for (const w of warnings) console.log(`  ${w}`);
  console.log('');
}
if (errors.length) {
  console.log(`ERRORS (${errors.length})`);
  for (const e of errors) console.log(`  ${e}`);
} else {
  console.log('No errors.');
}

process.exit(errors.length ? 1 : 0);
