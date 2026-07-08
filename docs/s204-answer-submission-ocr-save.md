# S204 Answer Submission OCR Confirmation and Durable Save

- Status: implementation foundation
- Linked roadmap item: `S204`
- Linked issue: `#440`
- Scope: learner-facing 답안길 감정평가사 2차 answer submission, OCR confirmation state, editable text review, and durable save foundation

## Contract

S204 uses `lib/review-os/answer-submission-contract.ts` as the source-level contract for learner answer submission state.

The contract covers:

- text input;
- image-origin OCR draft input;
- PDF-origin manual text fallback input;
- OCR confirmation state;
- learner edit state before save;
- authenticated user ownership binding;
- durable save target through the existing Review OS item path.

Required learner trust copy:

> OCR 결과는 학습 보조 초안입니다. 저장 전 직접 수정할 수 있습니다.

The copy treats OCR and AI output as learning-support draft material. It does not introduce grading, reference answers, billing, or question ingestion.

## Data Boundary

Raw learner answer, OCR, and upload-derived content is user-owned service data. S204 keeps that data in the existing authenticated learner save path and records only contract metadata outside the raw save surface.

Safe derived metadata may include:

- subject;
- source type;
- input kind;
- page count;
- OCR confirmation state;
- low-confidence flag;
- capture quality issue;
- one biggest gap / one next action linkage state.

Safe derived metadata must not include learner text, upload bytes, official question content, reference-answer content, instructor comments, or provider payloads.

Learner submissions are not used for model training without explicit consent. S204 does not write learner submissions into the global reference corpus.

## Save Path

The current durable foundation is the existing `/api/os/items` route and Review OS item persistence.

Ownership rules:

- route user ownership comes from `requireRequestUserId(request)`;
- client input cannot choose the owner;
- persisted S204 contract metadata uses `ownerBinding: authenticated_request_user`;
- upload bytes are not persisted by this contract;
- browser draft recovery remains local before save;
- after save, refresh recovery relies on the server-backed learner record when Supabase persistence is available.

## Learner And Instructor Separation

S204 does not call or expose instructor OCR or second-grading routes from learner capture UI.

Instructor OCR remains under:

- `/api/instructor/second-grading/ocr`
- `/instructor/second-grading`

Learner answer submission remains under:

- `/app/capture`
- `/api/os/items`

## Rollout

No database migration, billing change, provider change, reference-answer release, or instructor workflow change is part of S204.

The rollout is source-compatible with existing Review OS records because S204 adds contract metadata to existing user-owned saves.

## Rollback

Rollback is a focused revert of the S204 PR.

Existing learner-owned records remain readable by older code because the added contract metadata is additive. No schema rollback, RLS rollback, billing rollback, or provider rollback is required.

## Remaining Risks

- S205+ must define rubric evidence and practice estimate behavior separately.
- S221 must complete export/delete/privacy operations before paid launch.
- Live PDF OCR remains outside this foundation unless later work verifies provider support, cost, and data-boundary handling.
- Runtime evidence is still required before claiming production readiness.
