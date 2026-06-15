# Inverge Legal Source Ingest

## Purpose

Inverge needs source-grounded legal explanations for 감정평가사 learners across 민법, 감정평가관계법규, 부동산 관련 법령, and 2차 감정평가 및 보상법규. This ingest path builds an official legal reference corpus from the Korean Ministry of Government Legislation / 국가법령정보 공동활용 Open API.

This PR adds ingestion infrastructure only. It does not change learner UI behavior, does not add payment, and does not create official grading, official model answers, score prediction, or pass/fail judgment.

## Why Open API, Not HTML Scraping

Use the official 국가법령정보 공동활용 Open API for legal source ingestion. Do not scrape 국가법령정보센터 HTML pages.

The relevant API path is:

- `lawSearch.do` with `target=law`, `type=XML`, and `query` for current-law search.
- `lawService.do` with `target=law`, `type=XML`, and `ID` for current-law body lookup.
- `lawService.do` with `target=law`, `type=XML`, `ID`, and `JO` for article-level lookup when needed.

HTML output is for browsing and manual inspection only. The ingest script requests XML and normalizes article-level chunks from that response.

## Source Hierarchy

1. `legal_sources`: one configured official law source from `reference_corpus/legal/appraiser/legal_sources.seed.json`.
2. `legal_versions`: one fetched current-law version for a source. The raw XML is not stored in this table; only a SHA-256 hash is stored for version identity.
3. `legal_article_chunks`: article-level legal source anchors with normalized text and embedding-ready text.
4. `legal_concept_nodes`: appraiser-exam legal concepts that can be linked to official law anchors.
5. `legal_concept_anchors`: joins concept nodes to source article chunks.
6. `legal_sync_runs`: metadata-only operational records for each ingest attempt.

## Data Boundary

Allowed:

- Official current-law metadata from the Open API.
- Official law article text fetched through the Open API for source anchoring.
- Metadata-only concept labels, curriculum labels, and anchor metadata.
- Hashes of fetched XML for versioning.

Not allowed:

- 국가법령정보센터 HTML scraping.
- Copyrighted academy materials.
- Raw user OCR text.
- Raw learner answers.
- Raw problem text.
- Official answer bodies or academy answer bodies.
- Service role keys in client code, client bundles, logs, screenshots, docs examples, or committed files.

Service role key must not be exposed. The ingest script is a server/local operator tool only.

## No Source, No Legal Claim

No source, no legal claim. Learner-facing legal explanations must eventually be grounded in stored source anchors before they can be treated as source-backed. If a concept cannot be tied to an official `legal_article_chunks` anchor, the product should present it as an unverified study note or avoid the legal claim.

## Seed Registry

The seed file covers appraiser-exam legal sources for:

- 민법
- 감정평가 및 감정평가사에 관한 법률
- 감정평가 및 감정평가사에 관한 법률 시행령
- 감정평가 및 감정평가사에 관한 법률 시행규칙
- 공익사업을 위한 토지 등의 취득 및 보상에 관한 법률
- 공익사업을 위한 토지 등의 취득 및 보상에 관한 법률 시행령
- 공익사업을 위한 토지 등의 취득 및 보상에 관한 법률 시행규칙
- 부동산 가격공시에 관한 법률
- 부동산 가격공시에 관한 법률 시행령
- 국토의 계획 및 이용에 관한 법률
- 건축법
- 도시 및 주거환경정비법
- 행정절차법
- 행정소송법
- 행정심판법

Every seed item remains metadata-only and starts with `needsOfficialVerification: true`.

## Update Strategy

1. Apply `supabase/migrations/20260615_legal_grounding.sql`.
2. Keep `LAW_OPEN_API_OC`, `NEXT_PUBLIC_SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in the local/server environment only.
3. Run:

```powershell
npm run ingest:legal
```

4. Review `legal_sync_runs` for success, request count, article count, and errors.
5. Review source/version hashes before using anchors as source-backed explanation evidence.

Use `LAW_OPEN_API_THROTTLE_MS` to increase the delay between calls if the API needs a slower request cadence.

## Operational Rules

- Do not commit secrets, API responses, raw XML dumps, screenshots, or local operator logs.
- Do not store raw user OCR, raw learner answers, raw problem text, or academy content in the legal reference corpus.
- Do not expose service role keys to any client route or browser bundle.
- Do not add public archive UI from this corpus.
- Do not claim official grading, official model answers, score prediction, or pass/fail judgment from legal source anchors.
- Keep appraiser-exam learner scope limited to 감정평가사 1차 and 감정평가사 2차.
