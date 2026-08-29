# APP-1 Owner Capture → Repair Vertical V1

APP-1 is an Owner-only, default-off continuation of the existing second-stage Capture surface. It uses the current trusted-repair access gate and preserves that gate's exact authorized subject set. The APP-1 CTA and continuation appear only when the currently selected subject is individually authorized; a Practice-only flag cannot advertise or redirect Theory or Law work. APP-1 uses the current learner-private persistence, OCR, Answer Review, Queue and Today seams. It adds no public navigation, API, provider route, database contract or activation.

## Learner outcome

The Owner enters through `/app/capture?mode=second` and sees one primary action: `사진·PDF·텍스트로 시작`. OCR and imported text stay editable. The confirmation surface always says `OCR 결과는 초안입니다. 저장 전 직접 확인해 주세요.` for the gated APP-1 path.

After a durable Capture save, the gated path continues to `/app/capture/repair?itemId=<id>`. The route reloads the learner-owned record and shows a bounded structure summary: subject, detected sections, page or section count, OCR-confirmation state and any known uncertainty. The Owner chooses `이 내용으로 분석` only after confirming the material.

Evidence Review renders exactly one biggest gap with its bounded anchor, one already-successful point, why the gap matters, one direct repair action and a short time estimate. The learner—not the system—enters the repair. No answer is auto-filled.

The second structure check may report only one of five honest states:

- the requested repair was confirmed for this session;
- one connection still appears missing;
- a structured trusted-repair path is needed;
- the repair was deferred;
- OCR or source uncertainty blocks confirmation.

Same-session confirmation creates no mastery, transfer, score, pass-probability, official-grading or official-answer claim. A guided fallback uses the already gated C3R Practice, Theory or Law route.

## Persistence and scheduling truth

APP-1 saves through the existing learner-private `/api/os/items` contract and reuses its idempotency and durable-receipt validation. A dedupe mismatch is a conflict, never a successful save. If the write fails or its binding receipt is missing, the UI says the repair was not completed.

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
