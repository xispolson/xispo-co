/**
 * email-to-journal Worker
 *
 * Receives inbound email via Cloudflare Email Routing, parses it with
 * postal-mime, uploads any image attachments to R2, then commits a new
 * journal markdown file to GitHub — triggering a Pages rebuild.
 *
 * Required bindings (set in wrangler.toml + Cloudflare dashboard):
 *   R2_BUCKET       — R2 bucket binding (for image uploads)
 *   GITHUB_TOKEN    — secret: PAT with repo write access
 *   GITHUB_REPO     — var: "xispolson/xispo-co"
 *   GITHUB_BRANCH   — var: "main"
 *   R2_PUBLIC_URL   — var: public base URL for the R2 bucket
 *   ALLOWED_SENDER  — var: your email address (rejects everything else)
 */

import PostalMime from 'postal-mime';

export default {
  async email(message, env, ctx) {
    // Only accept mail from yourself
    if (message.from !== env.ALLOWED_SENDER) {
      message.setReject(`Sender ${message.from} not allowed`);
      return;
    }

    const rawEmail = await streamToArrayBuffer(message.raw, message.rawSize);
    const parser = new PostalMime();
    const email = await parser.parse(rawEmail);

    const subject = (email.subject || 'Untitled').trim();
    const now = new Date();
    const dateStr = toDateString(now);
    const slug = slugify(subject);
    const filePath = `src/content/journal/${dateStr}-${slug}.md`;

    // Upload image attachments to R2, collect markdown references
    const imageLines = [];
    for (const att of email.attachments ?? []) {
      if (!att.mimeType?.startsWith('image/')) continue;
      const ext = att.filename?.split('.').pop() ?? 'jpg';
      const key = `journal/${dateStr}-${slug}-${imageLines.length + 1}.${ext}`;
      await env.R2_BUCKET.put(key, att.content, {
        httpMetadata: { contentType: att.mimeType },
      });
      const alt = att.filename ?? `image ${imageLines.length + 1}`;
      imageLines.push(`![${alt}](${env.R2_PUBLIC_URL}/${key})`);
    }

    // Prefer plain text body; fall back to stripped HTML
    const bodyText = email.text?.trim() ?? stripHtml(email.html ?? '');
    const fullBody = [bodyText, ...imageLines].filter(Boolean).join('\n\n');

    // Build the excerpt (first non-empty line, max 160 chars)
    const excerpt = bodyText.split('\n').find(l => l.trim()) ?? '';
    const excerptTrimmed = excerpt.length > 160 ? excerpt.slice(0, 157) + '…' : excerpt;

    const mdContent = buildFrontmatter({
      title: subject,
      date: dateStr,
      excerpt: excerptTrimmed,
    }) + '\n\n' + fullBody;

    await commitToGitHub(env, filePath, mdContent, `Add journal post: ${subject}`);
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────

async function streamToArrayBuffer(stream, size) {
  const result = new Uint8Array(size);
  let offset = 0;
  for await (const chunk of stream) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result.buffer;
}

function toDateString(date) {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
}

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function buildFrontmatter({ title, date, excerpt }) {
  const safe = (s) => s.replace(/"/g, '\\"');
  return `---
title: "${safe(title)}"
date: ${date}
excerpt: "${safe(excerpt)}"
categories: []
tags: []
draft: false
---`;
}

async function commitToGitHub(env, path, content, message) {
  const apiBase = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    'Content-Type': 'application/json',
    'User-Agent': 'xispo-email-to-journal/1.0',
  };

  // Check if file already exists (to get its SHA for updates)
  let sha;
  const check = await fetch(`${apiBase}?ref=${env.GITHUB_BRANCH}`, { headers });
  if (check.ok) {
    const existing = await check.json();
    sha = existing.sha;
  }

  const body = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch: env.GITHUB_BRANCH,
    ...(sha ? { sha } : {}),
  };

  const res = await fetch(apiBase, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${err}`);
  }
}
