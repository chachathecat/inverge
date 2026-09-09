# Owner-local held-statute reference bridge

Scope: APPRAISER-LEGAL-EVIDENCE-BRIDGE-01. This is a standalone read-only reference
workspace, not a question answer, exam-applicability checker or learning-evidence
producer. It consumes no attempt and persists no source, answer or learner data.

## Runtime path and trust

- Page: /app/first-stage/legal-evidence. Conditional entry on the existing Owner
  first-stage dashboard only; nothing is added inside an economics attempt.
- API: /api/review-os/first-stage/legal-evidence. GET lists only held metadata;
  POST search/reopen carries bounded selections or the exact native reference.
  URL parameters, arbitrary root/catalog/context fields and duplicate JSON keys
  are denied. The 16,384-byte existing session parser bounds actual stream bytes.
- Same existing Owner allowlists plus genuine authenticated non-demo/non-smoke
  Supabase session. Local auth URL must be exactly http://127.0.0.1:55421.
  Dedicated flag INVERGE_OWNER_LEGAL_EVIDENCE_ENABLED must be true, NODE_ENV
  development, no VERCEL/VERCEL_ENV/CI/smoke. Actual Host must be
  127.0.0.1:3883; forwarded headers never authorize access. Server binding must
  separately be verified loopback-only before any authorized real use.
- Runtime-only server configuration: INVERGE_OWNER_LEGAL_READER_ROOT,
  INVERGE_OWNER_LEGAL_SNAPSHOT_ROOT, INVERGE_OWNER_LEGAL_CATALOG_PATH,
  INVERGE_OWNER_LEGAL_CATALOG_SHA256. These are not client fields; no actual
  flag, path, env file or live server setting is changed by this implementation.
- config/legal-snapshot-reader-source-v1.json binds revision/tree and the full
  18-file dependency closure. Hash/size/path checks precede native import.
  No supplier module/private content is copied into the application or Git.
  Native reader additionally pins catalog and each selected snapshot on every
  read. Host files must remain read-only while running.
- Initial server/client HTML receives no statute body. Responses are private,
  no-store; queries/references are POST-only and never logged. UI stores content
  only transiently and clears results before requests, selection changes/errors.
  Original full JSON fragments are not sent, only selected text plus exact native
  reference. No localStorage/sessionStorage or API result cache.
- Preserve JSON references, deleted articles and supplementary unit distinctions.
  No invented UUID/raw_xml_sha256. No source text in logs, CI or screenshots.
  Synthetic screenshot fixtures are explicitly not actual statute text.

The source documentation describes older substring ranking, but the pinned
implementation actually returns ALL_TOKENS_SUBSTRING_WITH_INLINE_SPACE_FALLBACK_V2.
The bridge delegates to that exact implementation; it does not reimplement ranking.

## Validation interpretation

Automated HTTP/React tests substitute synthetic auth/reader data. They exercise
the actual application handler and component, closed scope, no-results, denied
Owner/demo/smoke/remote/production/host, bounded input, error clearing and same-ref
reopen. A separate source-loader test exercises pinned bytes and transitive
dependency drift with an explicitly synthetic external module.

Actual retained-source tests must separately call the pinned real reader through
this bridge, network-disabled, read-only, and emit counts/states only. They do not
prove a genuine Owner browser login or legal correctness. No source-body screenshot
or full result dump is permitted. Do not run the supplier global offline guard
inside the economics app; use it only in an isolated verification process.

## Activation and rollback

The explicit 2026-09-09 Owner amendment permits conditional OFF-code integration
and genuine acceptance only in the existing Owner-PC environment. Before that
authorized run verify code pins, private root/catalog checksum and loopback Docker/
PC listeners. Keep the existing account/session ownership controls. Do not collect,
change catalog/backups/claims or reach any remote DB/Storage/provider.

Disable the independent bridge flag to hide the page/entry and deny API access
before private reads. There is no DB migration, stored row or content installation
to undo. Preserve all economics records and existing server/browser/cache.

The existing PC launcher offers an explicit `start-legal-evidence` command. It
first verifies the unchanged dedicated stack and actual loopback listeners, then
passes only the four non-secret reader/root/catalog/checksum settings and the
bridge flag alongside the existing filtered local economics environment. Ordinary
`start` continues to exclude inherited bridge flags. Do not use any `prepare`
command, reinstall content, reapply SQL or create an account for this bridge.
Returning to ordinary `start` is the bridge rollback and preserves every record.

## Historical evidence at preserved 82da64df

Local code validation completed on 2026-09-09 KST:

- 8 new HTTP/loader/React browser tests passed. Initial rendered HTML and browser
  bundle contain no synthetic body; selected search/reopen succeeds, error and
  expired access clear bodies. No external browser requests or storage entries.
- Default suite: 1,806 passed before the final lint-only variable/ref clarification.
  After that clarification, final typecheck, changed-file lint (zero warnings),
  41 focused bridge/economics/Today/curriculum tests and final build passed.
- 162 tracked/candidate JSON files parsed. 191 build traces and server/client
  artifacts contained no private root paths. Build's 13 NFT warnings point to the
  unchanged curriculum-reference/service import chain; they are not claimed absent.
- Separate actual held-source run through this HTTP handler with synthetic auth:
  18 source dependencies verified; 15 held laws listed; article 1 search 15/15,
  exact reference reopen 15/15, tampered text-hash rejection 15/15. Global offline
  network guard active; catalog unchanged; private writes and emitted bodies zero.
  This is NOT a genuine Owner browser/login acceptance or legal correctness score.
- Existing 3883 listener remained 127.0.0.1; economics worktree retained its sole
  uncommitted completion checkpoint. Supplier checkout remained clean. No personal
  database, server, browser, cache, credential or actual runtime flag was changed.

Authenticated read-only Vercel CLI 54.1.0 query found the exact inverge project
and repository, Git createDeployments enabled, no Deploy Hooks and no repository
hooks. Ignored Build Step skips non-preview builds and permits preview builds.
The original stop was therefore a deployment permission gate, not writer handoff.
The later Owner amendment expressly permits disabled-code automatic Preview
deployment through existing Git integration, but no Preview reader access or
activation. No Vercel settings or deployment-protection changes are permitted.

At the original preserved commit, remote native CI/review/Draft/merge and real
Owner activation were not completed. The following resumed evidence is separate.
GitHub remains authoritative. The previous supplier 45-sample test is separate
from the new 15-law bridge execution.

## Resumed authorized candidate evidence — 2026-09-09 KST

- Final source typecheck and changed-file lint passed; 44 affected tests passed,
  including the actual route/server deployment matrix and explicit launcher tests.
  Six deployment combinations deny page/GET/POST before auth, private configuration,
  reader initialization or request-body consumption even with enabled local flags
  and spoofed local request headers. This is direct code execution, not Vercel login.
- The existing stopped Docker Desktop engine and seven existing dedicated services
  were restarted without creating containers, accounts, schemas or installations.
  Pre-start Docker binding validation and actual PC listener validation passed:
  four service ports and app 3883 are 127.0.0.1 only. Original wildcard containers
  remained stopped; existing TLS files and authentication policy were unchanged.
- The existing genuine Owner browser profile/session opened the actual Next page,
  which listed 15 held versions and initially no body. Civil-law article 1 displayed
  the actual returned body; same-reference reopen returned identical reference and
  body with originalReopened true. Keyword search returned 10 bounded results.
- Tampered reference returned HTTP 503 INTEGRITY_ERROR with no body; anonymous
  GET returned HTTP 404 and no anchors. Responses were no-store. Reload cleared
  body/results. Browser errors and external browser requests were zero. Only the
  no-body initial screen was captured privately; no source-body screenshot/log.
- All 105 retained source/catalog files, existing installation, all six personal
  session rows and planning rows were byte/digest-identical before/after lookup.
  The read-only supplier checkout was clean at the pinned revision. No r46 attempt,
  clock change, account creation, preparation SQL or learning-record mutation.
- This is an agent-operated genuine Owner-session lookup, not a fresh password
  entry, human legal review, exam applicability proof or learner performance.
- Final production build passed. 191 production traces / 147,831 trace entries
  and 3,239 built artifacts contain no private roots. The actual compiled API
  rejected all four Preview/Production GET/POST calls before body consumption,
  even with enabled bridge/kernel flags and local Host/Origin. 162 JSON files,
  the exact 18-file manifest, changed-source secret-pattern and diff checks passed.
- GitHub exact-head CI/review/merge and actual deployed Preview denial still await
  the new candidate; no prior-head result is represented as those future outcomes.

## Historical remote candidate and safe stop at c188b9f9 — 2026-09-09

PR #909 is Draft/Open at c188b9f94407fa73ed1313ccd21a588784f2046c (tree
bc3d7a3735e020aecc40c8f678e46df22dba5fd3). Vercel, PR Contract, Risk and Runtime
passed. Fast and Full Linux/Windows each passed 1,807 tests and failed only the
bridge browser launch because CI lacked Chromium. Two minimal workflow install
steps (three jobs) and an executable prerequisite regression are local uncommitted
corrections; both affected browser tests pass. No test is skipped or weakened.
The local candidate manifest now has 20 paths, adding ci-fast.yml and ci-full.yml;
the remote 18-path manifest and its historical validation remain distinguishable.

Learner Loop independently passed 707/708: the unchanged registry recheck date
2026-09-08 expired, so needsUpdateNodes is 2, not the test's hard-coded 1. This
was reproduced locally. No actual source date/status or verification was altered.
Security run 34301588544 failed on unchanged Next (two critical advisories), sharp
(high) and js-yaml (high) dependencies, reproduced by local package-lock audit.
No dependency upgrade, audit exception or policy relaxation has been performed.
Independent review has not been requested for this known failing candidate;
zero unresolved threads does not constitute a clean formal review.

Automatic Preview dpl_HiJYXgBbjp6psPQffUWk9afbFG22 reached READY at that exact head.
Direct GET returns 302 to Vercel login; POST returns 401. Application denial behind
protection remains unobserved; those responses are not claimed as bridge denial.
The installed CLI curl implementation can PATCH/create a protection-bypass token,
so it was not executed. Protection, Vercel configuration and secrets are unchanged.
Production suppression is the previously authenticated Preview-only build setting.

After the Windows Next RCE advisory was identified, only the task-started local
app and its launcher were stopped; port 3883 has no listener. Dedicated loopback
services/DB, credentials/TLS and browser profile remain preserved. A second
read-only comparison confirms all 105 source files, personal session rows and
planning unchanged. The genuine UI acceptance above preceded this safe stop.
No r46 next-day action or new economics work was performed. Resume only the
necessary authorized correction/validation; no successful merge/CI claim is made.

## Authorized security/CI recovery — 2026-09-09

The latest bounded Owner instruction supersedes the preceding safe-stop decision
gate, not its historical failed CI results. Current compatible versions are
Next/eslint-config-next 16.3.3, sharp 0.35.4 with libheif 1.23.2, and js-yaml 4.3.2.
Only these root fields and required transitive packages changed; package inventory,
React/Supabase and PostCSS remain unchanged. Historical Phase C/D and C3R package
identities are preserved separately from exact current package/lock assertions.
No audit exception, security-policy expiry, workflow permission or source registry
was changed. Chromium is installed before all three native browser-test jobs.

- Clean npm ci passed. Current production/full audits have critical/high/moderate
  zero and one unchanged Low advisory. The existing audit/SBOM validator passed
  with 571 components; no new waiver or extension. Low is not claimed fixed.
- 70 affected bridge/economics/security/expiry tests passed. The first complete
  run passed 1,807/1,810; its three failures were stale package identity assertions.
  Those directly coupled assertions were corrected without changing historical
  contracts; all 102 C3R-A1/P regressions subsequently passed. A direct node command
  missing the repository TS loader was corrected, not treated as a product failure.
- Typecheck and full lint passed (12 preexisting warnings outside changed files).
  Changed-file lint passed with zero warnings. Quality, taxonomy and explanation
  evaluations passed. All 162 JSON files parsed and diff checks passed.
- Next 16.3.3 production build passed with six dynamic-filesystem tracing warnings
  in unchanged dashboard/reference code. 189 production traces / 148,602 entries
  and 3,040 built artifacts contain no private root paths. Compiled Preview and
  Production GET/POST return 404 ACCESS_DENIED, zero anchors and no-store without
  consuming the request body, including enabled flags and local Host/Origin.
- Synthetic expiry tests cover before, inclusive due-day boundaries and after.
  A separate unchanged-real-registry test proves expiry becomes needs_update.
  These Date mocks are test-process only; actual source dates and OS time did not
  change. No synthetic currentness is real-source review evidence.
- Authenticated CLI GET revalidated Production-skip / Preview-build behavior,
  zero Deploy Hooks and canceled latest Production deployment. Existing CLI
  authentication also reached the c188b9f9 deployed application: GET and POST
  returned 404 ACCESS_DENIED and empty anchors (POST private/no-store). This is
  separate from the earlier unauthenticated protection responses. No new token,
  project-link write, protection change or secret output occurred. The corrected
  candidate's own Preview must still be observed after push.

Final local full suite passed 1,810/1,810 with no skip; the authoritative Learner
Loop test portion passed 710/710. Its quality/taxonomy/explanation evaluations and
the same production build passed separately; no redundant second local build is
claimed. The final manifest is 27 changed paths, with no private artifact or secret
signature detected. These are candidate-worktree executions, not native CI results.

Only after these gates passed, the corrected Next 16.3.3 launcher resumed on the
existing 127.0.0.1:3883. All four service listeners and app listener are loopback
only. Genuine existing login/session lists 15 held versions with no initial body;
Civil-law article 1 displays, its exact reference/body reopens identically, and
keyword search returns 10 results. Tamper gives 503 INTEGRITY_ERROR/empty anchors;
anonymous gives 404/empty anchors; reload clears bodies. Browser errors and
external requests remain zero. All 105 source/catalog files, six personal session
rows, planning and installation are unchanged; no r46 action or clock change.
The old vulnerable app was not resumed. Account/TLS/volumes/profile are reused.

Final remote native CI, corrected-head deployed Preview observation, independent
review and conditional merge remain pending until live GitHub/Vercel outcomes.
GitHub remains the exact-head CI/review/merge authority; no future result is
predeclared. Supplier source pins and actual source catalog remain read-only.

## Review 5149413670: proxy-before-auth correction

At 3d9082e7, all nine required native checks plus C3R-P/T/L passed, but independent
review found one P1: the global proxy could create the Supabase client/getUser and
refresh cookies before the route-only deployment denial. Earlier direct compiled
route and deployed 404 observations did not prove the complete pre-auth boundary.
That candidate was not marked Ready or merged.

The new regression first reproduced one client creation where zero was required.
The root proxy now denies only the two bridge path families before the unchanged
global auth proxy. Its shared pure environment predicate and bodyless failure
projection import neither a reader nor auth service. The page/route retain their
independent Owner checks. Encoded/trailing paths and RSC query requests are covered.
No matcher exclusion, general auth relaxation, remote configuration or policy change.

The actual proxy -> existing Supabase proxy -> route composition uses a synthetic
configured auth client to count creation/getUser/cookie refresh, not a fake bridge
permission. Preview/Production, remote synthetic auth URL, spoofed local flags and
OFF cases deny with no body consumption, cookie, client, route or reader access.
Unrelated paths still invoke normal auth/cookie handling; enabled local bridge still
requires a genuine non-demo Owner. No new secrets, user or remote request is used.
New validation and exact-head review/CI must be recorded separately from 3d9082e7.

Correction-local evidence: 39 affected proxy/bridge/browser/economics/private-route
tests passed, typecheck and zero-warning changed-file lint passed, build passed.
All 162 JSON files parsed; manifest is now 28 paths, adding only proxy.ts. The
rebuilt 189 traces / 148,602 entries / 3,040 artifacts have no private roots.
The actual compiled Next middleware handler independently denied eight page/API
GET/POST calls across Preview/Production, with zero outbound fetches and cookies,
404/empty anchors/no-store. No temporary server, remote auth or protection bypass.
The existing corrected local Owner session still lists 15 held versions and
source/session/planning preservation comparisons pass. The previous 1,810-test
full suite remains 3d9082e7 evidence; native CI and independent review on the new
commit are required before integration, not inferred from that previous head.

The pushed proxy correction ce896ebc additionally passed actual authenticated
Preview page/API GET/POST denial: deployment dpl_27a561nX1ThRGN7GhMGEcuYXt4r7,
four HTTP 404 ACCESS_DENIED responses with empty anchors and no-store. The
deployment ID/head binding was checked through authenticated read-only CLI. The
original P1 thread was resolved with the reproduction and correction evidence.
No new token, protection change or private content was used.

Its PR Contract check exposed a metadata-only mistake: the rewritten PR body
used Summary instead of the mandatory Goal heading. Goal is restored and the
unchanged local validator passes. The workflow consumes its captured PR event
body, so the final evidence/checkpoint commit also supplies a fresh push event
with the corrected contract. No workflow trigger/policy, implementation code or
dependency changes are included in that metadata closeout; all final native
checks and independent review still apply to its own exact head.
