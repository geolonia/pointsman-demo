#!/usr/bin/env node
// Checks out the Pointsman commit pinned in engine.json into engine/, for the
// FIWARE bridge (engine/bridge/src). The repository is fixed here: the build
// runs its code.
//
// Usage: node scripts/fetch-engine.mjs        (skips when engine/ exists)
// For local development you can instead link a checkout: ln -s ../pointsman engine

import { existsSync, lstatSync, mkdtempSync, readFileSync, renameSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const REPOSITORY = 'geolonia/pointsman';
const { repository, ref } = JSON.parse(readFileSync(new URL('../engine.json', import.meta.url), 'utf8'));
if (repository !== REPOSITORY) throw new Error(`engine.json: repository must be ${REPOSITORY}`);
if (!/^[0-9a-f]{40}$/.test(ref)) throw new Error('engine.json: ref must be a 40-character commit SHA');
const git = (...args) => execFileSync('git', args, { stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();
if (existsSync('engine')) {
  // A link to a local checkout is for development: not checked.
  if (lstatSync('engine').isSymbolicLink()) {
    console.log('engine/ is a link to a local checkout, not checked against engine.json');
    process.exit(0);
  }
  let head = '';
  try { head = git('-C', 'engine', 'rev-parse', 'HEAD'); } catch { /* not a complete checkout */ }
  if (head !== ref) throw new Error(`engine/ is at ${head || 'no commit'}, engine.json pins ${ref}: delete engine/ and run again`);
  console.log(`engine/ already at ${ref}`);
  process.exit(0);
}
// Fetch into a temporary folder and move it into place only when complete, so
// a failed fetch never leaves an engine/ that a later run would trust.
const tmp = mkdtempSync('engine-tmp-');
try {
  git('init', '-q', tmp);
  git('-C', tmp, 'fetch', '-q', '--depth', '1', `https://github.com/${REPOSITORY}.git`, ref);
  git('-C', tmp, 'checkout', '-q', 'FETCH_HEAD');
  if (git('-C', tmp, 'rev-parse', 'HEAD') !== ref) throw new Error('fetched commit differs from engine.json');
  renameSync(tmp, 'engine');
} catch (err) {
  rmSync(tmp, { recursive: true, force: true });
  throw err;
}
console.log(`engine/ at ${ref}`);
