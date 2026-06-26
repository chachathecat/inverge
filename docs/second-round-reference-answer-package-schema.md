# S207 Verified Reference Answer Package Schema

## Scope

S207 defines the metadata contract for appraiser second-round learning-reference packages. It does not create reference-answer content.

Committed artifacts:

- `reference_corpus/reference_answers/second/appraiser_second_round_reference_answer_packages.json`
- `reference_corpus/reference_answers/second/appraiser_second_round_reference_answer_package_report.json`

Typed loader and validator:

- `lib/review-os/second-round-reference-answer-package-registry.ts`
- `npm run check:second-round-reference-answer-packages`

The committed registry is intentionally empty for real packages. Tests use synthetic temp fixtures only.

## Non-Official Boundary

A package is a learning reference and issue/evidence review draft. It is not an official answer, official grading criteria, confirmed score, pass-probability result, or pass guarantee.

Every package must expose:

- official source status from S203/S202 linkage;
- learning-reference status;
- evidence-anchor status;
- verification status;
- uncertainty and alternative reasoning;
- release blockers;
- subject-specific validation requirements.

The schema requires `officialAnswerAvailability: "not_available_for_second_round"`, `officialAnswerUsed: false`, and `officialGradingCriteriaUsed: false`.

## Release Contract

`release.status: "released"` is allowed only when all release gates pass:

- S203 question ID exists and matches subject/source metadata.
- Problem text and canonical structure are verified or synthetic fixture only.
- Source rights are not unresolved or operator-only.
- Source, evidence, subject validation, critic consensus, and release gate statuses are complete.
- At least three independent candidates and one critic pass are recorded.
- Unresolved conflict count is zero.
- No open blocking release blocker exists.
- No unresolved blocking uncertainty exists.
- Subject-specific checks pass.
- Required caveat key is present and learner-facing official claims remain disabled.

Open blocking blockers force `release.status: "blocked"`. A blocked release must name the blocker and required resolver.

## Subject Sections

Practice packages require `practiceValidation`:

- fixed calculator model `casio_fx_9860giii`;
- reset-safe hand-keyed routine required;
- stored-program dependency forbidden;
- assumptions, formula, extracted values, independent recalculation, unit, rounding, hand-keyed sequence, expected display, answer-sheet transfer, and unsupported-type checks.

Theory packages require `theoryValidation`:

- definition, logic chain, comparison, application, term consistency, alternative view, source coverage, and unsupported-claim checks.

Law packages require `lawValidation`:

- exam date and law effective date matching S203;
- effective-date, rule-source, article-citation, issue-identification, application, case/administrative anchor, conclusion, and unsupported-legal-claim checks.

Law effective date must not be after the exam date.

## Downstream Use

S214 may use S207 packages as the shape for multi-candidate generation, but must not mark real content released.

S215 owns critic, consensus, and release-gate decisions. It must fail closed on legal-source blockers, calculation blockers, and unresolved consensus conflicts.

S211, S212, and S213 may read released package metadata as review anchors for law, theory, and practice respectively. They must still attach learner-answer evidence before any deduction or score-range estimate.

S208, S209, and S210 must provide the actual law-version, theory-concept, and practice-calculation validators before real package release.

## Data Boundary

Git may contain schema, metadata, synthetic fixtures, validators, docs, and tests.

Git must not contain raw official question bodies, raw official answer bodies, generated reference-answer bodies for S207, learner answers, OCR text, source excerpts, copied third-party academy content, local file paths, or binary official materials.

Rollback is a focused revert of the S207 schema/validator/docs/tests. No database, runtime route, billing, provider, or instructor-console rollback is required.
