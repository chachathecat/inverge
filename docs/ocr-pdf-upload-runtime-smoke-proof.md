# OCR/PDF Upload Runtime Smoke Proof v1

## Purpose

This document records focused local runtime/manual smoke evidence for the learner OCR/PDF capture path before Inverge expands closed beta beyond the smallest trusted cohort.

The current decision remains **Conditional Go, not full production readiness**. PDF fallback upload smoke passed locally with a safe synthetic learner-created placeholder. Full image OCR upload execution remains partial because the current image path can call an OCR provider, and this proof must not add AI provider calls.

Inverge remains a learner-owned appraiser-exam study operating OS. This proof is not Q-Net ingestion, not a problem bank, not public archive UI, not official grading, not a model-answer product, not score prediction, and not pass/fail judgment.

## Smoke Environment

- Date: 2026-06-13 KST
- Local URL: `http://127.0.0.1:3000`
- Account mode: local auth-disabled demo mode
- Persistence mode: no-Supabase browser-local fallback
- Browser/device: Playwright Chromium headless on Windows local machine
- Synthetic input: short learner-created English study notes only
- Synthetic file handling: in-memory PDF placeholder only; no uploaded file, screenshot, or local artifact was committed
- OCR provider calls during smoke: 0 requests to `/api/inverge/ocr`
- Expected local persistence observation: `/api/os/items` returned `503` in no-Supabase mode and browser-local fallback saved the learner note

## Runtime Smoke Scenarios

| Scenario | Status | Route | Source type | Account mode | Persistence status | Evidence summary | Follow-up needed |
| --- | --- | --- | --- | --- | --- | --- | --- |
| A. Text-first capture baseline still works | pass | `/app/capture?mode=second` | text | local auth-disabled demo | `local_fallback_saved` | Text-first capture accepted a short synthetic learner note and saved one browser-local beta note. | none |
| B. Image upload control is reachable if available | pass | `/app/capture?mode=second` | image | local auth-disabled demo | `not_applicable` | Runtime DOM exposed two image file inputs. Image upload execution was intentionally not triggered because it can call the OCR provider endpoint. | Run a provider-disabled synthetic image upload smoke before wider beta. |
| C. PDF upload control is reachable if available | pass | `/app/capture?mode=second` | pdf | local auth-disabled demo | `local_fallback_saved` | Runtime DOM exposed one PDF file input. An in-memory synthetic PDF placeholder selected successfully without provider requests. | none |
| D. OCR/PDF output is framed as draft | pass | `/app/capture?mode=second` | pdf | local auth-disabled demo | `local_fallback_saved` | PDF selection moved the capture path into manual draft state and kept learner-facing copy that the content must be directly checked before save. | none |
| E. OCR/PDF output is editable before save | pass | `/app/capture?mode=second` | pdf | local auth-disabled demo | `local_fallback_saved` | After PDF selection, the draft textarea accepted a direct manual edit before save. | none |
| F. Synthetic learner-created input can produce or support one biggestGap | pass | `/app/capture?mode=second` | pdf | local auth-disabled demo | `local_fallback_saved` | Saved browser-local beta note included exactly one non-empty `biggestGap`. | none |
| G. Synthetic learner-created input can produce or support one nextAction | pass | `/app/capture?mode=second` | pdf | local auth-disabled demo | `local_fallback_saved` | Saved browser-local beta note included exactly one non-empty `nextAction`. | none |
| H. Save path preserves learner-owned / metadata-only semantics | pass | `/app/capture?mode=second` | pdf | local auth-disabled demo | `local_fallback_saved` | Saved local beta note had `metadataOnly: true` and `safeUse: closed_beta_local_note`. | none |
| I. No official grading/model-answer/score/pass-fail copy appears | pass | `/app/capture?mode=second` | text, pdf | local auth-disabled demo | `not_applicable` | Visible capture/save states had no prohibited learner-facing official grading, model-answer, score prediction, pass/fail, payment, public archive, or instructor-console copy. | none |
| J. No raw official material or local official path is exposed | pass | `/app/capture?mode=second` | text, pdf | local auth-disabled demo | `not_applicable` | Runtime smoke used only synthetic learner-created text and an in-memory PDF placeholder. No Q-Net material, local official path, raw official text, or raw OCR full text was exposed or committed. | none |
| K. Provider-free telemetry can record safe metadata-only capture events | pass | provider-free telemetry contract | text, pdf | local Node helper evidence | `local_fallback_saved` | Existing provider-free learner-loop telemetry distinguishes metadata-only capture events without raw learner text or external analytics provider calls. Browser smoke also observed 0 OCR provider requests. | none |
| L. If image/PDF upload is unavailable in current runtime, mark partial honestly | partial | `/app/capture?mode=second` | image, pdf | local auth-disabled demo | `not_applicable` | PDF upload fallback was available and passed. Image controls were available, but full image OCR execution was not run because it can call a provider. Conditional Go remains until provider-disabled synthetic image smoke is completed. | Add provider-disabled synthetic image OCR smoke evidence. |

## Runtime Observations

- Capture route was accessible in local auth-disabled demo mode.
- Runtime exposed 2 image file inputs and 1 PDF file input.
- Text-first baseline save created 1 browser-local beta note.
- PDF fallback save created 1 browser-local beta note.
- PDF draft text was editable before save.
- Saved PDF fallback note preserved `metadataOnly: true`.
- Saved PDF fallback note preserved `safeUse: closed_beta_local_note`.
- Saved PDF fallback note included one biggestGap and one nextAction.
- No requests to `/api/inverge/ocr` occurred during the smoke.
- No severe console failures were observed for hydration mismatch, server/client text mismatch, `localStorage is not defined`, `window is not defined`, `TypeError`, or `ReferenceError`.
- No screenshots or uploaded raw files were committed.

## Draft and Editability Rules

- OCR/PDF output must be treated as draft.
- OCR/PDF output must be editable before save.
- The learner must directly check the content before saving.
- Output must prioritize one biggestGap and one nextAction, not score.
- If upload controls are unavailable or provider-disabled image upload cannot be tested, mark the result partial and preserve Conditional Go.

## Safety Boundaries

This proof preserves the closed-beta boundary:

- no local_official_materials
- no qnet_manifest.json
- no raw Q-Net
- no raw official text
- no raw PDF/HWP/HWPX/Word/ZIP/images
- no OCR full text committed
- no official grading/model-answer/score/pass-fail
- no public archive UI
- no instructor-console learner exposure
- no payment
- no analytics provider calls
- no AI provider calls
- no instructor grading behavior changes

Only short synthetic learner-created text/files may be used for future runtime smoke. Do not upload Q-Net raw official materials for QA.

## Decision

Current OCR/PDF smoke decision: **Conditional Go** for limited invited closed beta.

Reason: text-first capture and PDF fallback upload smoke passed with draft/editable/learner-owned/metadata-only evidence and no provider calls. Full image OCR upload execution remains partial until a provider-disabled synthetic image smoke can be run safely.

## Follow-up Gate

Required before wider beta:

1. Add provider-disabled synthetic image upload smoke evidence.
2. Confirm image OCR output remains draft-framed and editable before save.
3. Confirm image OCR smoke stores only learner-owned metadata evidence.
4. Confirm no official grading/model-answer/score/pass-fail copy appears.
5. Confirm no raw official materials, local official paths, OCR full text, screenshots, or uploaded raw files are committed.

## Validation

Required validation commands:

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run test -- --workers=1
npm.cmd run check:closed-beta-readiness
npm.cmd run verify:learner-loop:ci
npm.cmd run build
```
