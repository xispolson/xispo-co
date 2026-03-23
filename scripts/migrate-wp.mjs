/**
 * migrate-wp.mjs
 * Converts WordPress XML exports to Markdown files for Astro content collections.
 *
 * Usage:
 *   node scripts/migrate-wp.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ─── Config ──────────────────────────────────────────────────────────────────

const SOURCES = [
  {
    xml: '/Users/xispo/Downloads/dedicateddiversions.WordPress.2026-03-23.xml',
    type: 'journal',
    outDir: path.join(ROOT, 'src/content/journal'),
  },
  {
    xml: '/Users/xispo/Downloads/gamesasapodcastcom.WordPress.2026-03-23.xml',
    type: 'podcast',
    outDir: path.join(ROOT, 'src/content/podcast'),
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractBetween(str, open, close) {
  const start = str.indexOf(open);
  if (start === -1) return '';
  const end = str.indexOf(close, start + open.length);
  if (end === -1) return '';
  return str.slice(start + open.length, end);
}

function extractAll(str, open, close) {
  const results = [];
  let pos = 0;
  while (true) {
    const start = str.indexOf(open, pos);
    if (start === -1) break;
    const end = str.indexOf(close, start + open.length);
    if (end === -1) break;
    results.push(str.slice(start + open.length, end));
    pos = end + close.length;
  }
  return results;
}

function stripCdata(str) {
  return str.replace(/<!\[CDATA\[/g, '').replace(/\]\]>/g, '').trim();
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

function htmlToMarkdown(html) {
  if (!html) return '';
  return html
    // paragraphs
    .replace(/<p[^>]*>/gi, '\n\n')
    .replace(/<\/p>/gi, '')
    // headings
    .replace(/<h1[^>]*>/gi, '\n\n# ').replace(/<\/h1>/gi, '\n')
    .replace(/<h2[^>]*>/gi, '\n\n## ').replace(/<\/h2>/gi, '\n')
    .replace(/<h3[^>]*>/gi, '\n\n### ').replace(/<\/h3>/gi, '\n')
    // bold/italic
    .replace(/<strong[^>]*>|<b[^>]*>/gi, '**').replace(/<\/strong>|<\/b>/gi, '**')
    .replace(/<em[^>]*>|<i[^>]*>/gi, '_').replace(/<\/em>|<\/i>/gi, '_')
    // links
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
    // images
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)')
    // lists
    .replace(/<ul[^>]*>/gi, '\n').replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '\n').replace(/<\/ol>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ').replace(/<\/li>/gi, '\n')
    // line breaks
    .replace(/<br\s*\/?>/gi, '\n')
    // blockquotes
    .replace(/<blockquote[^>]*>/gi, '\n> ').replace(/<\/blockquote>/gi, '\n')
    // strip remaining tags
    .replace(/<[^>]+>/g, '')
    // decode common entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&nbsp;/g, ' ')
    // normalise whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function yamlStr(str) {
  // Escape for YAML: wrap in quotes, escape inner quotes
  const s = String(str ?? '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  return `"${s}"`;
}

function makeSlug(title, date, existingSlugs) {
  let base = slugify(title) || slugify(date);
  let slug = base;
  let n = 1;
  while (existingSlugs.has(slug)) {
    slug = `${base}-${n++}`;
  }
  existingSlugs.add(slug);
  return slug;
}

// ─── Parse XML items ──────────────────────────────────────────────────────────

function parseItems(xml) {
  const itemBlocks = extractAll(xml, '<item>', '</item>');
  return itemBlocks.map(block => {
    const postType  = stripCdata(extractBetween(block, '<wp:post_type>', '</wp:post_type>'));
    const status    = stripCdata(extractBetween(block, '<wp:status>', '</wp:status>'));
    const title     = stripCdata(extractBetween(block, '<title>', '</title>'));
    const slug      = stripCdata(extractBetween(block, '<wp:post_name>', '</wp:post_name>'));
    const date      = stripCdata(extractBetween(block, '<wp:post_date>', '</wp:post_date>'));
    const content   = stripCdata(extractBetween(block, '<content:encoded>', '</content:encoded>'));
    const excerpt   = stripCdata(extractBetween(block, '<excerpt:encoded>', '</excerpt:encoded>'));

    // Categories & tags
    const categories = [];
    const tags = [];
    const domainMatches = [...block.matchAll(/<category domain="([^"]+)" nicename="([^"]+)"><!\[CDATA\[([^\]]+)\]\]><\/category>/g)];
    for (const m of domainMatches) {
      if (m[1] === 'category') categories.push(m[3]);
      else if (m[1] === 'post_tag') tags.push(m[3]);
    }

    return { postType, status, title, slug, date, content, excerpt, categories, tags };
  });
}

// ─── Write journal post ───────────────────────────────────────────────────────

function writeJournalPost(item, outDir, existingSlugs) {
  const slug = makeSlug(item.slug || item.title, item.date, existingSlugs);
  const dateStr = item.date ? item.date.split(' ')[0] : '2005-01-01';
  const body = htmlToMarkdown(item.content);
  const excerpt = item.excerpt
    ? item.excerpt.replace(/\n/g, ' ').trim().slice(0, 300)
    : '';

  const fm = [
    '---',
    `title: ${yamlStr(item.title)}`,
    `date: ${dateStr}`,
    excerpt ? `excerpt: ${yamlStr(excerpt)}` : null,
    `categories: [${item.categories.map(c => yamlStr(c)).join(', ')}]`,
    `tags: [${item.tags.map(t => yamlStr(t)).join(', ')}]`,
    `draft: false`,
    '---',
  ].filter(l => l !== null).join('\n');

  const md = `${fm}\n\n${body}\n`;
  fs.writeFileSync(path.join(outDir, `${slug}.md`), md, 'utf8');
  return slug;
}

// ─── Write podcast episode placeholder ───────────────────────────────────────

function writePodcastPlaceholder(item, outDir, existingSlugs, epNum) {
  const slug = makeSlug(item.slug || item.title, item.date, existingSlugs);
  const dateStr = item.date ? item.date.split(' ')[0] : '2025-01-01';
  const body = htmlToMarkdown(item.content);

  const fm = [
    '---',
    `title: ${yamlStr(item.title)}`,
    `date: ${dateStr}`,
    epNum != null ? `episodeNumber: ${epNum}` : null,
    `audioUrl: "https://media.xispo.co/episodes/placeholder.mp3"`,
    `duration: ""`,
    `description: ${yamlStr(item.excerpt || item.title)}`,
    `draft: true`,
    '---',
  ].filter(l => l !== null).join('\n');

  const md = `${fm}\n\n${body}\n`;
  fs.writeFileSync(path.join(outDir, `${slug}.md`), md, 'utf8');
  return slug;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

for (const source of SOURCES) {
  if (!fs.existsSync(source.xml)) {
    console.warn(`⚠  XML not found: ${source.xml} — skipping`);
    continue;
  }

  fs.mkdirSync(source.outDir, { recursive: true });

  const xml = fs.readFileSync(source.xml, 'utf8');
  const items = parseItems(xml);
  const published = items.filter(i =>
    i.postType === 'post' && i.status === 'publish' && i.title
  );

  console.log(`\n📂  ${source.type} — found ${published.length} published posts`);

  const existingSlugs = new Set();
  let count = 0;
  let epNum = 1;

  for (const item of published) {
    if (source.type === 'journal') {
      const slug = writeJournalPost(item, source.outDir, existingSlugs);
      count++;
      if (count % 50 === 0) console.log(`    ${count}/${published.length} done…`);
    } else {
      writePodcastPlaceholder(item, source.outDir, existingSlugs, epNum++);
      count++;
    }
  }

  console.log(`✅  ${count} files written → ${source.outDir}`);
}

console.log('\n🎉  Migration complete!');
console.log('   Next steps:');
console.log('   1. Review src/content/journal/ for any formatting issues');
console.log('   2. Update src/content/podcast/ with real audioUrl values');
console.log('   3. Set draft: false on podcast episodes once audio is uploaded to R2');
