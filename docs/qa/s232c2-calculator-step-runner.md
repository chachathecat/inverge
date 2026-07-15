# S232C.2 CalculatorStep runner acceptance

## Scope

S232C.2 connects the passive Figma V3 `CalculatorStep` primitive to the existing
authenticated fx-9860GIII nine-step runner. It does not replace the domain
controller, persistence, completion signal, sync, or device-verification
boundary.

## Mapping

| Canonical step | Figma step |
| --- | --- |
| `casio_input` | `KeyInput` |
| `display_value` | `Display` |
| `answer_value` | `Transfer` |

The other six canonical steps retain their existing presentation.

## State evidence

- `Error`: only a matching explicit learner mistake record.
- `Complete`: only a non-empty raw learner entry for the active mapped step.
- `Current`: every other mapped-step condition.
- Blank, stuck, offline, storage failure, sync failure, and unsupported states
  never imply Error or Complete.
- Device verification remains exactly `기기 검증 전`.

## Automated acceptance

- Source/adapter/route/privacy contract: 7/7.
- Focused runner, learning-signal, C.1 regression: 43/43.
- TypeScript, targeted ESLint, workflow YAML, diff integrity, production build.
- Authenticated exact-head Preview at 390px, 1440px, and a 720px
  desktop-at-200%-equivalent resilience viewport.
- Current-to-Complete transitions for all three mapped variants.
- Back/Next and session reload persistence.
- Canonical step count 9 and passive primitive tab-stop count 0.
- Keyboard order, horizontal overflow, Axe serious/critical, console errors,
  page errors, and same-origin request failures.

## Evidence boundary

The workflow discovers a successful Vercel Preview deployment by exact GitHub
head SHA, verifies `/api/runtime/version` before and after the test, and uploads
only a bounded JSON summary. It captures no learner text, email, credentials,
DOM, screenshot, trace, or video.

## Remaining manual boundary

Physical fx-9860GIII behavior is not tested by browser automation and remains
separately unverified.
