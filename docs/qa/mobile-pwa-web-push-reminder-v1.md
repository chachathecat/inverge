# M418 Mobile PWA & Web Push Reminder v1

## Scope

M418 adds the missing mobile reminder layer for the existing learner loop:

```text
Today Plan / Review Queue / calculator recovery
-> metadata-only notification plan
-> scheduled Web Push
-> mobile OS notification
-> click opens /app or /app/review
-> learner resumes the existing learning loop
```

This PR does not change Morning Brief preview behavior, auth provider, payment, Q-Net ingestion, instructor routes, native apps, or the final closed-beta verdict. M419 must perform real mobile end-to-end acceptance after M418 is merged and deployed with credentials.

## Environment Variables

Required for Web Push runtime:

```text
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=
CRON_SECRET=
SUPABASE_SERVICE_ROLE_KEY=
```

Generate local VAPID values without committing secrets:

```powershell
npm.cmd run generate:vapid
```

`NEXT_PUBLIC_VAPID_PUBLIC_KEY` is intentionally public. `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY` are server-only.

## Migration

Migration:

```text
supabase/migrations/20260622_mobile_pwa_web_push_reminder.sql
```

Tables:

- `push_subscriptions`: user-owned endpoint/key metadata, enabled/revoked state, last sent timestamps.
- `notification_preferences`: enabled flag, timezone, weekday array using `0-6`, and reminder time.
- `notification_deliveries`: metadata-only delivery log with unique `delivery_key` for cron idempotency.

RLS:

- authenticated learners can read/write only their own subscription and preference rows.
- learners can read only their own delivery rows.
- scheduled sending uses service-role server access.

No table contains raw OCR text, raw problem/question text, raw answer text, official answer body, formulas, learner-entered numbers, units, CASIO keystrokes, display values, verification memo, mistake memo, scores, pass/fail predictions, or instructor comments.

## Notification Contract

Allowed push payload keys only:

```text
type
title
body
url
notificationId
tag
```

Allowed `type` values:

```text
today
review
calculator_recovery
test
```

Allowed click URLs:

```text
/app
/app/review
```

Payload copy is generic. It must not include subject names, concept names, problem text, answer text, numbers, units, CASIO input, expected values, official/model-answer claims, scores, pass/fail predictions, or instructor comments.

## API Routes

- `GET /api/notifications/settings`
- `PUT /api/notifications/settings`
- `POST /api/notifications/subscribe`
- `POST /api/notifications/unsubscribe`
- `POST /api/notifications/test`
- `GET /api/cron/notifications`

Authenticated routes bind all writes to the current request user and ignore client-selected `userId`.

Cron route protection:

```http
Authorization: Bearer ${CRON_SECRET}
```

Missing or wrong authorization returns `401`. Missing VAPID/admin environment returns a safe aggregate non-send response. Responses never include endpoints, keys, learner text, raw payload data, or secrets.

## Scheduler

No existing `vercel.json` cron convention was present. This PR implements the protected route and documents scheduler activation as a deployment step.

Suggested schedule:

```text
GET /api/cron/notifications every 15 or 60 minutes
```

The route checks each user preference in that user timezone and time window. Duplicate sends are prevented by the database-level `notification_deliveries.delivery_key` unique constraint.

## Supported States

The settings UI covers:

- loading
- unsupported browser
- service worker unsupported
- PushManager unsupported
- iPhone/iPad not launched from Home Screen
- permission default
- permission granted
- permission denied
- subscribed
- unsubscribed
- local-only / server unavailable
- VAPID not configured
- save error
- test-send error
- success

Permission is requested only after the learner presses the explicit subscribe button.

## Platform Notes

Android / Chromium:

- install PWA normally or use browser install UI
- allow notifications after explicit button press
- save days, time, and timezone
- send a test notification

iPhone / iPad:

- Safari tab shows Home Screen installation guidance
- add Inverge to Home Screen
- launch the standalone Home Screen app
- allow notifications only after explicit button press

## Manual Test Checklist

Android:

- install PWA
- open from home screen
- allow notifications
- save days/time/timezone
- receive test notification
- click test notification and land on `/app`
- receive Review notification and land on `/app/review`
- unsubscribe
- confirm no further test send succeeds

iPhone/iPad:

- Safari tab shows Home Screen installation guidance
- add to Home Screen
- launch standalone app
- permission is requested only after button press
- receive test notification
- notification click opens the correct app route
- unsubscribe

Failure cases:

- permission denied
- unsupported browser
- service worker registration failure
- VAPID missing
- Supabase unavailable
- unauthenticated request
- expired endpoint
- duplicate cron invocation
- malformed subscription
- invalid timezone
- notification URL injection attempt

## Automated Validation

Run:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run check:mobile-pwa-web-push-reminder
npm.cmd run test -- --workers=1
npm.cmd run verify:learner-loop:ci
npm.cmd run check:closed-beta-readiness
npm.cmd run build
git diff --check
```

## Not Verified Locally

These require deployed HTTPS, real VAPID keys, migrated Supabase tables, active authenticated accounts, and physical/OS browser testing:

- Android OS notification delivery
- iPhone/iPad Home Screen notification delivery
- cron execution from deployment scheduler
- real expired push endpoint handling
- real Supabase RLS smoke for the new tables

Do not mark closed beta fully accepted from M418 alone. M419 is the device/runtime acceptance pass.
