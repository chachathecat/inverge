# Capture-to-Note v1 Foundation

## Purpose

Capture-to-Note v1 turns a learner-owned capture into a lightweight learning note draft. It is a retention-loop foundation, not a full AI tutor, problem bank, public archive, or score-first grader.

The learner loop is:

`Capture/OCR/text input -> learner-owned note -> one biggest gap -> one next action -> Today Plan max 3 -> Review Queue`

## Learner Flow

- The learner starts from the learner-safe `/app/capture` route.
- The page title is `오늘 한 것 정리하기`.
- The primary action is `학습 노트 만들기`.
- Image and PDF inputs may use the existing safe capture path, but text input remains the stable path.
- The OCR notice must remain visible: `OCR 결과는 학습 보조 초안입니다. 저장 전 직접 수정할 수 있습니다.`
- OCR result text is editable before save.

## Data Boundary

Raw user text belongs to the learner. Capture-to-Note may keep `userEditableText` in the learner-owned note draft, but derived planning signals must stay metadata-only.

Raw user text must not be stored in global reference data. Do not store raw OCR text, learner answers, problem text, official answer body, or model answers in legal corpus, curriculum reference data, Q-Net material metadata, or any shared global source table.

The v1 builder returns:

- `userEditableText` for the learner-owned draft
- one `biggestGap`
- one `nextAction`
- `derivedSignals`
- a metadata-only Today Plan candidate
- a metadata-only Review Queue candidate

## Learner/Instructor Separation

Capture-to-Note v1 is learner-facing only. It must not import or expose `/instructor/second-grading`, instructor OCR workflows, grading panels, grading draft routes, or instructor-only review tools.

Instructor routes remain separate from learner capture.

## Safety Claims

This flow must not claim:

- official grading
- official model answers
- score prediction
- pass-fail judgment
- final legal interpretation

The note is a study draft. It identifies one candidate gap and one candidate next action.

## Legal Grounding

The legal grounding hook is used only as a source-status hint.

- No source, no legal claim.
- Draft, needs-update, or rejected anchors block production legal explanation.
- Verified anchors may only allow a grounded explanation draft path later.
- Verified anchors are not official model answers.
- Article bodies must not be returned as final learner explanations.

When no verified legal source exists, learner copy must stay conservative, such as:

- `법령 근거 후보가 있지만 아직 검수 전입니다.`
- `아직 연결된 법령 근거가 없습니다.`

## Today Plan And Review Queue

Today Plan candidates created from Capture-to-Note are metadata-only and capped to max 3. Review Queue candidates carry the same one gap and one next action so the learner can retry, rewrite, or schedule review without a score-first endpoint.
