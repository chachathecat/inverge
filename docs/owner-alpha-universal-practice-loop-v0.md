# Owner-only Universal Appraisal Practice Study Loop v0

This alpha reuses the existing `/problem-snap` route family and the existing Review OS persistence spine. It is private by default: the server-only `OWNER_ALPHA_UNIVERSAL_PRACTICE_ENABLED=true` flag and an authenticated `ALPHA_ADMIN_EMAILS` match are both required. No public navigation points to the owner query key.

## Product boundary

`PracticeProblemModel` is method-generic. The same compiler, state machine, persistence port, API, and learner UI support cost/depreciation, comparison/allocation/adjustment, income/capitalization/present-value, and mixed or unresolved problems. The three synthetic families are regression fixtures, not hard-coded product content. A third-party answer key is never required.

The learner flow is:

1. image, PDF, or text capture;
2. direct confirmation of OCR-critical text, requirements, roles, dates, numbers, and units;
3. an independent attempt with elapsed time and confidence before any answer exposure;
4. four bounded hints followed by an explicit full-reference request;
5. L1/L2/L3 content labelled only `AI 학습용 기준안`;
6. per-claim provenance and deterministic calculation checks;
7. exactly one biggest gap;
8. a learner rewrite or recalculation;
9. one numeric or condition variant;
10. a fixed 24-hour D+1 Queue item plus Today and Learning Record linkage.

Question Chain, Misconception Graph, Root Cause Candidate, and Question Replay Link are native contract fields. v0 stores and renders a small list representation only; it does not implement a graph visualizer or a long-horizon causal engine.

## Canonical data and persistence boundary

Only the normalized Inverge contract and learner-owned rows are canonical. Gemini responses are adapter input and are normalized before storage; a provider cannot promote its own claim to official or deterministic evidence.

| Native data | Existing learner-owned table | Boundary |
| --- | --- | --- |
| full practice session and learning evidence | `exam_sessions` | owner RLS; contract/version validation; record-version plus `updated_at` CAS |
| independent first attempt | `answer_submissions` | stored before assistance, with `answerExposure=none` |
| rewrite or recalculation | `rewrite_submissions` | learner text stays in raw payload |
| Learning Record | `wrong_answer_items` | existing Records source shape |
| fixed D+1 task | `review_queue_items` | existing `wrong_answer_os` / `alpha` / `wrong_answer` Queue shape |
| Today linkage | `action_seeds` | existing `next_action` seed shape |
| metadata-only success/follow-up events | `usage_events` | no raw problem, attempt, question, or rewrite text |

No migration is added. API requests use the authenticated Supabase cookie client and re-check its user ID; every query also constrains `user_id`. Existing `auth.uid() = user_id` RLS policies remain the database privacy boundary. Completion first claims a native `completion_pending` record version, then writes deterministic projection IDs, and becomes `completed` only after Queue, Today, Record, and metadata events succeed. An interrupted projection is resumed from the learner-owned pending contract after refresh; a competing stale completion cannot write projections before winning CAS.

## Verification and failure policy

Every critical problem number starts as `problem_given`. AI claims begin as `ai_inference` or `unresolved_needs_review`; only native deterministic code can promote a supported calculation to `deterministically_validated`. The six exposed states are:

- `problem_given`
- `official_source_grounded`
- `deterministically_validated`
- `cross_checked_ai`
- `ai_inference`
- `unresolved_needs_review`

The generic validator supports expression ordering, sums, subtraction, ratios, percentage direction, unit conversion, elapsed periods, rounding/truncation/significant digits, area × unit price, allocation/residual, index ratios, present value, annuity factors, capitalization, and remaining-life ratios. A critical AI/deterministic conflict withholds the entire AI reference and all hints. Unsupported or methodologically disputed claims remain unresolved; mixed method selection is not forced.

Provider generation is guarded by a short native CAS lease, so concurrent or hostile retries cannot duplicate a live model call. Provider timeout, entitlement quota, invalid output, or outage does not create a success usage event or promote AI evidence. The native session receives a low-confidence unresolved gap and one condition variant, so the learner can still save the independent attempt, rewrite/recalculate, schedule fixed D+1, and reach Queue, Today, and Records. Existing learner data remains readable independently of the provider.

The exact-head workflow applies the current native prerequisite migrations plus the frozen S233A migration in network-isolated Postgres, then proves own-row inserts and two-user isolation across the seven reused tables. It separately runs the shared runtime through the private existing route at mobile, tablet, and desktop widths with serious/critical Axe findings and overflow treated as failures. Only scalar metadata is uploaded as evidence.

## Focused verification

```bash
npm run test -- tests/owner-alpha-universal-practice-loop-v0.test.mjs --workers=1
npm run typecheck
npm run lint
npm run build
```

The focused suite covers all three smoke families through the same runtime, attempt/exposure separation, L1/L2/L3 reveal, every deterministic primitive, conflict fail-closed behavior, timeout fallback, method abstention, hostile provider self-promotion, Question Replay linkage, fixed D+1, and the existing owner/RLS route and storage boundaries.
