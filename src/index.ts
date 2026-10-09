// The demo Worker: the page's API, the FIWARE bridge on /notify, the GitHub
// review queue, and the daily cleanup. See README.md.

import { type BridgeConfig, DECISION_CONTEXT, type Route, decisionEntityId, handleRequest, taskEntityId } from '../engine/bridge/src/bridge';
import { Broker, type Entity, TRANSPORTATION_CONTEXT } from './broker';
import { type Env, checkEnv, trimUrl } from './env';
import { GitHub, type Issue, verifyWebhook } from './github';
import { fetchWithAgent } from './http';
import { AREA, PREPARED, parseReport, toEntity } from './reports';
import { mayReview, parseCommand } from './review';

const PROFILE = 'road-restriction-check';
/** Actions a person looks at; they become issues (prepared reports only). */
const PERSON_ACTIONS = ['review', 'urgent'];
const ROUTE: Route = {
  type: 'RoadRestriction',
  profile: PROFILE,
  inputs: ['roadName', 'restrictionStatus', 'statusLabel', 'description'],
  attribute: 'check',
  decisionEntity: true,
  reviewActions: PERSON_ACTIONS,
  // A Task (datamodels.jp) for the same reports that get an issue (pointsman#81).
  task: { actions: PERSON_ACTIONS, name: 'roadName', priority: { urgent: 1, review: 5 } },
};
/**
 * Step 2 of the chain (pointsman#66): for reports that step 1 decided
 * urgent or review (the subscription's q), does the closure cut people off
 * from their evacuation site? An alert creates an Alert entity.
 */
const EVACUATION_ROUTE: Route = {
  type: 'RoadRestriction',
  profile: 'evacuation-access-check',
  inputs: ['description', 'check'],
  attribute: 'evacuation',
  decisionEntity: true,
  reviewActions: ['review'],
  name: 'evacuation',
  informedBy: 'check',
};
const alertId = (decision: string) => `urn:ngsi-ld:Alert:demo-${decision}`;
/** Demo data lives this long. */
const KEEP_MS = 24 * 3600_000;
const KV_TTL = 2 * 24 * 3600;

interface ReportRecord { prepared?: string; createdAt: string }
interface IssueRecord { decision: string; entity: string; action: string; corrections: Correction[]; createdAt: string }
interface Correction { name: string; value: string | boolean; by: string; at: string }

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      checkEnv(env);
    } catch (err) {
      console.error(`configuration: ${(err as Error).message}`);
      return json({ error: 'the demo is not configured' }, 500);
    }
    const url = new URL(request.url);
    try {
      if (url.pathname === '/notify') return await notify(request, env, ctx);
      if (url.pathname === '/github/webhook' && request.method === 'POST') return await webhook(request, env);
      if (url.pathname.startsWith('/api/')) return await api(request, url, env, ctx);
      // The page and its files (wrangler.jsonc "assets").
      return env.ASSETS.fetch(request);
    } catch (err) {
      console.error(`${request.method} ${url.pathname}: ${(err as Error).message}`);
      return json({ error: 'something went wrong' }, 502);
    }
  },

  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    checkEnv(env);
    await cleanup(env);
  },
} satisfies ExportedHandler<Env>;

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers });
}

// --- The bridge -------------------------------------------------------------

function bridgeConfig(env: Env): BridgeConfig {
  return {
    routes: [ROUTE, EVACUATION_ROUTE],
    notifySecret: env.NOTIFY_SECRET,
    pointsman: { url: trimUrl(env.POINTSMAN_URL), token: env.POINTSMAN_TOKEN },
    broker: { url: trimUrl(env.BROKER_URL), apiKey: env.BROKER_API_KEY, tenant: env.BROKER_TENANT, context: TRANSPORTATION_CONTEXT },
    fetch: fetchWithAgent,
  };
}

async function notify(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const response = await handleRequest(request, bridgeConfig(env));
  if (response.status === 200 || response.status === 502) {
    const { handled } = (await response.clone().json()) as { handled: { id: string; action?: string; decision?: string }[] };
    // Issues after the answer, so the broker is not kept waiting.
    if (new URL(request.url).searchParams.get('route') === EVACUATION_ROUTE.name) {
      // Step 2: alerts for the evacuation sites' staff, nothing for GitHub.
      const alerts = handled.filter((h) => h.action === 'alert' && h.decision);
      if (alerts.length) ctx.waitUntil(Promise.all(alerts.map((h) => createAlert(env, h.id, h.decision!).catch((err) => console.error(`alert for ${h.decision}: ${(err as Error).message}`)))));
      return response;
    }
    const forPeople = handled.filter((h) => h.action && h.decision && PERSON_ACTIONS.includes(h.action));
    if (forPeople.length) ctx.waitUntil(Promise.all(forPeople.map((h) => openIssue(env, h.id, h.decision!, h.action!).catch((err) => console.error(`issue for ${h.decision}: ${(err as Error).message}`)))));
  }
  return response;
}

/**
 * An Alert (Smart Data Models) for the staff of the evacuation site: where
 * the road is closed, which site, how much longer the way on foot is, and
 * the decision that raised it.
 */
async function createAlert(env: Env, entityId: string, decision: string, attempts = 3, pauseMs = 1000): Promise<void> {
  const broker = new Broker(env);
  // The Alert is written once (a later retry gets 409), so it waits for the
  // complete facts: the Decision entity may not be readable at once.
  let entity: Entity | null = null;
  let site: Record<string, unknown> | undefined;
  let walk: Record<string, unknown> | undefined;
  for (let i = 0; i < attempts; i++) {
    if (i > 0) await new Promise((r) => setTimeout(r, pauseMs));
    const [e, decided] = await Promise.all([broker.getRoadRestriction(entityId, { sysAttrs: false }), broker.getDecision(decisionEntityId(decision))]);
    const facts = factsOf(decided);
    const fact = (name: string) => (facts.find((f) => f.name === name && !f.missing) as { values: Record<string, unknown> } | undefined)?.values;
    entity = e;
    site = fact('shelter');
    walk = fact('walk');
    if (entity && typeof site?.name === 'string' && typeof site.distance_m === 'number' && typeof walk?.extra_m === 'number') break;
  }
  if (!entity) throw new Error('report not found in the broker');
  if (typeof site?.name !== 'string' || typeof site.distance_m !== 'number' || typeof walk?.extra_m !== 'number') throw new Error('decision facts not readable: no alert written');
  const P = (value: unknown) => ({ type: 'Property', value });
  const description = [
    `Road closed near the evacuation site ${site.name} (${site.distance_m} m).`,
    `On foot, the closed section cannot be passed; the way around is ${walk.extra_m} m longer.`,
    String((entity.description as { value?: unknown } | undefined)?.value ?? ''),
  ].join(' ');
  await broker.createAlert({
    id: alertId(decision),
    type: 'Alert',
    category: P('traffic'),
    subCategory: P('roadClosed'),
    severity: P('high'),
    description: P(description),
    location: entity.location,
    dateIssued: P({ '@type': 'DateTime', '@value': new Date().toISOString() }),
    // A Relationship in the Smart Data Models Alert: the decision that raised it.
    alertSource: { type: 'Relationship', object: decisionEntityId(decision) },
  });
}

async function openIssue(env: Env, entityId: string, decision: string, action: string): Promise<void> {
  const report = await env.DEMO.get<ReportRecord>(`report:${entityId}`, 'json');
  // Free text from visitors never goes to GitHub: only prepared reports.
  if (!report?.prepared) return;
  // A retried notification must not open a second issue.
  // Workers KV takes one write per second per key, so the in-flight marker and
  // the final record are different keys, each written once.
  const [opened, inFlight] = await Promise.all([env.DEMO.get(`decision-issue:${decision}`), env.DEMO.get(`decision-pending:${decision}`)]);
  if (opened || inFlight) return;
  // Short-lived (60 s is the KV minimum): only guards against parallel retries.
  await env.DEMO.put(`decision-pending:${decision}`, '1', { expirationTtl: 60 });
  let issue: Issue;
  try {
    issue = await createIssueFor(env, entityId, decision, action);
  } catch (err) {
    // No issue was created: let a retried notification try again (if this
    // delete is refused, the marker expires within a minute anyway).
    await env.DEMO.delete(`decision-pending:${decision}`).catch(() => {});
    throw err;
  }
  // The issue exists now: keep the marker even if a write below fails, so a
  // retry never opens a second issue for the same decision.
  const record: IssueRecord = { decision, entity: entityId, action, corrections: [], createdAt: new Date().toISOString() };
  await env.DEMO.put(`decision-issue:${decision}`, String(issue.number), { expirationTtl: KV_TTL });
  await env.DEMO.put(`issue:${issue.number}`, JSON.stringify(record), { expirationTtl: KV_TTL });
}

async function createIssueFor(env: Env, entityId: string, decision: string, action: string): Promise<Issue> {
  const entity = await new Broker(env).getRoadRestriction(entityId);
  if (!entity) throw new Error('report not found in the broker');
  const r = summarize(entity);
  const answers = Object.entries(r.check?.answers ?? {})
    .map(([name, a]) => `| ${name} | \`${String(a.value)}\` | ${a.p === undefined ? '' : a.p.toFixed(2)} |`).join('\n');
  const body = [
    `**${action === 'urgent' ? 'Urgent: someone may be in danger.' : 'Needs a check before it is published.'}**`,
    '',
    `> ${r.description}`,
    '',
    `Road: ${r.roadName || '(not given)'} · status: \`${r.status}\` · rule: \`${r.check?.policyRule ?? '?'}\``,
    '',
    '| Question | Answer | Probability |',
    '|---|---|---|',
    answers,
    '',
    'Resolve it with a comment (members of this repository): `/publish` or `/reject`, and optionally correct answers, for example `/category laneRestriction` or `/danger no`.',
    '',
    'This is demo data, deleted after a day.',
    '',
    `<!-- decision: ${decision} entity: ${entityId} -->`,
  ].join('\n');
  const title = `[${action}] ${r.roadName || 'Report'}: ${r.description.slice(0, 60)}${r.description.length > 60 ? '…' : ''}`;
  return new GitHub(env).createIssue(title, body, ['demo', action]);
}

// --- Reviews from GitHub -----------------------------------------------------

async function webhook(request: Request, env: Env): Promise<Response> {
  const body = await request.text();
  if (!(await verifyWebhook(env.GITHUB_WEBHOOK_SECRET, body, request.headers.get('x-hub-signature-256')))) {
    return json({ error: 'bad signature' }, 401);
  }
  if (request.headers.get('x-github-event') !== 'issue_comment') return json({ ignored: 'event' });
  const p = JSON.parse(body) as {
    action: string;
    issue: { number: number; state: string };
    comment: { body: string; user: { login: string; type: string }; author_association: string };
  };
  if (p.action !== 'created' || p.comment.user.type === 'Bot' || p.issue.state !== 'open') return json({ ignored: 'comment' });
  const command = parseCommand(p.comment.body);
  if (command === null) return json({ ignored: 'no command' });
  const github = new GitHub(env);
  if (!mayReview(p.comment.author_association)) {
    await github.comment(p.issue.number, `@${p.comment.user.login} only members of this repository can review demo reports.`);
    return json({ ignored: 'not a reviewer' });
  }
  if (typeof command === 'string') {
    await github.comment(p.issue.number, `Not understood: ${command}.`);
    return json({ error: command }, 200);
  }
  const record = await env.DEMO.get<IssueRecord>(`issue:${p.issue.number}`, 'json');
  if (!record) {
    await github.comment(p.issue.number, 'This report is no longer in the demo (deleted after a day).');
    return json({ ignored: 'unknown issue' });
  }

  const by = `github:${p.comment.user.login}`;
  const now = new Date().toISOString();
  const pointsman = (path: string, payload: unknown) => fetchWithAgent(`${trimUrl(env.POINTSMAN_URL)}${path}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.POINTSMAN_TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const hasCorrections = Object.keys(command.correct).length > 0;
  // Pointsman queues only `review` decisions; for the others the final action
  // is recorded in the broker, and corrections go in as feedback.
  const res = command.final && record.action === 'review'
    ? await pointsman(`/v1/reviews/${record.decision}/resolve`, { action: command.final, correct: command.correct, by })
    : hasCorrections ? await pointsman(`/v1/decisions/${record.decision}/feedback`, { correct: command.correct, by }) : null;
  if (res && !res.ok) {
    await github.comment(p.issue.number, `Pointsman refused this (${res.status}); nothing was changed.`);
    return json({ error: `pointsman ${res.status}` }, 200);
  }

  record.corrections.push(...Object.entries(command.correct).map(([name, value]) => ({ name, value, by, at: now })));
  const broker = new Broker(env);
  await broker.updateDecision(decisionEntityId(record.decision), {
    ...(record.corrections.length > 0 && { corrections: { type: 'JsonProperty', json: record.corrections } }),
    ...(command.final && {
      reviewStatus: { type: 'Property', value: 'resolved' },
      finalAction: { type: 'Property', value: command.final },
      reviewedBy: { type: 'Property', value: by },
      reviewedAt: { type: 'Property', value: { '@type': 'DateTime', '@value': now } },
    }),
  });
  if (command.final) {
    const entity = await broker.getRoadRestriction(record.entity, { sysAttrs: false });
    // The person's work is done, whichever way they decided. Best effort: the
    // review itself is resolved, and reports from before Tasks have none.
    const taskId = entity && await taskIdOf(entity);
    if (taskId) {
      await broker.updateTask(taskId, {
        progress: { type: 'Property', value: 'completed' },
        statusLabel: { type: 'Property', value: command.final },
        completedAt: { type: 'Property', value: { '@type': 'DateTime', '@value': now } },
      }).catch((err) => console.error(`task for ${record.decision}: ${(err as Error).message}`));
    }
    // The page reads the outcome from the report's check property.
    const check = entity?.check as Record<string, unknown> | undefined;
    if (check) {
      await broker.writeAttribute(record.entity, 'check', {
        ...check,
        finalAction: { type: 'Property', value: command.final },
        reviewedAt: { type: 'Property', value: now },
      });
    }
  }
  await env.DEMO.put(`issue:${p.issue.number}`, JSON.stringify(record), { expirationTtl: KV_TTL });

  const corrected = Object.entries(command.correct).map(([k, v]) => `\`${k}\` → \`${String(v)}\``).join(', ');
  if (command.final) {
    await github.comment(p.issue.number, `Resolved by @${p.comment.user.login}: **${command.final}**${corrected ? `, corrected ${corrected}` : ''}. Sent to Pointsman and written to the broker.`);
    await github.close(p.issue.number, ['demo', record.action, command.final]);
  } else {
    await github.comment(p.issue.number, `Feedback recorded: ${corrected}. Resolve with /publish or /reject.`);
  }
  return json({ ok: true });
}

// --- The page's API ------------------------------------------------------------

function corsHeaders(request: Request, env: Env): Record<string, string> | null {
  const origin = request.headers.get('origin');
  const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  if (!origin) return {};
  if (!allowed.includes(origin)) return null;
  return { 'access-control-allow-origin': origin, vary: 'origin' };
}

async function api(request: Request, url: URL, env: Env, ctx: ExecutionContext): Promise<Response> {
  const cors = corsHeaders(request, env);
  if (!cors) return json({ error: 'origin not allowed' }, 403);
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { ...cors, 'access-control-allow-methods': 'GET, POST', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400' } });
  }
  const today = new Date().toISOString().slice(0, 10);
  const used = Number(await env.DEMO.get(`day:${today}`)) || 0;
  const limit = Number(env.DAILY_LIMIT);

  if (url.pathname === '/api/config' && request.method === 'GET') {
    return json({
      prepared: PREPARED,
      area: AREA,
      freeText: Boolean(env.TURNSTILE_SECRET && env.TURNSTILE_SITE_KEY),
      turnstileSiteKey: env.TURNSTILE_SITE_KEY ?? null,
      today: { used, limit },
    }, 200, cors);
  }

  if (url.pathname === '/api/reports' && request.method === 'GET') {
    // Many pages poll this: a few seconds of cache keep the broker calm.
    const key = new Request(new URL('/api/reports', url).toString());
    const hit = await caches.default.match(key);
    if (hit) return new Response(hit.body, { headers: { ...Object.fromEntries(hit.headers), ...cors } });
    const list = (await new Broker(env).listRoadRestrictions()).map(summarize);
    const res = json({ reports: list }, 200, { 'cache-control': 'max-age=3' });
    ctx.waitUntil(caches.default.put(key, res.clone()));
    return new Response(res.body, { headers: { ...Object.fromEntries(res.headers), ...cors } });
  }

  if (url.pathname === '/api/decisions' && request.method === 'GET') {
    const key = new Request(new URL('/api/decisions', url).toString());
    const hit = await caches.default.match(key);
    if (hit) return new Response(hit.body, { headers: { ...Object.fromEntries(hit.headers), ...cors } });
    const res = json(await pendingDecisions(env), 200, { 'cache-control': 'max-age=3' });
    ctx.waitUntil(caches.default.put(key, res.clone()));
    return new Response(res.body, { headers: { ...Object.fromEntries(res.headers), ...cors } });
  }

  // Browsers send the id percent-encoded (urn%3Angsi-ld%3A…).
  let path = url.pathname;
  try { path = decodeURIComponent(path); } catch { /* malformed: no match below */ }
  const one = path.match(/^\/api\/reports\/(urn:ngsi-ld:RoadRestriction:demo-[0-9a-f-]{36})$/);
  if (one && request.method === 'GET') {
    // The summary for the page, and the real NGSI-LD data for developers.
    const broker = new Broker(env);
    const entity = await broker.getRoadRestriction(one[1]!);
    if (!entity) return json({ error: 'not found' }, 404, cors);
    const summary = summarize(entity);
    const decisionId = summary.check?.decision;
    const [decisionEntity, issueNumber, report] = await Promise.all([
      decisionId ? broker.getDecision(decisionId) : null,
      decisionId ? env.DEMO.get(`decision-issue:${decisionId.split(':').pop()}`) : null,
      env.DEMO.get<ReportRecord>(`report:${entity.id}`, 'json'),
    ]);
    const issue = issueNumber && /^\d+$/.test(issueNumber) ? `https://github.com/${env.GITHUB_REPOSITORY}/issues/${issueNumber}` : null;
    const [evacuation, task] = await Promise.all([
      evacuationOf(broker, entity),
      // Extra data for developers: the page still works without it.
      PERSON_ACTIONS.includes(summary.check?.action ?? '') ? taskIdOf(entity).then((id) => (id ? broker.getEntity(id) : null)).catch(() => null) : null,
    ]);
    // Only prepared reports go to the GitHub queue; the page says so.
    return json({ ...summary, prepared: Boolean(report?.prepared), issue, facts: factsOf(decisionEntity), evacuation, ngsi: { entity, decision: decisionEntity, task } }, 200, cors);
  }

  if (url.pathname === '/api/reports' && request.method === 'POST') {
    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
    if (!(await env.REPORT_LIMIT.limit({ key: ip })).success) return json({ error: 'too many reports, try again in a minute' }, 429, cors);
    if (used >= limit) return json({ error: 'the demo has reached its limit for today', today: { used, limit } }, 429, cors);
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return json({ error: 'body must be JSON' }, 400, cors);
    }
    const { turnstile, ...body } = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const input = parseReport(body);
    if (typeof input === 'string') return json({ error: input }, 400, cors);
    if (!('prepared' in input)) {
      if (!env.TURNSTILE_SECRET) return json({ error: 'only prepared reports in this demo' }, 403, cors);
      if (!(await turnstileOk(env.TURNSTILE_SECRET, turnstile, ip))) return json({ error: 'please confirm you are human' }, 403, cors);
    }
    const { entity, prepared } = toEntity(input);
    const record: ReportRecord = { ...(prepared && { prepared }), createdAt: new Date().toISOString() };
    // Before the entity: the notification may arrive before this call returns.
    await env.DEMO.put(`report:${entity.id}`, JSON.stringify(record), { expirationTtl: KV_TTL });
    await new Broker(env).createRoadRestriction(entity);
    // Counted once the broker has the report (each one is a Pointsman call).
    // Best effort: KV is eventually consistent and takes one write per second
    // per key, so at busy moments a count is lost; the ceiling is approximate,
    // and an accepted report must never answer with an error.
    ctx.waitUntil(env.DEMO.put(`day:${today}`, String(used + 1), { expirationTtl: KV_TTL })
      .catch((err) => console.error(`daily count: ${(err as Error).message}`)));
    return json({ id: entity.id }, 201, cors);
  }

  return json({ error: 'not found' }, 404, cors);
}

async function turnstileOk(secret: string, token: unknown, ip: string): Promise<boolean> {
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) return false;
  const res = await fetchWithAgent('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: new URLSearchParams({ secret, response: token, remoteip: ip }),
  });
  return res.ok && ((await res.json()) as { success?: boolean }).success === true;
}

// --- Decisions across entities ----------------------------------------------------

export interface PendingDecision {
  id: string;
  /** The entity the decision is about. */
  refersTo?: string;
  action?: string;
  decidedAt?: string;
  issue: string | null;
}

/** At most this many are listed (newest first); each needs a KV read for its issue. */
const PENDING_SHOWN = 50;

/**
 * Decisions waiting for a person, with the NGSI-LD request that found them
 * (the first page; `pages` says how many pages it took).
 */
async function pendingDecisions(env: Env): Promise<{ request: { method: 'GET'; url: string; tenant: string; link: string; pages: number }; total: number; decisions: PendingDecision[] }> {
  // The published Decision context (datamodels.jp): the broker reads the
  // short names in the query (Decision, reviewStatus) from it.
  const contextUrl = DECISION_CONTEXT;
  const { query, pages, decisions } = await new Broker(env).listPendingDecisions(contextUrl);
  const shown = decisions.map(pendingOf).sort((a, b) => (b.decidedAt ?? '').localeCompare(a.decidedAt ?? '')).slice(0, PENDING_SHOWN);
  await Promise.all(shown.map(async (d) => {
    const n = await env.DEMO.get(`decision-issue:${d.id.split(':').pop()}`);
    d.issue = n && /^\d+$/.test(n) ? `https://github.com/${env.GITHUB_REPOSITORY}/issues/${n}` : null;
  }));
  return {
    request: { method: 'GET', url: `${trimUrl(env.BROKER_URL)}/ngsi-ld/v1${query}`, tenant: env.BROKER_TENANT, link: contextUrl, pages },
    total: decisions.length,
    decisions: shown,
  };
}

/** Accepts a DateTime value as a string or as {"@type": "DateTime", "@value": …}. */
const dateOf = (v: unknown) => (typeof v === 'string' ? v : typeof (v as { '@value'?: unknown })?.['@value'] === 'string' ? (v as { '@value': string })['@value'] : undefined);

export function pendingOf(e: Entity): PendingDecision {
  const refersTo = (e.refersTo as Attr | undefined)?.object;
  const action = val(e.action);
  const decidedAt = dateOf(val(e.decidedAt));
  return {
    id: e.id,
    ...(typeof refersTo === 'string' && { refersTo }),
    ...(typeof action === 'string' && { action }),
    ...(decidedAt && { decidedAt }),
    issue: null,
  };
}

// --- Shapes for the page ---------------------------------------------------------

/**
 * The report's Task (pointsman#81). The bridge makes its id from the report,
 * the result attribute and the input hash, so a retried notification finds
 * the same Task; the hash is in the check property.
 */
async function taskIdOf(e: Entity): Promise<string | null> {
  const hash = val((e.check as Attr | undefined)?.inputHash);
  return typeof hash === 'string' ? taskEntityId(e.id, ROUTE.attribute, hash) : null;
}

/** Step 2 of the chain for the page: its action, facts, Alert and NGSI-LD data; null before it ran. */
async function evacuationOf(broker: Broker, entity: Entity) {
  const attr = entity.evacuation as Attr | undefined;
  if (!attr || typeof attr.value !== 'string') return null;
  const decision = (attr.decision as Attr | undefined)?.object;
  const decisionEntity = typeof decision === 'string' ? await broker.getDecision(decision) : null;
  const alert = attr.value === 'alert' && typeof decision === 'string' ? await broker.getEntity(alertId(decision.split(':').pop()!)) : null;
  return {
    action: attr.value,
    ...(typeof attr.observedAt === 'string' && { decidedAt: attr.observedAt }),
    ...(typeof val(attr.policyRule) === 'string' && { policyRule: val(attr.policyRule) as string }),
    facts: factsOf(decisionEntity),
    ngsi: { decision: decisionEntity, alert },
  };
}

/** One spatial fact as the page shows it (pointsman docs/profile-format.md#facts). */
export type PageFact =
  | { name: string; missing: false; values: Record<string, string | number | boolean | null>; source: string }
  | { name: string; missing: true; reason: string };

const FACTS_IRI = 'https://datamodels.jp/ns/decision/facts';

/**
 * The facts of a Decision entity (read without a context, so the attribute
 * has its full IRI). Items that do not have the expected shape are left out:
 * the entity comes from the broker, and the page shows the values as text.
 */
export function factsOf(decision: Entity | null): PageFact[] {
  const attr = decision?.[FACTS_IRI] as { json?: unknown } | undefined;
  if (!Array.isArray(attr?.json)) return [];
  const out: PageFact[] = [];
  for (const f of attr.json as Record<string, unknown>[]) {
    if (!f || typeof f !== 'object' || typeof f.name !== 'string') continue;
    if (f.missing === true && typeof f.reason === 'string') out.push({ name: f.name, missing: true, reason: f.reason });
    else if (f.missing === false && typeof f.source === 'string' && f.values && typeof f.values === 'object' && !Array.isArray(f.values)) {
      const values: Record<string, string | number | boolean | null> = {};
      for (const [k, v] of Object.entries(f.values as Record<string, unknown>)) {
        if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) values[k] = v as string | number | boolean | null;
      }
      out.push({ name: f.name, missing: false, values, source: f.source });
    }
  }
  return out;
}

type Attr = { type?: string; value?: unknown; object?: unknown; [sub: string]: unknown };
const val = (a: unknown) => (a && typeof a === 'object' ? (a as Attr).value : undefined);

export interface Summary {
  id: string;
  roadName: string;
  status: string;
  statusLabel?: string;
  description: string;
  location: unknown;
  createdAt?: string;
  check?: {
    action: string;
    decidedAt?: string;
    policyRule?: string;
    decision?: string;
    answers: Record<string, { value: unknown; p?: number }>;
    finalAction?: string;
    reviewedAt?: string;
  };
  /** Shown on the residents' map. */
  published: boolean;
}

const CHECK_META = new Set(['type', 'value', 'observedAt', 'createdAt', 'modifiedAt', 'decisionId', 'decision', 'profile', 'profileVersion', 'policyRule', 'model', 'inputHash', 'finalAction', 'reviewedAt']);

export function summarize(e: Entity): Summary {
  const c = e.check as Attr | undefined;
  let check: Summary['check'];
  if (c && typeof c.value === 'string') {
    const answers: Record<string, { value: unknown; p?: number }> = {};
    for (const [k, v] of Object.entries(c)) {
      if (CHECK_META.has(k) || k.endsWith('Probability')) continue;
      const p = val(c[`${k}Probability`]);
      answers[k] = { value: val(v), ...(typeof p === 'number' && { p }) };
    }
    check = {
      action: c.value,
      ...(typeof c.observedAt === 'string' && { decidedAt: c.observedAt }),
      ...(val(c.policyRule) !== undefined && { policyRule: String(val(c.policyRule)) }),
      ...(typeof (c.decision as Attr | undefined)?.object === 'string' && { decision: (c.decision as Attr).object as string }),
      answers,
      ...(typeof val(c.finalAction) === 'string' && { finalAction: val(c.finalAction) as string }),
      ...(typeof val(c.reviewedAt) === 'string' && { reviewedAt: val(c.reviewedAt) as string }),
    };
  }
  const outcome = check?.finalAction ?? check?.action;
  return {
    id: e.id,
    roadName: String(val(e.roadName) ?? ''),
    status: String(val(e.restrictionStatus) ?? ''),
    ...(typeof val(e.statusLabel) === 'string' && { statusLabel: val(e.statusLabel) as string }),
    description: String(val(e.description) ?? ''),
    location: val(e.location),
    ...(typeof e.createdAt === 'string' && { createdAt: e.createdAt }),
    ...(check && { check }),
    published: outcome === 'publish',
  };
}

// --- Cleanup -----------------------------------------------------------------------

/** Deletes reports and their Decision, Task and Alert entities after a day, and closes their issues. */
export async function cleanup(env: Env, now = Date.now()): Promise<{ deleted: number; closed: number }> {
  const broker = new Broker(env);
  let deleted = 0;
  for (const e of await broker.listRoadRestrictions()) {
    const created = Date.parse(String(e.createdAt ?? ''));
    if (!(now - created > KEEP_MS)) continue;
    const decision = ((e.check as Attr | undefined)?.decision as Attr | undefined)?.object;
    if (typeof decision === 'string') await broker.delete(decision);
    // Extra data: a Task that cannot be deleted must not keep the report.
    const taskId = await taskIdOf(e);
    if (taskId) await broker.delete(taskId).catch((err) => console.error(`task cleanup: ${(err as Error).message}`));
    // Step 2: its Decision entity and the Alert it raised.
    const second = ((e.evacuation as Attr | undefined)?.decision as Attr | undefined)?.object;
    if (typeof second === 'string') {
      await broker.delete(second);
      await broker.delete(alertId(second.split(':').pop()!));
    }
    await broker.delete(e.id);
    deleted += 1;
  }
  let closed = 0;
  const github = new GitHub(env);
  for (const key of (await env.DEMO.list({ prefix: 'issue:' })).keys) {
    const record = await env.DEMO.get<IssueRecord>(key.name, 'json');
    // The issue's own time: the report's KV record may already have expired.
    if (!record || now - Date.parse(record.createdAt) <= KEEP_MS) continue;
    await github.comment(Number(key.name.slice(6)), 'Demo data deleted after a day; closing.').catch(() => {});
    await github.close(Number(key.name.slice(6))).catch(() => {});
    await env.DEMO.delete(key.name);
    closed += 1;
  }
  return { deleted, closed };
}
