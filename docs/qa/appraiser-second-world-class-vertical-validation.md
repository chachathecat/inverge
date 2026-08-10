# 감정평가사 2차 World-Class Vertical Source Validation

- 작성일: 2026-08-10 KST
- 상태: source-only validation
- contract version: `1.0.2`
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
7. `scripts/run-node-tests.mjs` — default CI test registration only

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
- Full-Day ExecutionBlock 0..N within available minutes
- Full-Day available minutes restricted to trusted-server integer 30..720
- engagement does not set learning priority
- raw learner body excluded from shared analytics, graph labels and cross-user cache
- private raw learner content categorically forbidden as model training input
- exact-purpose consent alone insufficient for raw learner-content training
- future training candidates limited to consented pseudonymous non-reconstructive signals or promoted Cleared Content Bank material
- FSRS due-date candidate only
- BKT benchmark/shadow only
- completed exact S236P acceptance required before live activation
- S236P blocked, failed or terminal disposition cannot substitute
- Golden 9 external readiness at S239A precedes S242C, O4F and paid Wave A
- separately approved exact external-commercial O4 entry gate required before paid canary
- full lifecycle path `S241A → O3C → S239A → S242C → O4F → S243C` preserved
- pre-canary completed path ends at `S241A → O3C → S239A → S242C → O4F`
- S243C is the paid canary target and its completion is not an entry prerequisite
- exact authorization to enter S243C is required
- S243C completion gates only later external waves and acceptance
- Owner-private acceptance and generic Owner activation cannot substitute for the external-commercial gate
- focused contract test registered in the default Node runner
- V13 remains active

## 5. Exact-head review corrections

The two exact-head Codex reviews of PR #700 found seven actionable issues. Contract
`1.0.2` closes them as follows.

1. **S236P gate** — live activation now requires current exact evidence with
   `acceptanceCompleted=true` and `terminalPass=true`; blocked or terminal
   disposition is not acceptance.
2. **Commercial gate** — WCV-9 is now a separate external trust and exact
   external-commercial O4 gate; WCV-10 is the paid canary and cannot start from
   Owner-private acceptance alone.
3. **Full-Day range** — `availableMinutes` is a trusted-server integer in
   the closed 30..720 range; outside-range or malformed values produce no plan.
4. **Default CI coverage** — the focused contract test is registered in
   `scripts/run-node-tests.mjs` so `npm test` executes it by default.
5. **Paid-canary entry** — the completed pre-canary path ends at O4F; S243C is
   Wave A itself, so entry requires exact S243C authorization rather than prior
   S243C completion. S243C completion gates only later waves and acceptance.
6. **Golden 9 order** — WCV-9 now performs S239A / Golden 9 external readiness
   before S242C/O4F commercial entry gating; WCV-10 is S243C paid Wave A and
   WCV-11 contains post-canary expansion only.
7. **Training prohibition** — private raw learner content is categorically
   forbidden as model training input. Exact-purpose consent alone is insufficient;
   only consented pseudonymous non-reconstructive signals or promoted Cleared
   Content Bank material can be future training candidates.

## 6. Commands

```bash
node --check tests/appraiser-second-world-class-vertical-contract.test.mjs
node -e "JSON.parse(require('fs').readFileSync('config/dabangil-appraiser-second-world-class-vertical-v1.json','utf8'))"
node --test tests/appraiser-second-world-class-vertical-contract.test.mjs
git diff --check
```

The focused source test requires no new dependency. Typecheck, lint, full `npm test`
and build are not duplicated locally; exact-head Fast CI, Full CI and Vercel are
the authoritative one-time full validation.

## 7. Non-claims

Passing these checks proves only:

- source files exist and agree;
- the machine mirror parses;
- key invariants are pinned;
- default CI executes the contract test;
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

## 8. Rollback

Rollback is a focused revert/removal of the six additive source artifacts plus
the one-line default-runner registration. No data, schema, runtime, provider or
deployment cleanup is required.
