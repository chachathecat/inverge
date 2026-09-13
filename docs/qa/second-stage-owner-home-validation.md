# Second-stage Owner home validation

## Scope

Issue #923 adds one Owner-only home for the existing C3R Practice, Theory and
Law runtimes. It does not add a new learning engine, content, feature flag,
schema, migration or remote activation.

## Truth boundary

- Each subject reuses its existing feature flag, Owner allowlist, non-Production
  denial and server-owned repository.
- The page projects only subject identity, record ID/state/update time and
  eligible queue phase/count/due time. Prompt, answer, attempt, scaffold,
  failure-note, source and claim bodies never enter the home view.
- One admitted subject is sufficient. A subject whose existing gate is closed is
  shown as unavailable and never linked.
- The authenticated learner shell exposes the home only when at least one of the
  three existing access checks succeeds. The home and all three C3R routes share
  the same active navigation item; ordinary learners retain the existing menu.
- A read failure is not treated as an empty or completed subject. If no known
  due, active or startable subject exists, the dominant action is a same-route
  status retry.

## Priority

The deterministic priority is:

1. eligible reopened or delayed independent review;
2. the most recently updated unfinished record;
3. the first admitted subject without a record;
4. status retry when admitted reads are unknown;
5. a new ordinary second-stage capture only when every admitted readable record
   is closed.

The first viewport contains one dominant action with why-now, estimated-time and
continuation copy. Subject links and the existing Capture/Today routes remain
secondary.

## Validation

- Focused projection/source/browser tests cover due/reopened priority, newest active
  resume, partial subject gates, read failure, all-closed continuation, no-gate
  refusal, bodyless projection and the single-primary presentation contract.
- A real Chromium render at 390px verifies primary-before-subject DOM order,
  keyboard-first primary focus, closed secondary disclosure, no horizontal
  overflow and no external request; the same document is resized to 768px and
  rechecked.
- Existing C3R-P/T/L contract and browser suites remain the runtime authority for
  each underlying learning loop.
- This evidence makes no real-content, actual learner-use, subject-completion,
  mastery, transfer, efficacy, Production or public availability claim.
