# Closed Beta Invite Gate & Conditional Go Rules

## Purpose

This document defines the invite gate for Inverge limited closed beta. The beta is a learner-owned appraiser-exam study operating OS for 감정평가사 1차 and 감정평가사 2차 learners. The current release status is **Conditional Go, not full production readiness**.

The beta exists to verify whether invited learners can complete the core loop:

Capture -> learner-owned note -> biggest gap -> next action -> Today Plan task -> Review Queue item -> Notes reflection -> loop_closed

## Eligible Invited User Profile

Invite only trusted appraiser-exam learners who:

- are preparing for 감정평가사 1차 or 감정평가사 2차
- can give detailed written feedback
- understand Inverge is not official grading
- understand Inverge does not provide model answers
- understand Inverge does not predict score/pass/fail
- agree to use synthetic or learner-owned study notes during beta
- agree not to upload Q-Net raw official materials for QA

Recommended first cohort: **3 to 5 trusted invited users only**.

## What Users May Test

Invited users may test:

- text-first Capture using learner-owned study notes
- OCR/PDF capture using synthetic or learner-owned notes
- editing OCR/PDF draft text before save
- browser-local fallback save copy and behavior
- Today Plan reflection
- Review Queue reflection
- Notes reflection
- loop_closed evidence when available
- support and bug-report flow

## What Users Must Not Expect

Invited users must not expect:

- official grading
- model answers
- score/pass/fail prediction
- public problem-bank or archive behavior
- payment or paid entitlement flow
- instructor console access
- final production durability guarantees
- automatic correctness judgment

## Known Limitations

Known partial evidence items from PR #378:

- durable invited-account persistence remains partial
- full OCR/PDF upload smoke remains partial
- visible Review completion runtime proof remains partial

Additional operating notes:

- OCR/PDF may be partial and must be checked by the learner before save.
- Persistence may use browser-local fallback depending on environment.
- Browser-local fallback evidence is useful for closed beta QA, but it is not the same as durable account persistence.
- Review completion evidence is still being hardened.

## Safety Boundaries

The beta must preserve these boundaries:

- no local_official_materials
- no qnet_manifest.json
- no raw Q-Net
- no raw PDF/HWP/HWPX/Word/ZIP/images
- no raw official problem text, answer text, OCR full text, or official answer body
- no official grading/model-answer/score/pass-fail
- no public archive UI
- no instructor-console learner exposure
- no payment
- no analytics provider calls
- no AI provider calls
- no instructor grading behavior changes

## Support / Bug Report Template

Use this template for every beta issue:

- Reporter:
- Date:
- Route:
- Exam mode: 1차 / 2차
- Subject:
- Browser/device:
- Account mode:
- Persistence state: durable_saved / local_fallback_saved / save_failed / not_applicable
- What the learner tried:
- What happened:
- Expected behavior:
- Console or network symptom if visible:
- Screenshot: not committed
- Boundary concern: yes / no
- Stop-rule concern: yes / no
- Suggested severity: blocker / high / medium / low

Do not paste raw official problem text, official answer text, OCR full text, or learner-private long-form content into the report.

## Daily Monitoring Checklist

Check daily during the first cohort:

- first capture completed
- note saved
- biggest gap generated
- next action generated
- Today Plan task selected
- Review Queue item created
- Notes reflected
- loop_closed
- durable_loop_closed
- local_fallback_loop
- save_failed
- OCR correction friction
- support issues
- user qualitative feedback
- any boundary safety report

## Weekly Monitoring Checklist

Review weekly before expanding the cohort:

- whether the core learner loop remains stable
- whether save_failed is excluded from ready Review Queue evidence
- whether persistence copy accurately describes durable or browser-local save state
- whether OCR/PDF draft correction friction is acceptable
- whether telemetry remains provider-free and metadata-only
- whether support issues repeat across users
- whether any No-Go escalation rule was triggered
- whether follow-up PRs are still blocking a wider beta

## Stop Rules

Pause beta or mark No-Go if any of these occur:

- learner sees official grading/model-answer/score/pass-fail copy
- learner sees instructor console
- raw official materials or local official paths are exposed
- core Capture -> Note -> Today Plan -> Review Queue -> Notes loop breaks
- persistence copy overclaims durable save
- save_failed appears as ready Review Queue evidence
- telemetry stores raw learner text or forbidden fields
- payment, public archive UI, analytics provider calls, or AI provider calls appear in the learner beta flow

## Conditional Go Rules

The beta may remain Conditional Go only when all of these are true:

- invited cohort remains limited to 3 to 5 trusted users
- users receive the known limitations before testing
- users use synthetic or learner-owned study notes
- core learner loop can be demonstrated for text-first Capture
- boundary safety sweep passes
- local_fallback_saved copy is clear when durable save is unavailable
- save_failed shows calm retry guidance and does not enter ready Review Queue evidence
- provider-free telemetry can represent loop evidence without raw text
- follow-up PRs are tracked for durable account persistence, OCR/PDF upload smoke, and Review completion runtime proof

Conditional Go does not mean full production readiness.

## No-Go Escalation Rules

Escalate to No-Go when:

- any stop rule is triggered
- core loop cannot be demonstrated for invited users
- persistence state is unclear enough that users may believe browser-local fallback is durable account sync
- telemetry or reports include raw learner text, official answer body, raw official material references, or forbidden fields
- a learner route exposes payment, public archive UI, or instructor-console functionality

## Next Follow-up PRs

Prioritize:

1. Durable Account Persistence QA Evidence v1: invited-account save and cross-session durability proof.
2. OCR/PDF Synthetic Upload Smoke Evidence v1: synthetic learner-owned image/PDF upload proof with editable draft framing.
3. Review Completion Runtime Evidence v1: visible Review completion action and stable closed-loop reflection.
4. Closed Beta Support Intake v1: lightweight issue intake and triage process without private/raw content.
