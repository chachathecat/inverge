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

`NEXT_PUBLIC_VAPID_PUBLIC_KEY` is intentionally public. `VAPID_PRIVATE_KEY`, `CRON_SECRET`, and `SUPABASE_SERVICE_ROLE_KEY` are server-only. Treat `VAPID_SUBJECT` as deployment configuration, not learner data.

The VAPID public and private keys must remain a matching pair. Changing VAPID keys invalidates or requires replacing old browser push subscriptions, so rotate keys only with a subscription replacement plan.

Runtime verification must use an approved non-production Supabase project. Apply the migration through normal migration history, configure the non-production service-role key, and run ownership/RLS checks there before any production rollout.

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

No existing `vercel.json` cron convention was present. This PR implements the protected route and documents scheduler activation as a deployment step. Scheduled reminders must not be described as active until a scheduler is configured and verified in the target environment.

Vercel Pro/Enterprise:

- hourly invocation of `GET /api/cron/notifications` is acceptable for closed-beta reminder windows.
- configure the request with `Authorization: Bearer ${CRON_SECRET}`.
- verify correct-secret success, wrong-secret `401`, delivery-key dedupe, and click routing before marking runtime acceptance pass.

Vercel Hobby:

- schedules more frequent than once daily are not supported.
- arbitrary learner-selected reminder times cannot be honestly guaranteed by a Vercel hourly cron on Hobby.
- use an approved external scheduler, upgrade the plan, or document scheduled Web Push as a closed-beta blocker before inviting learners to rely on reminder timing.

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

## Runtime Evidence - 2026-06-23

M418 is parked as code complete and runtime blocked. This evidence records the
current non-production Preview state without exposing secrets or push
subscription credentials.

| Check | Result | Evidence |
| --- | --- | --- |
| Automated M418 checks | PASS | Source, static, and migration checks were completed for the PR branch. |
| Supabase migration | PASS | `20260622_mobile_pwa_web_push_reminder.sql` was applied to the non-production Supabase project. |
| Remote migration history | PASS | Remote migration history records the 20260622 migration. |
| Preview Supabase configuration | PASS | Preview settings API returned an authenticated, successful response. |
| Preview VAPID presence | PASS | Preview settings API reported the public VAPID configuration present. |
| Authenticated settings API | PASS | `GET /api/notifications/settings` returned `ok=true`. |
| Durable browser subscription | PASS | Browser subscription was persisted with `enabled=true` and `revoked=false`. |
| Live test send | BLOCKED | `POST /api/notifications/test` returned HTTP 500. |
| `last_test_sent_at` | BLOCKED | The field remains unset after the failed test send. |
| Android delivery | NOT VERIFIED | Physical Android PWA delivery was not completed. |
| iPhone delivery | NOT VERIFIED | iPhone Home Screen web app delivery was not completed. |
| `/app` click routing | NOT VERIFIED | Test notification click routing was not verified. |
| `/app/review` click routing | NOT VERIFIED | Review notification deep link routing was not verified. |
| Unsubscribe runtime | NOT VERIFIED | No completed runtime unsubscribe evidence was recorded for this hold. |
| RLS A/B | NOT VERIFIED | Account isolation runtime smoke was not completed. |
| Cron auth | NOT VERIFIED | Wrong-secret and correct-secret runtime checks were not completed. |
| Cron dedupe runtime | NOT VERIFIED | Duplicate invocation runtime evidence was not completed. |
| Expired endpoint | NOT VERIFIED | Expired endpoint behavior was not completed. |
| Scheduler | BLOCKED | Scheduler blocked by Vercel Hobby plan; do not add hourly `vercel.json` cron for M418. |

Existing 20260608, 20260615, and 20260616 migrations remain unapplied for M418.
Do not use `db push --include-all` for M418. This evidence includes no push
endpoint, `p256dh`, `auth`, VAPID private key, Supabase service-role key,
`CRON_SECRET`, or other subscription credential.

## M421B Source-Level Recovery - 2026-06-24

M421B adds bounded, secret-safe source-level classification around the Web Push
test-send path. It does not claim live delivery has passed yet. Owner-run
Preview verification is still required after deployment, using only safe HTTP
status and bounded aggregate categories.

Bounded send categories:

- `sent`
- `expired`
- `vapid_configuration_error`
- `subscription_format_error`
- `push_provider_rejected`
- `push_transport_failure`
- `payload_validation_error`

Test-send aggregate responses include only:

- `ok`
- safe top-level `status`
- `sent`
- `expired`
- `failed`
- bounded `failureCategoryCounts`

The route must not return subscription IDs, push endpoints, `p256dh`, `auth`,
user identifiers, VAPID values, raw provider response bodies, raw error
messages, stack traces, or learner data. Provider `404` and `410` remain
`expired`; other provider `4xx` responses are `push_provider_rejected`; provider
`5xx`, timeout, and network failures are `push_transport_failure`.

Successful test sends must update both `last_test_sent_at` and `updated_at`.
If an OS push is sent but persistence fails, the response reports
`sent_persistence_failed` instead of full success. Expired endpoint revocation
persistence is likewise checked and reported as `expired_persistence_failed`
when needed.

Notification payloads remain metadata-only. No raw OCR text, problem text,
answer text, formulas, numbers, units, CASIO values, scores, pass/fail
predictions, or instructor content may enter payloads.

Scheduler status is unchanged: arbitrary reminder-time scheduling remains
blocked on the current Vercel Hobby plan, and this PR must not add an hourly
`vercel.json` cron. VAPID rotation remains prohibited unless later evidence
specifically proves the key pair itself must be replaced and a subscription
replacement plan is approved.

## Not Verified Locally

These require deployed HTTPS, real VAPID keys, migrated Supabase tables, active authenticated accounts, and physical/OS browser testing:

- Android OS notification delivery
- iPhone/iPad Home Screen notification delivery
- cron execution from deployment scheduler
- real expired push endpoint handling
- real Supabase RLS smoke for the new tables

Do not mark closed beta fully accepted from M418 alone. M419 is the device/runtime acceptance pass.
