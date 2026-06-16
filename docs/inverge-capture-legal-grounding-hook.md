# Capture-to-Note Legal Grounding Hook v1

## Purpose

This hook gives the Capture-to-Note/learning-note pipeline a safe pre-check before any legal explanation is drafted.
It is infrastructure-only and does not generate learner-facing legal interpretations by itself.

## Rule

No source, no legal claim.

The hook checks whether the detected legal concept candidates have grounded, current legal source anchors via the authenticated concept-anchor reader.

If a verified anchor exists, `status` becomes `grounded_verified`.

If only draft/needs-update/review-needed anchors exist, `status` becomes `grounded_draft`.

If no concept anchors are attached yet but keyword-like candidates exist, `status` becomes `source_candidates_only`.

If no anchors/candidates exist, `status` is `unsupported`.

## Copy Rules

- Verified anchors allow a grounded explanation draft path only.
- Draft/needs_update anchors do not allow production legal claims.
- Learner-safe guidance messages are short and must avoid exposing article body text.

For example:

- `검증된 법령 근거를 찾았습니다.`
- `법령 근거 후보가 있지만 아직 검수 전입니다.`
- `아직 연결된 법령 근거가 없습니다.`

## Source Boundary

- Official law chunks are source anchors, not official model answers.
- Learner raw input remains separate from legal corpora:
  - Do not store raw OCR text
  - Do not store raw learner answers
  - Do not store raw problem text

## Blocking Policy

Draft anchors (`sourceStatus: draft`, `sourceStatus: needs_update`, or `needsOfficialVerification: true`) are treated as `grounded_draft` and must not drive legal claims.
Only verified anchors (`sourceStatus: verified` and `needsOfficialVerification: false`) can move to `grounded_verified`.

No source, no legal claim applies for:

- explanation draft generation
- scoring or pass-fail judgments
- model-answer-style outputs

## Learner-Loop Safety

- No learner text is persisted into the legal source corpus by this hook.
- This hook is read-only and does not mutate anchor tables.
- For learner note generation, this hook only returns structured metadata:
  source counts, status, and short safety copy.
