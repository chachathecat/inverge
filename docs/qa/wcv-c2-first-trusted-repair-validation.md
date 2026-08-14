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
  materially ambiguous required concepts fail closed within one bounded
  deterministic evaluator shared by canonical concepts, acceptable
  alternatives, and forbidden false claims. Nonnumeric occurrences require a
  complete semantic token, valid Korean inflection, or explicit unit
  attachment rather than an arbitrary substring. Every occurrence is retained
  before reduction. Same-clause conflict and conflicting polarity for the same
  explicit target across sentences are `ambiguous`. Bounded anaphoric subjects
  inherit the nearest prior explicit target, and unscoped contradiction fails
  closed. A clearly distinct explicit counterexample does not erase a clean
  target-positive assertion, but the word `반례` alone creates no exemption.
  Alternatives satisfy only their explicitly mapped concepts and only from a
  positive aggregate. Any positive forbidden occurrence remains blocking even
  when contradictory wording makes its aggregate ambiguous; pure negated and
  pure ambiguous forbidden mentions remain nonblocking diagnostics. The
  complete accepted input is scanned without silent clause or occurrence
  truncation: clause 64/65 and occurrence 32/33 retain late contradiction,
  ambiguity, and positive forbidden evidence. The evaluator uses no external NLP,
  model, embedding, or provider.
- Semantic bindings: fixture
  `wcv_c2_rights_safe_fixtures.2026-08-12.v2` and rubric
  `wcv_c2_semantic_anchor_rubric.v2`.
- Dedicated runtime: same-repository and fork `pull_request` events run at the
  exact pull-request head with `contents: read`, no secrets, and a
  GitHub-hosted ephemeral runner. Its exact delegated set is the C2 migration,
  Law registry, `app/app/layout.tsx`, `components/review-os/app-shell.tsx`, and
  `components/learner/learner-ui.tsx`; all five paths are machine-bound to the
  literal workflow trigger. `pull_request_target`, write-capable tokens, remote
  Supabase, and provider access are prohibited.
- Law: release-facing source and version statuses fail-closed reduce both the
  source record and exact selected anchor. Diagnosis and continuation share
  one predicate requiring verified effective source/version, verified current
  Law, exact anchor identity, and zero referenced open blocking blockers.
  Resolved/warning provenance cannot bypass another gate, anchor-state drift
  invalidates an old session, and the expected and observed terminal result
  remains blocked until the existing registry proves that complete binding.
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
- cross-sentence same-target contradictory Theory repair → `partial` →
  same-session append-only clean rewrite → corrected retry `verified`,
  including retry-command replay without a duplicate body;
- second failed repair remains `partial`, rejects a third submission through
  the API, and keeps `DEFER_FOR_NOW` plus `SWITCH_TO_GUIDED` available;
- Practice and Theory same-session verified, Law blocked;
- 390px all-subject completion, representative 768px and 1440px completion,
  200% reflow, keyboard completion, and Axe serious/critical zero;
- all five input modes, partial-CTA refresh/new-browser/process-restart
  recovery, and zero external provider browser requests; and
- unconditional no-backup Docker cleanup with exact head unchanged.

Fixture and rubric remain semantic v2. This correction changes no learner
state, API, server, Law source or behavior, database, migration, schema,
provider, or Production activation.
