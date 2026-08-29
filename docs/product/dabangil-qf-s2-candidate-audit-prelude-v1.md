# QF-S2 candidate-time-aware audit prelude v1

QF-S2 is an inert, source-only reconstruction of the causal metadata already
bound into one valid QF-0 quarantined candidate. It creates no new event and
uses no audit-creation clock. Every `occurredAt` comes from the candidate's
source decision, exact model-execution identities, or `createdAt`.

## Boundary

The prelude is in-memory and metadata-only. It contains no question, answer,
explanation, rubric, OCR, learner, prompt, response, or provider body. It
performs no provider execution, network access, database access, persistence,
remote mutation, or Production mutation. It has no similarity, validation,
judging, transfer, release, learner-assignment, or bank-assignment authority.
QF-S3 is required before any later chronology aggregation.

An independent model identity proves only that the exact QF-0A2 identity was
bound. Its presence does not prove that a blind solver, critic, or judge
completed a valid task.

## Exact dependency

Construction first validates the candidate through
`assertQuarantinedQuestionCandidateV1`. The frozen QF-0 dependency receipt
binds PR #866's resulting-main SHA/tree, aggregate QF-0 config digest, six-path
identity, candidate-contract and candidate-core implementation digests,
source-only boundary digest, and exact export surface. The core directly uses
QF-0A1 bounded canonicalization, SHA-256 digesting, and UTF-8 byte ordering.
Any dependency drift fails closed.

## Closed actors and steps

There is one `SYSTEM_COMPONENT` actor for this reconstruction component. It is
bound to the QF-S2 contract version and QF-S2 source-only boundary digest. Each
`MODEL_EXECUTION` actor binds the candidate's exact role, execution ID,
identity digest, model artifact digest, execution artifact digest, and
`executedAt`. With the generator and at most sixteen inherited independent
executions, the single system actor keeps the closed maximum at eighteen.

The only step kinds are:

1. `SOURCE_DECISION_BOUND`
2. `GENERATION_RIGHTS_REVALIDATED`
3. `GENERATOR_EXECUTION_BOUND`
4. `INDEPENDENT_EXECUTION_IDENTITY_BOUND`
5. `MATERIALIZATION_RIGHTS_REVALIDATED`
6. `CANDIDATE_QUARANTINED`

No similarity-reviewed, solved, judged, transfer, release, approval, learner,
or bank state exists in this contract.

## Causality and time

The exact graph is source decision → generation-rights revalidation →
generator execution; generator execution → every independent identity;
source decision + generator execution → materialization-rights revalidation;
and materialization rights + generator execution + every independent identity
→ quarantine. Missing, extra, later, or cyclic dependencies fail closed. Each
dependency output digest must equal its predecessor's step digest.

`startedAt` is the earliest evidence timestamp and `completedAt` is exactly the
candidate's `createdAt`. Equal timestamps are permitted, but topology always
precedes time, closed phase rank, and immutable evidence/identity digest in the
deterministic ordering. Host locale and input-array order are irrelevant.

Step digests bind candidate identity, actor identity, evidence, evidence time,
and sorted predecessor IDs/output digests. The prelude digest binds the full
closed actor and step graph. Any timestamp, actor, role, artifact, dependency,
order, candidate identity, or evidence drift invalidates the prelude.

## Program state

This PR closes only QF-S2 child Issue #868 and references completed QF-0/#857,
Question Foundry #811, and cognitive/product reference #714. QF-S3 and QF-I1
remain unstarted.
