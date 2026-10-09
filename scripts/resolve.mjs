#!/usr/bin/env node
// Resolves a decision the way any FIWARE app could (pointsman#83): by
// writing the result to its Decision entity in the broker. The broker
// notifies the Worker (/reviews), and the bridge resolves the review in
// Pointsman, writes the final action to the report and completes its Task.
// No GitHub involved.
//
// Usage:
//   BROKER_API_KEY=$(op read …) node scripts/resolve.mjs <decision> <publish|reject> [--by <id>] [--correct name=value …]
// <decision>: urn:ngsi-ld:Decision:<id> or just <id>. --by: an account or
// role, not a personal name (default: demo:script).

import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { parse } from 'jsonc-parser';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { by: { type: 'string', default: 'demo:script' }, correct: { type: 'string', multiple: true, default: [] } },
});
const [decision, action] = positionals;
if (!decision || !['publish', 'reject'].includes(action ?? '')) {
  console.error('usage: node scripts/resolve.mjs <decision> <publish|reject> [--by <id>] [--correct name=value …]');
  process.exit(2);
}
const { BROKER_API_KEY } = process.env;
if (!BROKER_API_KEY) throw new Error('set BROKER_API_KEY');
const { vars } = parse(readFileSync('wrangler.jsonc', 'utf8'));

const id = decision.startsWith('urn:') ? decision : `urn:ngsi-ld:Decision:${decision}`;
const now = new Date().toISOString();
// name=value; true/false become booleans, as the profile's yes/no questions expect.
const corrections = values.correct.map((pair) => {
  const at = pair.indexOf('=');
  if (at < 1) throw new Error(`--correct ${pair}: expected name=value`);
  const raw = pair.slice(at + 1);
  return { name: pair.slice(0, at), value: raw === 'true' ? true : raw === 'false' ? false : raw, by: values.by, at: now };
});
const P = (value) => ({ type: 'Property', value });
const body = {
  '@context': ['https://datamodels.jp/context/decision/v1.jsonld', 'https://uri.etsi.org/ngsi-ld/v1/ngsi-ld-core-context-v1.8.jsonld'],
  reviewStatus: P('resolved'),
  finalAction: P(action),
  reviewedBy: P(values.by),
  reviewedAt: P({ '@type': 'DateTime', '@value': now }),
  ...(corrections.length > 0 && { corrections: { type: 'JsonProperty', json: corrections } }),
};
const res = await fetch(`${vars.BROKER_URL}/ngsi-ld/v1/entities/${encodeURIComponent(id)}/attrs`, {
  method: 'POST',
  headers: { 'x-api-key': BROKER_API_KEY, 'NGSILD-Tenant': vars.BROKER_TENANT, 'content-type': 'application/ld+json', 'user-agent': 'pointsman-demo (+https://github.com/geolonia/pointsman-demo)' },
  body: JSON.stringify(body),
});
// Only the status: the body may echo the request.
console.log(`${id}: ${res.status}${res.ok ? ', resolved; the bridge does the rest' : ''}`);
if (!res.ok) process.exit(1);
