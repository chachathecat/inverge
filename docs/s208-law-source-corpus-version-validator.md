# S208 Law Source Corpus and Exam-Date Version Validator

- Status: implementation contract
- Linked roadmap item: `S208`
- Linked issue: `#448`
- Scope: metadata-only 감정평가사 2차 법규 legal-source grounding

S208 creates the source/version layer required before S211 can make any legal-source confidence claim. It does not implement the law answer review engine, generate law reference answers, ingest statute bodies, or change learner or instructor runtime routes.

## Artifacts

Committed artifacts:

- `lib/review-os/law-source-version-registry.ts`
- `reference_corpus/legal_sources/appraiser_second_round_law_sources.json`
- `reference_corpus/legal_sources/appraiser_second_round_law_source_report.json`
- `scripts/validate-law-source-version-registry.mjs`
- `tests/law-source-version-registry.test.mjs`

Validation gate:

```text
npm run check:law-source-version-registry
```

## Metadata Boundary

Git may contain only source identity metadata, law-version status, safe source-anchor IDs, effective-date metadata, blocker IDs, and downstream link metadata.

Git must not contain raw statute bodies, case bodies, official question text, official answer text, generated reference-answer text, source excerpts, learner answers, OCR text, PDFs, HWPs, images, third-party academy material, or provider payloads.

The committed real law-source records are intentionally `needs_official_verification`. They are candidate source identities only. No committed real law source is marked verified, no exam-date version is marked applicable, and no high-confidence S211/S214/S215 use is allowed yet.

## Status Taxonomy

Legal source status:

- `verified`
- `needs_official_verification`
- `unresolved_conflict`
- `blocked`
- `synthetic_fixture`

Exam-date version status:

- `applicable_to_exam_date`
- `needs_official_verification`
- `unresolved_conflict`
- `blocked`
- `synthetic_fixture`

Current-law comparison status:

- `same_as_exam_date`
- `diverges_from_exam_date`
- `current_law_unresolved`
- `exam_date_version_unresolved`
- `not_applicable`
- `synthetic_fixture`

Verified real legal-source status requires source provenance, `lastVerifiedAt`, effective-date metadata, and verified effective-date status. Synthetic fixtures may exercise release-ready paths only inside tests.

## Blocker Taxonomy

S208 blockers include:

- `missing_source_id`
- `missing_source_provenance`
- `missing_effective_date`
- `missing_last_verified_at`
- `exam_date_version_unresolved`
- `current_law_divergence_unreviewed`
- `unresolved_source_conflict`
- `repeal_or_rename_unverified`
- `raw_content_boundary`
- `release_ready_blocked`
- `reference_package_link_blocked`
- `rubric_evidence_link_blocked`
- `unsupported_legal_source`

Open blocking legal-source blockers must block high-confidence S211 review and S215 release gates.

## Downstream Usage

S211 law answer review:

- Use `examDateVersionChecks` and `sourceAnchors` to decide whether legal-source review can proceed.
- Withhold high-confidence law review when source status is `needs_official_verification`, `unresolved_conflict`, or `blocked`.
- Never treat current-law metadata as applicable to a historical exam date unless the exam-date version check is verified.

S214 reference answer generation:

- Use only source anchors whose exam-date version is verified or synthetic fixture-only.
- Carry legal-source blockers forward into candidate-generation metadata.
- Do not generate releasable law reference answers from candidate law-source records.

S215 critic and release gate:

- Reject release-ready law packages when any linked legal-source blocker is open.
- Reject release if current-law and exam-date-law divergence is unresolved or undisclosed.
- Require zero blocking legal-source conflicts before release.

S207 reference answer packages:

- Link through `referencePackageLinks` and `lawVersionAnchorIds`.
- `ready_for_s215` or `released` package statuses require verified legal-source anchors and no open legal-source blockers.
- S207 no-official-answer guardrails remain unchanged.

S205 rubric/evidence review:

- Link through `evidenceReviewLinks`.
- `s205SourceStatus: "verified"` is allowed only when the linked legal-source anchor is verified.
- High-confidence review links require verified legal-source anchors and no open blockers.

## Validator Rules

The validator fails closed on:

- missing source IDs or anchor IDs;
- forbidden raw-content fields such as `rawContent`, `bodyText`, `statuteText`, `articleText`, `caseText`, `sourceExcerpt`, learner answer, OCR, PDF/HWP/image, or academy-content fields;
- verified source/version/anchor status without provenance, last verification date, and effective-date metadata;
- current-law claims while the exam-date version is unresolved;
- release-ready S207 package links while legal-source blockers or conflicts remain;
- S205 verified/high-confidence review links while legal-source status is unresolved;
- stale deterministic report JSON.

## Rollout

S208 is additive and source-level only: schema, metadata registry, deterministic report, docs, CLI, and tests. It has no database migration, auth change, provider change, billing change, learner UI change, public archive UI, or instructor route change.

Rollback is a focused revert of the S208 PR.

## Remaining Risks

- Real exam-date law-version verification still requires official-source work before S211 can claim legal correctness.
- Historical law-source coverage remains incomplete until every law question links to verified exam-date sources.
- Current-law divergence must stay explicit because current law can differ from the law applicable on a historical exam date.
