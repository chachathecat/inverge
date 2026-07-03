# S215 Reference Answer Critic Consensus and Release Gate

- Status: implementation contract
- Linked roadmap item: `S215`
- Scope: metadata-only appraiser second-round reference-answer critic, consensus, and release gate

S215 adds the release layer after the S214 multi-candidate handoff. It consumes S211, S212, S213, and S214 metadata contracts and decides whether a generated learning reference answer can be marked `released` or must remain `blocked`.

Generated reference answers remain learning references. S215 does not create official answers, official grading criteria, confirmed scores, pass-probability outputs, pass/fail predictions, guarantees, learner UI, public archive UI, provider calls, OCR calls, billing, auth, Supabase writes, migrations, workflows, instructor UI, or academy routes.

## Artifacts

- `lib/review-os/s215-reference-answer-release-gate.ts`
- `tests/s215-reference-answer-release-gate.test.mjs`
- `tests/fixtures/s215-reference-answer-release-gate/metadata-only-release-gate-registry.json`
- `docs/s215-reference-answer-critic-consensus-release-gate.md`
- `roadmap/active-program.yml`

Focused validation:

```text
npm.cmd run test -- tests/s215-reference-answer-release-gate.test.mjs --workers=1
```

## Contract

The S215 contract includes:

- critic findings for source-anchor integrity, requirement coverage, rubric-answer consistency, subject grounding, data boundary, and official-claim guardrails;
- consensus records with accepted candidate slots, covered requirement slots, and preserved unresolved conflict IDs;
- S211/S212/S213 compatibility snapshots that contain only engine versions, gate status, dimension IDs, metadata checks, and learner/instructor separation flags;
- a release decision that is computed from blockers rather than trusted from fixture intent.

S215 emits:

- `released` only when all source, candidate, critic, consensus, subject-review, and guardrail checks pass;
- `blocked` whenever any blocker remains unresolved.

## Fail-Closed Release Rules

S215 fails closed when any of these remain unresolved:

In short, S215 must fail closed rather than release a learning reference with unresolved blockers.

- S214 handoff is not `ready_for_s215_consensus`;
- source pack or S207 release-gate input is missing or blocked;
- legal source or exam-date law version gate is unresolved;
- theory concept, definition, or source coverage gate is unresolved;
- practice calculation unit, unit check, rounding check, independent recalculation, runtime evidence, or release permission is unresolved;
- candidate metadata or evidence anchors are missing;
- source or evidence anchors are fabricated;
- requirement coverage is missing;
- critic finding is missing or release-blocking;
- rubric-answer consistency is blocked;
- consensus is missing, blocked, or unresolved;
- required learning-reference caveat or official-claim guardrails are not present.

Released status is impossible when blockers remain.

## Data Boundary

Committed S215 fixtures are metadata-only. They must not contain learner answers, OCR text, official question text, official answer text, generated reference-answer prose, source excerpts, formula expressions, extracted values, calculation traces, provider payloads, credentials, private content, PDFs, HWPs, images, or asset bytes.

S215 preserves learner/instructor separation:

- no learner runtime change;
- no instructor runtime route change;
- no academy tenant data access;
- no learner/instructor data merge;
- no final-grade or human expert-review claim.

## Subject Contracts

S211 law metadata must indicate ready legal-source and reference-package gates before law release is possible.

S212 theory metadata must indicate passed concept-source verification, reference-package verification, and dimension evidence before theory release is possible.

S213 practice metadata must indicate passed reference-package verification, calculation-unit support, calculation-review metadata, dimension evidence, and metadata checks before practice release is possible. The CASIO policy remains fixed:

```text
casio_fx_9860giii
resetSafeHandKeyedRoutineOnly: true
storedProgramDependency: false
```

## Rollout

S215 is additive:

- source-level release-gate contract;
- metadata-only fixture;
- focused tests;
- documentation;
- roadmap completion wiring;
- Agent Factory ready-target update where the completed roadmap state requires it.

No runtime, provider, OCR, billing, auth, Supabase, instructor, academy, workflow, production route, environment, Next config, or Vercel change is part of this item.

## Rollback

Rollback is a focused revert of the S215 module, fixture, tests, docs, runner wiring, roadmap status change, and ready-target text/test updates. S211, S212, S213, and S214 remain valid because S215 only reads their metadata contracts.

## Remaining Risks

- Real public reference release still depends on complete verified source packs and domain validation for all three subjects.
- Practice reference release remains blocked unless independent recalculation and human-reviewed runtime evidence exist.
- S216 still needs to convert released review-gap metadata into automatic error notes.
