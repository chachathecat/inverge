# Inverge Product Constitution

- Status: docs/reference-data source of truth
- Date: 2026-07-01
- Runtime impact: none
- Primary sources: `docs/inverge-second-round-final-product-spec.md`, `docs/dabangil-second-exam-premium-os.md`, `roadmap/active-program.yml`, `AGENTS.md`

## One-Sentence Promise

Inverge is the internal codename for Dabangil (답안길), a premium 감정평가사 2차 answer operating system that runs a learner's 실무, 이론, and 보상법규 answer practice through Evidence Review, one biggest gap, one next action, rewrite or recalculation, Review Queue, Today Plan max 3, and Personal Concept State until exam day.

## What Inverge Is

Inverge is:

- a 감정평가사 2차 learning OS for the three second-round subjects: 감정평가실무, 감정평가이론, and 감정평가 및 보상법규;
- a Capture-to-Plan learning OS pattern where learner-owned capture or answer work becomes a note, safe concept candidate, weakness signal, next action, Today Plan item, Review Queue item, Learning Record, and Personal Concept State;
- an Evidence Review and rewrite/recalculation system;
- a CASIO fx-9860GIII practical-routine system that trains reset-safe hand-keyed routines only;
- a theory paragraph-production system;
- a law issue/application-production system;
- a learning-record, weakness-map, Review Queue, and Today Plan system.

## What Inverge Is Not

Inverge is not:

- a problem bank;
- an OCR-only app;
- a score-first AI grader;
- a manual wrong-answer notebook;
- an official grader;
- an official model-answer service;
- a pass-probability or pass/fail prediction product;
- a guaranteed-score product;
- a human expert-review B2C service;
- a public historical-question archive;
- generic dashboard SaaS;
- a broad multi-exam platform.

## Core Learner Loop

The core operating loop is:

```text
historical question or learner capture
-> attempt or answer review
-> OCR confirmation when needed
-> learner-owned note
-> safe concept candidate
-> Evidence Review
-> one biggest gap
-> one next action
-> verified learning reference comparison when available
-> rewrite or recalculation
-> automatic error note / concept graph signal
-> Today Plan max 3
-> Review Queue / retrieval
-> Learning Record
-> Personal Concept State
```

Historical exams are reference and corpus infrastructure, not the main passive front-door experience. Attempt before reveal remains the default, with deliberate override allowed after a clear confirmation.

## Magic Moment

The magic moment is when a learner's own answer, capture, or recalculation trace turns into a calm Evidence Review that names exactly one biggest gap, gives one next action, and schedules the next rewrite, recalculation, or review without ending at a score.

## Non-Negotiables

- Today Plan shows max 3 primary tasks.
- Retrieval or production happens before explanation by default.
- Feedback ends in retry, rewrite, regrade/recalculation, or scheduled review.
- Score-like ranges are secondary practice estimates with confidence and evidence, never official scores.
- Generated reference answers are learning references, not official answers or official grading criteria.
- No reference answer is released with a blocking legal-source, calculation, or unresolved-consensus error.
- Raw learner answer, OCR, upload, rewrite, and raw problem text stay private service data.
- Product learning uses safe derived signals, not raw user text.
- Official syllabus, official answers, annual notices, law versions, and source rights must be verified before production claims.
- CASIO practice uses only reset-safe `casio_fx_9860giii` hand-keyed routines and never teaches stored-program dependency as exam strategy.

## Product Principles

- One screen has one primary task.
- The result surface leads with one biggest gap and one next action.
- The product reduces decision load instead of creating a control-room dashboard.
- Passive answer browsing is never the default when retrieval or production is possible.
- Historical-question coverage is important infrastructure, but rights, source status, and release gates control exposure.
- Calm recovery and spaced review are ethical retention; shame, ranking pressure, fake urgency, and casino-style gamification are forbidden.

## Learner/Instructor Separation

Learner-facing Dabangil and the academy console are separate products. Academy tools may support roster, assignment, batch answer operations, AI grading/feedback drafts, instructor approval, cohort analytics, and rewrite management, but they must not appear in learner navigation or learner UI.

If an academy publishes a final grade to a learner, academy approval is required. Inverge does not sell or supply human expert review as a B2C service.

## Official-Source Claim Policy

Learner-facing copy must not claim:

- official grading;
- official model answers;
- official scores;
- pass probability;
- pass guarantee;
- AI final judgment;
- guaranteed correctness.

Reference answers must expose source status, verification status, and uncertainty. Legal claims must be tied to the law version applicable to the exam date when relevant.

## Data Boundary Policy

The data boundary has three product layers:

- private raw service layer: learner-owned uploads, OCR, answers, rewrites, notes, and raw problem text needed for the learner's own service;
- derived learning signal layer: sanitized concept, gap, task, confidence, and scheduling metadata;
- aggregated product intelligence layer: aggregate metrics that contain no raw learner text, no OCR text, no answer text, and no raw problem text.

Raw learner text, OCR text, answer text, rewrite text, raw problem text, provider payloads, secrets, and copyrighted source text must never become global reference data, telemetry, analytics, commercial metrics, or model-training material without explicit future consent and policy.

Official-source records must keep manifest, hash, source, provenance, rights status, verification status, and reviewed-at metadata separate from learner artifacts.

## Agent Factory AF016 Completion Note

AF010 through AF016 completed the first report-only Agent Factory automation evidence chain. That chain can plan and document safe future work from metadata, but it still cannot execute Codex, apply patches, mutate GitHub, rerun workflows, merge/rebase, or touch learner/runtime/provider/billing/auth/payment/OCR/instructor/production systems.

Future execution automation remains approval-gated and must be implemented in a separate issue with its own safety evidence.

## Next Roadmap After This PR

This PR records the product transition after AF016. Product work resumes from the second-round active program, especially:

1. theory concept corpus and validator;
2. practice calculation, unit, OCR, and supported-type validator;
3. law, theory, and practice answer review engines;
4. multi-candidate reference-answer pipeline and critic/release gate;
5. automatic error notebook, personal concept graph, and review scheduler;
6. catalog, usage ledger, billing, trust, academy console, and integrated paid-launch gates later.

Capture-to-Note and Capture-to-Plan remain the learner-loop quality standard, but this PR does not implement runtime behavior. Raw historical corpus expansion, public archive behavior, billing, usage ledger, execution automation, and production source ingestion remain deferred until source, rights, private-storage, data-boundary, runtime, and cost gates exist.
