# Dabangil Rights-Safe Adaptive Variant Foundry V1

This source-only architecture turns source eligibility into a fail-closed decision before any blueprint, generation, sharing, calibration, analytics, training or paid-delivery path.

## Flow

1. Classify the source and bind a valid `RightsManifestV1` to its exact purpose.
2. Reject hard-denied classes from every shared route with a stable denial code.
3. Extract only a non-expressive `SkillBlueprintV1`; protected expression never becomes a reusable blueprint.
4. Search the eligible bank under exact skill, difficulty, item-family and exposure constraints.
5. On a gap, emit only a bodyless `BankScarcityEventV1` and schedule an offline batch.
6. Traverse source/rights, schema/blueprint, deterministic/source, similarity/reconstruction, blind-solver, strong-critic, Owner and pilot/calibration gates in that order.
7. Release survivors to Learning Bank first; later evidence separately qualifies Transfer and Measurement banks.

## Stable source-decision lineage

Every reusable `SkillBlueprintV1` binds one stable `sourceDecisionId` that
resolves exactly to `SourceEligibilityDecisionV1.decisionId`. The resolved
decision fixes the source class, purpose, policy version, decision,
denial codes, decision time and `decisionBasisChecksum` for that exact
revision. A changed basis creates a new decision identity or exact revision;
it may not silently reuse the old ID.

Missing, empty, stale, ambiguous or unresolved decision lineage blocks the
blueprint and every later shared route. AI output may neither create nor
self-certify a source-eligibility decision ID.

## Exact pre-blueprint rights-manifest binding

A `DENY_ALL_SHARED_ROUTES` decision may omit a manifest and remains denied.
Every decision that permits or conditionally permits any shared route must
carry `rightsManifestId`, `rightsManifestVersionId` and
`rightsEvaluatedAt` before blueprint extraction. Those fields resolve one
unique `RightsManifestV1.manifestId + manifestVersionId` pair.

The resolved manifest must be active; have the same source class; include the
exact decision and requested-route purpose; cover the territory; and satisfy
`validFrom <= decidedAt, rightsEvaluatedAt, useAsOf <= validUntil`. Missing,
mismatched, duplicate, expired, revoked, disputed, blocked or ambiguous
bindings fail closed before blueprint extraction, generation context, variant
bank entry, cross-user reuse, calibration, analytics body, model-training body
or paid delivery.

Blueprint extraction and every shared-route use re-resolve and revalidate the
exact decision and manifest version. A decision that was valid yesterday
cannot authorize use after expiry, revocation or dispute. A separate
`VariantReleaseArtifactV1` manifest ID/version remains mandatory at release,
but it cannot retroactively cure absent pre-blueprint lineage.

## Complete reference graph

The nine internal edges are:

1. `SourceEligibilityDecisionV1.rightsManifestId → RightsManifestV1.manifestId`;
2. `SourceEligibilityDecisionV1.rightsManifestVersionId → RightsManifestV1.manifestVersionId`;
3. `SkillBlueprintV1.sourceDecisionId → SourceEligibilityDecisionV1.decisionId`;
4. `VariantCandidateV1.blueprintId → SkillBlueprintV1.blueprintId`;
5. `VariantReleaseArtifactV1.candidateId → VariantCandidateV1.candidateId`;
6. `VariantReleaseArtifactV1.rightsManifestId → RightsManifestV1.manifestId`;
7. `VariantReleaseArtifactV1.rightsManifestVersionId → RightsManifestV1.manifestVersionId`;
8. `ExposureLedgerV1.artifactId → VariantReleaseArtifactV1.artifactId`; and
9. `DisputeAndRetirementV1.artifactId → VariantReleaseArtifactV1.artifactId`.

Every source field has exactly one target and every identity is required by
its target contract. Contributor, skill-taxonomy and idempotency identifiers
remain explicitly external or policy-scoped. Unresolved or multi-target
references fail closed.

## Fail-closed invariants

- Missing or invalid rights manifests block blueprint extraction and every
  later shared route; release-time binding cannot repair earlier absence.
- Academy/commercial material, private uploads, rights-unknown sources and blocked sources have no shared route.
- Raw learner bodies never enter shared calibration, analytics or training; consent cannot change the training prohibition.
- AI candidates cannot self-promote, self-publish or self-verify.
- Deterministic/source conflicts, near-copy results, reconstruction risk, disputes, staleness and retirement block new assignment.
- The similarity corpus contains only legally held or cleared material.

## Three-bank separation

Learning usability proves only bounded learning use. Transfer requires independent evidence. Measurement requires pilot and calibration evidence. Promotion is explicit and lineage-preserving; no state implies the next.

## Runtime boundary

This contract defines source policy and evidence shapes only. It does not install a generator, model, provider, route, store, migration, learner flow, bank content or activation.
