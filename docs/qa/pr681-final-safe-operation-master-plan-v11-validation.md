# PR #681 — Final Safe-Operation Master Plan v11 Validation

## Scope

This record validates the documentation-only finalization of Dabangil’s safe
photographed-question study architecture.

Active artifacts in this PR:

- `docs/strategy/ACTIVE-MASTER-PLAN.md`
- `docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v11-2026-08-05.md`
- `docs/decisions/2026-08-05-owner-safe-ephemeral-study-finalization.md`
- `config/dabangil-ephemeral-source-safety-contract-v1.json`
- this validation record

The preliminary v10 addendum, preliminary Owner decision and preliminary validation
record are removed so there is one active strategy entry point.

Tracking issue: `#682`.

## Authority boundary

This PR does not authorize:

- runtime, API, UI, schema, migration, RLS or Storage changes;
- provider, dependency or deployment changes;
- processing real unlicensed third-party source;
- Owner activation, external learner, payment, entitlement or Production;
- Ready transition, merge or auto-merge.

## Inputs incorporated

The final plan incorporates the Owner-supplied legal analyses concerning:

- direct civil and criminal exposure of an individual operator and the limits of using
  a corporation or user-liability clause as a shield;
- injunction, damages, enhanced-damages, criminal and repeat-infringer risk;
- the distinction between user capture, platform transient copying and AI output;
- the fact that non-persistence does not automatically make processing lawful;
- rights-holder black-box testing, screen recording and source/output comparison;
- output similarity, table reconstruction, answer-key imitation and market
  substitution;
- one-item/private/ephemeral processing, on-device OCR and source-minimized remote
  transmission;
- takedown, counter-notice, publisher blocking, repeat-infringer and kill-switch
  operations;
- actual UI, data-flow, provider-contract, sample-output and deletion evidence for
  written counsel review.

## Final authority assertions

1. v11 is the single active strategy entry point.
2. v8 and v9 are annexes only and cannot weaken v11.
3. the earlier v10 pipeline is superseded and removed.
4. unknown commercial source cannot become persistent/shared content without an exact
   active RightsManifest.
5. `transient_personal_study` defaults to one item, one page, one learner, one
   synchronous private session.
6. the exact two-page exception applies only to one item spanning two pages and does
   not authorize a full spread or sequential book extraction.
7. PDFs, batches, continuous pages, answer keys, publisher solutions, illegal scans and
   coordinated reconstruction are blocked.
8. on-device crop, PII redaction, OCR and source minimization are preferred.
9. full-source remote processing is blocked unless the exact organization, project,
   endpoint, model and capability have current contractual zero-content-retention
   eligibility plus written counsel approval.
10. raw/source-derived content cannot enter DB, Storage, Blob, object store, durable
    cache, queue, DLQ, logs, traces, APM, replay, analytics, backups, snapshots, CI,
    support, training, evaluation, embeddings, vector stores or RAG.
11. the ephemeral processor has no persistent-store credentials and no background,
    batch, webhook or automatic retry path.
12. full source-bound output is client-only or local-vault-only and cannot become a
    server answer history or cross-user cache.
13. cloud persistence is limited to scrubbed learner-authored body, closed learning
    evidence and bodyless receipts.
14. output release blocks full question restatement, source-table reconstruction,
    unique phrase/typo reproduction, publisher-outline imitation and answer-key style
    imitation.
15. the product is tested from the perspective of a rights holder using a test account,
    screen recording, network capture and source/output comparison.
16. transient source and derived variants cannot become shared bank, RAG, training,
    evaluation, verified held-out or stable-mastery evidence.
17. takedown, counter-notice, repeat-infringer, publisher blocklist and global kill
    switch are pre-launch requirements.
18. public docs, marketing, terms and privacy notice must match actual data flow and may
    not claim automatic legality, complete physical erasure or transfer all platform
    responsibility to the user.
19. written current Korean copyright/privacy review is a hard gate before any real
    third-party transient pilot.
20. external learners, payment and Production remain behind existing commercial gates.

## Machine-contract validation

The JSON contract must parse and preserve these exact hard acceptance values:

```text
rawPersistentWrites                              = 0
rawCacheQueueDlqWrites                           = 0
rawLogTraceReplayAnalyticsSupportCopies         = 0
rawBackupSnapshotCiCopies                       = 0
sourceEmbeddingRagTrainingEvalWrites             = 0
crossUserSourceOrOutputReuse                    = 0
sourceBoundFullOutputServerRecords              = 0
fullProblemRestatementReleases                  = 0
sourceTableReconstructionReleases               = 0
publisherAnswerImitationReleases                = 0
transientItemVerifiedHeldOutQualifications      = 0
validNoticeAfterHoldProcessingAttempts          = 0
unknownOrStaleProviderFullSourceCalls            = 0
```

## Documentation consistency checks

- active pointer resolves to the v11 path;
- final Owner decision resolves to the v11 path and JSON contract;
- v11 resolves to the active pointer, Owner decision and JSON contract;
- no active file points to the removed v10 path as current authority;
- v11 states that v8/v9 are annexes for non-conflicting detail;
- v11 and the JSON contract agree on raw persistent retention `0`, memory ceiling
  `600`, one-page default, exact two-page exception and blocked PDF/answer-key paths;
- v11 and the JSON contract both require rights-holder direct testing;
- v11 and the JSON contract both require written Korean legal/privacy review;
- the PR remains documentation/configuration only.

## Repository checks

Exact-head checks must include:

- JSON parsing;
- typecheck;
- lint;
- focused tests;
- full test suite;
- learner-loop verification;
- build;
- PR Contract;
- Risk Gate;
- Runtime Gate;
- Learner Loop Health;
- Vercel status where applicable.

Feature-specific runtime acceptance may skip because no runtime behavior is changed.

## Review posture

Human approval required. The PR remains Draft.

Passing CI does not replace legal/product review, does not authorize real-source
processing, and does not authorize merge or implementation.
