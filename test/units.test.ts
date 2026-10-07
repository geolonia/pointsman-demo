// Pure parts: reports, review commands, GitHub signatures, the page summary.

import { describe, expect, it } from 'vitest';
import { appJwt, verifyWebhook } from '../src/github';
import { summarize } from '../src/index';
import { AREA, PREPARED, parseReport, toEntity } from '../src/reports';
import { mayReview, parseCommand } from '../src/review';

describe('reports', () => {
  const free = { roadName: '靖国通り', status: 'closed', description: '冠水のため通行止め', location: { type: 'Point', coordinates: [139.75, 35.69] } };

  it('accepts prepared reports by id and language', () => {
    expect(parseReport({ prepared: 'car-trapped', lang: 'en' })).toEqual({ prepared: 'car-trapped', lang: 'en' });
    expect(parseReport({ prepared: 'nope', lang: 'en' })).toMatch(/unknown/);
    expect(parseReport({ prepared: 'car-trapped', lang: 'de' })).toMatch(/lang/);
  });

  it('accepts free text inside the area, within limits', () => {
    expect(parseReport(free)).toEqual(free);
    expect(parseReport({ ...free, status: 'gone' })).toMatch(/status/);
    expect(parseReport({ ...free, description: 'x' })).toMatch(/description/);
    expect(parseReport({ ...free, description: 'x'.repeat(301) })).toMatch(/description/);
    expect(parseReport({ ...free, roadName: 'x'.repeat(61) })).toMatch(/roadName/);
    expect(parseReport({ ...free, location: { type: 'Point', coordinates: [135.5, 34.7] } })).toMatch(/demo area/);
    expect(parseReport({ ...free, location: { type: 'Polygon', coordinates: [] } })).toMatch(/Point or LineString/);
    const long = Array.from({ length: 21 }, (_, i) => [139.73 + i * 0.001, 35.69]);
    expect(parseReport({ ...free, location: { type: 'LineString', coordinates: long } })).toMatch(/2 to 20/);
  });

  it('keeps every prepared report inside the area', () => {
    const points = PREPARED.flatMap((p) => (p.location.type === 'Point' ? [p.location.coordinates] : p.location.coordinates));
    for (const [x, y] of points) expect(x >= AREA.west && x <= AREA.east && y >= AREA.south && y <= AREA.north).toBe(true);
  });

  it('makes a RoadRestriction entity in the datamodels.jp shape', () => {
    const { entity, prepared } = toEntity({ prepared: 'water-pipe-works', lang: 'ja' }, new Date('2026-10-07T00:00:00Z'));
    expect(prepared).toBe('water-pipe-works');
    expect(entity.id).toMatch(/^urn:ngsi-ld:RoadRestriction:demo-[0-9a-f-]{36}$/);
    expect(entity).toMatchObject({
      type: 'RoadRestriction',
      roadName: { type: 'Property', value: '白山通り' },
      restrictionStatus: { type: 'Property', value: 'limited' },
      statusLabel: { type: 'Property', value: '車線規制' },
      location: { type: 'GeoProperty', value: { type: 'LineString' } },
      validFrom: { type: 'Property', value: { '@type': 'DateTime', '@value': '2026-10-07T00:00:00.000Z' } },
    });
    // Free text: the road name is always present, empty when not given.
    const { entity: e2, prepared: p2 } = toEntity({ roadName: '', status: 'closed', description: 'blocked road', location: { type: 'Point', coordinates: [139.75, 35.69] } });
    expect(p2).toBeUndefined();
    expect(e2.roadName).toEqual({ type: 'Property', value: '' });
    expect(e2).not.toHaveProperty('statusLabel');
  });
});

describe('review commands', () => {
  it('reads final actions and corrections', () => {
    expect(parseCommand('Looks fine.\n/publish\n/category laneRestriction')).toEqual({ final: 'publish', correct: { category: 'laneRestriction' } });
    expect(parseCommand('/danger no')).toEqual({ correct: { danger: false } });
    expect(parseCommand('/reject')).toEqual({ final: 'reject', correct: {} });
    expect(parseCommand('no commands here')).toBeNull();
  });

  it('refuses what it does not understand', () => {
    expect(parseCommand('/publish\n/reject')).toMatch(/both/);
    expect(parseCommand('/category roads')).toMatch(/needs one of/);
    expect(parseCommand('/danger maybe')).toMatch(/yes or no/);
    expect(parseCommand('/publish now')).toMatch(/no value/);
    expect(parseCommand('/delete')).toMatch(/unknown command/);
  });

  it('lets only members and collaborators review', () => {
    for (const a of ['OWNER', 'MEMBER', 'COLLABORATOR']) expect(mayReview(a)).toBe(true);
    for (const a of ['CONTRIBUTOR', 'NONE', 'FIRST_TIMER', undefined]) expect(mayReview(a)).toBe(false);
  });
});

describe('GitHub', () => {
  it('verifies webhook signatures', async () => {
    const secret = crypto.randomUUID();
    const body = '{"action":"created"}';
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac = [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)))].map((b) => b.toString(16).padStart(2, '0')).join('');
    expect(await verifyWebhook(secret, body, `sha256=${mac}`)).toBe(true);
    expect(await verifyWebhook(secret, `${body} `, `sha256=${mac}`)).toBe(false);
    expect(await verifyWebhook(secret, body, null)).toBe(false);
    expect(await verifyWebhook(secret, body, 'sha256=zz')).toBe(false);
  });

  it('signs an app JWT that the public key verifies', async () => {
    const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']) as CryptoKeyPair;
    const der = new Uint8Array(await crypto.subtle.exportKey('pkcs8', pair.privateKey) as ArrayBuffer);
    const label = ['PRIVATE', 'KEY'].join(' '); // no key-shaped literal in the repository
    const pem = `-----BEGIN ${label}-----\n${btoa(String.fromCharCode(...der))}\n-----END ${label}-----\n`;
    const jwt = await appJwt('5219531', pem, Date.parse('2026-10-07T00:00:00Z'));
    const [h, p, s] = jwt.split('.');
    const unb64 = (x: string) => Uint8Array.from(atob(x.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
    expect(JSON.parse(new TextDecoder().decode(unb64(p!)))).toEqual({ iat: 1791331140, exp: 1791331680, iss: '5219531' });
    expect(await crypto.subtle.verify('RSASSA-PKCS1-v1_5', pair.publicKey, unb64(s!), new TextEncoder().encode(`${h}.${p}`))).toBe(true);
    // A PKCS#1 header, put together at run time (no key-shaped literal in the repository).
    const pkcs1 = ['BEGIN', 'END'].map((w) => `-----${w} RSA PRIVATE KEY-----`).join('\nAAAA\n');
    await expect(appJwt('1', pkcs1)).rejects.toThrow(/PKCS#8/);
  });
});

describe('summary for the page', () => {
  const P = (value: unknown) => ({ type: 'Property', value });
  const entity = {
    id: 'urn:ngsi-ld:RoadRestriction:demo-1',
    type: 'RoadRestriction',
    createdAt: '2026-10-07T01:00:00Z',
    roadName: P('内堀通り'),
    restrictionStatus: P('closed'),
    description: P('片側交互通行で通れる'),
    location: { type: 'GeoProperty', value: { type: 'Point', coordinates: [139.753, 35.6855] } },
    check: {
      type: 'Property', value: 'review', observedAt: '2026-10-07T01:00:01Z',
      decisionId: P('d-1'), decision: { type: 'Relationship', object: 'urn:ngsi-ld:Decision:d-1' },
      profile: P('road-restriction-check'), profileVersion: P(1), policyRule: P('default'), model: P('clef-flash'), inputHash: P('h'),
      category: P('alternatingOneWay'), categoryProbability: P(0.85),
      status_matches: P(false), status_matchesProbability: P(0.95),
    },
  };

  it('lists the answers and the outcome', () => {
    const s = summarize(entity);
    expect(s).toMatchObject({ roadName: '内堀通り', status: 'closed', published: false, createdAt: '2026-10-07T01:00:00Z' });
    expect(s.check).toEqual({
      action: 'review', decidedAt: '2026-10-07T01:00:01Z', policyRule: 'default', decision: 'urn:ngsi-ld:Decision:d-1',
      answers: { category: { value: 'alternatingOneWay', p: 0.85 }, status_matches: { value: false, p: 0.95 } },
    });
  });

  it('is published after /publish, or when Pointsman said publish', () => {
    expect(summarize({ ...entity, check: { ...entity.check, finalAction: P('publish'), reviewedAt: P('2026-10-07T01:05:00Z') } }).published).toBe(true);
    expect(summarize({ ...entity, check: { ...entity.check, value: 'publish' } }).published).toBe(true);
    expect(summarize({ ...entity, check: { ...entity.check, value: 'publish', finalAction: P('reject') } }).published).toBe(false);
    expect(summarize({ ...entity, check: undefined }).published).toBe(false);
  });
});

describe('the default fetch', () => {
  // The Worker tests replace the global fetch with a mock, which hides the
  // "Illegal invocation" error of an unbound fetch. This calls the real one.
  it('works when called through the classes', async () => {
    const { Broker } = await import('../src/broker');
    const { GitHub } = await import('../src/github');
    const env = { BROKER_URL: 'http://127.0.0.1:9', BROKER_API_KEY: 'k', BROKER_TENANT: 't', GITHUB_REPOSITORY: 'o/r' } as never;
    // Connection refused is fine; "Illegal invocation" is not.
    await expect(new Broker(env).listRoadRestrictions()).rejects.not.toThrow(/Illegal invocation/);
    const gh = new GitHub(env) as unknown as { fetchFn: typeof fetch };
    await expect(gh.fetchFn('http://127.0.0.1:9')).rejects.not.toThrow(/Illegal invocation/);
  });
});

describe('listing reports', () => {
  it('pages through all of them, newest first', async () => {
    const { Broker } = await import('../src/broker');
    const offsets: number[] = [];
    const fakeFetch = (async (input: RequestInfo | URL) => {
      const u = new URL(String(input));
      const offset = Number(u.searchParams.get('offset'));
      offsets.push(offset);
      const n = offset === 0 ? 1000 : 5; // a full page, then the rest
      return Response.json(Array.from({ length: n }, (_, i) => ({ id: `r${offset + i}`, type: 'RoadRestriction', createdAt: new Date(Date.UTC(2026, 9, 7) + (offset + i) * 1000).toISOString() })));
    }) as typeof fetch;
    const env = { BROKER_URL: 'https://broker.test', BROKER_API_KEY: 'k', BROKER_TENANT: 't' } as never;
    const list = await new Broker(env, fakeFetch).listRoadRestrictions();
    expect(offsets).toEqual([0, 1000]);
    expect(list).toHaveLength(1005);
    expect(list[0]!.id).toBe('r1004');
  });
});

describe('listing pending decisions', () => {
  it('pages through all of them', async () => {
    const { Broker } = await import('../src/broker');
    const offsets: number[] = [];
    const fakeFetch = (async (input: RequestInfo | URL) => {
      const u = new URL(String(input));
      const offset = Number(u.searchParams.get('offset') ?? 0);
      offsets.push(offset);
      expect(u.searchParams.get('q')).toBe('reviewStatus=="pending"');
      const n = offset === 0 ? 1000 : 3; // a full page, then the rest
      return Response.json(Array.from({ length: n }, (_, i) => ({ id: `urn:ngsi-ld:Decision:d${offset + i}`, type: 'Decision' })));
    }) as typeof fetch;
    const env = { BROKER_URL: 'https://broker.test', BROKER_API_KEY: 'k', BROKER_TENANT: 't' } as never;
    const { pages, decisions, query } = await new Broker(env, fakeFetch).listPendingDecisions('https://demo.test/context/decision.jsonld');
    expect(offsets).toEqual([0, 1000]);
    expect(pages).toBe(2);
    expect(decisions).toHaveLength(1003);
    expect(query).not.toContain('offset');
  });
});
