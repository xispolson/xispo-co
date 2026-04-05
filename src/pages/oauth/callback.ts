export const prerender = false;
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

interface CloudflareEnv {
  GITHUB_OAUTH_CLIENT_ID: string;
  GITHUB_OAUTH_CLIENT_SECRET: string;
}

export const GET: APIRoute = async ({ url }) => {
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error || !code) {
    return postMessageResponse('error', { message: error ?? 'OAuth cancelled or denied' });
  }

  const cfEnv = env as unknown as CloudflareEnv;

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: cfEnv.GITHUB_OAUTH_CLIENT_ID,
      client_secret: cfEnv.GITHUB_OAUTH_CLIENT_SECRET,
      code,
    }),
  });

  const data = await tokenRes.json() as Record<string, string>;

  if (data.error || !data.access_token) {
    return postMessageResponse('error', {
      message: data.error_description ?? data.error ?? 'Token exchange failed',
    });
  }

  return postMessageResponse('success', { token: data.access_token, provider: 'github' });
};

function postMessageResponse(
  status: 'success' | 'error',
  data: Record<string, string>,
): Response {
  const message = `authorization:github:${status}:${JSON.stringify(data)}`;
  const html = `<!DOCTYPE html>
<html>
<body>
<script>
(function () {
  const msg = ${JSON.stringify(message)};
  if (window.opener) {
    window.opener.postMessage(msg, '*');
  }
  window.close();
})();
</script>
</body>
</html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}
