# Inverge agent rules

## Product scope
This repository is currently focused ONLY on:
- 감정평가사 1차
- 감정평가사 2차

Do not expand product-facing scope to:
- 계리사
- universal exam platform framing
- generic multi-exam messaging

## Product identity
Inverge is a premium Pass Management OS.
It is not an AI grading product.
It is not a generic dashboard.

## UX rules
- One screen = one primary action
- Reduce extraneous cognitive load
- Logged-in app must never render public marketing UI
- Keep 1차 and 2차 clearly separated
- Home must feel like a calm operating screen
- OCR-related UX should be input-pipeline-ready, but must not fake full OCR if it is not implemented

## Design system
When implementing UI or UX changes, use:
- docs/DESIGN_SYSTEM_IMPLEMENTATION_SPEC.md
as the source of truth.

## Quality bar
Changes should feel:
- premium
- calm
- minimal
- cognitively efficient
- Korean-first
- production-minded

## Done when
A task is done only when:
- implementation is complete
- lint passes
- build passes
- relevant smoke tests are run
- changed files and remaining risks are reported