# PR #681 — Final Master Plan v12 Coverage Validation

## Scope

This record validates the documentation/configuration-only v12 aggregate that adds the
Appraiser-wide Official Coverage Compiler and Original Question Engine without weakening
the v11 source-safety contract.

Active artifacts under validation:

- `docs/strategy/ACTIVE-MASTER-PLAN.md`
- `docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v12-2026-08-06.md`
- `docs/strategy/dabangil-appraiser-coverage-compiler-and-original-question-engine-v1-2026-08-06.md`
- `docs/decisions/2026-08-06-owner-appraiser-coverage-and-original-question-engine.md`
- `config/dabangil-appraiser-coverage-engine-v1.json`

Mandatory source-safety artifacts preserved from v11:

- `docs/strategy/dabangil-professional-exam-reasoning-os-final-master-plan-v11-2026-08-05.md`
- `docs/decisions/2026-08-05-owner-safe-ephemeral-study-finalization.md`
- `config/dabangil-ephemeral-source-safety-contract-v1.json`

No runtime, API, UI, schema, migration, RLS, Storage, provider, dependency, deployment,
real copyrighted source, external learner, payment or Production change is included.

## Source basis

The strategy aggregate distinguishes source-derived scope from independent curriculum
inference.

### Official / Owner-provided source-derived envelope

- current `감정평가 및 감정평가사에 관한 법률 시행령` Annex 1 subject list;
- current Q-Net annual execution plan and corrections;
- Owner-provided historical official file
  `감정평가사 자격시험 출제영역(등재용) (1).hwp`;
- Q-Net official past questions and item-level public-use conditions;
- exam-date current statutes, regulations, appraisal rules and practice standards;
- exam-date current K-IFRS registry.

The historical official scope file supplies these coarse domains:

- First Stage: Civil Law general part and real rights; micro/macro economics;
  intermediate/advanced financial accounting and cost/management accounting;
  appraisal-related statutes; Real Estate Studies general and ten applied domains.
- Second Stage: Practice foundations, property-specific, purpose-specific and applied
  work; Theory principles, approaches and applications; Price Public Notice Act,
  Appraisal Act and Land Compensation Act.

Historical statutory names are not silently treated as current. The current exam
subject annex and exam-date current law control normalized nodes.

### Independent curriculum inference

Prerequisites, misconception nodes, First-to-Second bridges, question families,
difficulty dimensions, mastery gates and transfer tasks are Dabangil-owned curriculum
inferences. Each inferred node must retain its source relationship and may not be
presented as an official syllabus item.

## Static assertions

The aggregate must preserve all assertions below.

1. `ACTIVE-MASTER-PLAN.md` identifies v12 as the only active strategy entry point.
2. V11 remains the mandatory source-safety annex and is not weakened.
3. Strategy coverage includes all five First-stage and all three Second-stage subjects.
4. Current learner-facing runtime authority remains Second-stage Practice, Theory and
   Appraisal/Compensation Law only.
5. `complete coverage` means bounded mapping completeness, not future-question
   prediction or guaranteed hit rate.
6. All official detailed-scope leaves must be representable in the coverage graph.
7. Recent nonappearance may not delete an official rotation domain.
8. Active law, accounting and practice-standard nodes require effective-date evidence.
9. Historical past-question answers and current-law answers remain separately versioned.
10. Official past questions are calibration and audit sources, not unrestricted
    verbatim generation seeds.
11. Generated shared content may use only validated concept graphs, Dabangil-owned or
    licensed curriculum, permitted official calibration metadata and current authority
    snapshots.
12. Unlicensed commercial textbook raw source and user-transient source are excluded
    from the shared generation corpus.
13. Every released question family requires a subject-specific deterministic solver or
    rubric validator and an adversarial critic.
14. Multiple-correct, no-correct, impossible-data, unit, rounding, law-currentness and
    rubric-omission defects are fail-closed.
15. Generated reference answers are visibly learning references, not official model
    answers or official grading criteria.
16. The same learner may study an entire book sequentially, but one ephemeral job
    processes one problem and may not assemble a book-level answer database.
17. Book Tutor output terminates in a source-scrubbed concept/error signature and a
    fresh Dabangil-owned transfer problem.
18. Raw source, OCR, publisher expression and source-bound full explanations remain
    non-persistent and non-reusable under the v11 contract.
19. Answer exposure, full reveal and guided success do not qualify as independent
    mastery.
20. Stable candidacy requires D+7 unseen verified transfer; timed integration requires
    prerequisite clearance.
21. The scheduler exposes at most three primary tasks per day.
22. User raw bodies do not enter analytics, shared graphs, model training or evaluation.
23. Current-source drift can hold a question, domain or subject.
24. Real third-party source processing remains blocked pending hostile synthetic
    acceptance, current provider verification, written Korean copyright/privacy review
    and separate Owner authorization.

## Machine-contract assertions

`config/dabangil-appraiser-coverage-engine-v1.json` must:

- parse as strict JSON;
- enumerate eight subjects and preserve the current runtime boundary;
- enumerate source precedence, source classes and concept priorities;
- define subject coverage-family registries and First-to-Second bridges;
- define First-stage, Practice, Theory and Law question-family registries;
- prohibit unlicensed/user-transient shared generation inputs;
- preserve Book Tutor one-problem-per-job and no-shared-corpus rules;
- define mastery, drift, scheduler, hard-gate and execution-sequence rules;
- set every known release-defect ceiling to zero;
- state that the file itself grants no runtime authority.

## Hostile review expectations

### Coverage

- official leaf omitted;
- duplicated or contradictory concept nodes;
- obsolete statute presented as current;
- current law or K-IFRS node with unknown effective version;
- past question mapped to the wrong concept;
- First-to-Second bridge without a transfer task.

### Generation

- two or zero correct answers;
- impossible or underdetermined data;
- graph contradicts prose;
- unit or rounding changes the keyed answer;
- legal timeline or action form is impossible;
- theory/law rubric omits a critical issue;
- model-generated reference is labelled official.

### Learning

- answer exposure raises mastery;
- near-identical template is counted as far transfer;
- D+7 reuses the same representation;
- timed integration bypasses prerequisites;
- scheduler exposes more than three primary tasks.

### Rights and source safety

- commercial source sentence or distinctive table appears in a generated item;
- user-transient source becomes a shared example or answer cache;
- multiple user uploads can reconstruct a book;
- official past question is shown without item-level rights/attribution handling;
- source-bound full explanation reaches a persistent sink.

## Repository validation expectations

For this documentation/configuration-only aggregate:

- JSON parse must pass;
- TypeScript typecheck and lint must remain green;
- focused and full tests must remain green;
- learner-loop verification and build must remain green;
- PR Contract, Risk Gate, Runtime Gate and Learner Loop Health must pass on the exact
  head;
- feature-specific runtime acceptance may skip because no runtime behavior changed;
- Vercel success establishes repository compatibility only, not activation authority.

## Merge posture

Human approval required. The PR remains Draft. Automated success does not replace
legal/product review and does not authorize merge, implementation, First-stage runtime
activation or real third-party source processing.
