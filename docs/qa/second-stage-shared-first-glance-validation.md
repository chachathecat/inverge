# Second-stage shared first-glance validation

Issue: #929  
Program: `INVERGE_OWNER_STUDY_OS`  
Phase: S2 `KOREAN_FIRST_GLANCE`

## Bounded outcome

The existing signed-in second-stage Capture, Today/session, weekly, agenda,
notes and review surfaces consume the shared Korean learner-language contract.
The change removes mixed English route labels and aligns the shared flow on
`오늘`, `오늘의 한 가지`, `오늘 할 일`, `복습 대기`, `내 공부 기록`, and
`가장 큰 감점 원인` without changing commands, stored state or scheduling.

## Preserved boundaries

- No API, schema, migration, RLS, Storage, repository or scheduler change.
- No content, provider, secret, dependency or environment change.
- No Production, public learner, real learner, payment or remote-data mutation.
- S3 remains an exact Owner-only gate; S4 remains blocked behind terminal S3.
- No official grading, official model-answer, mastery, score or pass claim.

## Verification contract

- `tests/second-stage-shared-first-glance.test.mjs` binds every shared route to
  the canonical dictionary and checks the Capture-to-Today handoff.
- The existing S232E.1 authenticated runtime checks the same Capture document at
  390, 768 and 1440 pixels, keyboard focus, accessible stage names, reflow and
  serious/critical Axe findings without storing screenshots or private bodies.
- Existing S232D.4 and S232D.5 contracts preserve the review priority and
  single-action Today information architecture.

Final exact-head native checks, Preview identity and fresh review are recorded
on the pull request. This S2 presentation receipt is not S3 approval, S4 start,
or completion of the wider Owner Study OS goal.
