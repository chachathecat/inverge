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
