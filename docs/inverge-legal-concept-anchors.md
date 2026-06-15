# Inverge Legal Concept Anchors

## Purpose

Legal concept anchors connect Inverge appraiser legal concept nodes to official law article chunks. They are needed so future 민법, 감정평가 관계법규, and 감정평가 및 보상법규 explanations can start from source-backed legal article candidates instead of unsupported legal claims.

This PR adds seed infrastructure only. It does not generate learner-facing legal explanations and does not change learner UI.

## Source Boundary

`legal_article_chunks` are official source anchors, not official model answers. A concept anchor can point to a relevant law article, but it is not grading, not a score prediction, not a pass/fail judgment, and not an official answer key.

No source, no legal claim. If a future explanation flow cannot resolve a legal concept to source anchors, it must stop, ask for review, or mark the point unsupported.

## Lifecycle

Each concept anchor has a source status:

- `draft`: seeded metadata that needs human legal review before production-grade explanation use.
- `verified`: reviewed by a responsible human and approved for grounded explanation workflows.
- `needs_update`: previously reviewed anchor that may be stale after law or curriculum changes.

Human verification is required before production-grade legal explanations. Draft anchors are retrieval scaffolding, not final legal authority.

## Data Boundary

Learner raw input must remain separate from the legal corpus:

- Do not store raw user OCR text in legal concept anchors.
- Do not store raw learner answers or problem text in legal concept anchors.
- Do not store copyrighted academy materials.
- Do not store official answer bodies, model answers, score prediction, or pass/fail judgment.

Q-Net/local official materials are out of scope for this PR. This anchor seed uses only law title and article number hints for already-ingested official current-law chunks.

## Operator Flow

Run a validation-only dry run first:

```powershell
$env:LEGAL_CONCEPT_ANCHOR_DRY_RUN="1"
npm run seed:legal-concept-anchors
```

For an actual operator run, provide `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the local/server environment. The script upserts `legal_concept_nodes`, resolves article chunks by exact law title and article number against current legal versions, and upserts only unambiguous `legal_concept_anchors`.

Missing or ambiguous anchors are reported and skipped.
