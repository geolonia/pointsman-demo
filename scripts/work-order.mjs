#!/usr/bin/env node
// Plays the part of Redmine with GTT (pointsman#85): writes a completed work
// order for a report, shaped like a GTT issue published in the Task
// vocabulary. The broker notifies the Worker (/reviews); the bridge resolves
// the report's review from the status name (src/work-orders.json).
//
// Usage:
//   BROKER_API_KEY=$(op read …) node scripts/work-order.mjs <report> <status> --issue <n> [--open]
// <report>: urn:ngsi-ld:RoadRestriction:demo-… ; <status>: a status name from
// src/work-orders.json, for example Published or Rejected (any name with
// --open, which writes it as not done yet). --issue: the issue number, one
// per report, as in Redmine. The work order is demo data: delete it with
// --delete.

import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { parse } from 'jsonc-parser';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { issue: { type: 'string' }, open: { type: 'boolean', default: false }, delete: { type: 'boolean', default: false } },
});
const [report, status] = positionals;
if (!report?.startsWith('urn:ngsi-ld:RoadRestriction:') || (!status && !values.delete) || !/^\d+$/.test(values.issue ?? '')) {
  console.error('usage: node scripts/work-order.mjs <report urn> <status> --issue <n> [--open] | <report urn> --delete --issue <n>');
  process.exit(2);
}
// A completed work order needs a status the Worker maps to a final action.
const mapping = JSON.parse(readFileSync(new URL('../src/work-orders.json', import.meta.url), 'utf8'));
if (!values.delete && !values.open && !Object.hasOwn(mapping, status)) {
  console.error(`status ${status}: not in src/work-orders.json (${Object.keys(mapping).join(', ')}); use --open for an open work order`);
  process.exit(2);
}
const { BROKER_API_KEY } = process.env;
if (!BROKER_API_KEY) throw new Error('set BROKER_API_KEY');
const { vars } = parse(readFileSync('wrangler.jsonc', 'utf8'));
const headers = { 'x-api-key': BROKER_API_KEY, 'NGSILD-Tenant': vars.BROKER_TENANT, 'user-agent': 'pointsman-demo (+https://github.com/geolonia/pointsman-demo)' };

// As GTT names it: urn:ngsi-ld:Issue:redmine:<instance>:<issue>.
const id = `urn:ngsi-ld:Issue:redmine:demo:${values.issue}`;
const entities = `${vars.BROKER_URL}/ngsi-ld/v1/entities`;
if (values.delete) {
  const res = await fetch(`${entities}/${encodeURIComponent(id)}`, { method: 'DELETE', headers });
  console.log(`${id}: deleted (${res.status})`);
  process.exit(res.ok || res.status === 404 ? 0 : 1);
}

const P = (value) => ({ type: 'Property', value });
const now = { '@type': 'DateTime', '@value': new Date().toISOString() };
const task = {
  '@context': ['https://datamodels.jp/context/task/v1.jsonld', 'https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld'],
  id,
  type: 'Task',
  name: P(`Check report ${report.slice(-8)}`),
  progress: P(values.open ? 'needs-action' : 'completed'),
  statusLabel: P(status),
  externalId: P(values.issue),
  refersTo: { type: 'Relationship', object: report },
  dateModified: P(now),
};
// Create, or update when it exists (GTT keeps one entity per issue).
let res = await fetch(entities, { method: 'POST', headers: { ...headers, 'content-type': 'application/ld+json' }, body: JSON.stringify(task) });
if (res.status === 409) {
  const { id: _, type: __, ...attributes } = task;
  res = await fetch(`${entities}/${encodeURIComponent(id)}/attrs`, { method: 'POST', headers: { ...headers, 'content-type': 'application/ld+json' }, body: JSON.stringify(attributes) });
}
// Only the status: the body may echo the request.
console.log(`${id}: ${res.status}${res.ok ? `, ${values.open ? 'open' : `completed as ${status}`}` : ''}`);
if (!res.ok) process.exit(1);
