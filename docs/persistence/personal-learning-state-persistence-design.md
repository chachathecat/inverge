# Personal Learning State Persistence Design v1

## Purpose

This design makes PR #340's deterministic, metadata-only personal learning state durable for closed-beta staging while keeping production durable writes disabled by default.

The durable state supports the learner operating loop:

`input → diagnosis → tracking → prediction → recommendation → execution → retry/rewrite`

It stores only compact learning-state metadata for 감정평가사 1차 and 감정평가사 2차 concept nodes. It is not a raw answer archive, OCR store, grading product, score prediction system, or official answer service.

## Table proposal

Table: `personal_learning_states`

Suggested columns:

| Column | Type | Purpose |
| --- | --- | --- |
| `id` | `uuid primary key` | Stable row identifier. |
| `user_id` | `uuid not null` | Authenticated learner owner. |
| `concept_node_id` | `text not null` | Curriculum concept node id. |
| `exam_mode` | `text not null` | `first` or `second` only. |
| `subject` | `text not null` | Metadata subject label. |
| `status` | `text not null` | PR #340 learning status. |
| `previous_status` | `text` | Prior PR #340 learning status when known. |
| `confidence_avg` | `numeric` | Optional aggregate confidence metadata. |
| `wrong_count` | `int default 0` | Metadata count only. |
| `correct_streak` | `int default 0` | Metadata count only. |
| `recovery_score` | `numeric` | Optional aggregate recovery signal. |
| `last_seen_at` | `timestamptz` | Last metadata event timestamp. |
| `next_review_at` | `timestamptz` | Spaced retrieval/rewrite due timestamp. |
| `last_source_event_type` | `text` | `capture`, `review`, or `session` metadata. |
| `last_task_type` | `text` | Safe task type metadata. |
| `last_reason` | `text` | Deterministic transition reason id. |
| `priority_score` | `numeric` | Ranking metadata. |
| `metadata` | `jsonb default '{}'` | Strict metadata-only extensions. |
| `created_at` | `timestamptz default now()` | Creation timestamp. |
| `updated_at` | `timestamptz default now()` | Last update timestamp. |

Required constraints:

- `unique(user_id, concept_node_id)`.
- `exam_mode in ('first', 'second')`.
- `status in ('unknown', 'confused', 'wrong', 'confident_wrong', 'recovering', 'stable')`.
- `previous_status` is either null or one of the same supported statuses.
- Counts are non-negative.
- Required text fields are non-empty after trimming.
- `metadata` is an object and must remain metadata-only.
- No raw text columns are added.

## Metadata-only field list

The table may store:

- user/concept ownership ids: `user_id`, `concept_node_id`.
- learner scope metadata: `exam_mode`, `subject`.
- deterministic PR #340 state metadata: `status`, `previous_status`, `last_reason`.
- aggregate counters/scores: `confidence_avg`, `wrong_count`, `correct_streak`, `recovery_score`, `priority_score`.
- scheduling metadata: `last_seen_at`, `next_review_at`.
- source/task metadata: `last_source_event_type`, `last_task_type`.
- controlled JSON metadata containing only derived flags, buckets, ids, counters, and version markers.

Forbidden in both columns and `metadata` recursively:

- raw OCR text or OCR payloads.
- raw learner answers, rewrites, handwritten text, or uploaded file text.
- problem/question/source/copyright/official/model answer text.
- score, score prediction, pass/fail, instructor/grader fields, or final-judgment claims.

## RLS own-row policy

RLS must be enabled on `public.personal_learning_states`.

Authenticated learners may only operate on rows where:

```sql
auth.uid() is not null and user_id = auth.uid()
```

Policies:

- Select own rows only.
- Insert own rows only via `with check`.
- Update own rows only via both `using` and `with check`.
- Delete own rows only for test cleanup and account-data cleanup when the project convention allows learner-owned delete.

There is no public read policy, no broad anon grant, and no cross-user access path.

## No service role learner routes

Learner routes and learner durable helpers must use the authenticated Supabase server-client pattern backed by the learner session. They must not import `lib/auth/admin`, read `SUPABASE_SERVICE_ROLE_KEY`, or create service-role clients.

Service role usage remains out of scope for learner personal learning state reads/writes.

## No raw OCR/problem/answer/source text

Durable personal learning state writes are rejected before persistence if any object recursively contains raw/copyright/answer/problem/question/source/official/model/score/instructor-style fields.

The table itself also avoids raw text columns. `metadata` is constrained to an object and checked for forbidden raw keys recursively by migration-level guardrails.

## Feature gates

Default behavior is in-memory only.

Supabase mode is active only when:

- `PERSONAL_LEARNING_STATE_REPOSITORY=supabase`

Durable writes require all of:

- `PERSONAL_LEARNING_STATE_REPOSITORY=supabase`
- `PERSONAL_LEARNING_STATE_DURABLE_WRITES=1`

Durable reads require all of:

- `PERSONAL_LEARNING_STATE_REPOSITORY=supabase`
- `PERSONAL_LEARNING_STATE_DURABLE_READS=1`

Production durable writes are therefore disabled by default unless explicitly enabled by environment configuration after staging validation.

## Runtime smoke plan

Script: `scripts/verify-personal-learning-state-rls.mjs`

The smoke check must:

1. Refuse to run unless `PERSONAL_LEARNING_STATE_RLS_SMOKE=1`.
2. Refuse runtime RLS verification unless `PERSONAL_LEARNING_STATE_REPOSITORY=supabase`.
3. Require fresh test user A/B ids and access tokens.
4. Upsert a metadata-only row for user A.
5. Confirm user A can read the own row.
6. Confirm user B cannot read user A's row.
7. Confirm unsupported `exam_mode` and `status` are rejected.
8. Attempt cleanup independently for both users.
9. Print JSON only and never print tokens or secrets.

Expected success status:

```json
{
  "status": "passed_personal_learning_state_rls_smoke",
  "verified": [
    "explicit_flag_required",
    "supabase_repository_mode",
    "own_row_read_allowed",
    "cross_user_read_denied",
    "metadata_only_rows",
    "unsupported_exam_rejected",
    "unsupported_status_rejected",
    "cleanup_attempted"
  ]
}
```

## Rollback plan

1. Disable writes immediately by unsetting `PERSONAL_LEARNING_STATE_DURABLE_WRITES` or setting it to any value other than `1`.
2. Disable reads by unsetting `PERSONAL_LEARNING_STATE_DURABLE_READS`.
3. Return repository mode to memory by unsetting `PERSONAL_LEARNING_STATE_REPOSITORY` or setting it to `memory`.
4. Keep the table and RLS policies in place while investigating; learner flows should continue through non-durable state.
5. If data cleanup is needed, delete only user-owned metadata rows by `user_id`/`concept_node_id`; do not touch existing durable concept graph tables or policies.
