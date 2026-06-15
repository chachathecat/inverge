# Inverge Legal Grounding Guard

## Purpose

The Legal Grounding Guard decides whether a future Civil Law, appraisal-related law, or compensation-law explanation has enough source support to proceed. It classifies a requested legal explanation as verified-grounded, draft-grounded, source-candidate-only, or unsupported.

This guard is infrastructure only. It does not generate learner-facing legal explanations and does not change learner UI.

## Rule

No source, no legal claim.

Draft source, review required.

Verified source, grounded explanation eligible.

Draft anchors require human review. A draft concept anchor or any anchor marked `needsOfficialVerification: true` is not production-ready.

Verified anchors are required for production-grade legal explanations. Official law chunks are source anchors, not official model answers, official grading, score prediction, or pass/fail judgment.

Keyword retrieval candidates are not enough for production-grade legal explanation. They can support review and investigation, but a future production explanation must resolve through verified concept anchors first.

## Data Boundary

Learner raw input remains separate from the legal corpus:

- Do not store raw user OCR text in legal source anchors.
- Do not store raw learner answers or raw problem text in legal source anchors.
- Do not store copyrighted academy materials.
- Do not store official answer bodies, model answers, score predictions, or pass/fail judgments.

Q-Net/local official materials are out of scope for this guard. The guard reads already-ingested legal source anchors only.

## Future Flow

Capture/Concept Detection -> Concept Anchors -> Guard -> Explanation Draft

If the guard returns `unsupported`, the explanation path must not make a legal claim. If it returns `grounded_draft` or `source_candidates_only`, human review is still required before any production-grade legal explanation.
