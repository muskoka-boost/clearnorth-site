#!/usr/bin/env node
// ClearNorth — how much of each service-area page is actually its own?
//
// Thirty-six pages about the same service in different places will always share some
// wording. The question this answers is whether a page is a real page or a mail-merge:
// how much of its main content is copy that appears on most of the other pages, and
// which single page it resembles most closely.
//
// Automated similarity is a warning system, not a verdict. A page can score well and
// still be useless, and a page can score badly because it legitimately shares a service
// list. Every flag here is a prompt to read the page, not a reason to rewrite it blind.
//
// Usage:
//   node scripts/check-location-uniqueness.mjs            # readable report
//   node scripts/check-location-uniqueness.mjs --json     # machine-readable
//   node scripts/check-location-uniqueness.mjs --strict   # exit 1 if anything is flagged

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AREAS = path.join(ROOT, 'service-areas');

const JSON_OUT = process.argv.includes('--json');
const STRICT = process.argv.includes('--strict');

// Thresholds. Deliberately loose — they mark pages for a human to read.
const TEMPLATE_SHARE_LIMIT = 0.40; // >40% of the page is corpus-wide boilerplate
const MIN_WORDS = 300;            // below this the page cannot carry standalone value
const TARGET_WORDS = 550;         // brief's lower target for a page with real material
const NEIGHBOUR_LIMIT = 0.55;     // two pages this alike are competing, not complementing
const COMMON_IN = 0.5;            // a shingle on >=50% of pages counts as template copy

// ---------------------------------------------------------------- extraction

/** Main content only: no header, no nav, no footer, no sticky CTA. */
function mainContent(html) {
  const m = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  let body;
  if (m) {
    body = m[1];
  } else {
    // Pre-<main> fallback, so the script still works on an un-migrated page.
    const start = html.indexOf('</header></div>');
    const end = html.indexOf('<div class="sc-host" data-sc-name="SiteFooter">');
    if (start === -1 || end === -1) return '';
    body = html.slice(start + '</header></div>'.length, end);
  }
  return body
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ');
}

const BLOCK = /<\/(p|h1|h2|h3|h4|li|div|section|td|blockquote|figcaption)>/gi;

function toText(fragment) {
  return decode(
    fragment
      .replace(BLOCK, '\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/[ \t ]+/g, ' ')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join('\n');
}

function decode(s) {
  const named = {
    amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
    mdash: '—', ndash: '–', hellip: '…', rsquo: '’', lsquo: '‘',
    ldquo: '“', rdquo: '”', times: '×', deg: '°'
  };
  return s
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => (n.toLowerCase() in named ? named[n.toLowerCase()] : m));
}

/** Words for counting: letters and digits only, so "289-943-4395" is one token. */
const words = (text) => text.toLowerCase().match(/[a-z0-9][a-z0-9'’-]*/g) || [];

/** Sentences, for the repeated-sentence check. Short fragments are ignored. */
function sentences(text) {
  return text
    .split('\n')
    .flatMap((line) => line.split(/(?<=[.!?])\s+(?=[A-Z“"])/))
    .map((s) => s.trim())
    .filter((s) => words(s).length >= 6);
}

const paragraphs = (text) => text.split('\n').map((s) => s.trim()).filter((s) => words(s).length >= 12);

/** Overlapping n-gram shingles — the unit of "is this the same copy". */
function shingles(tokens, n = 6) {
  const set = new Set();
  for (let i = 0; i + n <= tokens.length; i++) set.add(tokens.slice(i, i + n).join(' '));
  return set;
}

// ---------------------------------------------------------------- load

const slugs = fs
  .readdirSync(AREAS, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

const pages = slugs.map((slug) => {
  const file = path.join(AREAS, slug, 'index.html');
  const html = fs.readFileSync(file, 'utf8');
  const text = toText(mainContent(html));
  const tokens = words(text);
  return {
    slug,
    file: path.relative(ROOT, file),
    title: (html.match(/<title>([\s\S]*?)<\/title>/) || [, ''])[1].trim(),
    text,
    wordCount: tokens.length,
    shingles: shingles(tokens),
    sentences: sentences(text),
    paragraphs: paragraphs(text)
  };
});

if (!pages.length) {
  console.error('No service-area pages found.');
  process.exit(2);
}

// ---------------------------------------------------------------- template share
//
// A shingle appearing on at least half the pages is template copy by definition: it is
// not what makes this page about this place. The share of a page made of such shingles
// is the inverse of its unique content.

const docFreq = new Map();
for (const page of pages) {
  for (const sh of page.shingles) docFreq.set(sh, (docFreq.get(sh) || 0) + 1);
}
const commonCutoff = Math.max(2, Math.ceil(pages.length * COMMON_IN));

for (const page of pages) {
  let shared = 0;
  for (const sh of page.shingles) if (docFreq.get(sh) >= commonCutoff) shared++;
  page.templateShare = page.shingles.size ? shared / page.shingles.size : 0;
  page.uniqueShare = 1 - page.templateShare;
}

// ---------------------------------------------------------------- closest match
//
// Containment, not Jaccard: a short page swallowed whole by a long one is the case that
// matters, and Jaccard hides it behind the length difference.

for (const a of pages) {
  let best = null;
  for (const b of pages) {
    if (a === b) continue;
    let hits = 0;
    for (const sh of a.shingles) if (b.shingles.has(sh)) hits++;
    const overlap = a.shingles.size ? hits / a.shingles.size : 0;
    if (!best || overlap > best.overlap) best = { slug: b.slug, overlap };
  }
  a.closest = best;
}

// ---------------------------------------------------------------- repetition

function repeated(key) {
  const seen = new Map();
  for (const page of pages) {
    for (const item of new Set(page[key])) {
      if (!seen.has(item)) seen.set(item, []);
      seen.get(item).push(page.slug);
    }
  }
  return [...seen.entries()]
    .filter(([, on]) => on.length > 1)
    .sort((a, b) => b[1].length - a[1].length || b[0].length - a[0].length);
}

const repeatedSentences = repeated('sentences');
const repeatedParagraphs = repeated('paragraphs');

// Runs of consecutive sentences that appear, in the same order, on more than one page.
function repeatedRuns(minRun = 3) {
  const runs = new Map();
  for (const page of pages) {
    const s = page.sentences;
    for (let i = 0; i + minRun <= s.length; i++) {
      const key = s.slice(i, i + minRun).join(' ⏎ ');
      if (!runs.has(key)) runs.set(key, new Set());
      runs.get(key).add(page.slug);
    }
  }
  return [...runs.entries()]
    .filter(([, on]) => on.size > 1)
    .map(([run, on]) => ({ run, pages: [...on].sort() }))
    .sort((a, b) => b.pages.length - a.pages.length);
}
const consecutiveRuns = repeatedRuns();

// ---------------------------------------------------------------- flags

for (const page of pages) {
  page.flags = [];
  if (page.wordCount < MIN_WORDS) page.flags.push(`THIN (${page.wordCount} words — mandatory review)`);
  else if (page.wordCount < TARGET_WORDS) page.flags.push(`short (${page.wordCount} words, target ${TARGET_WORDS}+)`);
  if (page.templateShare > TEMPLATE_SHARE_LIMIT) {
    page.flags.push(`TEMPLATE ${(page.templateShare * 100).toFixed(0)}% shared copy (limit ${TEMPLATE_SHARE_LIMIT * 100}%)`);
  }
  if (page.closest && page.closest.overlap > NEIGHBOUR_LIMIT) {
    page.flags.push(`NEAR-DUPLICATE of ${page.closest.slug} (${(page.closest.overlap * 100).toFixed(0)}%)`);
  }
}

// ---------------------------------------------------------------- output

if (JSON_OUT) {
  console.log(
    JSON.stringify(
      {
        generated: new Date().toISOString().slice(0, 10),
        pageCount: pages.length,
        thresholds: { TEMPLATE_SHARE_LIMIT, MIN_WORDS, TARGET_WORDS, NEIGHBOUR_LIMIT },
        pages: pages.map((p) => ({
          slug: p.slug,
          words: p.wordCount,
          uniqueShare: +p.uniqueShare.toFixed(4),
          templateShare: +p.templateShare.toFixed(4),
          closest: p.closest,
          flags: p.flags
        })),
        repeatedParagraphs: repeatedParagraphs.slice(0, 40).map(([text, on]) => ({ pages: on, text })),
        repeatedSentences: repeatedSentences.slice(0, 60).map(([text, on]) => ({ pages: on, text })),
        consecutiveRuns: consecutiveRuns.slice(0, 20)
      },
      null,
      2
    )
  );
} else {
  const pct = (n) => `${(n * 100).toFixed(0)}%`.padStart(4);
  const flagged = pages.filter((p) => p.flags.length);

  console.log(`ClearNorth — service-area uniqueness report (${pages.length} pages)\n`);
  console.log(`  unique   = share of 6-word sequences NOT found on ${commonCutoff}+ of the ${pages.length} pages`);
  console.log(`  closest  = highest share of this page's sequences also present on one other page\n`);
  console.log('slug                      words  unique  closest match                flags');
  console.log('-'.repeat(100));

  for (const p of [...pages].sort((a, b) => a.uniqueShare - b.uniqueShare)) {
    const closest = p.closest ? `${p.closest.slug} ${pct(p.closest.overlap)}` : '—';
    console.log(
      `${p.slug.padEnd(24)} ${String(p.wordCount).padStart(5)}   ${pct(p.uniqueShare)}   ${closest.padEnd(28)} ${p.flags.join('; ')}`
    );
  }

  const avgWords = Math.round(pages.reduce((s, p) => s + p.wordCount, 0) / pages.length);
  const avgUnique = pages.reduce((s, p) => s + p.uniqueShare, 0) / pages.length;
  console.log('-'.repeat(100));
  console.log(`average                   ${String(avgWords).padStart(5)}   ${pct(avgUnique)}`);
  console.log(`\nflagged: ${flagged.length} of ${pages.length}`);

  if (repeatedParagraphs.length) {
    console.log(`\nRepeated paragraphs (12+ words, identical on 2+ pages): ${repeatedParagraphs.length}`);
    for (const [text, on] of repeatedParagraphs.slice(0, 12)) {
      console.log(`  ${String(on.length).padStart(2)}x  ${text.slice(0, 90)}${text.length > 90 ? '…' : ''}`);
    }
    if (repeatedParagraphs.length > 12) console.log(`  … and ${repeatedParagraphs.length - 12} more (--json for all)`);
  }

  if (consecutiveRuns.length) {
    console.log(`\nRepeated runs of 3+ consecutive sentences: ${consecutiveRuns.length}`);
    for (const { run, pages: on } of consecutiveRuns.slice(0, 6)) {
      console.log(`  ${String(on.length).padStart(2)}x  ${run.slice(0, 90)}…`);
      console.log(`        ${on.join(', ')}`);
    }
  }

  if (!repeatedParagraphs.length && !consecutiveRuns.length) {
    console.log('\nNo paragraph or multi-sentence run is repeated across pages.');
  }
}

if (STRICT && pages.some((p) => p.flags.some((f) => f === f.toUpperCase() || /^(THIN|TEMPLATE|NEAR-DUPLICATE)/.test(f)))) {
  process.exit(1);
}
