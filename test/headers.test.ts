// The page's security headers (#122): site/_headers, and that the page fits its CSP.

import { env as cfEnv } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';
import type { Env } from '../src/env';
import demo from '../src/index';

const env = cfEnv as unknown as Env;
const ctx = { waitUntil: () => {}, passThroughOnException: () => {}, props: {} } as unknown as ExecutionContext;
const get = (path: string) => demo.fetch(new Request(`https://pointsman-demo.test${path}`), env, ctx);

/** The CSP as { directive: [sources] }. */
function directives(csp: string): Record<string, string[]> {
  return Object.fromEntries(csp.split(';').map((d) => d.trim().split(/\s+/)).filter((d) => d[0]).map(([name, ...sources]) => [name!, sources]));
}
/** Allowed when a source is the URL's origin, or a path prefix that ends in "/". */
const allows = (sources: string[] | undefined, url: string) =>
  (sources ?? []).some((s) => (s.endsWith('/') ? url.startsWith(s) : url === s || url.startsWith(`${s}/`)));

describe('security headers (#122)', () => {
  it('are set on the page and its files', async () => {
    for (const path of ['/', '/app.js', '/theme.js', '/style.css']) {
      const res = await get(path);
      expect(res.status, path).toBe(200);
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
      expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
      expect(res.headers.get('x-frame-options')).toBe('DENY');
      const csp = directives(res.headers.get('content-security-policy') ?? '');
      expect(csp['frame-ancestors']).toEqual(["'none'"]);
      expect(csp['object-src']).toEqual(["'none'"]);
      // Scripts only from files: nothing inline, no eval.
      expect(csp['script-src']).not.toContain("'unsafe-inline'");
      expect(csp['script-src']).not.toContain("'unsafe-eval'");
    }
  });

  it("are set on the Worker's own answers too", async () => {
    const res = await get('/api/nothing');
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
  });

  it('allow what index.html and app.js load, and the page has no inline script', async () => {
    const res = await get('/');
    const html = await res.text();
    const csp = directives(res.headers.get('content-security-policy')!);
    // An inline script would be blocked: every <script> has a src.
    expect(html.match(/<script(?![^>]*\ssrc=)[^>]*>/g)).toBeNull();
    const scripts = [...html.matchAll(/<script[^>]*\ssrc="(https:[^"]+)"/g)].map((m) => m[1]!);
    const styles = [...html.matchAll(/<link(?=[^>]*rel="stylesheet")[^>]*\shref="(https:[^"]+)"/g)].map((m) => m[1]!);
    expect(scripts).toHaveLength(2);
    expect(styles).toHaveLength(2);
    for (const u of scripts) expect(allows(csp['script-src'], u), u).toBe(true);
    for (const u of styles) expect(allows(csp['style-src'], u), u).toBe(true);
    // app.js fetches the GSI tiles, glyphs and shelter data; the other hosts are links.
    const app = await (await get('/app.js')).text();
    const links = ['https://github.com', 'https://maps.gsi.go.jp', 'https://disaportal.gsi.go.jp', 'https://geolonia.github.io', 'https://pointsman.net'];
    const hosts = new Set([...app.matchAll(/'(https:\/\/[a-z0-9.-]+)\//g)].map((m) => m[1]!).filter((h) => !links.includes(h)));
    expect(hosts.size).toBeGreaterThan(0);
    for (const host of hosts) expect(allows(csp['connect-src'], host), host).toBe(true);
  });

  it('do not serve the _headers file itself', async () => {
    expect((await get('/_headers')).status).toBe(404);
  });
});
