# QF-S3 dependency-ranked transfer chronology v1

QF-S3 is an inert source-only chronology primitive for Question Foundry. It
consumes the exact merged `QuarantinedQuestionCandidateV1`,
`SimilarityFirewallReviewV1`, `CandidateAuditPreludeV1`, QF-0A1 canonical
JSON/UTF-8/digest primitive, and QF-0A2 model execution identities. Its only
materialized result is `DependencyRankedTransferChronologyV1`.

This final source-only candidate is bound to Issue #875 and exact protected-main base
`761b7f6b7648d19845ab3385665e92046165dddd` /
`c6c6a8ad876c2f40b5276a26485b088656addf49`. It was reconstructed without
scratch ancestry after APP-1 reached terminal blocked Draft PR #876 at exact
head `0685ae1266c842e7a3d03bef20ce4ba2369bf961`. Scratch evidence is not used as
final-head evidence.

## Closed evidence contract

The ten receipt kinds are exactly:

1. `CANDIDATE_PRELUDE_BOUND`
2. `SIMILARITY_REVIEW_BOUND`
3. `TRANSFER_VARIANT_SEALED`
4. `DECLARED_VALIDATOR_COMPLETED`
5. `BLIND_SOLVER_COMPLETED`
6. `JUDGE_COMPLETED`
7. `ADVERSARIAL_CRITIC_COMPLETED`
8. `VARIANT_VALIDATION_AGGREGATED`
9. `TRANSFER_EVIDENCE_AGGREGATED`
10. `META_AUDIT_COMPLETED`

Every receipt binds the candidate, optional exact variant, opaque artifact
whose ID is content-addressed to its exact artifact digest,
exact actor, canonical evidence time, exact predecessor receipt IDs and output
digests, optional closed validator-profile reference, and output digest. The
implementation derives receipt IDs and digests through QF-0A1. Raw question,
answer, source, prompt, response, learner, and provider bodies do not enter the
chronology output.

System actors use one exact opaque component identity, version, and artifact
digest. Model actors are validated QF-0A2 identities with role, execution ID,
identity digest, model artifact digest, execution artifact digest, and
execution time. A declared-validator receipt requires a trusted system actor;
the closed QF-0A2 model roles cannot be repurposed as a validator label. A
label is never identity evidence.

## Causal graph

Candidate-prelude and similarity-review bindings are mandatory roots. Each
variant seal depends exactly on the candidate-prelude root. Every declared
validator and blind solver depends on its seal. The judge depends on every
required validator plus the solver. The critic depends on the judge plus every
required validator. The variant aggregate depends on all validators, solver,
judge, and critic. The transfer aggregate depends on every variant aggregate
plus the exact similarity review. The meta audit depends on the transfer
aggregate.

Missing evidence can produce only `INCOMPLETE` with closed blocking reasons.
It can never be hidden by an aggregate. Supplying an aggregate before its
final causal receipt fails closed.

The stable order is:

1. topological dependency rank;
2. `occurredAt`;
3. closed receipt-kind phase rank;
4. immutable artifact and receipt digests.

Timestamp equality is valid, but cannot move a child or aggregate before a
predecessor. `startedAt` is the earliest supplied evidence time and
`completedAt` is the latest supplied valid receipt time. QF-S3 never uses
`Date.now`, locale ordering, or construction wall-clock time as evidence.

## Execution separation

The candidate generator and every model receipt actor must have distinct
execution IDs, identity digests, and execution-artifact digests. Blind solver,
judge, adversarial critic, and meta auditor roles are exact. Reusing or
relabeling an execution or execution artifact fails. This proves exact
execution-identity separation only; it does not prove organizational or human
independence.

## Authority boundary

`COMPLETE` means only that the supplied closed metadata graph contains its
required causal receipts. It is not correctness, source-right, release,
learner-suitability, transfer, readiness, calibration, learner-assignment, or
bank-assignment authority. QF-S3 cannot emit `CLEAR_FOR_RELEASE`,
`PERSONAL_LEARNING_USABLE`, `TRANSFER_VERIFIED`, or `RELEASED`. QF-I1 remains
required for any later integration decision.

The immutable boundary receipt records source-only, in-memory-only operation;
provider execution, network, database, persistence, remote mutation, and
Production mutation are off or zero.

## Bounded work

Machine limits allow at most 16 variants, 16 declared validator profiles per
variant, 340 receipts, 341 actors, and 64 predecessors per receipt. The
receipt ceiling exactly accommodates the complete maximum graph. Callers
cannot override those limits. Counts and dense closed arrays are inspected
before graph construction. Proxies, accessors, symbols, exotic prototypes,
unknown fields, missing fields, cycles, duplicate identities, unresolved
predecessors, and noncanonical timestamps fail closed.
