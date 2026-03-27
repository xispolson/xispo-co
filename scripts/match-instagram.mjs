#!/usr/bin/env node
/**
 * match-instagram.mjs
 *
 * Parses Instagram data export (posts_1.html) and matches posts to journal
 * markdown files that contain the "instagram" tag. Copies matched images and
 * rewrites journal files with embedded image markdown.
 */

import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync, readdirSync } from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const INSTAGRAM_HTML = '/Users/xispo/Downloads/instagram-xispo-2025-03-09-kDbYdRpn/your_instagram_activity/media/posts_1.html';
const INSTAGRAM_MEDIA_ROOT = '/Users/xispo/Downloads/instagram-xispo-2025-03-09-kDbYdRpn';
const JOURNAL_DIR = '/Users/xispo/Developer/Git/GitHub/xispo-co/src/content/journal';
const DEST_DIR = '/Users/xispo/Developer/Git/GitHub/xispo-co/public/images/journal';

// ---------------------------------------------------------------------------
// Step 1 – Parse posts_1.html
// ---------------------------------------------------------------------------

function parseInstagramHtml(filePath) {
  const content = readFileSync(filePath, 'utf-8');

  // Split into per-post blocks. Each post starts with the "pam _3-95" div.
  const rawChunks = content.split(/(?=<div class="pam _3-95 _2ph- _a6-g uiBoxWhite noborder">)/);

  const posts = [];

  for (const chunk of rawChunks) {
    if (!chunk.startsWith('<div class="pam')) continue;

    // Date: <div class="_3-94 _a6-o">Feb 28, 2025 10:07 am</div>
    const dateMatch = chunk.match(/<div class="_3-94 _a6-o">([^<]+)<\/div>/);
    if (!dateMatch) continue;

    const dateStr = dateMatch[1].trim();
    const parsedDate = parseInstagramDate(dateStr);
    if (!parsedDate) continue;

    // Caption: <div class="_3-95 _2pim _a6-h _a6-i">…</div>
    const captionMatch = chunk.match(/<div class="_3-95 _2pim _a6-h _a6-i">([^<]*)<\/div>/);
    const caption = captionMatch
      ? decodeHtmlEntities(captionMatch[1].trim())
      : '';

    // Images: href="media/posts/…" (only .jpg / .jpeg / .png / .webp)
    const imgMatches = [...chunk.matchAll(/href="(media\/posts\/[^"]+\.(jpg|jpeg|png|webp))"/gi)];
    // Deduplicate (same href appears twice for <a href> and <img src>)
    const images = [...new Set(imgMatches.map(m => m[1]))];

    posts.push({ dateStr, date: parsedDate, caption, images });
  }

  return posts;
}

/**
 * Parse an Instagram date string like "Feb 28, 2025 10:07 am"
 * Returns a plain Date object in local time (time-of-day is preserved).
 */
function parseInstagramDate(str) {
  // e.g. "Feb 28, 2025 10:07 am"  or  "Feb 28, 2025 10:07 AM"
  const m = str.match(/^(\w+ \d+, \d{4})/);
  if (!m) return null;
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return d;
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

// ---------------------------------------------------------------------------
// Step 2 – Read journal .md files that have the instagram tag
// ---------------------------------------------------------------------------

function parseJournalFiles(dir) {
  const files = readdirSync(dir).filter(f => f.endsWith('.md'));
  const results = [];

  for (const file of files) {
    const filePath = join(dir, file);
    const content = readFileSync(filePath, 'utf-8');

    // Only process posts that still have the Instagram link pattern
    if (!content.includes('[View in Instagram ⇒]')) continue;

    // Check for instagram tag
    if (!content.includes('instagram')) continue;

    // Parse frontmatter date
    const dateMatch = content.match(/^date:\s*(\d{4}-\d{2}-\d{2})/m);
    if (!dateMatch) continue;

    const date = new Date(dateMatch[1] + 'T12:00:00'); // noon local to avoid TZ edge cases

    // Parse title and excerpt for similarity matching
    const titleMatch = content.match(/^title:\s*"?([^"\n]+)"?/m);
    const excerptMatch = content.match(/^excerpt:\s*"?([^"\n]+)"?/m);
    const title = titleMatch ? titleMatch[1].trim() : '';
    const excerpt = excerptMatch ? excerptMatch[1].trim() : '';

    results.push({ file, filePath, date, title, excerpt, content });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Step 3 – Match journal posts to Instagram posts
// ---------------------------------------------------------------------------

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function dayDiff(a, b) {
  // Compare just calendar dates (UTC)
  const aDay = Math.floor(a.getTime() / ONE_DAY_MS);
  const bDay = Math.floor(b.getTime() / ONE_DAY_MS);
  return Math.abs(aDay - bDay);
}

/**
 * Simple word-overlap similarity (Jaccard on word sets).
 */
function similarity(a, b) {
  if (!a && !b) return 0;
  const wordsA = new Set(a.toLowerCase().match(/\w+/g) || []);
  const wordsB = new Set(b.toLowerCase().match(/\w+/g) || []);
  if (wordsA.size === 0 && wordsB.size === 0) return 0;
  let intersection = 0;
  for (const w of wordsA) if (wordsB.has(w)) intersection++;
  const union = wordsA.size + wordsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

const DATE_TOLERANCE_DAYS = 5;

function matchPosts(journalPosts, instagramPosts) {
  const matched = [];
  const unmatched = [];

  for (const jPost of journalPosts) {
    // Find Instagram candidates within ±5 days
    const candidates = instagramPosts.filter(ig => dayDiff(jPost.date, ig.date) <= DATE_TOLERANCE_DAYS);

    if (candidates.length === 0) {
      unmatched.push({ jPost, reason: `No Instagram post within ±${DATE_TOLERANCE_DAYS} days` });
      continue;
    }

    let best;
    if (candidates.length === 1) {
      best = candidates[0];
    } else {
      // Multiple candidates: pick by closest date first, then caption similarity as tiebreaker
      const query = [jPost.title, jPost.excerpt].filter(Boolean).join(' ');
      let bestDays = Infinity;
      let bestSim = -1;
      for (const c of candidates) {
        const days = dayDiff(jPost.date, c.date);
        const sim = similarity(query, c.caption);
        if (
          days < bestDays ||
          (days === bestDays && sim > bestSim)
        ) {
          bestDays = days;
          bestSim = sim;
          best = c;
        }
      }
    }

    matched.push({ jPost, igPost: best, candidates });
  }

  return { matched, unmatched };
}

// ---------------------------------------------------------------------------
// Step 4 – Copy images and rewrite journal files
// ---------------------------------------------------------------------------

function sanitizeFilename(name) {
  // Keep alphanumeric, dash, underscore, dot
  return name.replace(/[^a-zA-Z0-9_\-.]/g, '_');
}

/**
 * Given an Instagram image relative path like "media/posts/202502/filename.jpg"
 * returns "202502-filename.jpg"
 */
function buildDestFilename(relPath) {
  // relPath = "media/posts/202502/filename.jpg"
  const parts = relPath.split('/');
  const yyyymm = parts[parts.length - 2]; // e.g. "202502"
  const file   = parts[parts.length - 1]; // e.g. "filename.jpg"
  return `${yyyymm}-${file}`;
}

function buildImageMarkdown(caption, destFilename) {
  const alt = caption || '';
  return `![${alt}](/images/journal/${destFilename})`;
}

/**
 * Rewrites the journal markdown content:
 * - Removes the [_](https://...) line
 * - Removes the [View in Instagram ⇒](...) line
 * - Removes any "Photo taken at: …" lines (optional, keep if desired)
 * - Inserts image embed(s) in place of the old Instagram link block
 */
function rewriteJournalContent(originalContent, images, caption) {
  // Build image markdown lines
  const imageLines = images
    .map(destFilename => buildImageMarkdown(caption, destFilename))
    .join('\n\n');

  // Replace the block:
  //   [_](https://www.instagram.com/…)
  //   <blank line(s)>
  //   Photo taken at: …  (optional)
  //   <blank line(s)>
  //   [View in Instagram ⇒](…)
  //
  // with the image embed(s).

  let content = originalContent;

  // Remove "[_](https://www.instagram.com/...)" lines
  content = content.replace(/^\[_\]\(https:\/\/www\.instagram\.com\/[^\)]*\)\s*$/gm, '');

  // Remove "[View in Instagram ⇒](...)" lines
  content = content.replace(/^\[View in Instagram ⇒\]\([^\)]*\)\s*$/gm, '');

  // Remove "Photo taken at: …" lines
  content = content.replace(/^Photo taken at:.*$/gm, '');

  // Collapse multiple blank lines into at most two
  content = content.replace(/\n{3,}/g, '\n\n');

  // Trim trailing whitespace from the end of the frontmatter body section
  // and insert image lines after the frontmatter closing ---
  // Find the end of frontmatter
  const fmEnd = content.indexOf('\n---\n', 3);
  if (fmEnd === -1) {
    // No standard frontmatter closing, just prepend images
    content = content.trimEnd() + '\n\n' + imageLines + '\n';
  } else {
    // Insert image block right after the frontmatter
    const afterFm = content.slice(fmEnd + 5); // skip "\n---\n"
    const trimmed = afterFm.trimStart();
    content = content.slice(0, fmEnd + 5) + '\n' + imageLines + '\n\n' + trimmed;
    // Clean up any duplicate blank lines
    content = content.replace(/\n{3,}/g, '\n\n');
    content = content.trimEnd() + '\n';
  }

  return content;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('=== match-instagram.mjs ===\n');

  // Parse Instagram HTML
  console.log('Parsing Instagram HTML…');
  const instagramPosts = parseInstagramHtml(INSTAGRAM_HTML);
  console.log(`  Found ${instagramPosts.length} Instagram posts\n`);

  // Read journal files
  console.log('Reading journal .md files…');
  const journalPosts = parseJournalFiles(JOURNAL_DIR);
  console.log(`  Found ${journalPosts.length} journal posts with [View in Instagram ⇒]\n`);

  // Match
  console.log('Matching posts…');
  const { matched, unmatched } = matchPosts(journalPosts, instagramPosts);
  console.log(`  Matched: ${matched.length}`);
  console.log(`  Unmatched: ${unmatched.length}\n`);

  // Ensure destination directory exists
  mkdirSync(DEST_DIR, { recursive: true });

  // Process matches
  let successCount = 0;
  let errorCount = 0;
  const conflicts = [];

  for (const { jPost, igPost, candidates } of matched) {
    if (candidates.length > 1) {
      conflicts.push({
        journalFile: jPost.file,
        journalDate: jPost.date.toISOString().slice(0, 10),
        candidateCount: candidates.length,
        chosenCaption: igPost.caption,
      });
    }

    // Only process image files (skip mp4/mov/srt etc.)
    const imageFiles = igPost.images.filter(img =>
      /\.(jpg|jpeg|png|webp)$/i.test(img)
    );

    if (imageFiles.length === 0) {
      console.warn(`  [WARN] No image files for journal post: ${jPost.file} (caption: ${igPost.caption.slice(0, 60)})`);
      unmatched.push({ jPost, reason: 'No image files in matched Instagram post' });
      continue;
    }

    const copiedDestFilenames = [];

    for (const relPath of imageFiles) {
      const srcPath = join(INSTAGRAM_MEDIA_ROOT, relPath);
      const destFilename = buildDestFilename(relPath);
      const destPath = join(DEST_DIR, destFilename);

      if (!existsSync(srcPath)) {
        console.warn(`  [WARN] Source image not found: ${srcPath}`);
        continue;
      }

      try {
        copyFileSync(srcPath, destPath);
        copiedDestFilenames.push(destFilename);
      } catch (e) {
        console.error(`  [ERROR] Failed to copy ${srcPath}: ${e.message}`);
        errorCount++;
      }
    }

    if (copiedDestFilenames.length === 0) {
      console.warn(`  [WARN] No images successfully copied for: ${jPost.file}`);
      continue;
    }

    // Rewrite journal file
    try {
      const newContent = rewriteJournalContent(jPost.content, copiedDestFilenames, igPost.caption);
      writeFileSync(jPost.filePath, newContent, 'utf-8');
      console.log(`  [OK] ${jPost.file} → ${copiedDestFilenames.join(', ')}`);
      successCount++;
    } catch (e) {
      console.error(`  [ERROR] Failed to write ${jPost.filePath}: ${e.message}`);
      errorCount++;
    }
  }

  // ---------------------------------------------------------------------------
  // Report
  // ---------------------------------------------------------------------------

  console.log('\n=== REPORT ===\n');
  console.log(`Total journal posts with Instagram links: ${journalPosts.length}`);
  console.log(`Successfully processed:                   ${successCount}`);
  console.log(`Errors during copy/write:                 ${errorCount}`);
  console.log(`Unmatched journal posts:                  ${unmatched.length}`);
  console.log(`Posts with multiple Instagram candidates: ${conflicts.length}`);

  if (unmatched.length > 0) {
    console.log('\n--- Unmatched journal posts ---');
    for (const { jPost, reason } of unmatched) {
      console.log(`  ${jPost.file} [${jPost.date.toISOString().slice(0, 10)}] — ${reason}`);
    }
  }

  if (conflicts.length > 0) {
    console.log('\n--- Conflict resolutions (multiple Instagram candidates) ---');
    for (const c of conflicts) {
      console.log(`  ${c.journalFile} [${c.journalDate}]: ${c.candidateCount} candidates → chose: "${c.chosenCaption.slice(0, 80)}"`);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
