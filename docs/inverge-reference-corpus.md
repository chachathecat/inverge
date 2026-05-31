# Inverge Reference Corpus / Context Adapter v1

## Purpose

The reference corpus is Inverge's trusted product reference foundation for learner-facing 감정평가사 1차 and 감정평가사 2차 study loops. It supports short, optional context for:

- learner explanations
- concept cards
- smart cloze hints
- 1차 O/X trap explanations
- 2차 rewrite hints
- topic mapping

It is not a textbook archive UI, a reference dashboard, or an official model-answer surface. Learner UI must keep one primary task and show reference snippets only through progressive disclosure.

## What belongs in the reference corpus

Reference corpus entries may include curated, licensed, or public-domain reference material that is safe to reuse as product reference data:

- 감정평가사 1차 subject/topic maps
- 감정평가사 2차 answer-structure topic maps
- law/rule excerpts only when source and usage status are recorded
- short internal summaries written for Inverge's learning operations
- citation labels that help staff trace the source
- tags, topics, concepts, and safe skeleton identifiers

Each entry should keep snippets short and operational. The adapter returns structured snippets with `referenceId`, `title`, `subject`, `sourceType`, `snippet`, optional `citationLabel`, `confidence`, and `usedFallback`.

## What must never be included

The corpus must never contain user-owned service data. Do not add or merge:

- raw OCR text
- user answer text
- uploaded image text
- uploaded PDF text
- full problem text copied from a learner upload
- rewrite paragraphs
- raw handwritten content
- private academy tenant data
- any learner's answer, memo, or capture result

These may be used only as user service data inside the relevant learner flow. The reference adapter accepts safe request metadata only: `examMode`, `subject`, `topicCandidate`, `conceptCandidate`, `taskType`, derived tags, safe skeleton IDs, and `maxSnippets`.

## Update process

1. Add or edit small JSON corpus entries under `reference_corpus/`.
2. Place files by source family, for example:
   - `reference_corpus/law/`
   - `reference_corpus/appraisal_rules/`
   - `reference_corpus/civil_law/`
   - `reference_corpus/first_exam_topics/`
   - `reference_corpus/second_exam_topics/`
3. Keep snippets concise enough for collapsed learner details.
4. Record source/license/usage metadata before enabling broad use.
5. Run the reference-context tests and learner-loop verification.

## Required source, license, and usage fields

Recommended entry fields:

```json
{
  "referenceId": "civil-law-juristic-act-void-cancel-001",
  "title": "법률행위 효력 판단: 무효와 취소",
  "examMode": "first",
  "subject": "민법",
  "sourceType": "civil_law",
  "snippet": "Short operational snippet.",
  "citationLabel": "Internal source label",
  "tags": ["무효", "취소"],
  "topics": ["법률행위"],
  "concepts": ["요건·효과·예외"],
  "licenseStatus": "internal_curated",
  "usageStatus": "active",
  "updatedAt": "2026-05-31"
}
```

`licenseStatus` should be one of `public_domain`, `licensed`, `internal_curated`, or `needs_review`. `usageStatus` should be `active`, `pilot`, or `retired`.

## Provider and cache abstraction rule

Learner-facing logic must not hard-code a model vendor. The adapter is configured through environment variables or explicit config objects:

- `INVERGE_REFERENCE_PROVIDER`
- `INVERGE_REFERENCE_MODEL_NAME`
- `INVERGE_REFERENCE_CACHE_ENABLED`
- `INVERGE_REFERENCE_CACHE_TTL_MS`
- `INVERGE_REFERENCE_CORPUS_PATH`

If a provider, cache, or corpus path is unavailable, the app must continue with a no-cache fallback and no snippets. Learner UI should remain simple and should not crash.

## User raw data separation rule

Reference requests are sanitized before matching. User uploads, OCR text, answers, rewrite paragraphs, and handwritten text are not valid request fields and must not be stored in corpus files. The boundary is intentional:

- **Reference corpus**: trusted product reference data.
- **User service data**: learner-owned captures, answers, OCR output, handwritten content, and rewrite drafts.

The two data classes must stay separate in storage, cache keys, tests, and UI copy.
