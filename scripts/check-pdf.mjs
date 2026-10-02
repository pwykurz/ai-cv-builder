// Verifies that the generated PDF is machine-readable: it extracts the text layer the way an ATS
// would and checks it against the data file.
//
//   node scripts/check-pdf.mjs [--data cv.en] [--max-pages 4]
//
// Exit code 1 when any ERROR check fails (warnings do not fail the run).
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { resolveDataFile } from './data-files.mjs';

const args = process.argv.slice(2);
const arg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const name = arg('--data', 'cv.en');
const maxPages = Number(arg('--max-pages', '4'));
const root = resolve(import.meta.dirname, '..');
const pdfPath = resolve(root, arg('--pdf', `out/${name}.pdf`));
const dataPath = resolveDataFile(name);

if (!dataPath) {
  console.error(`No CV "${name}" in data/ or examples/`);
  process.exit(1);
}

for (const file of [pdfPath, dataPath]) {
  if (!existsSync(file)) {
    console.error(`Missing file: ${file}`);
    process.exit(1);
  }
}

const cv = JSON.parse(readFileSync(dataPath, 'utf8'));

// ---------- helpers ----------
const squash = (s) => s.replace(/\s+/g, ''); // whitespace-insensitive comparison
const norm = (s) => squash(s).toLowerCase();

function formatDate(value, locale) {
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  if (!m) return value;
  return new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(
    new Date(Number(m[1]), Number(m[2]) - 1, 1),
  );
}

// ---------- extract the text layer ----------
const doc = await pdfjs.getDocument({
  data: new Uint8Array(readFileSync(pdfPath)),
  verbosity: 0,
}).promise;

const pages = [];
for (let i = 1; i <= doc.numPages; i++) {
  const content = await (await doc.getPage(i)).getTextContent();
  let text = '';
  for (const item of content.items) {
    text += item.str;
    if (item.hasEOL) text += '\n';
  }
  pages.push(text);
}
const fullText = pages.join('\n');
const lines = fullText
  .split('\n')
  .map((l) => l.trim())
  .filter(Boolean);
const flat = norm(fullText);
const meta = await doc.getMetadata();

// ---------- checks ----------
const results = [];
const check = (level, ok, message) => results.push({ level, ok, message });

const { profile, labels, locale } = cv;

check('error', fullText.replace(/\s/g, '').length > 800, 'PDF has a real text layer (not an image)');
check('warn', doc.numPages <= maxPages, `Page count ${doc.numPages} (max ${maxPages})`);

// The first thing a parser sees should be the candidate's name.
check('error', norm(lines[0] ?? '') === norm(profile.name), `First line of text is the name (got: "${lines[0]}")`);

// Standard section headings, on their own line, in the expected order.
const headingLine = (label) => lines.findIndex((l) => l.toLowerCase() === label.toLowerCase());
const order = [labels.skills, labels.experience, labels.education];
const positions = order.map(headingLine);
order.forEach((label, i) => check('error', positions[i] >= 0, `Heading "${label}" is on its own line`));
check(
  'error',
  positions.every((p, i) => p >= 0 && (i === 0 || p > positions[i - 1])),
  `Headings appear in order: ${order.join(' > ')}`,
);

// Contact data is extractable.
const digits = (s) => s.replace(/[^\d+]/g, '');
check('error', flat.includes(norm(profile.contact.email)), 'E-mail is in the text layer');
check('error', digits(fullText).includes(digits(profile.contact.phone)), 'Phone number is in the text layer');
check('warn', flat.includes(norm(profile.contact.linkedin)), 'LinkedIn URL is in the text layer');

// Experience: every employer, role and date range present, in data order (reverse-chronological).
let last = -1;
let orderOk = true;
for (const job of cv.experience) {
  const company = flat.indexOf(norm(job.company), Math.max(last, 0));
  const role = flat.includes(norm(job.role));
  const from = formatDate(job.start, locale);
  const dates = flat.includes(norm(from));
  check('error', company >= 0 && role && dates, `Job "${job.company}": employer, role and start date (${from}) found`);
  if (company < last) orderOk = false;
  if (company >= 0) last = company;
}
check('error', orderOk, 'Employers appear in the same order as in the data file');

// Content integrity: every sentence from the data file must appear intact (catches cut-off text).
const missing = [];
const sentences = [
  ...profile.summary,
  ...cv.experience.flatMap((j) => [
    j.blurb,
    ...(j.bullets ?? []),
    ...(j.projects ?? []).flatMap((p) => p.bullets ?? []),
  ]),
].filter(Boolean);
for (const s of sentences) if (!flat.includes(norm(s))) missing.push(s.slice(0, 70));
check(
  'error',
  missing.length === 0,
  `All ${sentences.length} summary/bullet texts are present and complete${missing.length ? `. Missing: ${missing.join(' | ')}` : ''}`,
);

const techMissing = [];
const techLists = [
  ...cv.skills.map((g) => g.items.join(', ')),
  ...cv.experience
    .flatMap((j) => [j.tech, ...(j.projects ?? []).map((p) => p.tech)])
    .filter(Boolean)
    .map((t) => t.join(', ')),
];
for (const t of techLists) if (!flat.includes(norm(t))) techMissing.push(t.slice(0, 60));
check(
  'error',
  techMissing.length === 0,
  `All skill/tech lists are complete${techMissing.length ? `. Missing: ${techMissing.join(' | ')}` : ''}`,
);

// Odd glyphs: ligatures, replacement characters, private-use area.
const odd = fullText.match(/[ﬀ-ﬆ�-]/g);
check('error', !odd, `No ligature / replacement / private-use characters${odd ? ` (found ${odd.length})` : ''}`);

// A line that ends with a hyphen can be glued together by an extractor ("e-commerce" -> "ecommerce").
const hyphenEnds = lines.filter((l) => /[A-Za-z0-9]-$/.test(l));
check(
  'warn',
  hyphenEnds.length === 0,
  `No line ends with a hyphen${hyphenEnds.length ? `: ${hyphenEnds.slice(0, 3).join(' | ')}` : ''}`,
);

// Hyphenated words must stay in one piece.
const textFields = [
  profile.headline,
  ...sentences,
  ...techLists,
  ...cv.experience.flatMap((j) => [j.role, j.company, ...(j.projects ?? []).flatMap((p) => [p.name, p.client])]),
].filter(Boolean);
const hyphenated = [...new Set(textFields.flatMap((s) => s.match(/[A-Za-z0-9]+(?:-[A-Za-z0-9]+)+/g) ?? []))];
const splitWords = hyphenated.filter((w) => !flat.includes(norm(w)));
check(
  'warn',
  splitWords.length === 0,
  `Hyphenated words intact${splitWords.length ? `: ${splitWords.join(', ')}` : ''}`,
);

// Layout sanity: no heading stranded at the bottom of a page, no near-empty last page.
const strandedAtBottom = [];
pages.forEach((text, i) => {
  const pageLines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const tail = pageLines.at(-1) ?? '';
  if (order.concat(labels.languages, labels.interests).some((h) => h.toLowerCase() === tail.toLowerCase())) {
    strandedAtBottom.push(`page ${i + 1}: "${tail}"`);
  }
});
check(
  'warn',
  strandedAtBottom.length === 0,
  `No section heading stranded at the bottom of a page${strandedAtBottom.length ? ` (${strandedAtBottom.join(', ')})` : ''}`,
);

const lastPageLines = pages
  .at(-1)
  .split('\n')
  .filter((l) => l.trim()).length;
check('warn', pages.length === 1 || lastPageLines >= 8, `Last page is not nearly empty (${lastPageLines} text lines)`);

check('warn', Boolean(meta.info?.Title), `PDF title metadata is set (${meta.info?.Title ?? 'none'})`);

// ---------- report ----------
let errors = 0;
let warnings = 0;
for (const { level, ok, message } of results) {
  const icon = ok ? 'PASS' : level === 'error' ? 'FAIL' : 'WARN';
  if (!ok) level === 'error' ? errors++ : warnings++;
  console.log(`${icon}  ${message}`);
}
console.log(`\n${doc.numPages} page(s), ${lines.length} text lines | ${errors} error(s), ${warnings} warning(s)`);
console.log('\nFirst lines as a parser sees them:\n  ' + lines.slice(0, 6).join('\n  '));
process.exit(errors ? 1 : 0);
