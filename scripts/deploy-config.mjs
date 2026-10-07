#!/usr/bin/env node
// Writes wrangler.deploy.json: wrangler.jsonc with the real KV namespace id,
// which is kept out of this public repository (Workers Builds variable
// DEMO_KV_ID). Deploy with: wrangler deploy --config wrangler.deploy.json

import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from 'jsonc-parser';

const id = process.env.DEMO_KV_ID;
if (!/^[0-9a-f]{32}$/.test(id ?? '')) throw new Error('DEMO_KV_ID must be the 32-character id of the KV namespace');
const config = parse(readFileSync('wrangler.jsonc', 'utf8'));
const kv = config.kv_namespaces?.find((n) => n.binding === 'DEMO');
if (!kv) throw new Error('wrangler.jsonc has no DEMO KV namespace');
kv.id = id;
writeFileSync('wrangler.deploy.json', `${JSON.stringify(config, null, 2)}\n`);
console.log('wrote wrangler.deploy.json');
