# Inverge Legal Anchor Verification Apply v1

## Purpose

Operator-only workflow that applies human-reviewed legal anchor verification decisions to
`public.legal_concept_anchors`.

This step is separate from report generation and never performs automatic verification.

## Core Rule

No source, no legal claim.

Only explicitly reviewed anchor decisions may update source status for production-grade legal
explanation readiness.

## Decision Policy

- This operator workflow does not auto-verify anchors.
- Verification only applies if a decision row is explicitly present and valid.
- `verified` requires human review metadata (`reviewer` + `reviewedAt`).
- Other decisions (`needs_update`, `rejected`, `keep_draft`) remain non-production unless
  subsequent human review changes them.

### Decision Mapping

- `verified`
  - `sourceStatus`: `verified`
  - `needsOfficialVerification`: `false`
  - `confidence`: `1.0`
- `needs_update`
  - `sourceStatus`: `needs_update`
  - `needsOfficialVerification`: `true`
- `rejected`
  - `sourceStatus`: `rejected`
  - `needsOfficialVerification`: `true`
- `keep_draft`
  - `sourceStatus`: `draft`
  - `needsOfficialVerification`: `true`

## What gets updated

For matching anchors:

- `legal_concept_anchors.metadata.sourceStatus`
- `legal_concept_anchors.metadata.needsOfficialVerification`
- `legal_concept_anchors.metadata.verificationDecision`
- `legal_concept_anchors.metadata.reviewedAt`
- `legal_concept_anchors.metadata.reviewer`
- `legal_concept_anchors.metadata.reviewerNotes`
- `legal_concept_anchors.metadata.safeUse` is set to `legal_anchor_verification_apply`
- `legal_concept_anchors.confidence`

No other tables are updated by this script.

## Runbook

### Dry-run

```
set LEGAL_ANCHOR_VERIFICATION_DECISIONS_PATH=<path-to-decisions-json>
set LEGAL_ANCHOR_VERIFICATION_DRY_RUN=1
npm run apply:legal-anchor-verification
```

Dry-run prints a summary only and does not mutate Supabase.

### Apply

```
set NEXT_PUBLIC_SUPABASE_URL=<https://...>
set SUPABASE_SERVICE_ROLE_KEY=<secret>
set LEGAL_ANCHOR_VERIFICATION_DECISIONS_PATH=<path-to-decisions-json>
npm run apply:legal-anchor-verification
```

## Matching Requirements

Each decision must match:

- `conceptKey` → `legal_concept_nodes.concept_key`
- `articleKey` → `legal_article_chunks.article_key`
- anchor row by `(concept_node_id, article_chunk_id)` in `legal_concept_anchors`

If any match is missing, the script records summary misses and does not apply updates for that item.

## Rollback

Rollback is manual and operator-driven:

- Re-run this script with explicit compensating `keep_draft` / `needs_update` / `rejected` decisions.
- Or apply a corrected `verified`/`rejected` decision set in a follow-up run.

There is no automatic undo command.

## Data and Source Boundaries

This script uses reviewed decisions only. It does not generate learner-facing legal explanations.

Learner raw input remains separate from the legal corpus:
- Do not store raw learner answers or raw problem text.
- Do not store copyrighted academy materials.
- Do not store official answer bodies, model answers, score predictions, or pass/fail judgments.

Q-Net/local official materials are out of scope. This is official article metadata review only.

Generated artifacts from other tooling are local by default. Do not commit operator run artifacts.
