# Calculator Workflow Content Verification

Status: Milestone 6-D alpha content audit.

## Scope

- 감평 1차 회계학
- 감평 2차 감정평가실무

This workflow is an execution aid for calculation-heavy study. It is not a solving engine, not a calculator manual, and does not claim exam approval for any calculator model.

## Common Core Audit

Each workflow card now uses the stricter alpha schema:

- `whenToUse`
- `valuesToWriteFirst`
- `calculationOrder`
- `buttonPath`
- `commonMistakes`
- `verificationCheck`
- `copyToAnswer`

The common core is verified only at the workflow level: write values first, calculate in blocks, preserve middle values, verify units/rounding, and copy only answer-relevant values into the answer.

## Device Appendix Audit

FX-9860GIII guidance is marked `Draft/Beta`.

Do not treat device-specific button paths as final until the following are checked:

- Reset path on the physical device.
- Setup path for display format and decimal behavior.
- Mode switch path back to the basic calculation screen.
- Parentheses, delete/clear, equals, and previous-result behavior.
- Whether any memory or answer-reuse feature should be included or excluded from the alpha workflow.

## Manual Verification Outcome Required

Before broadening beyond closed alpha, replace Draft/Beta button-path text with verified short paths or keep the appendix hidden from user-facing guidance.
