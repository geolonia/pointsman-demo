// The Worker end to end, with a fake broker, Pointsman and GitHub (global fetch stubbed).

import { env as cfEnv, exports } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/env';
import { taskEntityId } from '../engine/bridge/src/bridge';
import { cleanup } from '../src/index';

// Secrets come from vitest.config.ts; the generated types know only the vars.
const env = cfEnv as unknown as Env;

type Call = { method: string; url: string; headers: Headers; body: any };
let calls: Call[] = [];
let answer: (c: Call) => Response | undefined;
const P = (value: unknown) => ({ type: 'Property', value });
const PAGE = 'https://pointsman-demo.geolonia.workers.dev';
const BROKER = 'https://geolonia-demo.geonicdb.jp/ngsi-ld/v1';
// Made at run time: no token-looking literal in the repository.
const GH_TOKEN = `ghs_${crypto.randomUUID().replaceAll('-', '')}`;

beforeEach(async () => {
  calls = [];
  answer = () => undefined;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = new Request(input, init);
    const text = await req.text();
    let body: unknown;
    try { body = text ? JSON.parse(text) : undefined; } catch { body = text; }
    const c = { method: req.method, url: req.url, headers: req.headers, body };
    calls.push(c);
    const custom = answer(c);
    if (custom) return custom;
    if (c.url.startsWith('https://api.github.com/app/installations/')) return Response.json({ token: GH_TOKEN, expires_at: new Date(Date.now() + 3600_000).toISOString() });
    if (c.url.endsWith('/issues') && c.method === 'POST') return Response.json({ number: 7, html_url: 'https://github.com/geolonia/pointsman-demo/issues/7' }, { status: 201 });
    if (c.url.startsWith('https://api.github.com/')) return Response.json({});
    if (c.url === `${BROKER}/entities` && c.method === 'POST') return new Response(null, { status: 201 });
    if (c.url.includes('/attrs')) return new Response(null, { status: 204 });
    return new Response('unexpected', { status: 599 });
  });
  for (const k of (await env.DEMO.list()).keys) await env.DEMO.delete(k.name);
});
afterEach(() => vi.restoreAllMocks());

const worker = (path: string, init: RequestInit = {}) => exports.default.fetch(`https://pointsman-demo.test${path}`, init);
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  worker(path, { method: 'POST', headers: { 'content-type': 'application/json', origin: PAGE, ...headers }, body: JSON.stringify(body) });

describe('reports from the page', () => {
  it('creates a RoadRestriction for a prepared report, remembered as prepared', async () => {
    const res = await post('/api/reports', { prepared: 'car-trapped', lang: 'ja' });
    expect(res.status).toBe(201);
    expect(res.headers.get('access-control-allow-origin')).toBe(PAGE);
    const { id } = await res.json<{ id: string }>();
    const create = calls.find((c) => c.url === `${BROKER}/entities`)!;
    expect(create.headers.get('x-api-key')).toBe(env.BROKER_API_KEY);
    expect(create.headers.get('user-agent')).toMatch(/^pointsman-demo/);
    expect(create.headers.get('ngsild-tenant')).toBe('pointsman_demo');
    expect(create.headers.get('link')).toContain('https://datamodels.jp/context/transportation/v1.jsonld');
    expect(create.body).toMatchObject({ id, type: 'RoadRestriction', roadName: P('紀尾井町通り') });
    expect(await env.DEMO.get(`report:${id}`, 'json')).toMatchObject({ prepared: 'car-trapped' });
    expect(await env.DEMO.get(`day:${new Date().toISOString().slice(0, 10)}`)).toBe('1');
  });

  it('does not count a report the broker refused', async () => {
    answer = (c) => (c.url === `${BROKER}/entities` ? new Response(null, { status: 503 }) : undefined);
    expect((await post('/api/reports', { prepared: 'vague', lang: 'en' })).status).toBe(502);
    expect(await env.DEMO.get(`day:${new Date().toISOString().slice(0, 10)}`)).toBeNull();
  });

  it('refuses other origins, free text without Turnstile, and the day after the limit', async () => {
    expect((await post('/api/reports', { prepared: 'vague', lang: 'en' }, { origin: 'https://evil.example' })).status).toBe(403);
    const free = { roadName: 'x', status: 'closed', description: 'road blocked', location: { type: 'Point', coordinates: [139.75, 35.69] } };
    expect((await post('/api/reports', free)).status).toBe(403);
    await env.DEMO.put(`day:${new Date().toISOString().slice(0, 10)}`, '300');
    expect((await post('/api/reports', { prepared: 'vague', lang: 'en' })).status).toBe(429);
    expect(calls).toHaveLength(0);
  });

  it('shows one report with its NGSI-LD data and issue', async () => {
    const id = 'urn:ngsi-ld:RoadRestriction:demo-00000000-0000-4000-8000-0000000000aa';
    const taskId = await taskEntityId(id, 'check', 'h-9');
    await env.DEMO.put('decision-issue:d-9', '12');
    answer = (c) => {
      if (c.url.startsWith(`${BROKER}/entities/${encodeURIComponent(id)}`)) {
        return Response.json({ id, type: 'RoadRestriction', description: P('blocked'), check: { type: 'Property', value: 'review', inputHash: P('h-9'), decision: { type: 'Relationship', object: 'urn:ngsi-ld:Decision:d-9' } } });
      }
      if (c.url === `${BROKER}/entities/${encodeURIComponent('urn:ngsi-ld:Decision:d-9')}`) {
        expect(c.headers.get('link')).toBeNull(); // full IRIs for the page
        return Response.json({ id: 'urn:ngsi-ld:Decision:d-9', type: 'https://datamodels.jp/ns/decision/Decision' });
      }
      if (c.url === `${BROKER}/entities/${encodeURIComponent(taskId)}`) return Response.json({ id: taskId, type: 'https://datamodels.jp/ns/task/Task' });
      return undefined;
    };
    // As the page asks: percent-encoded.
    const r = await (await worker(`/api/reports/${encodeURIComponent(id)}`)).json<any>();
    expect(r).toMatchObject({ id, prepared: false, check: { action: 'review', decision: 'urn:ngsi-ld:Decision:d-9' }, issue: 'https://github.com/geolonia/pointsman-demo/issues/12' });
    expect(r.ngsi.entity.id).toBe(id);
    expect(r.ngsi.decision.type).toBe('https://datamodels.jp/ns/decision/Decision');
    expect(r.ngsi.task.id).toBe(taskId);
  });

  it('shows the report when its Task cannot be read', async () => {
    const id = 'urn:ngsi-ld:RoadRestriction:demo-00000000-0000-4000-8000-0000000000ab';
    answer = (c) => {
      if (c.url.startsWith(`${BROKER}/entities/${encodeURIComponent(id)}`)) {
        return Response.json({ id, type: 'RoadRestriction', check: { type: 'Property', value: 'urgent', inputHash: P('h-8'), decision: { type: 'Relationship', object: 'urn:ngsi-ld:Decision:d-8' } } });
      }
      if (c.url.endsWith(encodeURIComponent('urn:ngsi-ld:Decision:d-8'))) return Response.json({ id: 'urn:ngsi-ld:Decision:d-8', type: 'Decision' });
      if (c.url.includes('urn%3Angsi-ld%3ATask%3A')) return new Response(null, { status: 503 });
      return undefined;
    };
    const res = await worker(`/api/reports/${encodeURIComponent(id)}`);
    expect(res.status).toBe(200);
    expect((await res.json<any>()).ngsi.task).toBeNull();
  });

  it('lists the decisions waiting for a person, with one NGSI-LD query', async () => {
    const D = (n: string, action: string, decidedAt: unknown) => ({
      id: `urn:ngsi-ld:Decision:${n}`, type: 'Decision', action: P(action), decidedAt: P(decidedAt),
      refersTo: { type: 'Relationship', object: `urn:ngsi-ld:RoadRestriction:demo-${n}` },
    });
    // First a broker failure: an error, and nothing cached.
    answer = (c) => (c.url.startsWith(`${BROKER}/entities?type=Decision`) ? new Response(null, { status: 400 }) : undefined);
    expect((await worker('/api/decisions', { headers: { origin: PAGE } })).status).toBe(502);

    await env.DEMO.put('decision-issue:d-2', '21');
    answer = (c) => (c.url.startsWith(`${BROKER}/entities?type=Decision`)
      ? Response.json([D('d-1', 'review', '2026-10-07T01:00:00Z'), D('d-2', 'urgent', { '@type': 'DateTime', '@value': '2026-10-07T02:00:00Z' })])
      : undefined);
    const res = await worker('/api/decisions', { headers: { origin: PAGE } });
    expect(res.status).toBe(200);
    expect(res.headers.get('access-control-allow-origin')).toBe(PAGE);
    const list = calls.filter((c) => c.url.startsWith(`${BROKER}/entities?type=Decision`)).pop()!;
    expect(new URL(list.url).searchParams.get('q')).toBe('reviewStatus=="pending"');
    // The short names come from the published Decision context (datamodels.jp).
    expect(list.headers.get('link')).toContain('<https://datamodels.jp/context/decision/v1.jsonld>');
    const body = await res.json<any>();
    expect(body.total).toBe(2);
    expect(body.request).toMatchObject({ method: 'GET', tenant: 'pointsman_demo', pages: 1, link: 'https://datamodels.jp/context/decision/v1.jsonld' });
    expect(body.request.url).toBe(list.url);
    expect(body.decisions).toEqual([
      { id: 'urn:ngsi-ld:Decision:d-2', refersTo: 'urn:ngsi-ld:RoadRestriction:demo-d-2', action: 'urgent', decidedAt: '2026-10-07T02:00:00Z', issue: 'https://github.com/geolonia/pointsman-demo/issues/21' },
      { id: 'urn:ngsi-ld:Decision:d-1', refersTo: 'urn:ngsi-ld:RoadRestriction:demo-d-1', action: 'review', decidedAt: '2026-10-07T01:00:00Z', issue: null },
    ]);
  });


  it('serves the configuration for the page', async () => {
    const res = await worker('/api/config', { headers: { origin: PAGE } });
    const c = await res.json<any>();
    expect(c.prepared).toHaveLength(9);
    expect(c.freeText).toBe(false);
    expect(c.today).toEqual({ used: 0, limit: 300 });
  });
});

describe('notifications (the bridge)', () => {
  const report = { id: 'urn:ngsi-ld:RoadRestriction:demo-00000000-0000-4000-8000-000000000001', type: 'RoadRestriction', roadName: P('内堀通り'), restrictionStatus: P('closed'), description: P('片側交互通行で通れる') };
  const decided = (action: string) => ({
    decision_id: '11111111-1111-4111-8111-111111111111', action, profile: 'road-restriction-check', profile_version: 1, model: 'clef-flash',
    created_at: '2026-10-07T01:00:01.000Z', rule: null,
    answers: { category: { type: 'choice', value: 'alternatingOneWay', p: 0.85, probabilities: { alternatingOneWay: 0.85, other: 0.15 } } },
  });
  const notify = () => worker('/notify', { method: 'POST', headers: { 'x-bridge-secret': env.NOTIFY_SECRET, 'content-type': 'application/json' }, body: JSON.stringify({ type: 'Notification', data: [report] }) });

  function pointsmanSays(action: string) {
    answer = (c) => {
      if (c.url === 'https://pointsman.geolonia.workers.dev/v1/decide/road-restriction-check') return Response.json(decided(action));
      // No Task yet for these inputs (the bridge looks before it cancels one).
      if (c.url.includes('urn%3Angsi-ld%3ATask%3A')) return new Response(null, { status: 404 });
      if (c.method === 'GET' && c.url.startsWith(`${BROKER}/entities/`)) {
        return Response.json({ ...report, check: { type: 'Property', value: action, policyRule: P('default'), category: P('alternatingOneWay'), categoryProbability: P(0.85) } });
      }
      return undefined;
    };
  }

  it('decides, writes back, and opens an issue for a prepared report that needs a person', async () => {
    await env.DEMO.put(`report:${report.id}`, JSON.stringify({ prepared: 'status-contradicts', createdAt: new Date().toISOString() }));
    pointsmanSays('review');
    const res = await notify();
    expect(res.status).toBe(200);
    await vi.waitFor(() => expect(calls.some((c) => c.url.endsWith('/repos/geolonia/pointsman-demo/issues'))).toBe(true));
    const decide = calls.find((c) => c.url.includes('/v1/decide/'))!;
    expect(decide.headers.get('authorization')).toBe(`Bearer ${env.POINTSMAN_TOKEN}`);
    // The bridge names itself on the requests it makes (pointsman#61).
    expect(decide.headers.get('user-agent')).toMatch(/^pointsman-(demo|bridge)/);
    const decisionEntity = calls.find((c) => c.url === `${BROKER}/entities` && c.body?.type === 'Decision')!;
    expect(decisionEntity.body.humanInvolvement).toEqual({ type: 'VocabProperty', vocab: 'dpv:HumanInvolvementForVerification' });
    // A Task for a person (pointsman#81), found again by the check's input hash.
    const task = calls.find((c) => c.url === `${BROKER}/entities` && c.body?.type === 'Task')!;
    expect(task.body).toMatchObject({
      name: P('[review] 内堀通り'), progress: P('needs-action'), priority: P(5),
      refersTo: { type: 'Relationship', object: report.id },
    });
    const check = calls.find((c) => c.url.endsWith('/attrs') && c.body?.check)?.body.check ?? calls.find((c) => c.url.endsWith('/attrs/check'))!.body;
    expect(task.body.id).toBe(await taskEntityId(report.id, 'check', check.inputHash.value));
    // Every broker request carries the demo's API key, tenant and a User-Agent
    // (GeonicDB's firewall refuses requests without one): the demo's, or the
    // bridge's for the requests the bridge makes.
    for (const c of calls.filter((x) => x.url.startsWith(BROKER))) {
      expect(c.headers.get('user-agent')).toMatch(/^pointsman-(demo|bridge)/);
      expect(c.headers.get('x-api-key')).toBe(env.BROKER_API_KEY);
      expect(c.headers.get('ngsild-tenant')).toBe('pointsman_demo');
    }
    const issue = calls.find((c) => c.url.endsWith('/issues'))!;
    expect(issue.headers.get('authorization')).toBe(`token ${GH_TOKEN}`);
    expect(issue.body.title).toMatch(/^\[review\] 内堀通り/);
    expect(issue.body.labels).toEqual(['demo', 'review']);
    expect(issue.body.body).toContain('| category | `alternatingOneWay` | 0.85 |');
    await vi.waitFor(async () => expect(await env.DEMO.get('issue:7', 'json')).toMatchObject({ decision: '11111111-1111-4111-8111-111111111111', action: 'review' }));
  });

  it('lets a retry open the issue when GitHub failed the first time', async () => {
    await env.DEMO.put(`report:${report.id}`, JSON.stringify({ prepared: 'status-contradicts', createdAt: new Date().toISOString() }));
    pointsmanSays('review');
    const decide = answer;
    let issueCalls = 0;
    answer = (c) => (c.url.endsWith('/issues') ? (++issueCalls === 1 ? new Response(null, { status: 502 }) : undefined) : decide(c));
    await notify();
    await vi.waitFor(() => expect(issueCalls).toBe(1));
    await vi.waitFor(async () => expect(await env.DEMO.get('decision-pending:11111111-1111-4111-8111-111111111111')).toBeNull());
    await notify();
    await vi.waitFor(async () => expect(await env.DEMO.get('issue:7')).not.toBeNull());
    expect(issueCalls).toBe(2);
  });

  it('never opens an issue for free text, or for publish', async () => {
    await env.DEMO.put(`report:${report.id}`, JSON.stringify({ createdAt: new Date().toISOString() }));
    pointsmanSays('urgent');
    expect((await notify()).status).toBe(200);
    pointsmanSays('publish');
    await env.DEMO.put(`report:${report.id}`, JSON.stringify({ prepared: 'flooded-underpass', createdAt: new Date().toISOString() }));
    expect((await notify()).status).toBe(200);
    await new Promise((r) => setTimeout(r, 50));
    expect(calls.some((c) => c.url.startsWith('https://api.github.com/'))).toBe(false);
    // Tasks are about the decision, not the issue: urgent free text gets one, publish none.
    expect(calls.filter((c) => c.body?.type === 'Task').map((c) => c.body.statusLabel.value)).toEqual(['urgent']);
    // For publish the bridge only looked for an open Task (none here).
    expect(calls.filter((c) => c.url.includes('urn%3Angsi-ld%3ATask%3A')).map((c) => c.method)).toEqual(['GET']);
  });
});

describe('reviews from GitHub', () => {
  const decision = '11111111-1111-4111-8111-111111111111';
  const entityId = 'urn:ngsi-ld:RoadRestriction:demo-00000000-0000-4000-8000-000000000001';
  async function signed(payload: unknown) {
    const body = JSON.stringify(payload);
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.GITHUB_WEBHOOK_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac = [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)))].map((b) => b.toString(16).padStart(2, '0')).join('');
    return worker('/github/webhook', { method: 'POST', headers: { 'x-github-event': 'issue_comment', 'x-hub-signature-256': `sha256=${mac}` }, body });
  }
  const comment = (text: string, association = 'MEMBER') => ({
    action: 'created', issue: { number: 7, state: 'open' },
    comment: { body: text, user: { login: 'reviewer', type: 'User' }, author_association: association },
  });

  beforeEach(async () => {
    await env.DEMO.put('issue:7', JSON.stringify({ decision, entity: entityId, action: 'review', corrections: [] }));
    answer = (c) => {
      if (c.url.startsWith('https://pointsman.geolonia.workers.dev/')) return new Response(null, { status: c.url.endsWith('/resolve') ? 200 : 204 });
      if (c.method === 'GET' && c.url.startsWith(`${BROKER}/entities/`)) return Response.json({ id: entityId, type: 'RoadRestriction', check: { type: 'Property', value: 'review', decisionId: P(decision), inputHash: P('h-7') } });
      return undefined;
    };
  });

  it('resolves the review in Pointsman, the broker and the issue', async () => {
    const res = await signed(comment('OK, one lane is open.\n/publish\n/category alternatingOneWay'));
    expect(res.status).toBe(200);
    const resolve = calls.find((c) => c.url.endsWith(`/v1/reviews/${decision}/resolve`))!;
    expect(resolve.body).toEqual({ action: 'publish', correct: { category: 'alternatingOneWay' }, by: 'github:reviewer' });
    const update = calls.find((c) => c.url === `${BROKER}/entities/${encodeURIComponent(`urn:ngsi-ld:Decision:${decision}`)}/attrs`)!;
    expect(update.body).toMatchObject({
      reviewStatus: P('resolved'), finalAction: P('publish'), reviewedBy: P('github:reviewer'),
      corrections: { type: 'JsonProperty', json: [{ name: 'category', value: 'alternatingOneWay', by: 'github:reviewer' }] },
    });
    const check = calls.find((c) => c.method === 'PATCH' && c.url.endsWith('/attrs/check'))!;
    expect(check.body).toMatchObject({ value: 'review', finalAction: P('publish') });
    expect(calls.find((c) => c.method === 'PATCH' && c.url.endsWith('/issues/7'))!.body).toEqual({ state: 'closed', labels: ['demo', 'review', 'publish'] });
    const taskUrl = `${BROKER}/entities/${encodeURIComponent(await taskEntityId(entityId, 'check', 'h-7'))}/attrs`;
    const task = calls.find((c) => c.url === taskUrl)!;
    expect(task.headers.get('content-type')).toBe('application/ld+json');
    expect(task.body).toMatchObject({
      '@context': ['https://datamodels.jp/context/task/v1.jsonld', 'https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld'],
      progress: P('completed'), statusLabel: P('publish'),
    });
    expect(task.body.completedAt.value['@value']).toMatch(/^\d{4}-\d\d-\d\dT/);
  });

  it('resolves the review even when the Task is missing or cannot be updated', async () => {
    for (const status of [404, 503]) {
      calls = [];
      await env.DEMO.put('issue:7', JSON.stringify({ decision, entity: entityId, action: 'review', corrections: [] }));
      const base = answer;
      answer = (c) => (c.url.includes('urn%3Angsi-ld%3ATask%3A') ? new Response(null, { status }) : base(c));
      expect((await signed(comment('/reject'))).status).toBe(200);
      expect(calls.find((c) => c.method === 'PATCH' && c.url.endsWith('/issues/7'))!.body).toEqual({ state: 'closed', labels: ['demo', 'review', 'reject'] });
      answer = base;
    }
  });

  it('sends corrections alone as feedback and keeps the issue open', async () => {
    await signed(comment('/danger yes'));
    expect(calls.find((c) => c.url.endsWith(`/v1/decisions/${decision}/feedback`))!.body).toEqual({ correct: { danger: true }, by: 'github:reviewer' });
    expect(calls.some((c) => c.url.endsWith('/resolve') || c.url.endsWith('/attrs/check'))).toBe(false);
    expect(calls.some((c) => c.method === 'PATCH' && c.url.endsWith('/issues/7'))).toBe(false);
  });

  it('answers people who may not review, and refuses bad signatures', async () => {
    await signed(comment('/publish', 'NONE'));
    expect(calls.filter((c) => c.url.startsWith('https://pointsman'))).toHaveLength(0);
    expect(calls.find((c) => c.url.endsWith('/issues/7/comments'))!.body.body).toMatch(/only members/);
    const res = await worker('/github/webhook', { method: 'POST', headers: { 'x-github-event': 'issue_comment', 'x-hub-signature-256': 'sha256=00' }, body: '{}' });
    expect(res.status).toBe(401);
  });
});

describe('cleanup', () => {
  it('deletes reports older than a day with their Decision entities, and closes their issues', async () => {
    const old = new Date(Date.now() - 25 * 3600_000).toISOString();
    answer = (c) => {
      if (c.method === 'GET' && c.url.includes('/entities?type=RoadRestriction')) {
        return Response.json([
          { id: 'urn:ngsi-ld:RoadRestriction:demo-old', type: 'RoadRestriction', createdAt: old, check: { type: 'Property', value: 'review', inputHash: P('h-old'), decision: { type: 'Relationship', object: 'urn:ngsi-ld:Decision:d-old' } },
            evacuation: { type: 'Property', value: 'alert', decision: { type: 'Relationship', object: 'urn:ngsi-ld:Decision:e-old' } } },
          { id: 'urn:ngsi-ld:RoadRestriction:demo-new', type: 'RoadRestriction', createdAt: new Date().toISOString() },
        ]);
      }
      if (c.method === 'DELETE') return new Response(null, { status: 204 });
      return undefined;
    };
    await env.DEMO.put('report:urn:ngsi-ld:RoadRestriction:demo-old', JSON.stringify({ prepared: 'vague', createdAt: old }));
    // The report's KV record may expire first: the issue keeps its own time.
    await env.DEMO.put('issue:9', JSON.stringify({ decision: 'd-old', entity: 'urn:ngsi-ld:RoadRestriction:demo-old', action: 'review', corrections: [], createdAt: old }));
    await env.DEMO.put('issue:10', JSON.stringify({ decision: 'd-new', entity: 'urn:ngsi-ld:RoadRestriction:demo-new', action: 'review', corrections: [], createdAt: new Date().toISOString() }));
    expect(await cleanup(env)).toEqual({ deleted: 1, closed: 1 });
    // Step 1's Decision and Task, step 2's Decision and Alert, then the report.
    expect(calls.filter((c) => c.method === 'DELETE').map((c) => decodeURIComponent(c.url.split('/entities/')[1]!))).toEqual(['urn:ngsi-ld:Decision:d-old', await taskEntityId('urn:ngsi-ld:RoadRestriction:demo-old', 'check', 'h-old'), 'urn:ngsi-ld:Decision:e-old', 'urn:ngsi-ld:Alert:demo-e-old', 'urn:ngsi-ld:RoadRestriction:demo-old']);
    expect(await env.DEMO.get('issue:9')).toBeNull();
    expect(await env.DEMO.get('issue:10')).not.toBeNull();
  });
});

describe('the chain (step 2)', () => {
  const location = { type: 'GeoProperty', value: { type: 'LineString', coordinates: [[139.7505, 35.7025], [139.7507, 35.7010]] } };
  const report = {
    id: 'urn:ngsi-ld:RoadRestriction:demo-00000000-0000-4000-8000-000000000002', type: 'RoadRestriction', roadName: P('飯田橋三丁目の橋'),
    description: P('倒木で道路がふさがれ、車も歩行者も通れない。'), location,
    check: { type: 'Property', value: 'urgent', decision: { type: 'Relationship', object: 'urn:ngsi-ld:Decision:22222222-2222-4222-8222-222222222222' } },
  };
  const step2 = (action: string) => ({
    decision_id: '33333333-3333-4333-8333-333333333333', action, profile: 'evacuation-access-check', profile_version: 1, model: 'clef-flash',
    created_at: '2026-10-07T01:00:05.000Z', rule: 0,
    answers: { foot_passable: { type: 'noul', value: false, p: 0.98, yes: 0.02 } },
    facts: {
      shelter: { missing: false, values: { found: true, distance_m: 443, name: '日本大学法学部①' }, source: 'GSI' },
      walk: { missing: false, values: { possible: true, extra_m: 316 }, source: 'OSM' },
    },
  });
  const FACTS = 'https://datamodels.jp/ns/decision/facts';
  const notify = (route = 'evacuation') => worker(`/notify?route=${route}`, { method: 'POST', headers: { 'x-bridge-secret': env.NOTIFY_SECRET, 'content-type': 'application/json' }, body: JSON.stringify({ type: 'Notification', data: [report] }) });

  function pointsmanSays(action: string) {
    answer = (c) => {
      if (c.url === 'https://pointsman.geolonia.workers.dev/v1/decide/evacuation-access-check') return Response.json(step2(action));
      if (c.method === 'GET' && c.url === `${BROKER}/entities/${encodeURIComponent(report.id)}`) return Response.json(report);
      if (c.method === 'GET' && c.url.startsWith(`${BROKER}/entities/${encodeURIComponent('urn:ngsi-ld:Decision:33333333')}`)) {
        return Response.json({ id: 'urn:ngsi-ld:Decision:33333333-3333-4333-8333-333333333333', type: 'Decision', [FACTS]: { type: 'JsonProperty', json: Object.entries(step2(action).facts).map(([name, f]) => ({ name, ...f })) } });
      }
      return undefined;
    };
  }

  it('decides with the second profile, links step 1, and raises an Alert for the site', async () => {
    pointsmanSays('alert');
    expect((await notify()).status).toBe(200);
    const decisionEntity = calls.find((c) => c.url === `${BROKER}/entities` && c.body?.type === 'Decision')!;
    expect(decisionEntity.body.wasInformedBy).toEqual({ type: 'Relationship', object: 'urn:ngsi-ld:Decision:22222222-2222-4222-8222-222222222222' });
    expect(calls.some((c) => c.method === 'PATCH' && c.url.endsWith('/attrs/evacuation'))).toBe(true);
    await vi.waitFor(() => expect(calls.some((c) => c.url === `${BROKER}/entities` && c.body?.type === 'Alert')).toBe(true));
    const alert = calls.find((c) => c.url === `${BROKER}/entities` && c.body?.type === 'Alert')!;
    expect(alert.headers.get('link')).toContain('https://smartdatamodels.org/context.jsonld');
    expect(alert.body).toMatchObject({
      id: 'urn:ngsi-ld:Alert:demo-33333333-3333-4333-8333-333333333333',
      category: P('traffic'), subCategory: P('roadClosed'), severity: P('high'),
      alertSource: { type: 'Relationship', object: 'urn:ngsi-ld:Decision:33333333-3333-4333-8333-333333333333' }, location,
    });
    expect(alert.body.description.value).toContain('日本大学法学部①');
    expect(alert.body.description.value).toContain('316 m');
    // Step 2 never opens GitHub issues.
    expect(calls.some((c) => c.url.startsWith('https://api.github.com/'))).toBe(false);
  });

  it('writes no Alert while the decision facts cannot be read', async () => {
    pointsmanSays('alert');
    const base = answer;
    // The Decision entity stays unreadable (404).
    answer = (c) => (c.method === 'GET' && c.url.includes(encodeURIComponent('urn:ngsi-ld:Decision:33333333')) ? new Response(null, { status: 404 }) : base(c));
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await notify()).status).toBe(200);
    await vi.waitFor(() => expect(errors).toHaveBeenCalledWith(expect.stringContaining('no alert written')), { timeout: 5000 });
    expect(calls.some((c) => c.body?.type === 'Alert')).toBe(false);
    // It tried three times.
    expect(calls.filter((c) => c.method === 'GET' && c.url.includes(encodeURIComponent('urn:ngsi-ld:Decision:33333333'))).length).toBe(3);
  });

  it('raises no Alert when step 2 says none', async () => {
    pointsmanSays('none');
    expect((await notify()).status).toBe(200);
    await new Promise((r) => setTimeout(r, 50));
    expect(calls.some((c) => c.body?.type === 'Alert')).toBe(false);
  });

  it('shows step 2 with the report: action, facts and the Alert', async () => {
    const decided = { ...report, evacuation: { type: 'Property', value: 'alert', observedAt: '2026-10-07T01:00:05Z', policyRule: P('0'), decision: { type: 'Relationship', object: 'urn:ngsi-ld:Decision:33333333-3333-4333-8333-333333333333' } } };
    answer = (c) => {
      if (c.method !== 'GET') return undefined;
      if (c.url.startsWith(`${BROKER}/entities/${encodeURIComponent(report.id)}`)) return Response.json(decided);
      if (c.url.startsWith(`${BROKER}/entities/${encodeURIComponent('urn:ngsi-ld:Decision:33333333')}`)) {
        return Response.json({ id: 'urn:ngsi-ld:Decision:33333333-3333-4333-8333-333333333333', type: 'Decision', [FACTS]: { type: 'JsonProperty', json: [{ name: 'walk', missing: false, values: { possible: true, extra_m: 316 }, source: 'OSM' }] } });
      }
      if (c.url.startsWith(`${BROKER}/entities/${encodeURIComponent('urn:ngsi-ld:Alert:demo-33333333')}`)) return Response.json({ id: 'urn:ngsi-ld:Alert:demo-33333333-3333-4333-8333-333333333333', type: 'Alert' });
      if (c.url.startsWith(`${BROKER}/entities/`)) return new Response(null, { status: 404 });
      return undefined;
    };
    const r = await (await worker(`/api/reports/${encodeURIComponent(report.id)}`, { headers: { origin: PAGE } })).json<any>();
    expect(r.evacuation).toMatchObject({ action: 'alert', decidedAt: '2026-10-07T01:00:05Z', policyRule: '0', facts: [{ name: 'walk', values: { extra_m: 316 } }] });
    expect(r.evacuation.ngsi.alert.type).toBe('Alert');
  });
});

