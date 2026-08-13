# WCV-C2 First Trusted Repair Validation

This document records the source-side acceptance contract. Exact-head run IDs,
artifact digest, walkthrough durations, and final check conclusions are added
to PR #716 after the final candidate workflow completes.

## Acceptance matrix

| Issue | Resulting-on-merge result | Primary evidence |
|---|---|---|
| #702 | complete | rights manifests, eligible/denied classes, release transitions, 21-item inventory, hostile rights/near-copy/no-promotion tests |
| #703 | complete | server-owned episode, pre-help commitment, max-three/top-one gaps, polarity-aware anchors, smallest scaffold, one bounded append-only partial retry and guided/deferred exits |
| #704 | complete | seven distinct fixtures per subject and 18 non-Owner-adjudicated Gold candidates across nine families |
| #705 | complete | isolated forced-RLS storage, CAS/RPC repository, allowlisted API, mobile UI and full runtime/recovery gate |

## #714 C2 allocation matrix

| Exact allocation | Source and runtime evidence |
|---|---|
| `adaptive_expertise_controller` | deterministic controller selects one of six repair paths from evidence sufficiency, input mode, and confidence |
| `cognitive_load_budget` | at most three gap candidates, one primary gap, one initial scaffold, bounded assistance levels |
| `concept_repair_need_decision` | deterministic `required`, `optional`, or `blocked`, including `INSUFFICIENT_EVIDENCE` |
| `concept_repair_input_modes_and_private_artifact_boundary` | typed/photo/PDF/voice/structured deterministic drafts and append-only service-only bodies |
| `concept_progression_gate_and_three_continue_semantics` | server state gate plus the three exact continuation commands |
| `episode_metacognitive_prediction_and_self_diagnosis` | prediction and self-diagnosis both precede server diagnosis and help |
| `initial_scaffold_fading_and_control_transfer` | assistance 0→1, independent reconstruction, honest level-3 guided exit |
| `same_session_reconstruction_application_and_no_shortcut_invariants` | repair required before verification; save/upload/view/skip/defer/guided cannot manufacture success |

## Evidence boundary

- Fixtures: 21 total, 7 per subject, release `AUTOMATED_CHECKED`.
- Runtime fixtures: 3 canonical Learning fixtures, one per subject.
- Gold candidates: 18 total, 9 families × 2, all
  `REGRESSION_CANDIDATE_NOT_OWNER_REVIEWED`.
- Input modes: 5 deterministic private representations.
- Repair paths: 6 bounded paths.
- Continuations: 3 distinct commands.
- Partial retry: at most 1 immediate retry in the same durable session;
  confirmed revision and primary gap remain exact, both submissions are
  append-only, and the latest eligible submission is regraded.
- Semantic polarity: positive assertion required; negated, antonym, or
  materially ambiguous required concepts fail closed within one bounded local
  assertion-state evaluator shared by canonical concepts, acceptable
  alternatives, and forbidden false claims. Alternatives satisfy only their
  explicitly mapped concepts and only when positive. Forbidden claims block
  only when positive; negated and ambiguous mentions remain diagnostic only.
- Semantic bindings: fixture
  `wcv_c2_rights_safe_fixtures.2026-08-12.v2` and rubric
  `wcv_c2_semantic_anchor_rubric.v2`.
- Dedicated runtime: same-repository and fork `pull_request` events run at the
  exact pull-request head with `contents: read`, no secrets, and a
  GitHub-hosted ephemeral runner. `pull_request_target`, write-capable tokens,
  remote Supabase, and provider access are prohibited.
- Law: expected and observed terminal result remains blocked until the
  existing registry can prove exact official current-law binding.
- Publication: no learner/fixture bodies, credentials, screenshots, traces,
  provider bodies, or remote project data enter CI artifacts or GitHub text.

## Required exact-head final gate

`wcv-c2-trusted-repair-runtime` must report:

- two fresh empty-state migration applications;
- five C2 tables with forced RLS and exact grants;
- anonymous, authenticated-direct, RPC, and bidirectional cross-user denial;
- actual browser → Next API → service repository → local PostgREST/Auth →
  PostgreSQL execution;
- CAS, idempotent replay, and failed-exposure zero-help behavior;
- incorrect repair → `partial` → same-session append-only rewrite → corrected
  retry `verified`, including retry-command replay without a duplicate body;
- second failed repair remains `partial`, rejects a third submission through
  the API, and keeps `DEFER_FOR_NOW` plus `SWITCH_TO_GUIDED` available;
- Practice and Theory same-session verified, Law blocked;
- 390px all-subject completion, representative 768px and 1440px completion,
  200% reflow, keyboard completion, and Axe serious/critical zero;
- all five input modes, partial-CTA refresh/new-browser/process-restart
  recovery, and zero external provider browser requests; and
- unconditional no-backup Docker cleanup with exact head unchanged.

This correction changes no learner state, Law source, database, migration,
provider, or Production activation.
