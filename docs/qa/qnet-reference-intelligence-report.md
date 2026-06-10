# Q-Net Reference Intelligence QA Report

This report is a metadata-only QA check for the committed Q-Net appraiser official materials reference intelligence.

It is not a learner-facing archive, problem browser, grading surface, model-answer surface, score prediction, or pass/fail product. It only summarizes committed reference metadata used to support source verification, topic frequency, trap-pattern candidates, answer skeleton tags, curriculum priority, and Today Plan ranking inputs.

## Run

```powershell
npm.cmd run check:qnet-reference-intelligence
```

The command prints a JSON report from:

- `reference_corpus/official_materials/appraiser/qnet_appraiser_materials_index.json`
- `reference_corpus/official_materials/appraiser/qnet_appraiser_source_map.json`
- `reference_corpus/official_materials/appraiser/qnet_appraiser_topic_frequency.json`
- `reference_corpus/curriculum/appraiser/official_sources.json`

## Report Scope

The report includes:

- material count
- source map count
- topic frequency entry count
- covered years and rounds
- exam mode counts
- subject counts
- year/round coverage
- second-exam integrated-source logical section checks
- top topic-frequency labels without source text or source ids
- boolean safety checks

For the 2024 제35회 second exam, the report confirms that the three subject-level logical sections share the same physical source hash without printing the hash.

## Safety

The report must keep all of these true:

- `rawTextStored` is false everywhere.
- `copyrightedTextStored` is false everywhere.
- storage policy is metadata-only.
- source URLs match the canonical official source registry entry.
- source map ids resolve to committed metadata materials.
- topic frequency ids resolve to matching exam mode and subject metadata.
- no raw material path, raw question body, answer body, OCR full text, source excerpt, scoring field, official grading claim, model-answer claim, score prediction, or pass/fail claim is emitted.

If any safety check fails, the CLI exits non-zero instead of printing a usable report.
