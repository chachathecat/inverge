# APP-1 Owner Capture → Repair Vertical V1

APP-1 is an Owner-only, default-off continuation of the existing second-stage Capture surface. It uses the current trusted-repair access gate and preserves that gate's exact authorized subject set. The APP-1 CTA and continuation appear only when the currently selected subject is individually authorized; a Practice-only flag cannot advertise or redirect Theory or Law work. APP-1 uses the current learner-private persistence, OCR, Answer Review, Queue and Today seams. It adds no public navigation, API, provider route, database contract or activation.

## Learner outcome

The Owner enters through `/app/capture?mode=second` and sees one primary action: `사진·PDF·텍스트로 시작`. That action opens one inline, keyboard-accessible chooser with exactly `사진 찍기`, `PDF 선택` and `텍스트 붙여넣기`; it does not silently invoke the camera, and APP-1 does not duplicate the choices under `다른 입력 방식`. OCR and imported text stay editable. The confirmation surface always says `OCR 결과는 초안입니다. 저장 전 직접 확인해 주세요.` for the gated APP-1 path.

After a durable Capture save, the gated path continues to `/app/capture/repair?itemId=<id>`. The route reloads the learner-owned record and shows a bounded structure summary: subject, detected sections, page or section count, OCR-confirmation state and any known uncertainty. The Owner chooses `이 내용으로 분석` only after confirming the material.

Evidence Review renders exactly one biggest gap with its bounded anchor, one already-successful point, why the gap matters, one direct repair action and a short time estimate. The learner—not the system—enters the repair. No answer is auto-filled.

The second structure check may report only one of five honest states:

- the requested repair was confirmed for this session;
- one connection still appears missing;
- a structured trusted-repair path is needed;
- the repair was deferred;
- OCR or source uncertainty blocks confirmation.

Same-session confirmation creates no mastery, transfer, score, pass-probability, official-grading or official-answer claim. A guided fallback uses the already gated C3R Practice, Theory or Law route.

## Answer Review purpose boundary

The existing `/api/answer-review/structure` endpoint accepts the closed purposes `learning_analysis`, `app1_initial_analysis`, and `repair_verification`; an absent purpose remains backward-compatible `learning_analysis`. APP-1 initial analysis is authenticated and binds the exact current-user source item, second-stage mode, persisted subject, and current subject-specific trusted-repair authorization before model execution. The server derives the single `App1PrimaryGap` and returns it with a short-lived tamper-evident analysis binding. The browser cannot substitute its own gap as authority.

Before any repair-verification model call, the server requires an authenticated Owner, a well-formed learner-owned source item, exact second-stage mode and persisted subject agreement, the current trusted-repair flag and Owner allowlist for that subject, the exact analysis binding, and one persistence operation/work-revision identity. Missing, expired, cross-account, first-stage, mismatched or unauthorized bindings fail closed without revealing another account's item. The canonical same-session evaluator runs on the server; only exact `repair_confirmed_for_this_session` creates a short-lived HMAC-SHA256 verification receipt bound to user, source revision, subject, gap digest, exact repair-text digest, policy version, operation and work revision. Failure, ambiguity and guided fallback create no receipt.

Ordinary learning analysis and authenticated APP-1 initial analysis retain eligible learning-signal creation. Repair verification may perform the model analysis and body-free usage/observability accounting, but it never creates a learning-signal event, weakness, mastery, Queue, item or Today-selection input. Browser-local evaluation is only a fail-closed hint and cannot enable persistence.

## Persistence and scheduling truth

APP-1 saves through a closed command branch on the existing learner-private `/api/os/items` route. Before rate consumption, usage reservation, provider/artifact work, recurrence, telemetry, item insertion or Queue insertion, the server rechecks current subject authorization and exact source ownership, validates the unexpired verification receipt and operation/work-revision binding, and constructs every APP-1 persistence field itself. Client-authored verification state, same-session flags, mastery/transfer flags, source identity, trusted gap metadata or `rewriteCompleted` cannot create APP-1 persistence authority. The repository gate remains defence in depth. Exact replay is idempotent; changed repair text, gap, operation, work revision, source revision or revoked authorization fails before side effects. A dedupe mismatch is a conflict, never a successful save.

Only after a durable item receipt does APP-1 query the existing Review Queue. It announces the next review only when the exact new item has a queue row whose due time is not earlier than the persistence receipt. Otherwise it says the repair record was saved but the next review was not confirmed. Reload never claims to restore unsaved repair text.

## Boundary

APP-1 remains:

- Owner-only and default-off through `trusted-repair-access`;
- second-stage only;
- source-only in this change except for composition of existing runtime seams;
- absent from public navigation and public activation;
- free of new APIs, migrations, schemas, RLS, auth, packages, workflows and provider routes;
- free of remote Supabase, Production, payment and external-learner mutation.

APP-1 does not activate first-stage learner scope and does not modify the common Question Foundry, Review OS substrate or durable-runtime authority.
