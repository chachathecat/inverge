# Inverge Legal Anchor Verification Report

## Purpose

The Legal Anchor Verification Report is an operator-only export for reviewing draft legal concept anchors before any production-grade legal explanation work. It helps a reviewer inspect whether each concept anchor points to the right law article, whether the article chunk is substantive, and whether the anchor needs another supporting source.

This report does not verify anchors automatically. It does not generate learner-facing legal explanations.

## Grounding Rule

No source, no legal claim.

Draft anchors are not production-ready. Anchors with `sourceStatus: draft` or `needsOfficialVerification: true` must remain blocked from production-grade legal explanations until human review records a separate verification decision.

Source anchors are not official model answers, official grading, score prediction, or pass/fail judgment. They are law-article references used to support future grounded explanation workflows.

## Human Verification Workflow

1. Run the report locally in an operator environment.
2. Review each concept group by exam subject and concept key.
3. Check whether the law title, article number, article title, and preview match the intended concept.
4. Mark the blank reviewer checklist in a local copy:
   - correct anchor
   - needs supporting article
   - wrong article
   - too broad concept
   - ready to verify
5. Use the reviewed report as input for a later Legal Anchor Verification Apply v1 change.

## How To Run

Required environment:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional environment:

- `LEGAL_ANCHOR_REPORT_DIR`
- `LEGAL_ANCHOR_REPORT_LIMIT`

Command:

```bash
npm run export:legal-anchor-verification-report
```

Default output directory:

```text
.data/legal-anchor-verification/
```

Generated files:

- `legal-anchor-verification-report.csv`
- `legal-anchor-verification-report.md`
- `legal-anchor-verification-summary.json`

## Risk Flags

- `draft_needs_review`: source status is draft or official verification is still required.
- `missing_article_title`: the article title is blank.
- `heading_like_chunk`: the preview looks like a chapter, section, part, or heading rather than a substantive article.
- `short_body_text`: the article preview is very short.
- `broad_concept_single_anchor`: a broad concept has only one source anchor.
- `low_confidence`: anchor confidence is below 0.75.
- `keyword_candidate_only`: reserved for future candidate-only retrieval paths.

## Data Boundary

Do not commit generated reports. They are local operator artifacts and may contain law-article previews used for review.

Learner raw input remains separate from the legal corpus. Do not store raw user OCR text, raw learner answers, raw problem text, copyrighted academy materials, official answer bodies, model answers, score predictions, or pass/fail judgments in this workflow.

Q-Net/local official materials are out of scope. This report reads already-ingested legal concept anchors and law article chunks only.

## Next Step

After human review, use a separate Legal Anchor Verification Apply v1 change to record approved verification decisions. This report PR must not mark anchors as verified.
