# Personal Concept Graph Runtime RLS Smoke Verification v1

## Scope

This QA note covers the safe runtime verification harness for the learner Personal Concept Graph Supabase repository and `public.personal_concept_nodes` RLS behavior. It is a pre-write safety gate only. Production learner writes remain disabled by default. The linked Supabase runtime smoke has passed for the test environment, but closed-beta production enablement still requires a later rollout PR.

## Prior PR context

- PR #324 added the Supabase migration for `public.personal_concept_nodes`, including metadata-only columns, appraiser-only exam constraints, indexes, and own-row RLS policies for authenticated users.
- PR #325 added the Supabase-backed Personal Concept Graph repository contract, the repository adapter, memory mode as the default, and Supabase mode only when `PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase` is explicitly set. It did not add a production learner write path.
- PR #326 added the static repository-contract probe and real Supabase runtime RLS smoke harness.
- PR #327 adds helper-level execution-signal-to-graph durable write integration, but it remains closed by default and requires both `PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase` and `PERSONAL_CONCEPT_GRAPH_DURABLE_WRITES=1`.
- PR #329 adds a Today Plan durable read helper only. It remains closed by default and requires both `PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase` and `PERSONAL_CONCEPT_GRAPH_DURABLE_READS=1`; the live Today Plan rollout still requires a separate PR.

## Why this runtime smoke is required

The schema and repository contract are necessary but not sufficient before durable learner writes. Before any capture, execution, or Today Plan route can write or read durable graph rows, and before PR #329 durable reads are enabled in a real learner environment, runtime checks must prove that the deployed Supabase project enforces the same safety boundaries as the code contract:

- default app behavior still uses the memory repository;
- Supabase mode is explicit and feature-flagged;
- persisted graph payloads are metadata-only and omit raw OCR, problem, answer, official-answer, model-answer, and score-prediction text;
- unsupported exam modes and unsupported states are rejected;
- authenticated users can operate only on their own rows;
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

The static repository-contract probe requires only the explicit smoke flag:

- `PERSONAL_CONCEPT_GRAPH_RLS_SMOKE=1`

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

The linked Supabase smoke environment has now reported `passed_static_repository_contract_probe` and `passed_runtime_rls_smoke`. A full pass means the harness verified:

- default adapter mode is memory;
- Supabase mode activates only with `PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase`;
- the Supabase repository builds metadata-only payloads;
- forbidden raw fields are rejected;
- unknown columns are not passed through;
- unsupported exam modes are rejected;
- test user A can insert, select, update, and delete only an own row (`own_insert_select_update_delete`);
- test user A cannot read test user B's row (`cross_user_read_denied`);
- anonymous clients cannot read graph rows (`anon_read_denied`);
- `metadata_only=true`, appraiser exam-mode, and state constraints are enforced by the database (`metadata_only_constraint`, `exam_mode_constraint`, `state_constraint`).

For anonymous read denial, either outcome is acceptable: the anon query returns zero rows, or the database returns a permission-denied/insufficient-privilege error such as SQLSTATE `42501`. No anon `SELECT` table grant is required for this smoke. Do not add public or anon table grants just to satisfy the smoke script; permission denied is a stricter acceptable proof that anonymous clients cannot read learner graph rows.

### Intentional skip

If Supabase URL/anon-key env vars are unavailable, the script reports `skipped_runtime_rls_due_missing_env` after the static contract probe. This is an intentional skip, not RLS success.

If public Supabase env vars exist but two test-auth users are not configured, the script reports `skipped_runtime_rls_due_missing_test_auth`. This is also an intentional skip, not RLS success.

A PR or deployment note must not claim runtime cross-user RLS success unless `passed_runtime_rls_smoke` appears in the script output.

### Refusal / failure

- Missing `PERSONAL_CONCEPT_GRAPH_RLS_SMOKE=1` reports a refusal and exits non-zero.
- Production-like environments without `PERSONAL_CONCEPT_GRAPH_RLS_ALLOW_PRODUCTION_SMOKE=1` report a refusal and exit non-zero.
- Contract-probe failures or runtime RLS failures exit non-zero.

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
3. anon read denial has been verified;
4. metadata-only, exam-mode, and state constraints have been verified against the deployed database;
5. the live app still avoids storing raw OCR/problem/answer text, official answers, model answers, and official score predictions;
6. capture, execution, and Today Plan durable-write/read changes remain behind explicit product and repository flags until separately reviewed.

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

This means the harness inserted/upserted metadata-only rows for test user A through an authenticated Supabase client, invoked `maybeBuildTodayPlanActionsFromDurableConceptGraph` with a Supabase-mode repository adapter, verified that returned actions are not skipped, verified `repositoryMode: "supabase"`, enforced max-three actions, required every action to be `metadataOnly` and `isPrimaryTask`, checked that raw DB-row fields are not returned, rejected unsupported exam modes, verified test user B cannot read test user A rows through the normal RLS path, and attempted cleanup.

### Secret-handling warnings

- Do **not** paste Supabase access tokens, anon keys, service role keys, database passwords, refresh tokens, or user JWTs into GitHub issues, pull request comments, Codex prompts, ChatGPT prompts, screenshots, or committed files.
- Keep smoke credentials in the local shell, CI secret store, or staging secret manager only.
- Test users should be deleted or their credentials rotated after the smoke run, especially after any shared staging run.
- Never commit raw OCR text, problem text, learner answer text, copyrighted/source text, official-answer text, model-answer text, score predictions, or instructor comments as Personal Concept Graph smoke data.

### Rollout warning

Durable reads must remain disabled in production until a separate gated Today Plan integration PR. A passing PR #330 smoke is necessary evidence for rollout, but it is not itself product enablement.
