#!/usr/bin/env node
// Weekly check of the prepared reports (.github/workflows/examples-check.yml):
// does Pointsman still give each one its expected action, in both languages?
//
//   POINTSMAN_CHECK_TOKEN=<test token> node scripts/check-examples.mjs [report.md]
//
// The token must be a Pointsman test token (scripts/tokens.mjs create --test in
// the pointsman repository): its decisions are not logged. POINTSMAN_URL
// defaults to the production Worker. Writes the result as Markdown to the
// given file and to the GitHub job summary; exits 1 when an example misses.

import { appendFileSync, writeFileSync } from 'node:fs';
// Node reads src/reports.ts directly (type stripping): it must keep to
// erasable TypeScript (no enum or namespace) and import values with a .ts
// extension.
import { PREPARED, toEntity } from '../src/reports.ts';
import { checkExamples, report } from './lib/examples-check.mjs';

const token = process.env.POINTSMAN_CHECK_TOKEN;
if (!token) {
  console.error('POINTSMAN_CHECK_TOKEN is not set');
  process.exit(2);
}
const url = process.env.POINTSMAN_URL || 'https://pointsman.geolonia.workers.dev';

const results = await checkExamples({ prepared: PREPARED, toEntity, url, token });
const { ok, markdown } = report(results);
console.log(markdown);
if (process.argv[2]) writeFileSync(process.argv[2], `${markdown}\n`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${markdown}\n`);
process.exit(ok ? 0 : 1);
