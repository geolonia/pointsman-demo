// The weekly check of the prepared reports (scripts/check-examples.mjs): does
// Pointsman still give each one its expected action, in both languages? The
// model's answers can move a little over time (pointsman-demo#33). Pure: the
// caller passes the reports, toEntity and fetch.

export const PROFILE = 'road-restriction-check';
/** Per request; the facts lookups can take a few seconds on a cold start. */
const TIMEOUT_MS = 30_000;
const LANGS = ['ja', 'en'];

/**
 * Sends every prepared report in both languages to Pointsman with a test
 * token (its decisions are not logged) and compares the action. Throws when
 * the token is not a test token, so that a wrong secret never fills the
 * decision log.
 */
export async function checkExamples({ prepared, toEntity, url, token, fetch: fetchFn = fetch }) {
  const results = [];
  for (const p of prepared) {
    for (const lang of LANGS) {
      const { entity } = toEntity({ prepared: p.id, lang });
      let d;
      // One failed request (network, timeout, not JSON) is one failed example,
      // not a lost report.
      try {
        const res = await fetchFn(`${url.replace(/\/+$/, '')}/v1/decide/${PROFILE}`, {
          method: 'POST',
          headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'user-agent': 'pointsman-demo-examples-check (+https://github.com/geolonia/pointsman-demo)' },
          body: JSON.stringify({ state: entity, ref: entity.id }),
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!res.ok) {
          results.push({ id: p.id, lang, expected: p.expected, error: `Pointsman ${res.status}` });
          continue;
        }
        d = await res.json();
      } catch (err) {
        results.push({ id: p.id, lang, expected: p.expected, error: `request failed: ${err instanceof Error ? err.message : String(err)}` });
        continue;
      }
      if (d.test !== true) throw new Error('the token is not a test token: this decision was logged. Use scripts/tokens.mjs create --test.');
      results.push({ id: p.id, lang, expected: p.expected, action: d.action, rule: d.rule, answers: d.answers });
    }
  }
  return results;
}

const pct = (x) => (typeof x === 'number' ? x.toFixed(2) : '');
/** A table cell: no `|` or line break from the data breaks the table. */
const cell = (x) => String(x ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');

/** One line per answer: value and the number the rules read (yes, p or score). */
function answersText(answers = {}) {
  return Object.entries(answers).map(([name, a]) => {
    const n = a.type === 'noul' ? `yes ${pct(a.yes)}` : a.type === 'score' ? `score ${pct(a.score)}` : `p ${pct(a.p)}`;
    return cell(`${name}: ${a.value} (${n})`);
  }).join('<br>');
}

/** Markdown for the job summary and the issue. */
export function report(results) {
  const bad = results.filter((r) => r.error || r.action !== r.expected);
  const lines = [
    bad.length === 0
      ? `All ${results.length} examples give their expected action.`
      : `**${bad.length} of ${results.length} examples do not give their expected action.** Change the text in src/reports.ts (one sentence that states what the report implies), check it with Pointsman \`dev:live\`, and update the comment above PREPARED.`,
    '',
    '| Example | Language | Expected | Got | Rule | Answers |',
    '|---|---|---|---|---|---|',
    ...results.map((r) => `| ${cell(r.id)} | ${r.lang} | ${cell(r.expected)} | ${r.error ? cell(r.error) : r.action === r.expected ? cell(r.action) : `**${cell(r.action)}**`} | ${r.error ? '' : cell(r.rule ?? 'default')} | ${answersText(r.answers)} |`),
  ];
  return { ok: bad.length === 0, markdown: lines.join('\n') };
}
