/**
 * email-to-journal Worker
 *
 * Handles two entry points:
 *
 * 1. email handler — receives inbound email via Cloudflare Email Routing,
 *    parses it with postal-mime, uploads image attachments to R2, commits a
 *    new journal .md file to GitHub (triggering a deploy).
 *
 * 2. fetch handler — HTTP endpoints:
 *    POST /sms  — STUB for Twilio SMS-to-journal (not yet implemented).
 *
 * Required bindings (wrangler.toml + Cloudflare dashboard):
 *   R2_BUCKET       — R2 bucket binding (for image uploads)
 *   GITHUB_TOKEN    — secret: PAT with repo Contents write access
 *   GITHUB_REPO     — var: "xispolson/xispo-co"
 *   GITHUB_BRANCH   — var: "main"
 *   R2_PUBLIC_URL   — var: public base URL for the R2 bucket
 *   ALLOWED_SENDER  — var: your email address (rejects everything else)
 *   ALLOWED_PHONE   — var: your phone number in E.164 (e.g. +15551234567)
 *   TWILIO_AUTH_TOKEN — secret: used to verify Twilio webhook signatures
 */

import PostalMime from 'postal-mime';

export default {
  // ── Email handler ──────────────────────────────────────────────────────────

  async email(message, env, _ctx) {
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

    // Upload image attachments to R2, collect markdown image references
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

    const bodyText = email.text?.trim() ?? stripHtml(email.html ?? '');
    const fullBody = [bodyText, ...imageLines].filter(Boolean).join('\n\n');
    const excerpt = buildExcerpt(bodyText);

    const mdContent =
      buildFrontmatter({ title: subject, date: dateStr, excerpt }) +
      '\n\n' +
      fullBody;

    await commitToGitHub(env, filePath, mdContent, `Add journal post: ${subject}`);
  },

  // ── HTTP handler ───────────────────────────────────────────────────────────

  async fetch(request, env, _ctx) {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/sms') {
      return handleSms(request, env);
    }

    return new Response('Not found', { status: 404 });
  },
};

// ── SMS stub ───────────────────────────────────────────────────────────────
// TODO: implement SMS-to-journal via Twilio webhook
//
// To wire this up:
//  1. Buy/configure a Twilio number and set its webhook to POST https://<worker-url>/sms
//  2. Set ALLOWED_PHONE and TWILIO_AUTH_TOKEN as Worker secrets
//  3. Validate the Twilio signature (X-Twilio-Signature header) using TWILIO_AUTH_TOKEN
//  4. Parse the FormData: `Body` = SMS text, `From` = sender phone, `MediaUrl0` etc for MMS images
//  5. Upload any MMS images to R2 (same pattern as the email handler)
//  6. Call commitToGitHub() with the assembled markdown
//  7. Return TwiML: <Response><Message>Posted!</Message></Response>

async function handleSms(request, _env) {
  // Stub — always reject until fully implemented
  return new Response(
    '<Response><Message>SMS posting not yet enabled.</Message></Response>',
    {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    },
  );
}

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

function buildExcerpt(text) {
  const first = text.split('\n').find((l) => l.trim()) ?? '';
  return first.length > 160 ? first.slice(0, 157) + '…' : first;
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
