# 답안길 Question Foundry quarantine core v1

QF-0I completes only the inert QF-0 foundation. It constructs one immutable
`QuarantinedQuestionCandidateV1` from closed metadata that has already passed
the merged QF-0A rights/time and execution-identity validators and the merged
QF-0B opaque-reference validator.

## Candidate boundary

The input and output contain no question, answer, explanation, OCR, learner
body, source excerpt, prompt, response or provider payload. The
`candidateContentDigest` is only a digest binding; it does not prove that
content exists, is safe or is correct. Opaque blueprint, answer-specification,
validator-profile and policy references are not resolved here and make no
existence or currentness claim.

The sole public lifecycle is `QUARANTINED`. QF-0I defines no release state,
readiness state, assignment state, calibration state or lifecycle mutator. A
candidate cannot be shown to a learner or placed in a shared bank under this
contract.

## Trust and time binding

Construction revalidates the complete source decision and fresh supplied
rights manifest through QF-0A2 twice: once at the generator execution time and
once at candidate creation. The expected source class and policy are bound to
the decision, and the purpose is exactly
`QUESTION_FOUNDRY_QUARANTINED_CANDIDATE_CREATION`.

This utility performs no live authority fetch. It proves only what the exact
authority snapshot supplied by a future trusted caller proves at those two
times. It cannot detect later revocation without another fresh snapshot.

The generator must have role `GENERATOR`. Independent executions, when
present, are exact identities distinct from the generator and each other.
They must occur between generation and candidate creation. An empty list is
valid and creates no claim of independent validation, consensus, correctness,
complete audit chronology or release sufficiency.

## Deterministic materialization

Validator-profile references and independent executions are closed bounded
sets. Their input order is erased by QF-0A1 UTF-8 byte ordering after duplicate
identity rejection. QF-0A1 canonicalization and digest construction then bind
the complete validated material into deterministic `qfc_...` and
`sha256:...` identities. Every returned object and owned nested snapshot is
immutable.

## Source-only receipt

The implementation is in-memory and source-only. Runtime activation, model or
provider execution, network, database, persistence, remote mutation,
Production mutation, similarity, release, learner assignment and bank
assignment are absent. QF-S1, QF-S2, QF-S3 and QF-I1 remain blocked and do not
start automatically.
