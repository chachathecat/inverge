# 감정평가사 2차 Official Syllabus Registry

## Purpose

S201 creates a metadata-only official baseline for 감정평가사 2차. It is not a learner UI feature and it is not a question, answer, OCR, or reference-answer corpus.

The registry is split into three files:

- `reference_corpus/curriculum/appraiser/official_syllabus.json`: stable official identity and subject facts.
- `reference_corpus/curriculum/appraiser/exam_rules.json`: stable/versioned operating rules.
- `reference_corpus/curriculum/appraiser/annual_notices/2026.json`: volatile annual schedule and notice metadata.

All verified records point to `reference_corpus/curriculum/appraiser/official_sources.json`.

## Official Versus Editorial

Official records contain only primary-source facts: qualification/stage identity, the three 2차 subject labels, supported exam-method/session/point/pass-threshold rules, effective dates, source IDs, verification dates, and recheck deadlines.

`second_exam_curriculum.json` remains Inverge editorial learning metadata. Its units can map to official subject IDs, but they must not be presented as official syllabus units. This keeps source facts separate from answer-writing strategy, review scheduling, concept nodes, and mistake taxonomies.

Current official subjects:

- 감정평가실무
- 감정평가이론
- 감정평가 및 보상법규

No 1차 product work is added by S201.

## Stable Versus Annual Data

Stable registries must not contain annual notice values such as application windows, exam dates, result windows, notice years, or exam rounds. Those values belong in `annual_notices/<year>.json`.

The 2026 annual notice stores metadata only: source IDs, official URL, annual dates, verification status, and the fact that notice/attachment bodies are not stored.

## Refresh Procedure

1. Recheck Q-Net exam information, Q-Net annual notice, and the National Law Information Center law page before the nearest `needsManualRecheckBy`.
2. If a primary source changes, add a new record with a new ID and effective date. Do not destructively overwrite the old record; use `effectiveTo`, `supersedes`, or `deprecatedRecords`.
3. If primary sources conflict, add the conflict to `unresolvedOfficialSourceConflicts` and keep validation failing until a human-decision record resolves it.
4. Never commit raw notice bodies, official attachments, question text, answer text, OCR text, learner text, academy material, or secrets.

## Downstream Contract

S203 question schema should resolve subject labels and stage identity through `official_syllabus.json`.

S205 grading contracts should use `exam_rules.json` for subject point ceilings, rule provenance, and fail-closed unsupported rule checks. It must not convert pass-threshold facts into pass-probability or official-grading claims.

S208 law-version validation should use the source IDs and effective dates here only as the exam-rule baseline, then verify the applicable law version for each historical exam date separately.

S223 release gates should require the S201 loader summary to be current, with no stale verified records and no unresolved conflicts.

## Validation

The typed loader is `lib/review-os/official-syllabus-registry.ts`.

Required checks:

- duplicate IDs fail;
- unknown source IDs fail;
- stale verified records fail;
- overlapping effective ranges for the same current rule fail;
- annual values embedded in stable registries fail;
- production-facing use of draft, unverified, or stale facts fails;
- forbidden raw text fields and official grading/model-answer/pass-probability claims fail.

The repo gate is:

```text
npm run check:official-source-verification
```

Focused tests live in `tests/official-syllabus-registry.test.mjs`.
