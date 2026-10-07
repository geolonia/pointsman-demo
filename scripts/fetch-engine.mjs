#!/usr/bin/env node
// Checks out the Pointsman commit pinned in engine.json into engine/, for the
// FIWARE bridge (engine/bridge/src). The repository is fixed here: the build
// runs its code.
//
// Usage: node scripts/fetch-engine.mjs        (skips when engine/ exists)
// For local development you can instead link a checkout: ln -s ../pointsman engine

import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const REPOSITORY = 'geolonia/pointsman';
const { repository, ref } = JSON.parse(readFileSync(new URL('../engine.json', import.meta.url), 'utf8'));
if (repository !== REPOSITORY) throw new Error(`engine.json: repository must be ${REPOSITORY}`);
if (!/^[0-9a-f]{40}$/.test(ref)) throw new Error('engine.json: ref must be a 40-character commit SHA');
if (existsSync('engine')) {
  console.log('engine/ exists, not fetching');
  process.exit(0);
}
const git = (...args) => execFileSync('git', args, { stdio: 'inherit' });
git('init', '-q', 'engine');
git('-C', 'engine', 'fetch', '-q', '--depth', '1', `https://github.com/${REPOSITORY}.git`, ref);
git('-C', 'engine', 'checkout', '-q', 'FETCH_HEAD');
console.log(`engine/ at ${ref}`);
