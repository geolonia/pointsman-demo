# Pointsman FIWARE demo

A demo of [Pointsman](https://github.com/geolonia/pointsman) on a smart-city
data platform (FIWARE). During heavy rain, residents report closed roads.
Pointsman checks each report within seconds. Clear reports go straight to
the residents' map. Unclear reports go to a person, and urgent reports go to
a person first.

Try it: https://pointsman-demo.geolonia.workers.dev

In FIWARE terms: the reports are `RoadRestriction` entities
([datamodels.jp](https://datamodels.jp/models/transportation/RoadRestriction/))
in GeonicDB, an NGSI-LD context broker. The
[bridge](https://github.com/geolonia/pointsman/tree/main/bridge) connects the
broker to Pointsman. [Why a bridge](https://github.com/geolonia/pointsman/blob/main/bridge/README.md#why-a-bridge)
explains these words.

The storyboard and the reasons are in Pointsman's
[docs/fiware-demo.md](https://github.com/geolonia/pointsman/blob/main/docs/fiware-demo.md).

## How it works

The same diagram is in Pointsman's [docs/fiware-demo.md](https://github.com/geolonia/pointsman/blob/main/docs/fiware-demo.md#how-it-runs).
Pointsman makes up to three decisions per report: the **first check**, the
**additional check** and the **final result** (the page uses the same names).

```mermaid
flowchart LR
  Page["Demo page"] -->|"report, poll"| W["Demo Worker<br/>(Cloudflare, runs the bridge)"]
  W -->|"create report"| B["GeonicDB<br/>(tenant pointsman_demo)"]
  B -->|"notifications<br/>(5 subscriptions)"| W
  W -->|"first check, additional check,<br/>final result; resolve review"| P["Pointsman"]
  P -->|"fixed questions"| AI["AI model<br/>(Workers AI)"]
  P -->|"flood zone, evacuation site,<br/>way around on foot"| Geo["Public map data<br/>(GSI; Valhalla on OpenStreetMap)"]
  W -->|"write check, evacuation, final;<br/>Decision, Task, Alert"| B
  W -->|"urgent / review<br/>(prepared reports only)"| G["GitHub issues<br/>(geolonia/pointsman-demo)"]
  G -->|"/publish, /reject<br/>(webhook)"| W
```

1. The page sends a report. The Worker creates a `RoadRestriction` in the
   broker.
2. The broker notifies the Worker (`/notify`, a subscription on the inputs).
   The [bridge](https://github.com/geolonia/pointsman/tree/main/bridge) asks
   Pointsman for the first check (profile `road-restriction-check`).
   Pointsman asks the AI model its questions and looks up the flood zone and
   the nearest evacuation site itself; the bridge sends only the report. The
   bridge writes the result back to the entity as `check`, plus a `Decision`
   entity.
3. `review` and `urgent` reports become issues here, for prepared reports only
   (free text from visitors never goes to GitHub). Each one also gets a
   `Task` entity ([datamodels.jp](https://datamodels.jp/models/task/Task/)),
   so any app that lists tasks from the broker shows the work.
4. The additional check: a second subscription sends `urgent` and `review`
   results to `/notify?route=evacuation`. The bridge asks Pointsman again (profile
   `evacuation-access-check`: does the closure cut people off from their
   evacuation site?) and writes `evacuation`, plus a `Decision` entity that
   links the first one (`wasInformedBy`). An `alert` creates an `Alert`
   entity (Smart Data Models) for the site's staff.
5. The final result (pointsman#101): a third subscription, on `check` and
   `evacuation`, sends the report to `/notify?route=final` once the first
   check published it or the additional check is there. The bridge sends only the ids of the two
   earlier decisions; Pointsman (profile `road-closure-final`, rules only, no
   model) reads their results from its log and decides once more. The bridge
   writes `final`, plus a `Decision` entity that links both earlier ones and,
   after a rerun, the one it replaces. The residents' map reads this result.
   It runs again when a person answers the first or the additional check
   (their answer counts). When the additional check did not come (it
   failed), the final result is not made either; the map then shows the
   first check's result.
6. A team member comments `/publish` or `/reject`, optionally with corrections
   (`/category laneRestriction`, `/danger no`). The Worker resolves the review
   in Pointsman (also for `urgent`: the profile's `people_check`), writes the
   result to the `Decision` entity, and closes the issue. On the page, the
   visitor who sent a report can decide it the same way (Publish or Reject).
7. Two more subscriptions send resolved `Decision` entities and completed
   `Task` entities to `/reviews`. The
   bridge writes the final action to the report (the page shows it as
   published) and completes the Task. This also works without GitHub: any
   app that writes the result to the Decision entity resolves the review
   (pointsman#83), for example `scripts/resolve.mjs`. Apps that keep their
   own work orders, such as Redmine with GTT, resolve it by completing a
   `Task` that refers to the report (pointsman#85): its status name gives
   the final action ([src/work-orders.json](src/work-orders.json):
   `Published` or `公開` → publish, `Rejected` or `却下` → reject).
8. Every hour, data older than a day is deleted (with its Decision, Task and
   Alert entities, also the final ones a rerun replaced) and its issues are
   closed.

Deploy order for the final step: Pointsman first (pointsman-config, with
`road-closure-final` and `road-restriction-check` v3, and the token's scope),
then this Worker, then `node scripts/setup.mjs` for the new subscription.
Without the profile, the final result's requests are refused and not retried.

No notification gets lost (pointsman#88). The Worker puts each notified
entity on a queue (`pointsman-demo-bridge`) and answers the broker at once.
The Worker's queue handler then runs items 2 to 5 and 7 above. Item 5 runs only
from the queue, one message at a time, so the newest final decision is
always written last.

- If Pointsman or the broker fails, the handler tries again after 30
  seconds, then waits twice as long each time, up to an hour: about 14 hours
  in all (20 tries). With a configuration error it waits 5 minutes each time,
  so about 100 minutes.
- After the last try the message goes to the queue
  `pointsman-demo-bridge-dlq`. Nothing reads that queue: check its messages
  in the Cloudflare dashboard (Queues), within its retention time (4 days by
  default), and send the report again if needed.
- The decision is safe, but the issue (item 3) and the Alert (item 4) are
  not tried again: if GitHub or the broker refuses them, the error is logged
  and the message is done. A second try would find the decision already
  written and do nothing.

## The page

https://pointsman-demo.geolonia.workers.dev — `site/`, served by the Worker
(static assets), in English and Japanese, light and dark:

a guided flow in four steps, for visitors who know nothing about FIWARE or AI:

1. **Pick a report.** Four examples, one for each outcome (a clear report, an
   unclear one, someone in danger, near an evacuation site); the others under
   "More examples". Each card says what happened and where, by a landmark
   (a station, park or river), since most streets in Japan have no name; it
   also lists the map checks Pointsman will run.
2. **First check.** Each part with its time, the AI's answers as plain
   questions with a confidence word, the map checks (question, answer and
   data source, apart from the AI's answers), and the city's rule in one
   sentence. On the headquarters map, the nearest evacuation site is marked
   with a dotted line to the report (its place from the same GSI data). In
   the first check no rule uses the site; the page says it is context for the person
   who checks. The rule box says what the rule was based on: the AI answers
   and the map checks it used, with their values. Open sections stay open
   when the page updates.
3. **Additional check.** The first result in one line, then the way to the
   evacuation site: the nearest site, the way around on foot (the map draws
   it from the `route` of Pointsman's detour fact; the evacuation profile
   asks for it with `route: true`), the rule and whether the site's staff
   were alerted. Or why it did not run: a report published at once needs no
   check, and a report that marks a point (not a road section) has no way
   around to work out.
4. **Final result.** The headline, the rule that made it and what it was made
   from, and, for a report that waits for a person, Publish and Reject
   buttons: the visitor who sent it decides it, as the person on duty would,
   and the final result is made again.

**Developer view** (button in the header, remembered in the browser): a
panel beside the page (a drawer at the bottom on narrow screens) shows the
report's way as a sequence diagram: this page, the data platform, the
bridge, Pointsman, and the AI and map data, one arrow per event (POST
/api/reports, the subscriptions' notifications, the decide calls, the map
checks, the PATCHes and new entities), each with a plain sentence and the
real data (request, entities, answers, facts). Events still to come are
greyed out. Pointing at a step on the page marks its events, and the other
way round.

Visitor-facing names: the page calls the FIWARE bridge the **connector**
(つなぎ役) and the demo Worker **the demo's server** (デモのサーバー), because
"bridge" reads as a road bridge in a demo about road closures; the
developer view adds the technical names in brackets.

One map, switched between headquarters (every report) and residents (only
what is published), on GSI's vector tiles (地理院タイル). Two panels from the
header: "How it works" (the four parts of the system, the chain as a diagram
with the DMN file to download, why cities use it this way, links for
developers) and "Reports" (the numbers of the last 7 days from Pointsman's
decision log, recent reports, and the reports waiting for a person, with the
NGSI-LD query).

No build step: plain HTML, CSS and JavaScript; MapLibre GL JS 5 from unpkg
(with integrity hashes).

## API for the page

| Endpoint | |
|---|---|
| `GET /api/config` | Prepared reports, the demo area, whether free text is on, today's usage |
| `GET /api/reports` | The reports with Pointsman's answers and the outcome (`published`) |
| `GET /api/reports/{id}` | One report, plus `prepared`, the review `issue` link, `evacuation` (the additional check) and `final` (the final result, with its Decision entity), and the NGSI-LD data (`ngsi.entity`, `ngsi.decision`, `ngsi.task`) |
| `GET /api/graph` | The chain of decisions as a diagram, from Pointsman (`GET /v1/profiles/road-closure-final/graph`): `format=svg` (default, `lang=en` or `ja`) for the page, `format=dmn` to download for DMN tools; cached 10 minutes |
| `GET /api/stats` | The last 7 days from Pointsman's decision log (`GET /v1/stats/{profile}?days=7`): reports, published at once, sent to a person (urgent), what people decided on unclear reports, corrections. Counts only; browsers keep it for a minute |
| `GET /api/decisions` | `Decision` entities waiting for a person (`reviewStatus` "pending"), newest first, with the NGSI-LD request that found them |
| `POST /api/reports` | `{"prepared": "<id>", "lang": "ja"}`, or free text: `{"roadName", "status", "description", "location", "turnstile"}`. Answers `{"id", "key"}` |
| `POST /api/reports/{id}/resolve` | `{"action": "publish" or "reject", "key"}`: the visitor who sent the report decides it, once, while it waits for a person. Like a review on GitHub (`reviewedBy` is `demo:visitor`); the report's issue is closed. Only a hash of the key is kept |

Same origin as the page; other origins must be listed in `ALLOWED_ORIGINS`.

## Limits

- Prepared reports by default; free text only with Cloudflare Turnstile
  (`TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET`), at most 300 characters, inside
  the demo area.
- 10 reports per visitor and minute; `DAILY_LIMIT` reports a day. A report
  is two Pointsman calls (the first check and the final result, which needs
  no model), or three when the first check decides `urgent` or `review` and
  the additional check runs.
- Everything is deleted after a day. Do not write personal data.

## Setup

Settings are in [wrangler.jsonc](wrangler.jsonc). Secrets (`wrangler secret put <NAME>`):

| Secret | Source |
|---|---|
| `POINTSMAN_TOKEN` | A Pointsman token limited to `road-restriction-check`, `evacuation-access-check` and `road-closure-final` |
| `BROKER_API_KEY` | 1Password `geonic-apps` / `geonicdb-production-geolonia-demo-pointsman_demo-apikey` |
| `NOTIFY_SECRET` | Random; every subscription sends it (`scripts/setup.mjs`) |
| `GITHUB_WEBHOOK_SECRET` | 1Password `geolonia-ops` / "Pointsman demo GitHub App" (password) |
| `GITHUB_APP_PRIVATE_KEY` | Same item, the private key converted to PKCS#8: `openssl pkcs8 -topk8 -nocrypt` |
| `TURNSTILE_SECRET` | Optional |

The two queues are created once in the Cloudflare account:
`wrangler queues create pointsman-demo-bridge` and
`wrangler queues create pointsman-demo-bridge-dlq` (done on 2026-10-15).

Then, once: `node scripts/setup.mjs` creates the five subscriptions in the
broker (new reports, the additional check, the final result, resolved
decisions, completed work orders) and the issue labels. Run it again after
an update: existing subscriptions are updated in place.

To resolve a review in the broker, as another app would (a member of the
team, with the broker key):

```sh
BROKER_API_KEY=… node scripts/resolve.mjs <decision id> publish --by demo:script --correct danger=false
```

Or as Redmine with GTT would, with a completed work order for the report
(one issue number per report; delete it afterwards with `--delete`, the
hourly cleanup does not know it):

```sh
BROKER_API_KEY=… node scripts/work-order.mjs urn:ngsi-ld:RoadRestriction:demo-… Published --issue 1
```

The GitHub issue of that report stays open (a later `/publish` there gets
"Pointsman refused this (409)"); the hourly cleanup closes it.

## Deployment

Cloudflare Workers Builds watches this repository and deploys `main`; no
credential lives in GitHub, and CI only runs a dry-run deploy. Settings of the
`pointsman-demo` Worker (Settings → Build):

| Setting | Value |
|---|---|
| Git repository | `geolonia/pointsman-demo`, production branch `main` |
| Build command | `node scripts/fetch-engine.mjs && pnpm install --frozen-lockfile` |
| Deploy command | `node scripts/deploy-config.mjs && npx wrangler deploy --config wrangler.deploy.json` |
| Build variables | `DEMO_KV_ID` (the KV namespace id, kept out of this public repository), `NODE_VERSION` `24` |
| Preview builds | Off: previews would run pull request code against the real broker and GitHub |

Secrets are not part of the build; they stay on the Worker (`wrangler secret put`).

## Examples check

The model's answers can move a little over time, so a prepared report can
stop giving its expected action (it happened on 2026-10-15, #33). Every
Monday at 09:00 JST a workflow ([examples-check.yml](.github/workflows/examples-check.yml))
sends all prepared reports in both languages to Pointsman and compares the
action with `expected` in [src/reports.ts](src/reports.ts). The job summary
shows every answer; a miss opens an issue (or comments on the open one). Run
it by hand from the Actions tab, or locally:

```sh
POINTSMAN_CHECK_TOKEN=… node scripts/check-examples.mjs
```

The repository secret `POINTSMAN_CHECK_TOKEN` is a Pointsman **test token**
for `road-restriction-check` (`scripts/tokens.mjs create --client
demo-examples-check --profiles road-restriction-check --test --remote` in
the config repository): its decisions are made like any other but not
logged, so the check never reaches the review queue or the accuracy numbers.
The script stops if the token is not a test token. GitHub switches off
scheduled workflows in a public repository after 60 days without activity:
if the weekly runs stop, enable the workflow again in the Actions tab.

## Development

Node.js 24, pnpm 12.

```sh
pnpm install
pnpm engine          # the bridge, from the Pointsman commit in engine.json
pnpm check           # typecheck, tests, dry-run deploy
pnpm dev             # with secrets in .dev.vars
```

For local work on the bridge itself, link a Pointsman checkout instead:
`ln -s ../pointsman engine`.

## License

[MIT](LICENSE). Contributions need a DCO sign-off (`git commit -s`); see
[CONTRIBUTING.md](CONTRIBUTING.md).
