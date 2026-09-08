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

Real Owner UI activation and integration remain separately gated. Before an
authorized run verify code pins, private root/catalog checksum and loopback Docker/
PC listeners. Keep the existing account/session ownership controls. Do not collect,
change catalog/backups/claims or reach any remote DB/Storage/provider.

Disable the independent bridge flag to hide the page/entry and deny API access
before private reads. There is no DB migration, stored row or content installation
to undo. Preserve all economics records and existing server/browser/cache.

## Current evidence

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
Therefore the old bridge prohibition on Preview deployment is a push/Draft PR
gate, not a writer handoff problem. The Owner was asked only about OFF-state
automatic Preview CI; no settings were changed and no push was made.

Remote native CI, independent exact-head review, Draft PR, merge and real Owner
activation are NOT completed. This file is not a green CI/review/real-use receipt.
GitHub remains authoritative. The previous supplier 45-sample test is separate
from the new 15-law bridge execution.
