---
document_title: "Owner Decision — C2R-A Rights-Safe Source Firewall"
status: "owner-decision/approved-source-contract-only"
decision_id: "owner_c2r_a_rights_safe_source_firewall_2026_08_15"
dated: "2026-08-15 KST"
repository: "chachathecat/inverge"
stage_id: "C2R-A"
stage_issue: 702
recovery_tracker_issue: 717
replacement_tracking_issue: 723
predecessor_decision: "docs/decisions/2026-08-14-wcv-c2-structural-recovery.md"
supersedes_for_exact_scope:
  - "c2r_a_source_contract"
  - "post_merge_current_replacement_stage"
  - "post_merge_current_replacement_stage_issue"
repository_authority_effective_on: "expected_head_pinned_merge"
operational_successor_start_requires:
  - "validated_c2r_a_merge_coverage_receipt"
  - "issue_702_terminal_close"
post_merge_current_replacement_stage: "C2R-B"
post_merge_current_replacement_stage_issue: 714
issue_702_closure_requires_validated_receipt: true
automatic_start_allowed: false
runtime_authorization: "none"
application_authorization: "none"
api_authorization: "none"
database_authorization: "none"
provider_authorization: "none"
learner_activation_authorization: "none"
payment_authorization: "none"
deployment_authorization: "none"
production_authorization: "none"
---

# Owner Decision — C2R-A Rights-Safe Source Firewall

## 1. Exact authority and precedence

Install the rights-safe adaptive variant foundry as the independently complete
C2R-A source outcome. This decision supersedes the 2026-08-14 structural
recovery decision only for:

- the exact C2R-A rights-safe source contract;
- the repository's post-merge current replacement-stage selector; and
- the repository's post-merge current replacement-stage issue selector.

The 2026-08-14 decision remains controlling for PR #716 terminal disposition,
Tracker #717, the five-stage serial chain, stage scopes and dependencies,
one-writer/no-auto-start authority, C2R-B leaving #714 open, and C2R-C-P
requiring terminal validated C2R-A and C2R-B merges. Historical text that
records C2R-A/#702 as the initial stage remains true history but cannot
override this later exact supersession after the clean expected-head-pinned
merge.

Repository authority becomes effective only on that merge. C2R-B may not
operationally start until a live-validated C2R-A `MergeCoverageReceiptV1`
exists and Issue #702 is terminally closed.

V13 remains the sole active master. WCV `1.0.8`, WCV-C2 and ULC-0 remain
subordinate. This decision creates no runtime, app, API, persistence,
migration, RLS, Storage, provider, learner-data, real-content, payment, store,
deployment or Production authority.

## 2. Source-decision and rights-manifest identities

Every `SourceEligibilityDecisionV1` has the stable core identity and basis:

- `decisionId`;
- `sourceClass`;
- `purpose`;
- `decision`;
- `denialCodes`;
- `decidedAt`;
- `policyVersion`; and
- `decisionBasisChecksum`.

A changed decision basis creates a new decision identity or an exact revision.
AI output cannot create or self-certify a decision. Missing, ambiguous or stale
identity fails closed.

Every `RightsManifestV1` has exact `manifestId` and
`manifestVersionId`, source class, rights holder, permitted purposes,
territory, `validFrom`, `validUntil`, status and provenance. A changed
rights basis creates a new version. Revoked, disputed, expired or blocked
manifests fail closed.

## 3. Conditional binding before any shared route

A `DENY_ALL_SHARED_ROUTES` decision may remain deny-only without a manifest.
Any decision that permits or conditionally permits a shared route must carry
`rightsManifestId`, `rightsManifestVersionId` and `rightsEvaluatedAt`
and resolve one exact active manifest version before:

- shared blueprint extraction;
- shared generation context;
- shared variant-bank entry;
- cross-user cache or reuse;
- shared calibration;
- analytics-body use;
- model-training-body use; or
- paid delivery.

The manifest source class must equal the decision source class, the requested
purpose must be included, territory must be eligible, and decision,
evaluation and use instants must fall within the exact validity window.
Blueprint extraction and every later shared-route use revalidate the binding.
A release-time manifest remains independently required but cannot
retroactively cure missing pre-blueprint lineage.

## 4. Complete internal reference graph

The exact internal edges are:

1. `SourceEligibilityDecisionV1.rightsManifestId → RightsManifestV1.manifestId`;
2. `SourceEligibilityDecisionV1.rightsManifestVersionId → RightsManifestV1.manifestVersionId`;
3. `SkillBlueprintV1.sourceDecisionId → SourceEligibilityDecisionV1.decisionId`;
4. `VariantCandidateV1.blueprintId → SkillBlueprintV1.blueprintId`;
5. `VariantReleaseArtifactV1.candidateId → VariantCandidateV1.candidateId`;
6. `VariantReleaseArtifactV1.rightsManifestId → RightsManifestV1.manifestId`;
7. `VariantReleaseArtifactV1.rightsManifestVersionId → RightsManifestV1.manifestVersionId`;
8. `ExposureLedgerV1.artifactId → VariantReleaseArtifactV1.artifactId`; and
9. `DisputeAndRetirementV1.artifactId → VariantReleaseArtifactV1.artifactId`.

Every source has one target. Missing, unresolved, duplicate-version or
multi-target references fail closed. Contributor, skill-taxonomy and
idempotency identifiers remain explicitly scoped external identifiers.

## 5. Source firewall, foundry and banks

The exact source classes are `INVERGE_ORIGINAL`,
`RIGHTS_CLEARED_OFFICIAL`, `CONTRACTED_EXPERT_ORIGINAL`,
`CLEARED_DETERMINISTIC_TEMPLATE`, `USER_PRIVATE_ONLY`,
`ACADEMY_OR_COMMERCIAL_TEXTBOOK`, `RIGHTS_UNKNOWN` and `BLOCKED`.

`ACADEMY_OR_COMMERCIAL_TEXTBOOK`, `USER_PRIVATE_ONLY`,
`RIGHTS_UNKNOWN` and `BLOCKED` are denied from every shared route. Raw
learner content is unconditionally barred from model training; consent cannot
override that ban.

The progression remains `DRAFT_CANDIDATE → AUTOMATED_CHECKED →
LEARNING_USABLE → TRANSFER_VERIFIED → CALIBRATION_PILOT →
CALIBRATED_MEASUREMENT`; `DISPUTED`, `BLOCKED`, `STALE` and
`RETIRED` remain hold or terminal states. Learning, Transfer and Measurement
banks do not substitute for one another. AI output cannot self-publish or
self-verify.

Bank search precedes generation. Gaps emit bodyless scarcity events. Historical
exams may inform only non-expressive skill blueprints after rights review.
Original wording, distinctive facts, tables, diagrams, answer structure and
explanation sequence cannot be copied or lightly transformed. Number, name,
order or word-only substitutions fail as near-copies.

## 6. Serial recovery semantics

After the clean expected-head-pinned merge, the repository represents C2R-A
complete source-only and C2R-B/#714 as the next authorized but unstarted stage.
Operational closeout still requires the validated receipt and #702 closure.
C2R-C-P remains blocked until terminal validated merges of both C2R-A and
C2R-B; issue state cannot substitute.

No donor finding row is assigned to C2R-A. The 21-row regression matrix remains
unchanged and the C2R-A receipt uses `coveredFindingThreadIds: []`.

## 7. Exact owned-path manifest

The clean replacement owns exactly:

- `AGENTS.md`
- `roadmap/active-program.yml`
- `config/dabangil-unified-program-contract.json`
- `config/dabangil-unified-product-multisurface-launch-v1.json`
- `docs/dabangil-unified-program-contract.md`
- `docs/inverge-master-roadmap.md`
- `docs/decisions/2026-08-15-owner-c2r-a-rights-safe-source-firewall.md`
- `docs/strategy/dabangil-rights-safe-adaptive-variant-foundry-v1.md`
- `config/dabangil-rights-safe-adaptive-variant-foundry-v1.json`
- `docs/qa/rights-safe-adaptive-variant-foundry-validation.md`
- `tests/rights-safe-adaptive-variant-foundry-contract.test.mjs`
- `tests/wcv-c2r-structural-recovery-authority.test.mjs`
- `tests/wcv-campaign-authority-roadmap-reconciliation.test.mjs`
- `tests/dabangil-unified-product-multisurface-launch-authority.test.mjs`
- `scripts/run-node-tests.mjs`
- `docs/strategy/ACTIVE-MASTER-PLAN.md`
- `docs/strategy/dabangil-unified-product-multisurface-launch-v1-2026-08-14.md`

No other path is authorized.
