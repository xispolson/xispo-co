export const prerender = false;
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

interface CloudflareEnv {
  GITHUB_OAUTH_CLIENT_ID: string;
}

export const GET: APIRoute = async ({ url }) => {
  const cfEnv = env as unknown as CloudflareEnv;
  const redirectUri = new URL('/oauth/callback', url.origin).toString();
  const state = crypto.randomUUID();

  const githubUrl = new URL('https://github.com/login/oauth/authorize');
  githubUrl.searchParams.set('client_id', cfEnv.GITHUB_OAUTH_CLIENT_ID);
  githubUrl.searchParams.set('redirect_uri', redirectUri);
  githubUrl.searchParams.set('scope', 'repo,user');
  githubUrl.searchParams.set('state', state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: githubUrl.toString(),
      'Set-Cookie': `oauth_state=${state}; Path=/oauth; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  });
};
