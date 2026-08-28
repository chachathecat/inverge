# Question Foundry Quarantine Core V1

QF-0 is an inert, source-only safety boundary for Question Foundry candidate
creation. It creates no bank, release, learner assignment, provider execution,
API, UI, persistence, or runtime capability.

## Closed entry boundary

Only `INVERGE_ORIGINAL`, `RIGHTS_CLEARED_OFFICIAL`,
`CONTRACTED_EXPERT_ORIGINAL`, and `CLEARED_DETERMINISTIC_TEMPLATE` may enter
candidate quarantine. Each entry requires one exact, current, active rights
manifest reference whose source class, policy version, permitted purpose, and
validity window match the source eligibility decision.

`USER_PRIVATE_ONLY` and `ACADEMY_OR_COMMERCIAL_TEXTBOOK` never gain shared
blueprint, bank, training, or cross-user reuse eligibility. `RIGHTS_UNKNOWN`
and `BLOCKED` are generation-ineligible. QF-0 applies the stricter rule that
none of these four classes may create a quarantine candidate.

## Quarantine-only candidate

A constructed candidate is always `QUARANTINED`. Its deterministic identity
binds its content digest, exact blueprint reference, answer-specification
digest, source and rights decision, generator execution identity, any declared
independent solver or judge identities, validator profiles, policy, and time.
Unknown fields and mismatched digests fail closed.

The object declares `releaseStatus`, `learnerAssignment`, and `bankAssignment`
as `null`. No releasable lifecycle exists. `REJECTED` is the only defined
terminal non-release lifecycle.

Generator, solver, and judge identities retain provider, model, version,
model-artifact, execution, execution-artifact, configuration, time, and
identity digests. A solver or judge supplied to this contract must have an
immutable execution identity distinct from the generator. QF-0 runs no model
and establishes no validation or release sufficiency.

## Solution-first and bodyless scarcity

Candidate construction requires an answer-specification digest and at least
one exact validator-profile reference before any question can enter
quarantine. This is a binding check, not proof that the answer is correct.

A Bank Scarcity Event carries bounded planning metadata only. Exact-field
validation rejects raw problems, answers, OCR, learner or textbook text,
source excerpts, prompts, responses, learner identity, and account identity.

QF-S1, QF-S2, QF-S3, QF-I1, similarity, audit chronology, judge drift,
release integration, persistence, and learner runtime remain outside QF-0.
