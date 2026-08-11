#!/usr/bin/env node
// ClearNorth — apply site.config.json to every page.
//
// The site has no build step: each page is a self-contained HTML file. This script is
// the one exception, and it exists so that no absolute origin is ever typed into a page
// by hand. It owns a delimited block in every <head>:
//
//     <!-- cn:generated:start -->  … <!-- cn:generated:end -->
//
// and regenerates it from site.config.json plus the page's own <script id="cn-page-meta">
// island. That block holds the canonical, the Open Graph and Twitter URLs, the robots
// meta tag and all JSON-LD. Everything else in the file is hand-written and untouched.
//
// Usage:
//   node scripts/apply-site-config.mjs                 # use config.active
//   node scripts/apply-site-config.mjs --env=production
//   node scripts/apply-site-config.mjs --check         # exit 1 if anything is stale
//
// --check writes nothing; use it in CI to prove the committed HTML matches the config.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));

const argv = process.argv.slice(2);
const CHECK_ONLY = argv.includes('--check');
const envArg = argv.find((a) => a.startsWith('--env='));
const ENV_NAME = envArg ? envArg.slice('--env='.length) : CONFIG.active;

const env = CONFIG.environments[ENV_NAME];
if (!env) {
  console.error(`Unknown environment "${ENV_NAME}". Known: ${Object.keys(CONFIG.environments).join(', ')}`);
  process.exit(2);
}

// One trailing-slash rule for the whole script: SITE_URL never ends in "/", every page
// path always starts and ends with one. url('/') therefore yields ".../" and not "//".
const SITE_URL = env.siteUrl.replace(/\/+$/, '');
const url = (p) => SITE_URL + p;

const START = '<!-- cn:generated:start -->';
const END = '<!-- cn:generated:end -->';

const BUSINESS_ID = url('/#business');
const WEBSITE_ID = url('/#website');

// ---------------------------------------------------------------- file discovery

function htmlFiles(dir = ROOT, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'scripts') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) htmlFiles(full, out);
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

/** /home/…/service-areas/toronto/index.html -> "/service-areas/toronto/" */
function pagePath(file) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  if (rel === '404.html') return '/404.html';
  return '/' + rel.replace(/index\.html$/, '');
}

// ---------------------------------------------------------------- page metadata

function readMeta(html, file) {
  const m = html.match(/<script type="application\/json" id="cn-page-meta">([\s\S]*?)<\/script>/);
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch (err) {
    throw new Error(`${path.relative(ROOT, file)}: cn-page-meta is not valid JSON — ${err.message}`);
  }
}

// Titles and descriptions are read out of HTML attributes, so they arrive escaped.
// JSON-LD wants the plain text: "Residential &amp; Commercial" must become
// "Residential & Commercial" before it is serialised.
const unescapeHtml = (s) =>
  s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&'); // last: an escaped "&amp;amp;" must not collapse twice

const titleOf = (html) => unescapeHtml((html.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1].trim());
const descOf = (html) =>
  unescapeHtml((html.match(/<meta name="description" content="([\s\S]*?)">/) || [, ''])[1].trim());

// The generated block is built from already-escaped page values (title/description come
// straight out of the HTML), so only genuinely new strings need escaping.
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// JSON-LD sits inside <script>, where the only sequence that can break out is "</".
const jsonld = (obj) => JSON.stringify(obj).replace(/<\//g, '<\\/');

// ---------------------------------------------------------------- schema builders

function businessNode() {
  return {
    '@type': 'HomeAndConstructionBusiness',
    '@id': BUSINESS_ID,
    name: CONFIG.business.name,
    description:
      'Residential and commercial window cleaning done pane by pane, plus screens, tracks, gutters and exterior washing. Based in Hampton, Ontario.',
    url: url('/'),
    telephone: CONFIG.business.phone,
    email: CONFIG.business.email,
    image: url(CONFIG.openGraph.image),
    logo: url('/assets/img/logo.png'),
    address: {
      '@type': 'PostalAddress',
      addressLocality: CONFIG.business.locality,
      addressRegion: CONFIG.business.region,
      addressCountry: CONFIG.business.country
    },
    areaServed: (CONFIG.areaServed || []).map((name) => ({ '@type': 'Place', name })),
    priceRange: '$',
    sameAs: CONFIG.business.sameAs
  };
}

function websiteNode() {
  return {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: url('/'),
    name: CONFIG.business.name,
    inLanguage: 'en-CA',
    publisher: { '@id': BUSINESS_ID }
  };
}

// Pull the accordion's questions and answers straight out of the page, so the markup
// and the structured data cannot drift apart. (This describes the page honestly; it is
// not a bid for FAQ rich results, which Google restricts for commercial sites.)
function faqEntities(html) {
  const items = [];
  const re = /<div class="cn-faq"[\s\S]*?<\/div>\s*<\/div>/g;
  for (const block of html.match(re) || []) {
    const q = block.match(/<button type="button" class="cn-faq-q"[\s\S]*?<span[^>]*>([\s\S]*?)<\/span>/);
    const a = block.match(/class="cn-faq-a"[^>]*>([\s\S]*?)$/);
    if (!q || !a) continue;
    const text = (s) => unescapeHtml(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    const question = text(q[1]);
    const answer = text(a[1]);
    if (question && answer) items.push({ '@type': 'Question', name: question, acceptedAnswer: { '@type': 'Answer', text: answer } });
  }
  return items;
}

function webPageNode(meta, p, title, description, html) {
  const faqs = faqEntities(html || '');
  const type =
    { home: 'WebPage', contact: 'ContactPage', about: 'AboutPage' }[meta.page] ||
    (meta.page === 'faq' && faqs.length ? 'FAQPage' : 'WebPage');
  const node = {
    '@type': type,
    '@id': url(p) + '#webpage',
    url: url(p),
    name: title,
    isPartOf: { '@id': WEBSITE_ID },
    about: { '@id': BUSINESS_ID },
    inLanguage: 'en-CA'
  };
  if (description) node.description = description;
  if (meta.primaryImage) node.primaryImageOfPage = url(meta.primaryImage);
  if (type === 'FAQPage') node.mainEntity = faqs;
  return node;
}

function breadcrumbNode(meta, p) {
  if (!meta.breadcrumbs || !meta.breadcrumbs.length) return null;
  const trail = [{ name: 'Home', path: '/' }, ...meta.breadcrumbs];
  return {
    '@type': 'BreadcrumbList',
    '@id': url(p) + '#breadcrumbs',
    itemListElement: trail.map((crumb, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: crumb.name,
      item: url(crumb.path)
    }))
  };
}

function serviceNode(meta, p) {
  if (!meta.service) return null;
  const s = meta.service;
  const node = {
    '@type': 'Service',
    '@id': url(p) + '#service',
    name: s.name,
    serviceType: s.serviceType || s.name,
    description: s.description,
    url: url(p),
    provider: { '@id': BUSINESS_ID }
  };
  if (s.areaServed) {
    node.areaServed = [].concat(s.areaServed).map((name) => ({ '@type': 'Place', name }));
  }
  if (s.offers) {
    node.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: s.offersName || `${s.name} — what's included`,
      itemListElement: s.offers.map((o) => ({
        '@type': 'Offer',
        itemOffered: { '@type': 'Service', name: o }
      }))
    };
  }
  return node;
}

// ---------------------------------------------------------------- head block

function buildBlock(meta, p, title, description, html) {
  const noindex = !env.indexable || meta.noindex === true || CONFIG.noindexPaths.includes(p);
  const og = CONFIG.openGraph;
  const ogImage = url(meta.ogImage || og.image);

  const lines = [START];
  lines.push(`<link rel="canonical" href="${url(p)}">`);

  // Robots. Preview environments blanket-noindex; in production only the pages that
  // genuinely should stay out of the index carry the tag, and everything else omits it.
  if (noindex) {
    lines.push(`<meta name="robots" content="${env.indexable ? 'noindex,follow' : env.robotsMeta}">`);
  }

  lines.push(`<meta property="og:url" content="${url(p)}">`);
  lines.push(`<meta property="og:image" content="${ogImage}">`);
  lines.push(`<meta property="og:image:width" content="${og.imageWidth}">`);
  lines.push(`<meta property="og:image:height" content="${og.imageHeight}">`);
  lines.push(`<meta property="og:image:alt" content="${esc(meta.ogImageAlt || og.imageAlt)}">`);
  lines.push('<meta property="og:site_name" content="ClearNorth Window Cleaning">');
  lines.push('<meta property="og:locale" content="en_CA">');
  lines.push('<meta name="twitter:card" content="summary_large_image">');
  lines.push(`<meta name="twitter:image" content="${ogImage}">`);
  lines.push(`<meta name="twitter:image:alt" content="${esc(meta.ogImageAlt || og.imageAlt)}">`);

  // One @graph per page rather than several disconnected <script> blocks, so every node
  // can reference the single business @id instead of restating the business.
  const graph = [webPageNode(meta, p, title, description, html)];
  if (meta.page === 'home') graph.push(businessNode(), websiteNode());
  const crumbs = breadcrumbNode(meta, p);
  if (crumbs) graph.push(crumbs);
  const service = serviceNode(meta, p);
  if (service) graph.push(service);

  lines.push(
    `<script type="application/ld+json">${jsonld({ '@context': 'https://schema.org', '@graph': graph })}</script>`
  );
  lines.push(END);
  return lines.join('\n');
}

// ---------------------------------------------------------------- rewriting

const written = [];
const stale = [];
const skipped = [];

function writeOut(file, next) {
  const current = fs.readFileSync(file, 'utf8');
  if (current === next) return false;
  if (CHECK_ONLY) stale.push(path.relative(ROOT, file));
  else fs.writeFileSync(file, next);
  return true;
}

const pages = [];

for (const file of htmlFiles().sort()) {
  const html = fs.readFileSync(file, 'utf8');
  const meta = readMeta(html, file);
  if (!meta) {
    skipped.push(path.relative(ROOT, file));
    continue;
  }

  const p = pagePath(file);
  const block = buildBlock(meta, p, titleOf(html), descOf(html), html);

  const startIdx = html.indexOf(START);
  const endIdx = html.indexOf(END);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error(`${path.relative(ROOT, file)}: missing ${START} / ${END} markers`);
  }
  let next = html.slice(0, startIdx) + block + html.slice(endIdx + END.length);

  // Formspree's `_next` is the no-JavaScript return address. It has to be absolute and
  // it has to belong to whichever host is serving the form, or a visitor with JS off
  // gets bounced onto a different environment after submitting. Only the origin is
  // rewritten — which confirmation page a form returns to is the page's own business.
  next = next.replace(/(<input type="hidden" name="_next" value=")([^"]*)(")/g, (m, pre, value, post) => {
    const to = value.replace(/^https?:\/\/[^/]+/, '');
    return pre + url(to.startsWith('/') ? to : '/' + to) + post;
  });

  if (writeOut(file, next)) written.push(path.relative(ROOT, file));

  pages.push({
    path: p,
    file,
    noindex: meta.noindex === true || CONFIG.noindexPaths.includes(p),
    priorityHint: meta.page
  });
}

// ---------------------------------------------------------------- robots.txt

function robotsTxt() {
  if (env.robotsTxt === 'disallow-all') {
    return [
      `# ${env.label} — not the live site. Keep it out of search results.`,
      'User-agent: *',
      'Disallow: /',
      ''
    ].join('\n');
  }
  return [
    '# ClearNorth Window Cleaning',
    'User-agent: *',
    'Allow: /',
    '',
    '# Confirmation page — reached only after submitting the quote form.',
    'Disallow: /quote-submitted/',
    '',
    `Sitemap: ${url('/sitemap.xml')}`,
    ''
  ].join('\n');
}

const robotsPath = path.join(ROOT, 'robots.txt');
if (writeOut(robotsPath, robotsTxt())) written.push('robots.txt');

// ---------------------------------------------------------------- sitemap.xml
//
// Only canonical, indexable pages. No <priority> or <changefreq>: Google ignores both,
// and nothing else consumes this file. <lastmod> is the file's own last commit date, so
// it moves when the page actually changes rather than on every deploy.

import { execFileSync } from 'node:child_process';

function lastmod(file) {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], {
      cwd: ROOT,
      encoding: 'utf8'
    }).trim();
    if (out) return out;
  } catch {
    /* not a git checkout, or the file is untracked — fall through */
  }
  return new Date(fs.statSync(file).mtime).toISOString().slice(0, 10);
}

const sitemapPages = pages
  .filter((pg) => !pg.noindex && pg.path !== '/404.html')
  .sort((a, b) => a.path.localeCompare(b.path));

const sitemap =
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemapPages.map(
      (pg) => `  <url>\n    <loc>${url(pg.path)}</loc>\n    <lastmod>${lastmod(pg.file)}</lastmod>\n  </url>`
    ),
    '</urlset>',
    ''
  ].join('\n');

const sitemapPath = path.join(ROOT, 'sitemap.xml');
// A staging sitemap is a liability, not an asset — it is only written for an indexable
// environment, and removed otherwise so a preview host cannot serve one.
if (env.indexable) {
  if (writeOut(sitemapPath, sitemap)) written.push('sitemap.xml');
} else if (fs.existsSync(sitemapPath)) {
  const placeholder =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<!-- ${env.label}: intentionally empty. The real sitemap is generated by\n` +
    '     scripts/apply-site-config.mjs --env=production. -->\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>\n';
  if (writeOut(sitemapPath, placeholder)) written.push('sitemap.xml');
}

// ---------------------------------------------------------------- report

console.log(`environment : ${ENV_NAME} — ${env.label}`);
console.log(`SITE_URL    : ${SITE_URL}`);
console.log(`indexable   : ${env.indexable}`);
console.log(`pages       : ${pages.length} (${sitemapPages.length} in sitemap)`);
if (skipped.length) console.log(`skipped     : ${skipped.join(', ')} (no cn-page-meta island)`);

if (CHECK_ONLY) {
  if (stale.length) {
    console.error(`\n${stale.length} file(s) do not match the config:`);
    stale.forEach((f) => console.error(`  ${f}`));
    console.error('\nRun: node scripts/apply-site-config.mjs');
    process.exit(1);
  }
  console.log('\nup to date.');
} else {
  console.log(written.length ? `updated     : ${written.length} file(s)` : 'updated     : nothing (already current)');
}
