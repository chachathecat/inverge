# OCR Quality Eval

This eval layer validates the frozen OCR v1 contract against text transcripts, image samples, and PDF boundary samples.

## Directory structure

- `fixtures.json`: runnable fixture manifest and scoring expectations.
- `samples/first-images/`: real 감정평가사 1차 image samples, redacted before commit.
- `samples/second-images/`: real 감정평가사 2차 image samples, redacted before commit.
- `samples/pdf-boundaries/`: PDF files used only to confirm the product does not fake PDF OCR support.

## Scoring fields

Each fixture may define `expect.scores` with:

- `subject_guess_accuracy`
- `needs_review_appropriateness`
- `first_note_usefulness`
- `second_correction_usefulness`

Use `1` for pass, `0.5` for partially useful but still review-heavy, and `0` for not useful. Keep uncertain values conservative.

## Running

Start the app, then run:

```bash
npm run eval:ocr-extraction
```

Optional image and PDF files may be omitted from the repository. Missing optional fixtures are reported as skipped, not passed.
