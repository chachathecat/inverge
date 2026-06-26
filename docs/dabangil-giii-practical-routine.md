# 답안길 GIII Practical Routine Policy

- 문서 상태: S200R calculator policy
- 적용 범위: future 감정평가실무 routine specifications, validation prompts, answer-review QA
- Fixed calculator model: `casio_fx_9860giii`
- Source provenance: GitHub issue #437, S201 exam-rule metadata, `docs/dabangil-second-exam-premium-os.md`

This document is policy only. It does not implement a calculator trainer, OCR, calculation validator, learner UI, or question ingestion.

## Decision

감정평가실무 practical routines must treat CASIO fx-9860GIII as the fixed calculator model.

Required principle:

> 시험장 리셋 후에도 손으로 재현 가능한 fx-9860GIII 타건 루틴만 훈련한다.

답안길 must not teach calculator program storage as an exam strategy. Routine training must assume the learner can reproduce the method by hand after a reset.

## Routine Specification Contract

Every future GIII routine specification should include:

- formula;
- extracted values;
- CASIO fx-9860GIII hand-keyed sequence;
- expected display;
- unit check;
- rounding check;
- answer-sheet transfer template;
- common mistake warnings;
- reset-safe hand-keyed routine;
- no stored-program dependency.

## Routine Review Rules

A future routine may be marked training-ready only when:

- the formula is tied to the specific practical task type;
- each extracted value has a source status and confidence state;
- every hand-keyed sequence is reproducible without stored programs;
- expected display values include rounding and unit assumptions;
- the answer-sheet transfer step prevents common won/thousand-won, area, rate, and period mistakes;
- unsupported task types fail closed instead of producing confident routines.

## Data Boundary

GIII routine metadata may record safe template structure, formula identifiers, unit policies, and mistake categories.

Do not commit:

- raw official question text;
- raw learner answer or OCR text;
- raw official PDF/HWP/image bytes;
- copied official answer body;
- learner-entered numeric tables from real submissions;
- provider payloads, secrets, cookies, or account IDs.

## Later Validation Needed

S200R does not validate live calculator behavior. Later implementation work must verify fx-9860GIII display behavior, rounding behavior, and reset-safe hand-keyed steps against actual calculator usage and current exam rules before any routine is released as learner-facing training.
