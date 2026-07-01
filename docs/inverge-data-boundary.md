# Inverge Data Boundary / Privacy Hardening v1

## 2026-07-01 Product Constitution Transition

The product data boundary has three layers:

1. **Private raw layer**: learner-owned uploads, OCR, answer text, rewrite text, note text, and raw problem text needed for that learner's own service.
2. **Derived learning signal layer**: sanitized concept, gap, confidence, task, review, and scheduling metadata.
3. **Aggregated product intelligence layer**: aggregate metrics and product-health signals that contain no raw learner text, no OCR payload, no answer payload, no raw problem text, no provider payload, and no secrets.

Forbidden raw global corpus behavior:

- no raw learner answer in global reference data;
- no raw OCR text in global reference data;
- no raw problem or copyrighted question text in global reference data;
- no raw learner text in analytics, commercial metrics, telemetry, issue bodies, screenshots, test fixtures, provider logs, or model-training material without explicit future consent and policy.

Official-source records must use manifest, source URL, hash, provenance, rights status, verification status, law-effective date when relevant, and last verification metadata. Official-source manifests are not learner artifacts, and learner artifacts must never be merged into historical-question or reference-answer records.

## Core rule

Inverge keeps three data classes separate:

1. **Raw user-owned service data**: learner artifacts needed to provide the learner’s own capture, note, answer-review, rewrite, and review service.
2. **Safe derived learning signals**: product metadata derived from learner activity that does not contain learner-authored raw text or uploaded content.
3. **Product reference data**: trusted Inverge reference corpus entries and curated snippets used for grounding and context.

These classes must not be mixed. Raw learner artifacts are not reference corpus, not telemetry, not aggregate analytics input, and not cache-key material.

## 1. Raw user-owned service data

Examples:

- uploaded images and PDFs
- OCR raw text
- user answer text and handwritten answer contents
- original 1차 O/X statement text supplied by a learner
- second-exam original answer
- rewrite paragraph and follow-up rewrite text
- raw problem text
- raw extraction JSON when it includes learner or OCR text

### May be stored only in

- user-owned wrong-answer item raw fields and `raw_payload`
- user-owned note/detail records required to render the learner’s own saved note
- draft/autosave storage scoped to that learner
- original answer storage scoped to that learner
- rewrite paragraph/follow-up storage scoped to that learner

### Must never be stored in

- `learning_signal_events.metadata_json`
- usage event / telemetry metadata
- `derived_payload` fields
- reference corpus files or tables
- aggregate product analytics
- reference-context request cache keys
- Today Plan derived task metadata

## 2. Safe derived learning signals

Examples:

- `examMode`, `subject`
- `topicCandidate`, `conceptCandidate`
- `mistakeType`, `weakStructurePoint`, `missingIssueCandidate`
- `calculationRisk`, `unitRisk`
- `reviewStage`, `nextTaskType`
- `confidenceBucket`, `pageCount`, `lowConfidenceFlag`, `captureQualityIssue`
- `supportedCalculatorTemplateId`, safe skeleton IDs
- `trapWords`, `templateId`

### May be stored in

- learning signal metadata
- wrong-answer `derived_payload`
- review queue `derived_payload`
- Today Plan derived task metadata
- usage-event metadata
- reference-context request inputs and cache keys

### Must never contain

- OCR/user answer/problem/rewrite raw text
- uploaded file bytes or file-derived raw text
- raw extraction JSON containing learner text
- original O/X statement text copied from learner input

The implementation guardrail is `lib/review-os/data-boundary.ts`, which removes forbidden raw keys recursively before metadata/telemetry/derived persistence.

## 3. Product reference corpus data

Examples:

- reference corpus entries
- internal curated snippets
- law/appraisal/civil/topic reference snippets
- citation labels
- license and usage status

### May be stored in

- `reference_corpus/**` JSON entries
- future product-owned reference corpus tables
- reference-context snippets returned to product flows

### Must never contain

- learner uploads
- learner OCR text
- learner answer or rewrite text
- learner-provided O/X statements
- private note text

Reference requests may include only safe derived fields such as subject, topic/concept candidates, task type, tags, and safe skeleton IDs. The request sanitizer removes raw learner fields before matching and cache-key construction.

## Deletion and export considerations

- Deleting or exporting a learner account must include the user-owned raw service records: uploads, OCR text, answers, notes, drafts, and rewrites.
- Derived learning signals can be exported as metadata, but must remain free of raw learner text.
- Aggregated product analytics should not need raw-text deletion because raw text must not enter that layer.
- Reference corpus data is product-owned and is not part of an individual learner export, except where displayed as citations/snippets in user-owned records.

## Future opt-in research layer rule

No model-training or research reuse layer exists in this hardening pass. If Inverge later adds research use, it must be an explicit opt-in layer with separate consent, tenant/user separation, revocation/deletion controls, and a documented transform that keeps raw service data out of default product analytics and reference corpus storage.
