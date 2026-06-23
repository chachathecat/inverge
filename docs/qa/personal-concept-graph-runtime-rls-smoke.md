# Personal Concept Graph Runtime RLS Smoke Verification v1

## Scope

This QA note covers the safe runtime verification harness for the learner Personal Concept Graph Supabase repository and `public.personal_concept_nodes` RLS behavior. It is a pre-write safety gate only. Production learner writes remain disabled by default. The linked Supabase runtime smoke must prove the current RPC-only write boundary before any closed-beta production enablement.

## Prior PR context

- PR #324 added the Supabase migration for `public.personal_concept_nodes`, including metadata-only columns, appraiser-only exam constraints, indexes, and own-row RLS policies for authenticated users.
- PR #325 added the Supabase-backed Personal Concept Graph repository contract, the repository adapter, memory mode as the default, and Supabase mode only when `PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase` is explicitly set. It did not add a production learner write path.
- PR #326 added the static repository-contract probe and real Supabase runtime RLS smoke harness.
- PR #327 adds helper-level execution-signal-to-graph durable write integration, but it remains closed by default and requires both `PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase` and `PERSONAL_CONCEPT_GRAPH_DURABLE_WRITES=1`.
- PR #329 adds a Today Plan durable read helper only. It remains closed by default and requires both `PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase` and `PERSONAL_CONCEPT_GRAPH_DURABLE_READS=1`; the live Today Plan rollout still requires a separate PR.
- M420 adds `public.transition_personal_concept_node_v1`, the atomic metadata-only transition RPC and transition-event audit table.
- M421A adds a forward-only RPC-only write-boundary migration. Direct authenticated insert and update are denied on `public.personal_concept_nodes`; durable concept-state writes must use the RPC.

## Why this runtime smoke is required

The schema and repository contract are necessary but not sufficient before durable learner writes. Before any capture, execution, or Today Plan route can write or read durable graph rows, and before PR #329 durable reads are enabled in a real learner environment, runtime checks must prove that the deployed Supabase project enforces the same safety boundaries as the code contract:

- default app behavior still uses the memory repository;
- Supabase mode is explicit and feature-flagged;
- persisted graph payloads are metadata-only and omit raw OCR, problem, answer, official-answer, model-answer, and score-prediction text;
- unsupported exam modes and unsupported states are rejected;
- authenticated users can select and delete only their own node rows;
- direct authenticated insert and update are denied;
- RPC transition writes still return `applied`, and identical RPC retries return `already_applied`;
- transition-event audit rows remain retained by design;
- cross-user RLS must be verified before enabling durable writes;
- anonymous clients cannot read learner graph rows.

The smoke script must never be used to claim official grading, official score prediction, official model answers, or no-review learner judgment.

## Command

Run the script only when intentionally performing the Personal Concept Graph RLS smoke:

```bash
PERSONAL_CONCEPT_GRAPH_RLS_SMOKE=1 PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase npm run check:personal-concept-graph-rls
```

The script is intentionally not a default production write path and does not modify learner capture, execution result controls, Today Plan, instructor grading, payment, entitlement, archive, notification, or dashboard routes. PR #329 similarly adds helper-level durable reads only; it does not wire the live `/app` Today Plan page.

## Required environment variables

The static repository-contract probe requires the explicit smoke flag and Supabase repository mode:

- `PERSONAL_CONCEPT_GRAPH_RLS_SMOKE=1`
- `PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase`

Real Supabase runtime RLS checks require the public Supabase client environment already used by the app:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Real cross-user RLS checks additionally require two safe, test-only authenticated users:

- `PERSONAL_CONCEPT_GRAPH_RLS_USER_A_ID`
- `PERSONAL_CONCEPT_GRAPH_RLS_USER_A_ACCESS_TOKEN`
- `PERSONAL_CONCEPT_GRAPH_RLS_USER_B_ID`
- `PERSONAL_CONCEPT_GRAPH_RLS_USER_B_ACCESS_TOKEN`

Do not provide, print, or require `SUPABASE_SERVICE_ROLE_KEY` for this smoke. The harness uses anon-key clients plus test-user access tokens so RLS is exercised instead of bypassed.

Production-like environments (`NODE_ENV=production` or `VERCEL_ENV=production`) require an additional explicit override, `PERSONAL_CONCEPT_GRAPH_RLS_ALLOW_PRODUCTION_SMOKE=1`, because the script may create and delete test-only metadata rows.

## Expected outcomes

### Pass

A full pass reports `passed_static_repository_contract_probe` and `passed_runtime_rls_smoke`. A full pass means the harness verified:

- default adapter mode is memory;
- Supabase mode activates only with `PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase`;
- the Supabase adapter exposes the RPC write method and no direct upsert method;
- the Supabase repository builds metadata-only payloads;
- forbidden raw fields are rejected;
- unknown columns are not passed through;
- unsupported exam modes are rejected;
- direct authenticated insert is denied (`direct_authenticated_insert_denied`);
- direct authenticated update is denied (`direct_authenticated_update_denied`);
- test user A can write concept state through `transition_personal_concept_node_v1` (`rpc_transition_applied`);
- identical RPC retry returns `already_applied`;
- test user A can select and delete only own node rows;
- test user A cannot read test user B's node row (`cross_user_node_read_denied`);
- test user A cannot read test user B's transition-event audit row (`cross_user_transition_event_read_denied`);
- anonymous clients cannot read graph rows or transition-event rows (`anonymous_node_read_denied`, `anonymous_transition_event_read_denied`);
- transition-event audit rows are retained by design.

For anonymous read denial, either outcome is acceptable: the anon query returns zero rows, or the database returns a permission-denied/insufficient-privilege error such as SQLSTATE `42501`. No anon `SELECT` table grant is required for this smoke. Do not add public or anon table grants just to satisfy the smoke script; permission denied is a stricter acceptable proof that anonymous clients cannot read learner graph rows.

### Refusal / failure

- Missing `PERSONAL_CONCEPT_GRAPH_RLS_SMOKE=1` reports a refusal and exits non-zero.
- Missing `PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase` reports a refusal and exits non-zero.
- Missing Supabase URL, anon key, or test-auth env names reports `failed_runtime_rls_missing_required_env` and exits non-zero. This is fail-closed, not an intentional skip.
- Production-like environments without `PERSONAL_CONCEPT_GRAPH_RLS_ALLOW_PRODUCTION_SMOKE=1` report a refusal and exit non-zero.
- Contract-probe failures or runtime RLS failures exit non-zero.

## Runtime Evidence - 2026-06-23

Owner-run non-production verification passed after the RPC-only write-boundary migration was applied through the approved owner workflow. This repository records only safe aggregate evidence. No secret values, tokens, user IDs, row bodies, endpoints, or raw learner data are recorded.

Initial runtime attempts that returned `PGRST303` were classified as authentication-token failures. Fresh authenticated sessions were obtained, and the runtime smokes were rerun successfully. The Node experimental-loader and module-type warnings observed during the runs were pre-existing, non-blocking warnings.

Migration and privilege evidence:

| Check | Result | Evidence |
| --- | --- | --- |
| RPC-only forward migration application | PASS | `202606232130_personal_concept_graph_rpc_only_write_boundary.sql` was applied in the non-production Supabase project by the owner. |
| Migration history alignment | PASS | The non-production history aligned on the prerequisite `20260605`, M420 `20260623`, and M421A `202606232130` migration timestamps. |
| Authenticated `SELECT` | PASS | Authenticated test users could read their own metadata-only concept node rows. |
| Authenticated `DELETE` | PASS | Authenticated test users could delete their own synthetic concept node rows for cleanup. |
| Direct authenticated `INSERT` denial | PASS | Direct table insert into `personal_concept_nodes` was denied for authenticated users. |
| Direct authenticated `UPDATE` denial | PASS | Direct table update on `personal_concept_nodes` was denied for authenticated users. |
| Authenticated RPC `EXECUTE` | PASS | Authenticated test users could execute `transition_personal_concept_node_v1`. |
| Anon/public RPC execution denial | PASS | Unauthenticated/public execution was denied; no public RPC write path was available. |
| Static repository contract probe | PASS | Supabase adapter exposed the RPC transition write method and no direct upsert write method. |

Runtime smoke evidence:

| Check | Result |
| --- | --- |
| RPC transition `applied` | PASS |
| Identical retry `already_applied` | PASS |
| Account A/B node RLS | PASS |
| Account A/B transition-event RLS | PASS |
| Anonymous node read denial | PASS |
| Anonymous transition-event read denial | PASS |
| Atomic transition runtime smoke | PASS |
| Concurrent final database row newer-wins | PASS |
| Durable graph read runtime smoke | PASS |
| RPC-seeded durable rows | PASS |
| Today Plan maximum three actions | PASS |
| Metadata-only boundary | PASS |
| Cross-user durable read denial | PASS |
| Synthetic node cleanup | PASS |
| Transition-event audit rows retained by design | PASS |
| Production durable read/write flags remain off | PASS |
| No secrets, tokens, user IDs, or row bodies printed | PASS |

All three runtime smokes passed after fresh authenticated sessions were obtained:

- RPC-only runtime RLS smoke;
- atomic transition runtime smoke;
- durable graph read runtime smoke.

Codex did not apply SQL remotely, did not run the live Supabase smokes, and did not handle secrets. This section records owner-supplied non-production evidence for PR #422 review.

## PR #327 durable write posture

PR #327 may call the durable write helper only after the helper validates metadata-only execution signals and confirms both feature flags are explicitly enabled:

- `PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase`
- `PERSONAL_CONCEPT_GRAPH_DURABLE_WRITES=1`

Default closed-beta behavior remains memory/no durable write. The helper must not persist raw OCR, problem, learner answer, copyrighted/source text, official-answer/model-answer text, score predictions, or instructor comments. Production enablement for learners still requires a later closed-beta rollout PR after the normal learner-loop, taxonomy, build, lint, and smoke checks pass.

## PR #329 durable read helper posture

PR #329 may call the durable read helper only after the helper confirms both feature flags are explicitly enabled:

- `PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase`
- `PERSONAL_CONCEPT_GRAPH_DURABLE_READS=1`

Default closed-beta behavior remains unchanged: memory/default Today Plan paths stay active, and durable graph reads are disabled. The helper reads repository metadata with `listPersonalConceptNodesForToday`, converts it through the existing Concept Graph Today Plan adapter and Today Plan source-union boundary, and returns at most 3 metadata-only source-union actions. It must not return raw database rows or raw OCR/problem/answer/source text, official answers, model answers, score predictions, or instructor comments.

The linked runtime RLS pass remains required before enabling durable reads in any real learner environment, and the live Today Plan rollout still requires a separate PR.

## Required verification before enabling durable writes or reads

Before any production learner write path is enabled, Inverge must have documented evidence from a safe Supabase environment that:

1. the full runtime smoke reports `passed_runtime_rls_smoke`;
2. cross-user RLS must be verified before enabling durable writes and has been verified with two distinct authenticated test users;
3. direct authenticated insert and update have been denied;
4. RPC transition write and identical retry have been verified;
5. anon read denial has been verified for node and transition-event tables;
6. metadata-only, exam-mode, and state constraints have been verified against the deployed database through static checks and RPC runtime behavior;
7. the live app still avoids storing raw OCR/problem/answer text, official answers, model answers, and official score predictions;
8. capture, execution, and Today Plan durable-write/read changes remain behind explicit product and repository flags until separately reviewed.

Production learner writes and live Today Plan durable reads remain disabled in this PR.

## PR #330 durable read runtime smoke

PR #330 adds a separate runtime smoke harness for the PR #329 durable Today Plan read helper. This harness is verification-only: it does not wire durable reads into the live learner `/app` Today Plan route and it does not enable durable reads by default.

The durable read smoke proves, against a real Supabase project and normal authenticated RLS paths, that metadata-only `personal_concept_nodes` rows can be read by the helper without leaking raw database rows or raw learner/copyrighted content into Today Plan actions.

### Required environment variables

The harness refuses to start unless all three explicit runtime gates are set:

- `PERSONAL_CONCEPT_GRAPH_DURABLE_READ_SMOKE=1`
- `PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase`
- `PERSONAL_CONCEPT_GRAPH_DURABLE_READS=1`

Real Supabase execution also requires the public app Supabase client configuration:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Cross-user RLS verification requires two safe, test-only authenticated users:

- `PERSONAL_CONCEPT_GRAPH_DURABLE_READ_USER_A_ID`
- `PERSONAL_CONCEPT_GRAPH_DURABLE_READ_USER_A_ACCESS_TOKEN`
- `PERSONAL_CONCEPT_GRAPH_DURABLE_READ_USER_B_ID`
- `PERSONAL_CONCEPT_GRAPH_DURABLE_READ_USER_B_ACCESS_TOKEN`

Do not use a service role key for this smoke. The point of the harness is to exercise ordinary authenticated RLS, not to bypass RLS.

### Exact command

```bash
PERSONAL_CONCEPT_GRAPH_DURABLE_READ_SMOKE=1 PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase PERSONAL_CONCEPT_GRAPH_DURABLE_READS=1 npm run check:personal-concept-graph-durable-read
```

Production-like environments (`NODE_ENV=production` or `VERCEL_ENV=production`) require the additional explicit override below because the script creates and deletes test-only metadata rows:

```bash
PERSONAL_CONCEPT_GRAPH_DURABLE_READ_ALLOW_PRODUCTION_SMOKE=1
```

### Expected success output

A successful run prints JSON with this shape:

```json
{
  "status": "passed_durable_graph_read_runtime_smoke",
  "verified": [
    "explicit_flags_required",
    "supabase_repository_mode",
    "metadata_only_rows",
    "helper_returns_max_3_actions",
    "no_raw_text_leak",
    "unsupported_exam_rejection",
    "cross_user_read_denied",
    "cleanup_attempted"
  ]
}
```

This means the harness seeded metadata-only rows for test user A through `transition_personal_concept_node_v1`, invoked `maybeBuildTodayPlanActionsFromDurableConceptGraph` with a Supabase-mode repository adapter, verified that returned actions are not skipped, verified `repositoryMode: "supabase"`, enforced max-three actions, required every action to be `metadataOnly` and `isPrimaryTask`, checked that raw DB-row fields are not returned, rejected unsupported exam modes, verified test user B cannot read test user A rows through the normal RLS path, and attempted cleanup.

After M421A, this harness seeds synthetic metadata-only nodes through `transition_personal_concept_node_v1` rather than direct table insert/upsert. It still deletes synthetic node rows through the user-owned lifecycle path after verification. Transition-event audit rows are retained by design.

### Secret-handling warnings

- Do **not** paste Supabase access tokens, anon keys, service role keys, database passwords, refresh tokens, or user JWTs into GitHub issues, pull request comments, Codex prompts, ChatGPT prompts, screenshots, or committed files.
- Keep smoke credentials in the local shell, CI secret store, or staging secret manager only.
- Test users should be deleted or their credentials rotated after the smoke run, especially after any shared staging run.
- Never commit raw OCR text, problem text, learner answer text, copyrighted/source text, official-answer text, model-answer text, score predictions, or instructor comments as Personal Concept Graph smoke data.

### Rollout warning

Durable reads must remain disabled in production until a separate gated Today Plan integration PR. A passing PR #330 smoke is necessary evidence for rollout, but it is not itself product enablement.

## PR #331 gated Today Plan integration QA note

PR #331 uses the passed PR #330 durable read runtime smoke as prerequisite evidence, including:

- `passed_durable_graph_read_runtime_smoke`
- max 3 metadata-only Today Plan actions
- no raw text leak
- unsupported exam rejection
- cross-user read denial
- cleanup attempted

This PR is not a broad production rollout. Durable reads remain disabled by default and are eligible to contribute to learner Today Plan source union only when all explicit closed-beta gates are set:

```bash
PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase
PERSONAL_CONCEPT_GRAPH_DURABLE_READS=1
PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT=1
```

The integration also requires an authenticated learner `userId` and a supported appraiser exam mode (`first` or `second`). Repository mode, durable reads, or rollout alone are not sufficient.

Expected fallback behavior:

- missing or disabled gates skip the durable helper without touching Supabase;
- durable helper errors fall back to existing Today Plan actions;
- unsafe/raw durable output is rejected and falls back without surfacing raw OCR/problem/answer/source text, official/model-answer text, score predictions, instructor comments, or raw DB rows;
- final learner Today Plan source-union output remains capped at 3 primary metadata-only actions.

Rollback for the Today Plan integration is flag-only:

```bash
PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT=0
# and/or
PERSONAL_CONCEPT_GRAPH_DURABLE_READS=0
```

Do not set `PERSONAL_CONCEPT_GRAPH_DURABLE_READS` in production as part of PR #331. Production enablement requires a separate approval for the explicit rollout gate after learner-loop, closed-beta readiness, taxonomy, build, lint, and relevant Supabase smoke checks pass.

## PR #332 durable Today Plan staging rollout QA

The staging/closed-beta rollout checklist for the gated durable Personal Concept Graph → Today Plan path lives at `docs/qa/durable-today-plan-staging-rollout-checklist.md`.

Before enabling the Today Plan rollout in a new staging environment, re-run this runtime RLS smoke and the durable read runtime smoke with fresh disposable learner users. The learner route remains staging-only and requires all of these flags before durable metadata can contribute to Today Plan candidates:

```bash
PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase
PERSONAL_CONCEPT_GRAPH_DURABLE_READS=1
PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT=1
```

Production durable Today Plan reads must remain off unless a separate production approval is completed:

```bash
PERSONAL_CONCEPT_GRAPH_DURABLE_READS=0
PERSONAL_CONCEPT_GRAPH_TODAY_PLAN_ROLLOUT=0
```

Unset production values are also acceptable. Do not use service role keys for learner runtime smoke. Rotate or delete disposable test users and tokens after every manual smoke run, and do not paste tokens, anon keys, service role keys, JWTs, database passwords, or screenshots containing secrets into GitHub, Codex, ChatGPT, or shared QA notes.
