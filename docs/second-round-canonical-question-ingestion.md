# S203 Canonical Second-Round Question Ingestion Contract

## Scope

S203 defines the canonical metadata contract for 감정평가사 2차 question records. It covers only:

- 감정평가실무 (`practice`)
- 감정평가이론 (`theory`)
- 감정평가 및 보상법규 (`law`)

The committed registry is:

- `reference_corpus/question_archive/second/appraiser_second_round_canonical_questions.json`
- `reference_corpus/question_archive/second/appraiser_second_round_ingestion_report.json`

The typed loader is:

- `lib/review-os/second-round-question-registry.ts`

The validation gate is:

```text
npm run check:second-round-question-registry
```

## Source Inputs

S203 consumes two upstream metadata sources:

- S201 official subject records from `reference_corpus/curriculum/appraiser/official_syllabus.json`
- S202 source and rights records from `reference_corpus/official_materials/appraiser/second_round_source_registry.json` and `second_round_rights_registry.json`

S203 may consume safe source metadata, source IDs, subject/session facts, rights decisions, extraction states, and S203 consumption gates. It must not consume or commit raw official question bodies, official answer bodies, raw official files, OCR text, learner text, or third-party academy content.

## Current Committed State

The default S203 registry intentionally contains no real canonical question bodies. The deterministic report projects 16 S202 source skeletons from the current 2020-2025 metadata basis:

- `metadataEligibleForS203`: 16
- `problemTextEligibleForS203`: 0
- `learnerPublicationEligible`: 0

This is expected because current S202 rights decisions remain `needs_legal_review` and extraction is `metadata_only`.

## Canonical Question Record

Each future canonical question record must include:

- stable question ID;
- exam year and round;
- `practice`, `theory`, or `law` subject key;
- S201 official subject ID and label;
- question number, sub-question labels, and points;
- S202 `sourceId`, rights status, display mode, extraction status, and S203 gate values;
- problem-text status and canonical verification status;
- exam date and, for law records, law effective date;
- metadata-only topic and concept IDs;
- issue, formula, and calculation candidate metadata;
- table/asset metadata placeholders;
- CASIO `casio_fx_9860giii` hooks for practice calculation candidates;
- Evidence Review eligibility metadata;
- Deep Review Unit estimate metadata.

Sub-question requirements use a metadata object with `textStored: false`. Real official wording must not be committed unless a later rights and extraction gate explicitly permits it.

## State Separation

These states are separate and must not be collapsed:

- source verification: S202 official source identity exists;
- rights verification: S202 display/redistribution decision exists;
- extraction status: source text/table/formula extraction readiness;
- problem-text verification: canonical problem text has been checked;
- canonical question verification: structure, points, and metadata match source;
- reference-answer verification: later S207/S214/S215 package status;
- Evidence Review eligibility: whether a learner answer can be reviewed against safe verified inputs;
- learner-publication eligibility: whether a learner-facing UI may expose the question/source content.

S202 metadata eligibility alone is not enough for problem-text verification, Evidence Review eligibility, learner publication, or reference-answer release.

## CASIO GIII Hook

Practice calculation metadata uses:

```text
calculatorModel: casio_fx_9860giii
resetSafeHandKeyedRoutineRequired: true
storedProgramDependencyAllowed: false
```

S203 records only hooks and candidate IDs. S210 must validate supported calculation types, unit checks, rounding checks, and fx-9860GIII behavior before learner-facing routine release.

## Deep Review Unit Estimate

S203 may store a metadata-only estimate:

- `0` units when not applicable or blocked;
- `1` unit for one 25-50 point sub-question;
- `2` units for one 100-minute full answer.

This does not implement billing, entitlements, reservation, debit, or a usage ledger. Consumption remains blocked until S219/S220 implement server-side catalog and ledger controls.

## Validation Rules

The loader fails closed for:

- duplicate canonical question IDs or nested metadata IDs;
- unknown S202 source IDs;
- subject/year/round mismatches against the linked S202 source;
- subject labels that do not resolve through S201;
- invalid rights/display/extraction linkage;
- verified problem text while S202 problem-text gates are blocked;
- learner publication while S202 learner-publication gates are blocked;
- non-law `lawEffectiveDate` without S202 support;
- missing law `lawEffectiveDate`;
- sub-question points that do not sum to `totalPoints`;
- practice calculation candidates without `casio_fx_9860giii` reset-safe hooks;
- stored-program calculator dependency;
- raw question, answer, OCR, learner, local-file, binary, or academy-content fields;
- official grading, official model-answer, pass-probability, or guarantee claims;
- stale or nondeterministic ingestion reports.

## Fixtures

Focused tests use synthetic temp fixtures to exercise canonical question records, GIII hooks, table/asset placeholders, Evidence Review metadata, and Deep Review estimates. Synthetic fixtures are not official question records and must not be used as learner-facing content.

## Downstream Use

- S207 may link reference-answer package schemas to S203 IDs, but must keep release status separate.
- S208 must verify law version applicability for historical exam dates before legal grounding release.
- S210 must validate practice calculation candidates and GIII routines before release.
- S218 may use metadata-only IDs and concept tags for scheduling, but not raw blocked problem text.
- S223 must require source, rights, extraction, canonical verification, reference-answer, and subject quality gates before corpus acceptance.
