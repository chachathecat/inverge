# Inverge Data Boundary / Privacy Hardening v1

## 2026-07-23 Post-#650 Unified Data Planes

`docs/dabangil-unified-program-contract.md` governs five non-interchangeable
planes:

1. **Personal Raw Vault**: one user's raw captures, OCR, answers, notes,
   rewrites, and AI bodies;
2. **Academy Tenant Vault**: one tenant's problems, rubrics, submissions,
   instructor edits, and approved prose;
3. **Shared Signal Plane**: purpose-consented, pseudonymous,
   non-reconstructive derived signals only;
4. **Cleared Content Bank**: rights-cleared or separately authored,
   actually rights-owned contribution objects after review only;
5. **Model/Eval Registry**: version and evidence metadata, never raw content.

Private raw content never automatically enters a shared corpus. Shared
references to private or tenant material before approved promotion use opaque
identifiers and safe metadata, not raw text, reconstructive embeddings,
corrections, source excerpts, or cross-vault equality signals. Rights-cleared
content or a separately authored, actually rights-owned contribution object
may enter shared references only after approved Cleared Content Bank
promotion. Private service answers, notes, handwriting, and raw OCR are not
contribution objects and never use that path.

Private and Academy fingerprints are domain-separated and vault-scoped.
They are keyed/one-way with vault-specific non-exportable domain keys and
never return an equality oracle.
Global dedup identifiers require material already promoted into the Cleared
Content Bank. The basis is rights-cleared official/owner-created/contracted
content, or a separately authored, actually rights-owned user contribution
object; O3/review and quarantine always apply. Pseudonymous-signal consent
alone is insufficient.
Rights promotion must record source post and attached asset,
rights/version/reviewer evidence, and pass conflicting-answer,
poisoning/anomaly, fingerprint/dedup, and held-out-contamination quarantine.
Academy instructor approval alone never creates shared Gold.

After applicable rights prerequisites and user-owned contribution consent
where required, promotion quarantine may use an access-controlled,
domain-separated, least-privilege internal fingerprint to compare a candidate
with the Cleared Content Bank. It emits only decision metadata, no equality
signal to the source vault, user, or tenant, and creates no global identifier
before promotion.

The Consent/Opt-out Ledger keeps separate purpose grants for personal service,
pseudonymous product signals, Academy sharing, user-owned content
contribution, and offline model training. Revocation stops future shared use.
It also stops future Academy sharing, content promotion, or offline
training/dataset refresh for the revoked purpose. Deletion and retention are
purpose-scoped. Online model-weight updates from any input are prohibited;
all permitted training is offline and requires an exact-scope O5 gate.

## 2026-07-01 Product Constitution Transition

The product data boundary has three layers:

1. **Private raw layer**: learner-owned uploads, OCR, answer text, rewrite text, note text, and raw problem text needed for that learner's own service.
2. **Derived learning signal layer**: sanitized concept, gap, confidence, task, review, and scheduling metadata.
3. **Aggregated product intelligence layer**: aggregate metrics and product-health signals that contain no raw learner text, no OCR payload, no answer payload, no raw problem text, no provider payload, and no secrets.

Forbidden raw global corpus behavior:

- no raw learner answer, note, or handwriting in global reference data;
- no raw OCR extraction text in global reference data;
- no private, rights-uncleared, or pre-promotion raw problem/copyrighted
  question text in global reference data; the only content-body path is an
  approved Cleared Content Bank promotion;
- no private raw learner body directly in analytics, commercial metrics,
  telemetry, issue bodies, screenshots, test fixtures, provider logs, or
  model-training material. Exact-purpose consent is necessary but not
  sufficient: O5 training input is limited to consented pseudonymous
  non-reconstructive signals or promoted Cleared Content Bank material.

Official-source records must use manifest, source URL, hash, provenance, rights status, verification status, law-effective date when relevant, and last verification metadata. Official-source manifests are not learner artifacts, and learner artifacts must never be merged into historical-question or reference-answer records.

## Core rule

Inverge keeps three data classes separate:

1. **Raw user-owned service data**: learner artifacts needed to provide the learner’s own capture, note, answer-review, rewrite, and review service.
2. **Safe derived learning signals**: product metadata derived from learner activity that does not contain learner-authored raw text or uploaded content.
3. **Product reference data**: trusted Inverge reference corpus entries and curated snippets used for grounding and context.

These classes must not be mixed. Raw learner artifacts are not reference corpus, not telemetry, not aggregate analytics input, and not cache-key material.

### Existing derived-signal runtime honesty

Current `SAFE_DERIVED_SIGNAL_KEYS`, key-name sanitization, legacy usage-event
metadata, and reference-cache metadata are personal-service/legacy contracts,
not Shared Signal Plane eligibility. Several permitted keys can carry free
text, so a safe key name does not prove pseudonymity or non-reconstructiveness.

A future O2 adapter must define a closed value-level schema using approved
IDs, enums, counts, and buckets; prohibit free text; enforce purpose consent;
and pass reconstructiveness tests. This reset does not change or connect the
legacy runtime.

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
