# S223 Three-Subject Corpus Reference Quality Acceptance

S223 adds the source-level acceptance contract for the three second-round subjects.

This is not learner runtime acceptance, not a public archive, and not a commercial or provider activation. It does not add checkout, billing hooks, entitlement enforcement, auth changes, OCR runtime expansion, provider calls, database migrations, academy routes, learner routes, or public question browsing.

## Goal

- Confirm that all three second-round subjects have source-provenance metadata.
- Confirm that source, rights, canonical question, reference package, law, theory, practice, critic, consensus, and release-gate status are represented.
- Define subject-specific quality gates for law, theory, and practice without storing raw content.
- Keep S224 learner runtime acceptance and S225 public paid launch as separate later gates.

## Scope

S223 covers:

- practice source metadata and calculation validation metadata;
- theory concept and coverage metadata;
- law source, version, exam-date, and current-law distinction metadata;
- S207 reference package status;
- S214 multi-candidate pipeline status;
- S215 critic, consensus, and release-gate status;
- quality acceptance readiness status for source-level acceptance only.

## Subject Gates

Practice requires:

- calculation input metadata;
- supported calculation type metadata;
- unit, rounding, and checksum-validation metadata;
- `casio_fx_9860giii`;
- reset-safe hand-keyed routine metadata;
- stored-program dependency disabled;
- no calculation sheets, images, PDFs, raw values, or traces in committed S223 metadata.

Theory requires:

- theory concept node/reference status;
- definition, comparison, and application coverage metadata;
- concept-source and alternative-view uncertainty status;
- no generated prose treated as exam authority.

Law requires:

- legal source and version status;
- exam-date law status;
- current-law distinction status;
- legal grounding/evidence status;
- no copied statute, case, source, question, or answer excerpts in S223 metadata.

## Acceptance Meaning

`accepted_source_contract_only` means the source-level acceptance contract exists and each subject has metadata gates. It does not mean full corpus completion, learner runtime readiness, or public paid launch readiness.

S223 intentionally keeps public launch blocked until later runtime and launch gates pass.

## Boundaries

S223 metadata-only records must not include:

- learner answer material;
- OCR material;
- problem or answer material;
- generated reference prose;
- source excerpts;
- calculation sheets or traces;
- PDFs, HWPs, images, or other asset bytes;
- provider payloads;
- credentials;
- payment or billing secrets.

S223 also keeps all exam-authority and launch claims disabled. Learning references remain learning references with caveats and source/uncertainty status.

## Rollout And Rollback

Rollout is a source-only merge:

- add the S223 contract module;
- add focused S223 tests;
- add this document;
- wire the test runner and safe metadata keys;
- advance the active roadmap from S223 to S224.

Rollback is a focused revert of those source, docs, test, runner, and roadmap edits. No database, route, auth, provider, OCR, billing, entitlement, archive, or academy rollback is required.

## Remaining Risks

- Real full-corpus coverage still needs later verified ingestion and rights decisions.
- Law and theory metadata include unresolved verification blockers.
- Practice calculation release still needs runtime evidence and independent recalculation evidence.
- S224 must prove the learner runtime loop end to end.
- S225 must prove paid launch, runtime, trust, cost, and release gates.

## Validation

Focused validation is:

```powershell
npm.cmd run test -- tests/s223-three-subject-corpus-reference-quality-acceptance.test.mjs --workers=1
```

The default node test runner includes the focused S223 test so full `npm.cmd run test -- --workers=1` covers this contract.
