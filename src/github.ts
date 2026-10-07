// GitHub: the review queue is the issues of the demo repository. The Worker
// acts as a GitHub App (geolonia-pointsman-demo): Issues read/write on that
// repository only, and webhooks for issue comments.

import type { Env } from './env';

const API = 'https://api.github.com';
const enc = new TextEncoder();
const b64url = (data: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof data === 'string' ? enc.encode(data) : new Uint8Array(data);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

/** RS256 JWT for the app, valid 9 minutes (GitHub allows 10). */
export async function appJwt(appId: string, pkcs8Pem: string, now = Date.now()): Promise<string> {
  const body = pkcs8Pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  if (!body || pkcs8Pem.includes('RSA PRIVATE KEY')) throw new Error('GITHUB_APP_PRIVATE_KEY must be PKCS#8 ("BEGIN PRIVATE KEY")');
  const der = Uint8Array.from(atob(body), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const iat = Math.floor(now / 1000) - 60; // clock drift
  const data = `${b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64url(JSON.stringify({ iat, exp: iat + 540, iss: appId }))}`;
  return `${data}.${b64url(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(data)))}`;
}

/** Checks X-Hub-Signature-256 against the raw body. */
export async function verifyWebhook(secret: string, body: string, signature: string | null): Promise<boolean> {
  if (!signature?.startsWith('sha256=')) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(body)));
  const hex = signature.slice(7);
  if (!/^[0-9a-f]{64}$/.test(hex)) return false;
  const given = Uint8Array.from(hex.match(/../g)!, (h) => parseInt(h, 16));
  return crypto.subtle.timingSafeEqual(mac, given);
}

export interface Issue {
  number: number;
  html_url: string;
}

export class GitHub {
  private token: { value: string; expires: number } | undefined;

  // A wrapper, not `fetch` itself: see Broker.
  constructor(private readonly env: Env, private readonly fetchFn: typeof fetch = (input, init) => fetch(input, init)) {}

  private async installationToken(): Promise<string> {
    if (this.token && this.token.expires > Date.now() + 60_000) return this.token.value;
    const jwt = await appJwt(this.env.GITHUB_APP_ID, this.env.GITHUB_APP_PRIVATE_KEY);
    const res = await this.request(`/app/installations/${this.env.GITHUB_INSTALLATION_ID}/access_tokens`, 'POST', undefined, `Bearer ${jwt}`);
    const t = (await res.json()) as { token: string; expires_at: string };
    this.token = { value: t.token, expires: Date.parse(t.expires_at) };
    return t.token;
  }

  private async request(path: string, method = 'GET', body?: unknown, auth?: string): Promise<Response> {
    const res = await this.fetchFn(`${API}${path}`, {
      method,
      headers: {
        accept: 'application/vnd.github+json',
        'user-agent': 'pointsman-demo',
        'x-github-api-version': '2022-11-28',
        authorization: auth ?? `token ${await this.installationToken()}`,
        ...(body !== undefined && { 'content-type': 'application/json' }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    if (!res.ok) throw new Error(`GitHub ${method} ${path.replace(/\/\d+/g, '/…')}: ${res.status}`);
    return res;
  }

  async createIssue(title: string, body: string, labels: string[]): Promise<Issue> {
    const res = await this.request(`/repos/${this.env.GITHUB_REPOSITORY}/issues`, 'POST', { title, body, labels });
    return (await res.json()) as Issue;
  }

  async comment(issue: number, body: string): Promise<void> {
    await this.request(`/repos/${this.env.GITHUB_REPOSITORY}/issues/${issue}/comments`, 'POST', { body });
  }

  async close(issue: number, labels?: string[]): Promise<void> {
    await this.request(`/repos/${this.env.GITHUB_REPOSITORY}/issues/${issue}`, 'PATCH', {
      state: 'closed',
      ...(labels && { labels }),
    });
  }
}
