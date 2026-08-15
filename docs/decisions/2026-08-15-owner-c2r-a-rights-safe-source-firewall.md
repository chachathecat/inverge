# Owner Decision — C2R-A Rights-Safe Source Firewall

- Decision date (KST): 2026-08-15
- Stage: `C2R-A`
- Issue: `#702`
- Recovery tracker: `#717`
- Scope: source contract only

## Decision

Install the rights-safe adaptive variant foundry contract as the independently complete C2R-A source outcome. It classifies every source before use, fails closed at every shared route, separates Learning, Transfer and Measurement banks, and makes generation subordinate to bank scarcity.

V13 remains the sole active master. WCV `1.0.8`, WCV-C2 and ULC-0 remain subordinate. This decision creates no runtime, app, API, persistence, migration, RLS, Storage, provider, learner-data, real-content, payment, deployment or Production authority.

## Source firewall

The exact classes are `INVERGE_ORIGINAL`, `RIGHTS_CLEARED_OFFICIAL`, `CONTRACTED_EXPERT_ORIGINAL`, `CLEARED_DETERMINISTIC_TEMPLATE`, `USER_PRIVATE_ONLY`, `ACADEMY_OR_COMMERCIAL_TEXTBOOK`, `RIGHTS_UNKNOWN` and `BLOCKED`.

`ACADEMY_OR_COMMERCIAL_TEXTBOOK`, `USER_PRIVATE_ONLY`, `RIGHTS_UNKNOWN` and `BLOCKED` are denied from shared blueprint extraction, shared generation context, shared variant banks, cross-user cache/reuse, shared calibration bodies, analytics bodies, model-training bodies and paid delivery. Each denial is machine-readable.

Raw learner content is unconditionally barred from model training. Consent cannot override or promote it into training data.

## Foundry and bank decision

The progression is `DRAFT_CANDIDATE → AUTOMATED_CHECKED → LEARNING_USABLE → TRANSFER_VERIFIED → CALIBRATION_PILOT → CALIBRATED_MEASUREMENT`; `DISPUTED`, `BLOCKED`, `STALE` and `RETIRED` are hold or terminal states. Learning usability does not imply transfer, transfer does not imply measurement, and AI output cannot self-publish or self-verify.

Bank search precedes generation. A gap records only a bodyless scarcity event; offline batches then traverse the cheap-to-expensive cascade before Owner adjudication. Real-time generation is limited to clearly labeled low-risk guided practice and cannot prove D+7 transfer, timed recurrence, readiness, efficacy or calibrated measurement.

Historical exams may inform only non-expressive skill blueprints after rights review. Original wording, distinctive facts, tables, diagrams, answer structure and explanation sequence cannot be copied or lightly transformed. Number/name/order/word-only substitutions fail as near-copies. Similarity comparison may use only legally held or cleared material.

## Serial recovery semantics

This candidate represents the state after its own expected-head-pinned squash merge and validated `MergeCoverageReceiptV1`: C2R-A is complete source-only and C2R-B/#714 is authorized but unstarted. Issue #702 closes only after live receipt validation. C2R-C-P remains blocked until terminal validated merges of both C2R-A and C2R-B; issue state cannot substitute.

No donor finding row is assigned to C2R-A, so the 21-row regression matrix remains byte-for-byte unchanged. The stage receipt uses an empty `coveredFindingThreadIds` list and names the focused contract test.

## Owned paths

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

No other path is authorized.
