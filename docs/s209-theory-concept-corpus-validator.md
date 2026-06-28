# S209 Theory Concept Corpus and Validator

- Status: implementation contract
- Linked roadmap item: `S209`
- Scope: metadata-only 감정평가사 2차 이론 concept grounding

S209 creates the theory concept grounding layer required before S212 can make high-confidence theory answer-review claims. It does not implement the S212 theory answer engine, generate reference answers, add learner UI, add provider calls, or change billing, auth, OCR, runtime API, instructor routes, or public archive behavior.

## Artifacts

Committed artifacts:

- `lib/review-os/theory-concept-corpus-registry.ts`
- `reference_corpus/theory_sources/appraiser_second_round_theory_concepts.json`
- `reference_corpus/theory_sources/appraiser_second_round_theory_concept_report.json`
- `scripts/validate-theory-concept-corpus.mjs`
- `tests/theory-concept-corpus-registry.test.mjs`

Validation gate:

```text
npm run check:theory-concept-corpus
```

## Metadata Boundary

Git may contain only concept IDs, concept titles, unit/category metadata, source identity metadata, source URLs or source IDs when safe, verification status, relation IDs, blocker IDs, downstream link metadata, and deterministic report metadata.

Git must not contain raw official question text, raw official answer text, generated reference-answer text, source excerpt text, copied textbook or academy explanation bodies, learner answers, OCR text, PDFs, HWPs, images, provider payloads, or private user content.

The committed real theory concept records are intentionally `needs_official_verification`. They are candidate source identities and concept graph anchors only. No committed real concept is marked verified and no high-confidence S212, S214, S215, S207, or S205 use is allowed yet.

## Status Taxonomy

Concept, definition, source, relation, and source-coverage statuses:

- `verified`
- `needs_official_verification`
- `unresolved_conflict`
- `blocked`
- `synthetic_fixture`

Relation taxonomy:

- `parent`
- `child`
- `prerequisite`
- `contrast`
- `near_synonym`
- `applied_by`
- `evaluated_by`
- `unclear_relation`

Verified real theory concepts require source provenance, `lastVerifiedAt`, verified definition status, verified source status, and no open blocking concept blockers. Synthetic fixtures may exercise release-ready paths only in tests, with `boundaryPolicy.syntheticFixturesOnly: true`.

## Blocker Taxonomy

S209 blockers include:

- `missing_concept_id`
- `missing_source_provenance`
- `missing_last_verified_at`
- `missing_definition_status`
- `unresolved_concept_conflict`
- `ambiguous_concept_relation`
- `alternative_view_unreviewed`
- `unsupported_theory_claim`
- `raw_content_boundary`
- `release_ready_blocked`
- `reference_package_link_blocked`
- `rubric_evidence_link_blocked`

Open blocking concept blockers must block high-confidence S212 review and S215 release gates.

## Downstream Usage

S212 theory answer review:

- Use `theoryConceptChecks`, `conceptAnchors`, and `conceptRelations` to decide whether high-confidence theory review can proceed.
- Withhold high-confidence theory review when concept, definition, relation, or source coverage status is `needs_official_verification`, `unresolved_conflict`, or `blocked`.
- Alternative views and uncertainty notes are metadata only and must not become official claims.

S214 reference answer generation:

- Carry theory concept blockers forward into candidate-generation metadata.
- Do not generate releasable theory reference answers from candidate-only concept records.

S215 critic and release gate:

- Reject release-ready theory packages when linked concept blockers, unresolved concept conflicts, ambiguous relations, or unreviewed alternative views remain open.
- Require zero blocking theory concept conflicts before release.

S207 reference answer packages:

- Link through `referencePackageLinks` and `theoryConceptAnchorIds`.
- `ready_for_s215` or `released` package links require verified theory concept anchors and no open S209 blockers.

S205 rubric/evidence review:

- Link through `evidenceReviewLinks`.
- `s205SourceStatus: "verified"` and `reviewConfidence: "high"` require verified theory concept anchors and no open blockers.

## Validator Rules

The validator fails closed on:

- missing concept IDs or relation endpoints;
- relation IDs pointing to missing concepts;
- forbidden raw-content fields such as `rawContent`, `bodyText`, `definitionText`, `sourceExcerpt`, `officialQuestionText`, `officialAnswerText`, `referenceAnswerText`, `learnerAnswer`, `ocrText`, `providerPayload`, `academyContent`, `pdf`, `hwp`, or `image`;
- verified real concept status without provenance and `lastVerifiedAt`;
- synthetic fixture status in the committed real corpus;
- high-confidence S212/S214/S215 flags while linked concepts, definitions, relations, source coverage, or blockers are unresolved;
- release-ready S207 package links while concept blockers remain open;
- S205 verified/high-confidence evidence links while concept status is unresolved;
- alternative views or uncertainty notes that allow official claims;
- stale deterministic report JSON.

## Rollout

S209 is additive and source-level only: schema, metadata registry, deterministic report, docs, CLI, and tests. It has no database migration, auth change, provider change, billing change, learner UI change, public archive UI, OCR runtime change, production API behavior, or instructor route change.

Rollback is a focused revert of the S209 PR.

## Remaining Risks

- Real theory concept verification still requires official/public-source review before S212 can claim high-confidence concept grounding.
- Concept graph coverage is only a conservative seed and must expand before complete three-subject launch acceptance.
- Alternative views and term-boundary conflicts must stay explicit until reviewed by the S209/S212/S215 flow.
