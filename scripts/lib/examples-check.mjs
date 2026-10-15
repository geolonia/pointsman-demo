// The weekly check of the prepared reports (scripts/check-examples.mjs): does
// Pointsman still give each one its expected action, in both languages? The
// model's answers can move a little over time (pointsman-demo#33). Pure: the
// caller passes the reports, toEntity and fetch.

export const PROFILE = 'road-restriction-check';
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
      const res = await fetchFn(`${url.replace(/\/+$/, '')}/v1/decide/${PROFILE}`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', 'user-agent': 'pointsman-demo-examples-check (+https://github.com/geolonia/pointsman-demo)' },
        body: JSON.stringify({ state: entity, ref: entity.id }),
      });
      if (!res.ok) {
        results.push({ id: p.id, lang, expected: p.expected, error: `Pointsman ${res.status}` });
        continue;
      }
      const d = await res.json();
      if (d.test !== true) throw new Error('the token is not a test token: this decision was logged. Use scripts/tokens.mjs create --test.');
      results.push({ id: p.id, lang, expected: p.expected, action: d.action, rule: d.rule, answers: d.answers });
    }
  }
  return results;
}

const pct = (x) => (typeof x === 'number' ? x.toFixed(2) : '');

/** One line per answer: value and the number the rules read (yes, p or score). */
function answersText(answers = {}) {
  return Object.entries(answers).map(([name, a]) => {
    const n = a.type === 'noul' ? `yes ${pct(a.yes)}` : a.type === 'score' ? `score ${pct(a.score)}` : `p ${pct(a.p)}`;
    return `${name}: ${a.value} (${n})`;
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
    ...results.map((r) => `| ${r.id} | ${r.lang} | ${r.expected} | ${r.error ?? (r.action === r.expected ? r.action : `**${r.action}**`)} | ${r.rule ?? (r.error ? '' : 'default')} | ${answersText(r.answers)} |`),
  ];
  return { ok: bad.length === 0, markdown: lines.join('\n') };
}
