# 감정평가사 2차 World-Class Vertical Source Validation

- 작성일: 2026-08-10 KST
- 상태: source-only validation
- runtime evidence: none
- active master change: none
- roadmap state change: none

## 1. 검증 대상

1. `docs/decisions/2026-08-10-owner-appraiser-second-world-class-vertical-execution.md`
2. `docs/strategy/dabangil-appraiser-second-world-class-vertical-execution-v1-2026-08-10.md`
3. `docs/qa/appraiser-second-world-class-benchmark-and-adoption-matrix-v1-2026-08-10.md`
4. `config/dabangil-appraiser-second-world-class-vertical-v1.json`
5. `docs/qa/appraiser-second-world-class-vertical-validation.md`
6. `tests/appraiser-second-world-class-vertical-contract.test.mjs`

## 2. Source hierarchy

- V13 remains the sole active master plan.
- This package is a subordinate execution standard.
- No `ACTIVE-MASTER-PLAN.md` change is included.
- No `roadmap/active-program.yml` change is included.
- PR #697 is not modified by this source package.

## 3. Benchmark evidence

The benchmark matrix uses primary/official sources where possible.

- UWorld official product pages
- AMBOSS official support pages
- Duolingo official engineering/learning blog
- Khan Academy official support
- OATutor official GitHub repository
- Open Spaced Repetition official GitHub repositories
- H5P official content page
- 1EdTech QTI and Caliper official pages
- W3C PROV
- NIST AI RMF GenAI Profile
- Scientific Reports RCT
- PNAS field experiment
- Tutor CoPilot paper
- retrieval-practice systematic review

The sources support design mechanisms, not Dabangil efficacy or pricing claims.

## 4. Required source assertions

- exact answer anchor required
- successful outcome required
- guided/full reveal is not independent
- D+7 verified non-same-surface required
- timed recurrence required for closure
- later independent failure reopens closure
- one canonical mastery authority
- Today CoreOutcome max 3
- Full-Day 0..N within available minutes
- engagement does not set learning priority
- raw learner body excluded from shared analytics/training
- FSRS due-date candidate only
- BKT benchmark/shadow only
- V13 remains active

## 5. Commands

```bash
node --check tests/appraiser-second-world-class-vertical-contract.test.mjs
node --test tests/appraiser-second-world-class-vertical-contract.test.mjs
node -e "JSON.parse(require('fs').readFileSync('config/dabangil-appraiser-second-world-class-vertical-v1.json','utf8'))"
git diff --check
npm run typecheck
npm run lint
npm test
npm run build
```

The focused source test can be run without new dependencies.

## 6. Non-claims

Passing these checks proves only:

- source files exist and agree;
- the machine mirror parses;
- key invariants are pinned;
- no active pointer/runtime authorization is asserted.

It does not prove:

- runtime behavior;
- subject-matter correctness;
- Golden 3 completion;
- learning efficacy;
- external usability;
- willingness to pay;
- commercial readiness;
- Production readiness.

## 7. Rollback

Rollback is deletion/revert of these six source-only artifacts. No data, schema,
runtime, provider or deployment cleanup is required.
