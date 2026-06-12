# Capture-to-Note Quality Contract v1

## Purpose

This contract hardens the closed-beta Capture-to-Note loop with safe synthetic fixtures and deterministic validation. It protects the learner loop:

Capture input -> learner-owned note -> biggest gap -> next action -> Today Plan max 3 -> Review Queue -> Notes reflection.

This is a quality contract, not an AI provider integration, grading system, source archive, or public problem bank.

## Quality Contract

Every validated capture-to-note draft must include:

- `examMode`: `first` or `second`
- `subject`
- learner-owned note text or a learner-owned summary
- exactly one `biggestGap`
- exactly one `nextAction`
- one allowed learner task type
- `metadataOnly: true`
- `safeUse: closed_beta_capture_note_quality`

Allowed learner task types:

- `ox`
- `cloze`
- `calculation_template`
- `rewrite`
- `issue_recall`
- `review_note`

First-exam notes may use O/X, cloze, calculation-template, or review-note actions. Second-exam notes may use calculation-template, rewrite, issue-recall, or review-note actions.

## Safe Synthetic Fixture Rule

Tests must use short synthetic learner-created wording only. Fixtures must not use real Q-Net official problem text, raw official answer text, OCR full text from official materials, official answer body, or copied source excerpts.

The fixtures are allowed to describe a learner's study trace at a high level, such as a concept distinction, calculation-condition check, issue recall, paragraph rewrite, or review-note task.

## Biggest Gap Rule

The note must identify one primary weakness signal. It should be subject-aware:

- first civil-law style notes: concept distinction, trap wording, or mistaken reason
- first accounting notes: calculation condition or calculation basis
- second practice notes: calculation basis, unit, or review process
- second theory notes: definition, comparison, application, keyword, or outline structure
- second law notes: requirement, procedure, disposition, remedy, or case-application structure

## Next Action Rule

The next action must be learner-executable and map to one allowed task type. It should ask the learner to retry, recall, calculate, rewrite, or review one small unit. It must not end in score-only feedback.

## Forbidden Fields

Validated note objects must not include:

- `score`
- `passFail`
- `officialGrade`
- `officialAnswer`
- `officialAnswerBody`
- `modelAnswer`
- `instructorComment`
- `localFileName`
- `sourceFileName`
- `localFilePath`
- `sourceFilePath`
- `rawFilePath`
- `qnetRawText`
- `ocrFullText`

The contract also rejects raw local file path fields, public archive fields, raw Q-Net fields, and instructor-only fields.

## Safety Boundary

Do not add official grading/model-answer/score/pass-fail copy. The shorthand rule is: no official grading/model-answer/score/pass-fail. Do not add public archive UI. Do not read or commit `local_official_materials`. Do not commit `qnet_manifest.json`. Do not commit raw Q-Net PDF/HWP/HWPX/Word/ZIP/images. Do not commit raw official problem text, raw official answer text, OCR full text, or official answer body.
