# S224 Three-Subject Learner Runtime Acceptance

S224 records the learner-runtime acceptance path for the three appraiser second-round subjects:

- practice
- theory
- law

This is an acceptance/reporting layer over the existing learner contracts. It does not add learner routes, academy routes, commercial activation, provider expansion, OCR expansion, corpus data, migrations, or workflow permissions.

## Acceptance Surface

The S224 contract is implemented in `lib/review-os/s224-three-subject-learner-runtime-acceptance.ts`.

It links these existing contracts:

- S204 answer capture and editable confirmation metadata
- S205 Evidence Review result ordering and secondary range metadata
- S206 rewrite/recalculation history
- S211, S212, and S213 subject engines
- S216 error notebook metadata
- S217 concept graph metadata
- S218 review scheduler metadata
- S220 through S223 paid-trust, academy-boundary, and source-quality guardrails

Each subject flow exposes:

- answer/capture input metadata
- editable confirmation and trust-copy status
- subject-specific one-gap and one-action result metadata
- ten-second retrieval-check metadata
- rewrite or recalculation continuation
- Review Queue, Today Plan, and Notes continuation
- learner-only and academy-separated boundaries

## Subject Paths

Practice continues through calculation-process recovery with the fixed `casio_fx_9860giii` policy. The continuation metadata requires reset-safe hand-keyed routine training and disallows stored-program dependency.

Theory continues through paragraph rewrite and outline recall.

Law continues through issue/application rewrite and issue recall.

## Runtime Evidence

The source report includes source-level acceptance and static route-smoke targets for:

- `/answer-review`
- `/app/capture`
- `/app/today`
- `/app/review`
- `/app/notes`
- `/app/calculator`

The default source report is honest about its limit: it does not claim an embedded live browser session. PR validation must record the actual build and route-smoke evidence separately.

## Boundaries

S224 remains metadata-only. It does not store learner material, OCR material, problem material, reference prose, source excerpts, provider payloads, credentials, payment secrets, billing secrets, or asset bytes.

S224 does not authorize public paid launch. It advances the learner-runtime acceptance gate only; S225 remains the final public paid launch acceptance gate.
