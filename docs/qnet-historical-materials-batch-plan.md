# Q-Net Historical Materials Batch Plan v1

## Purpose

This plan defines metadata-only historical reference intelligence work for the Inverge learner loop. Q-Net appraiser official materials may be represented only as safe metadata for retrieval, planning, topic coverage, weakness matching, and review recommendation.

This work must never turn Inverge into a public archive, problem bank, official answer archive, official grading product, model-answer product, score prediction product, pass/fail judgment product, or payment-first material access product.

## Scope

- Target scope: 2020 이하 historical Q-Net appraiser material batches.
- Product scope: 감정평가사 1차 and 감정평가사 2차 learner-facing metadata/reference intelligence only.
- Recent merged baseline batches: 2025 제36회, 2024 제35회, 2023 제34회, 2022 제33회, and 2021 제32회 partial source coverage.
- Out of scope for this PR: creating 2020 metadata records, reading local source files, ingestion changes, product UI changes, instructor grading changes, public archive UI, or raw official content storage.

## Batch Order Proposal

1. 2020 제31회
2. 2019 제30회
3. 2018 제29회
4. Continue backward only when local source files are available and can be confirmed locally.

## Coverage Levels

- `full_source_coverage`: all expected source papers for the year/round are locally confirmed and represented as metadata records.
- `partial_source_coverage`: only some expected source papers are locally confirmed and represented.
- `source_missing`: expected source material is not locally available, so no metadata record is created.
- `source_unverified`: a candidate source exists but paper identity or official-source alignment is not confirmed.

The 2021 제32회 baseline is partial source coverage. Only these records were represented: 1차 1교시 A/B, 1차 2교시 A/B, and 2차 1교시 감정평가실무. No 2021 2차 2교시 or 2차 3교시 records were invented.

## Metadata Rules

- Only create records for locally confirmed source files.
- Never invent missing 2차 papers.
- A/B type first-exam PDFs can be represented as separate source records when separately confirmed.
- 2차 integrated/source PDFs must be mapped conservatively by confirmed paper identity.
- If a 2차 source file only confirms 1교시, do not create 2교시 or 3교시 records.
- Use metadata-only topic, trap, issue, curriculum, calculation, CASIO, and answer-skeleton labels.
- No raw PDF/HWP/HWPX/Word/ZIP/images may be committed.
- No raw problem text, answer text, OCR full text, official answer body, source excerpt, or copied official explanation may be committed.
- Do not commit `qnet_manifest.json`.
- `local_official_materials` must not be committed.
- Q-Net/local official materials work must be done only in local Codex, using local-only files and metadata-safe outputs.
- Keep learner surfaces closed-beta and operational. Do not add public archive UI, official grading/model-answer/score/pass-fail/payment copy, or instructor-console exposure.

## Required Fields For Future Metadata Records

Every future committed metadata record must include:

- `sourceId`
- `officialSourceId`
- `sourceKind`
- `sourceName`
- `sourceUrl`
- `localRawFileNameHash`
- `examYear`
- `examRound`
- `examMode`
- `subject`
- `paper`
- `questionNumber: source`
- `itemType: source_paper`
- `topicCandidates`
- `curriculumNodeCandidates`
- `issueCandidates`
- `trapWordCandidates`
- `answerSkeletonTags`
- `calculationTemplateCandidates`
- `casioRelevant`
- `estimatedMinutes`
- `difficultyBand`
- `sourceStatus`
- `lastOfficialVerifiedAt`
- `needsOfficialVerification`
- `rawTextStored: false`
- `copyrightedTextStored: false`

## Future Batch Validation Checklist

- Confirm each represented source file exists locally before metadata generation.
- Confirm the year, round, exam mode, subject, and paper identity from the local source file name and safe metadata only.
- Mark coverage as `full_source_coverage`, `partial_source_coverage`, `source_missing`, or `source_unverified`.
- Confirm no missing 2차 paper is invented.
- Confirm A/B first-exam records are represented separately only when each source is locally confirmed.
- Confirm 2차 source records are mapped only to confirmed paper identities.
- Confirm all source hashes are deterministic 64-character hex hashes.
- Confirm `rawTextStored` is `false` and `copyrightedTextStored` is `false`.
- Confirm metadata labels are topic/trap/skeleton/curriculum labels only.
- Confirm no raw official problem, answer, OCR full text, or official answer body is present.
- Confirm no raw PDF/HWP/HWPX/Word/ZIP/images are staged or committed.
- Confirm no `qnet_manifest.json` is staged or committed.
- Confirm no `local_official_materials` content is staged or committed.
- Run typecheck, lint, node tests, closed-beta readiness, learner-loop CI, and build.

## Merge Checklist

- The PR changes only committed metadata, tests, docs, or metadata-supporting scripts explicitly approved for the batch.
- No product behavior, learner archive UI, instructor grading behavior, payment copy, model-answer copy, score copy, or pass/fail copy is changed.
- Source coverage notes are explicit for partial batches.
- Tests validate committed metadata and committed safety boundaries, not local-only source files.
- Final git status shows only intended files before commit and a clean working tree after push.

