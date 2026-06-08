# Official Source Verification v1 (PR #346)

## Why this exists

Official-source verification separates Inverge's internal curriculum planning metadata from facts that have been manually checked against official sources. The goal is to let curriculum, schedule, and exam-reference data distinguish draft guidance from Q-Net/current-notice verified metadata before wider closed beta or production-facing use.

This layer is intentionally static for v1:

- no scraping;
- no external network calls in checks;
- no production rollout toggle;
- no public archive UI;
- no copyrighted raw problem text or official answer bodies stored in the repository.

## Official source hierarchy

Use the strongest available source for the fact being verified:

1. **Q-Net/current public notice** for current exam operation metadata, schedule notices, application windows, answer-publication windows, and qualification identity.
2. **한국산업인력공단/Q-Net official 자료실** for official reference downloads and Q-Net pages such as 기출문제 내려받기 or 최종정답 pages, used as metadata/link references only.
3. **국토교통부 statutes/notices where relevant** for ministry-level legal or regulatory context.
4. **Internal draft curriculum** for Inverge learning-operation nodes that have not yet been checked against official sources.

## What can be stored

The repository may store only metadata needed for verification and safe learning operations:

- metadata;
- URLs;
- source IDs;
- verified facts, such as `감정평가사`, `Certified Appraiser`, `관련부처: 국토교통부`, and `시행기관: 한국산업인력공단`;
- source status values: `draft`, `verified`, `needs_update`, `deprecated`;
- manual verification timestamps and reviewer labels.

## What cannot be stored

The repository must not store or claim:

- raw copyrighted problem body;
- official answer text beyond allowed metadata and URL references;
- model answer;
- score or pass/fail claims;
- official grading claims;
- raw OCR text, raw learner answer text, source text, instructor comments, or score predictions.

## Node lifecycle

### `draft` → `verified`

A node can move from `draft` to `verified` only after manual official-source review confirms the exact metadata fact. A verified node must include:

- `officialSourceId`;
- `officialSourceUrl`;
- `officialSourceName`;
- `officialSourceKind`;
- `lastOfficialVerifiedAt`;
- `verifiedBy`;
- `needsOfficialVerification: false`.

### `verified` → `needs_update`

Move a node to `needs_update` when:

- the source registry `needsManualRecheckBy` date has passed;
- Q-Net/current public notice changes the relevant fact;
- the node depends on a time-sensitive schedule, notice, answer-publication window, or exam-info page.

### `needs_update` → `verified`

Move a node back to `verified` only after the manual recheck is complete and the verified metadata is refreshed.

### `deprecated`

Use `deprecated` when a source, route, or curriculum metadata item should no longer be used. Deprecated nodes must remain metadata-only and must not be surfaced as current production authority.

## Manual verification checklist

Before marking a node `verified`, confirm:

1. The fact is in learner-facing 감정평가사 1차 or 감정평가사 2차 scope.
2. The official source is present in `reference_corpus/curriculum/appraiser/official_sources.json`.
3. The source ID, URL, name, and kind match the registry.
4. The checked fact is metadata only.
5. No raw problem body, official answer body, OCR text, source text, model answer, score, pass/fail, or instructor comment is stored.
6. Detailed curriculum units are not labeled official unless the exact unit has been checked against the official source.
7. Closed beta copy treats draft nodes as guidance only.
8. Production-facing use is limited to verified nodes or explicitly draft-safe guidance.
9. The static check passes with `npm run check:official-source-verification`.
10. Relevant tests pass with `npm run test:official-source-verification`.

## Rollback plan

If a source is wrong, stale, or too broad:

1. Change affected nodes from `verified` to `needs_update` or `draft`.
2. Set `needsOfficialVerification: true` unless the node remains verified.
3. Remove verified-source metadata that no longer applies.
4. Add a `verificationNote` explaining why the node is not production-authoritative.
5. Run `npm run check:official-source-verification` and the closed-beta readiness checks.
6. Do not enable production rollout until the source is manually rechecked.
