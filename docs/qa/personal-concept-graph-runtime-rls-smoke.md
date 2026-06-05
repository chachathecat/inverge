# Personal Concept Graph Runtime RLS Smoke Verification v1

## Scope

This QA note covers the safe runtime verification harness for the learner Personal Concept Graph Supabase repository and `public.personal_concept_nodes` RLS behavior. It is a pre-write safety gate only. Production learner writes remain disabled.

## Prior PR context

- PR #324 added the Supabase migration for `public.personal_concept_nodes`, including metadata-only columns, appraiser-only exam constraints, indexes, and own-row RLS policies for authenticated users.
- PR #325 added the Supabase-backed Personal Concept Graph repository contract, the repository adapter, memory mode as the default, and Supabase mode only when `PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase` is explicitly set. It did not add a production learner write path.

## Why this runtime smoke is required

The schema and repository contract are necessary but not sufficient before durable learner writes. Before any capture, execution, or Today Plan route can write or read durable graph rows, runtime checks must prove that the deployed Supabase project enforces the same safety boundaries as the code contract:

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

The script is intentionally not a default production write path and does not modify learner capture, execution result controls, Today Plan, instructor grading, payment, entitlement, archive, notification, or dashboard routes.

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

A full pass reports `passed_static_repository_contract_probe` and `passed_runtime_rls_smoke`. That means the harness verified:

- default adapter mode is memory;
- Supabase mode activates only with `PERSONAL_CONCEPT_GRAPH_REPOSITORY=supabase`;
- the Supabase repository builds metadata-only payloads;
- forbidden raw fields are rejected;
- unknown columns are not passed through;
- unsupported exam modes are rejected;
- test user A can insert, select, update, and delete only an own row;
- test user A cannot read test user B's row;
- anonymous clients cannot read graph rows;
- `metadata_only=true`, appraiser exam-mode, and state constraints are enforced by the database.

For anonymous read denial, either outcome is acceptable: the anon query returns zero rows, or the database returns a permission-denied/insufficient-privilege error such as SQLSTATE `42501`. No anon `SELECT` table grant is required for this smoke. Do not add public or anon table grants just to satisfy the smoke script; permission denied is a stricter acceptable proof that anonymous clients cannot read learner graph rows.

### Intentional skip

If Supabase URL/anon-key env vars are unavailable, the script reports `skipped_runtime_rls_due_missing_env` after the static contract probe. This is an intentional skip, not RLS success.

If public Supabase env vars exist but two test-auth users are not configured, the script reports `skipped_runtime_rls_due_missing_test_auth`. This is also an intentional skip, not RLS success.

A PR or deployment note must not claim runtime cross-user RLS success unless `passed_runtime_rls_smoke` appears in the script output.

### Refusal / failure

- Missing `PERSONAL_CONCEPT_GRAPH_RLS_SMOKE=1` reports a refusal and exits non-zero.
- Production-like environments without `PERSONAL_CONCEPT_GRAPH_RLS_ALLOW_PRODUCTION_SMOKE=1` report a refusal and exit non-zero.
- Contract-probe failures or runtime RLS failures exit non-zero.

## Required verification before enabling durable writes

Before any production learner write path is enabled, Inverge must have documented evidence from a safe Supabase environment that:

1. the full runtime smoke reports `passed_runtime_rls_smoke`;
2. cross-user RLS must be verified before enabling durable writes and has been verified with two distinct authenticated test users;
3. anon read denial has been verified;
4. metadata-only, exam-mode, and state constraints have been verified against the deployed database;
5. the live app still avoids storing raw OCR/problem/answer text, official answers, model answers, and official score predictions;
6. capture, execution, and Today Plan durable-write changes remain behind explicit product and repository flags until separately reviewed.

Production learner writes remain disabled in this PR.
