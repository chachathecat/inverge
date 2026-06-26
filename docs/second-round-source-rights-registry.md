# S202 Second-Round Source and Rights Registry

## Scope

This document defines the S202 metadata boundary for 감정평가사 2차 historical-question sources.

Committed artifacts:

- `reference_corpus/official_materials/appraiser/second_round_source_registry.json`
- `reference_corpus/official_materials/appraiser/second_round_rights_registry.json`
- `reference_corpus/official_materials/appraiser/second_round_coverage_report.json`

The committed registry is 2차-only and currently covers the committed Q-Net metadata basis for 2020-2025. It does not claim full historical completion for older years. Older years remain discovery work until official source identity can be confirmed without committing raw files or copied question bodies.

## Registration Procedure

1. Confirm the source belongs to 감정평가사 2차 and one of the three subjects: `practice`, `theory`, or `law`.
2. Confirm the official source ID exists in `reference_corpus/curriculum/appraiser/official_sources.json`.
3. Register only safe metadata: source ID, official URL, source agency, year, round, subject, paper/session, artifact kind, source status, extraction status, and optional safe page/date metadata.
4. Do not register question text, answer text, OCR text, screenshots, local file paths, raw filenames, or third-party academy material.
5. If the artifact has not been retrieved through an approved private workflow, set `hashStatus` to `not_fetched` and omit `fileHashSha256`.
6. If a source is expected but not confirmed, keep it out of the source registry and represent the missing slot in the coverage report as `not_found` or `needs_manual_review`.

## Private Retrieval and Hashing

Approved retrieval and hashing is local/private only.

- Raw PDF/HWP/image bytes stay outside Git and outside issue/PR artifacts.
- The local operator may retrieve an official artifact, compute SHA-256 locally, and then commit only the hash and safe metadata.
- A committed `fileHashSha256` is valid only when it is a real 64-character SHA-256 digest from that workflow.
- Placeholder hashes, filename hashes, and guessed hashes are invalid as `fileHashSha256`.
- Existing `localRawFileNameHash` values are legacy safe filename-key hashes. They are not artifact-content hashes.

## Rights Workflow

Every source must have one rights decision.

- `needs_legal_review`: default for ambiguous redistribution rights. Display must stay `metadata_and_link` or stricter. It cannot permit full text or official-file embed.
- `display_by_deep_link`: use `metadata_and_link`.
- `private_reference_only`: use `operator_only`.
- `redistribution_allowed`: broader display is allowed only when evidence and verification date are recorded.

Public availability on Q-Net is not enough to infer redistribution permission. Ambiguous rights stay `needs_legal_review` and fail closed.

## S203 Consumption

S203 may consume S202 as source inventory and a rights gate.

Allowed for S203 now:

- read source IDs, official URLs, year/round/subject/session metadata;
- see missing slots and rights-blocked slots;
- use `s203Consumption.metadataEligible` to decide whether safe metadata can enter canonical ingestion planning.

Blocked for S203 until later gates:

- canonical question-body ingestion from `needs_legal_review` sources;
- learner-facing full text or official-file embed;
- release of extracted problem text while extraction is `metadata_only`, `not_started`, `needs_visual_check`, or `blocked`;
- any reference-answer release decision.

## Coverage Gaps

The coverage report is deterministic and generated from the source and rights registries.

Each expected slot is keyed by year, round, subject, and canonical 2차 session. Missing or blocked work is explicit:

- `not_found`: expected subject slot is absent from committed source metadata;
- `source_unavailable`: official source is known unavailable;
- `rights_blocked`: source exists but rights do not allow raw display or learner publication;
- `needs_manual_review`: source identity or coverage needs manual review.

The current report intentionally shows the 2021 theory and law slots as `not_found`, and all registered sources as `rights_blocked`.

## Separate States

S202 keeps these states separate:

- Source verification: official provenance and artifact identity are registered.
- Rights verification: allowed display mode and redistribution status are recorded.
- Problem-text verification: extraction, visual checks, and canonical question-body readiness. This is not completed in S202.
- Reference-answer verification: source anchors, calculations, critic review, consensus, and release gate. This is not part of S202.

Keeping these separate prevents a verified source link from being mistaken for verified problem text or a releasable reference answer.

## Validation

Run:

```text
npm run check:second-round-source-rights
npm run test:second-round-source-rights
```

To regenerate the deterministic coverage report after source or rights metadata changes:

```text
npm run check:second-round-source-rights -- --write-coverage
```

The validator fails on duplicate source IDs, unknown official sources, unsupported year/round/subject combinations, invalid rights/display combinations, placeholder hashes, broad display without evidence, raw-content fields, and learner publication while rights or extraction are blocked.
