/**
 * clean-instagram.mjs
 *
 * For all journal posts:
 *   1. Remove any line containing "instagram.com"
 *   2. Remove "Photo taken at:" lines
 *   3. If the post still had Instagram links (View in Instagram ⇒ was present),
 *      set draft: true in frontmatter
 *   4. Clean up resulting blank line clusters (3+ blank lines → 2 max)
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const JOURNAL_DIR = join(__dirname, '../src/content/journal');

const files = readdirSync(JOURNAL_DIR).filter(f => f.endsWith('.md'));

let drafted = 0;
let cleaned = 0;

for (const file of files) {
  const filePath = join(JOURNAL_DIR, file);
  const original = readFileSync(filePath, 'utf8');

  const hadInstagram = original.includes('instagram.com');
  if (!hadInstagram) continue;

  // Set draft: true in frontmatter if this post still has unmatched Instagram links
  // (indicated by "View in Instagram" still being present)
  const needsDraft = original.includes('View in Instagram');

  let content = original;

  // Set draft: false → true if needed
  if (needsDraft) {
    content = content.replace(/^(draft:\s*)false$/m, '$1true');
    drafted++;
  }

  // Remove lines containing instagram.com
  content = content
    .split('\n')
    .filter(line => !line.includes('instagram.com'))
    .join('\n');

  // Remove "Photo taken at:" lines
  content = content
    .split('\n')
    .filter(line => !/^Photo taken at:/.test(line.trim()))
    .join('\n');

  // Collapse 3+ consecutive blank lines to 2
  content = content.replace(/\n{3,}/g, '\n\n');

  if (content !== original) {
    writeFileSync(filePath, content, 'utf8');
    cleaned++;
  }
}

console.log(`Cleaned ${cleaned} files, drafted ${drafted} posts.`);
