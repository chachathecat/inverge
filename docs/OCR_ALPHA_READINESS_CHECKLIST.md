# OCR v1 Closed Alpha Readiness Checklist

Status: Milestone 6 checklist for 3-5 user closed alpha.

## Alpha scope

- Include only 감정평가사 1차 and 감정평가사 2차.
- Treat pasted text or transcripts as the stable OCR v1 path.
- Keep image upload visible only as experimental support.
- Keep PDF upload as storage/boundary support until real PDF extraction exists.
- Do not describe the product as an AI grader or full OCR product.

## Required setup

- `docs/OCR_V1_BASELINE_CONTRACT.md` is current and linked from alpha notes.
- `npm run lint` passes.
- `npm run build` passes.
- `npm run verify:review-os-schema` passes against the target environment.
- `npm run eval:ocr-extraction` passes against a running app.
- Image/PDF fixtures are either populated with redacted real samples or explicitly reported as skipped.

## Alpha user guidance

- Ask users to paste text copied from their source material or manually transcribed from images/PDFs.
- For 1차, ask users to include `문제`, `정답`, `내 답`, and one short reason when available.
- For 2차, ask users to include `사례`, `기준 답안`, `내 답안`, and any known `누락 논점`.
- Tell users every generated field is a draft and must be confirmed before saving.
- Tell users image/PDF files are useful for preserving source context, not for reliable automated extraction in this alpha.

## Stop conditions

- More than one alpha user believes image/PDF OCR is production-ready.
- Text/transcript eval falls below `0.8` for `subject_guess_accuracy` or `needs_review_appropriateness`.
- Saved notes frequently contain unreviewed `unknown` values.
- Users interpret 2차 correction output as a score or authoritative grading result.

## Ready signal

Text/transcript OCR v1 is alpha-ready when the eval passes, copy remains conservative, and the first alpha cohort understands that the product creates reviewable drafts rather than final judgments.
