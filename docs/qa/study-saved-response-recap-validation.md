# Saved-response reconnect — Issue #913

Base: validated #912 main `c706312a0e0f7f4772e322a9fc2c58cfef9aaa4a`.
Local candidate evidence only; GitHub remains authoritative for final CI/review.

## Actual outcome

The private session service reads the already validated durable latest attempt
and returns a closed primitive response recap: selected/previous choice,
confidence/change, server submission time, assistance and exact question identity.
It does not echo client state. An active attempt suppresses previous recap and
feedback; replay of an old successful request still reads the latest durable retry.
The UI distinguishes the learner's submitted answer from the reference explanation
and preserves reviewed vs human-unreviewed labels. No new state, schema, authority,
content approval, installation, environment or operational activation.

The recap is owner-private answer readback, not derived Today/QF metadata. No work
trace, prompt, question/answer body, evaluation receipt or correct-answer field is
copied. Existing read ownership/version/admission and no-store remain unchanged.
No personal records, source files, DB schema or clocks were modified for testing.

## Local tests and observed corrections

- Three actual loader/HTTP regressions reproduced the absent projection before
  source implementation. Tests then cover durable save/reconnect, lost-response
  retry, failed write, competing different answers, active retry suppression,
  latest retry after old-request replay, other Owner/version/client denial,
  confidence/change and unanswered readback. Today still contains no response.
- Two initial synthetic trace constructions were rejected by the existing strict
  contract; corrected only test `choiceId` and the required nonempty read step.
  No input validator or policy was relaxed.
- A full default run: 1,820 pass / 1 fail. The sole failure was a pinned historical
  whole-response hash after the additive field. The exact old row and legacy
  response hashes remain unchanged; only `submittedResponse` is separated and
  independently checked against the stored attempt. Final affected suite: 69 pass,
  no failures/skips. Final native Linux/Windows full suites must pass before merge;
  this document does not relabel the earlier full run as successful.
- Isolated PostgreSQL + actual repository/HTTP/React browser: 8/8 pass, including
  all five reviewed subject flows and unreviewed economics, CAS/replay, deliberate
  write failure, submitted selection across reload, retry completion and mode
  rejection. Synthetic users/rows cleaned to zero; network disabled. No personal
  DB used. Console errors/external requests: zero (expected test 503/404 resource
  diagnostics are separately allowed by the unchanged harness).
- Clean locked install, typecheck, changed-file lint and build pass. 162 tracked
  JSON files parse. 191 NFT traces / 148,961 entries and 2,212 generated artifacts
  scanned: private-root matches zero. Diff check passes.
- Synthetic browser screenshot visually inspected: saved response, exact submit
  time, unreviewed caveat and separate explanation visible after retry/reload.
  React serialization/derived-state review keeps the whitelist out of initial RSC
  and derives display directly from server view, with no redundant client copy.
- Read-only preflight helper: no actionable findings, not a formal GitHub review.

## Delivery / rollback

Require final-head native CI, independent clean review, resolved threads and
authenticated actual Preview denial/Production-build suppression. Existing local
Owner account may reconnect after reviewed integration, without starting r46's
actual next-day attempt or changing records. New evidence belongs to this candidate,
not #912. Normal reviewed source revert restores the old display; no data cleanup.
Approved content remains zero; #883 and the overall A/B/C Goal remain incomplete.
