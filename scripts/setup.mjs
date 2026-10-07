#!/usr/bin/env node
// One-time setup outside Cloudflare: the subscription in the context broker
// (RoadRestriction -> the Worker's /notify) and the issue labels on GitHub.
// Idempotent: an existing subscription with the same id is updated in place.
//
// Secrets come from the environment, for example from 1Password:
//   BROKER_API_KEY=$(op read …) NOTIFY_SECRET=$(op read …) node scripts/setup.mjs
// Labels need the GitHub CLI (gh), signed in with access to the repository.

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parse } from 'jsonc-parser';

const { vars, name } = parse(readFileSync('wrangler.jsonc', 'utf8'));
const WORKER_URL = process.env.WORKER_URL ?? `https://${name}.geolonia.workers.dev`;
const { BROKER_API_KEY, NOTIFY_SECRET } = process.env;
if (!BROKER_API_KEY || !NOTIFY_SECRET) throw new Error('set BROKER_API_KEY and NOTIFY_SECRET');

const base = `${vars.BROKER_URL}/ngsi-ld/v1`;
const headers = { 'x-api-key': BROKER_API_KEY, 'NGSILD-Tenant': vars.BROKER_TENANT, 'content-type': 'application/json' };
const id = 'urn:ngsi-ld:Subscription:pointsman-demo-road-restrictions';
const subscription = {
  description: 'Pointsman demo: new and changed road restriction reports to the bridge',
  entities: [{ type: 'RoadRestriction' }],
  // The inputs of the road-restriction-check profile (src/index.ts ROUTE).
  watchedAttributes: ['roadName', 'restrictionStatus', 'statusLabel', 'description'],
  notification: {
    format: 'normalized',
    endpoint: { uri: `${WORKER_URL}/notify`, accept: 'application/json', receiverInfo: [{ key: 'x-bridge-secret', value: NOTIFY_SECRET }] },
  },
};
const withContext = { ...headers, link: '<https://datamodels.jp/context/transportation/v1.jsonld>; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"' };
// Update in place, so notifications never stop; create it when missing.
let res = await fetch(`${base}/subscriptions/${encodeURIComponent(id)}`, { method: 'PATCH', headers: withContext, body: JSON.stringify(subscription) });
if (res.status === 404) {
  res = await fetch(`${base}/subscriptions`, { method: 'POST', headers: withContext, body: JSON.stringify({ id, type: 'Subscription', ...subscription }) });
}
// Only the status: the body may echo the request, secret included.
console.log(`subscription ${id}: ${res.status}`);
if (!res.ok) process.exit(1);

const labels = { demo: ['ededed', 'Demo data, deleted after a day'], review: ['fbca04', 'Pointsman: needs a check'], urgent: ['d93f0b', 'Pointsman: someone may be in danger'], publish: ['0e8a16', 'Resolved: published'], reject: ['5319e7', 'Resolved: not published'] };
for (const [label, [color, description]] of Object.entries(labels)) {
  try {
    execFileSync('gh', ['label', 'create', label, '--repo', vars.GITHUB_REPOSITORY, '--color', color, '--description', description, '--force'], { stdio: 'pipe' });
    console.log(`label ${label}: ok`);
  } catch (err) {
    console.log(`label ${label}: ${String(err.stderr ?? err).trim()}`);
  }
}
