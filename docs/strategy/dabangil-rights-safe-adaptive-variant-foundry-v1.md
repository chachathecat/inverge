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
decision fixes the source class, purpose, policy version, decision basis,
denial codes and decision time for that exact revision. A changed basis must
invalidate or version the decision identity; it may not silently reuse the
old ID.

Missing, empty, stale, ambiguous or unresolved decision lineage blocks the
blueprint and every later shared route. A valid decision lineage does not
replace the independently required `RightsManifestV1` lineage. AI output may
neither create nor self-certify a source-eligibility decision ID.

## Fail-closed invariants

- Missing or invalid rights manifests block release.
- Academy/commercial material, private uploads, rights-unknown sources and blocked sources have no shared route.
- Raw learner bodies never enter shared calibration, analytics or training; consent cannot change the training prohibition.
- AI candidates cannot self-promote, self-publish or self-verify.
- Deterministic/source conflicts, near-copy results, reconstruction risk, disputes, staleness and retirement block new assignment.
- The similarity corpus contains only legally held or cleared material.

## Three-bank separation

Learning usability proves only bounded learning use. Transfer requires independent evidence. Measurement requires pilot and calibration evidence. Promotion is explicit and lineage-preserving; no state implies the next.

## Runtime boundary

This contract defines source policy and evidence shapes only. It does not install a generator, model, provider, route, store, migration, learner flow, bank content or activation.
