# 감정평가사 2차 World-Class Vertical Source Validation

- 작성일: 2026-08-10 KST
- 상태: source-only validation
- contract version: `1.0.3`
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
7. `scripts/run-node-tests.mjs` — default CI registration only

## 2. Source hierarchy

- V13 remains the sole active master plan.
- This package is a subordinate execution standard.
- `ACTIVE-MASTER-PLAN.md` and `roadmap/active-program.yml` are unchanged.
- PR #697 and Issue #695 are superseded/closed without merge.
- #701 is the final implementation program and #713 is a future authority
  reconciliation; neither changes authority through this PR.

## 3. Benchmark evidence

The benchmark matrix uses primary/official sources where possible:

- UWorld official product pages
- AMBOSS official support
- Duolingo official engineering/learning blog
- Khan Academy official support
- OATutor, Ajv, decimal.js, Inspect AI, FSRS, pyBKT, pgvector,
  PaddleOCR and Tesseract official repositories/sites
- H5P official content page
- 1EdTech QTI/Caliper
- W3C PROV
- NIST AI RMF GenAI Profile
- Scientific Reports RCT
- PNAS field experiment
- Tutor CoPilot paper
- retrieval-practice systematic review

The sources support design mechanisms, not Dabangil efficacy or pricing claims.

## 4. Required source assertions

### Product and evidence

- exact answer anchor required
- successful outcome required
- guided/full reveal/same surface is not independent transfer
- D+7 verified non-same-surface required
- timed recurrence required for closure
- later independent failure reopens closure
- one canonical MasteryState authority
- Today CoreOutcome 0..3
- Full-Day availableMinutes trusted-server integer 30..720
- block completion and engagement do not change mastery/priority

### Trust and privacy

- Practice deterministic conflict blocks numeric release
- Law source/effective-version conflict blocks verified release
- raw body excluded from shared analytics, graph labels, calibration and cache
- private raw learner content categorically forbidden as model training input
- exact-purpose consent is insufficient for raw-body training
- future training candidates limited to pseudonymous non-reconstructive signals
  or promoted Cleared Content Bank material

### Activation and commercial

- completed exact S236P acceptance required before live activation under current authority
- blocked/failed/terminal disposition cannot substitute
- current canonical external lifecycle remains
  `S241A → O3C → S239A → S242C → O4F → S243C`
- S243C is Wave A and its completion is not an entry prerequisite
- exact authorization to enter S243C is required
- Owner-private evidence cannot substitute current external-commercial gates
- #713 may later reconcile a new accelerated Owner authority only through a
  separate exact source Work

### Open source

- FSRS due-date candidate only
- pyBKT current disposition exactly `benchmark_only`
- pyBKT shadow requires exact O2 measurement/consent and sufficient
  closed-schema skill-event data
- local synthetic benchmark alone is insufficient for pyBKT shadow
- every dependency requires version/license/security/SBOM/data-egress/fallback/
  rollback/uninstallability evidence
- this PR installs no dependency

## 5. Exact-head review corrections

Three exact-head Codex review rounds found eleven substantive issues. Contract
`1.0.3` closes them as follows.

1. **S236P gate** — current exact `acceptanceCompleted=true` and
   `terminalPass=true` required.
2. **Commercial gate** — separate external trust/O4 entry gate before paid canary.
3. **Full-Day range** — trusted-server integer 30..720, malformed values rejected.
4. **Default CI coverage** — focused test registered in default Node runner.
5. **S243C entry** — O4F completed path plus exact entry authorization; S243C
   completion only gates later waves.
6. **Golden 9 order** — S239A precedes S242C/O4F under current authority.
7. **Raw training prohibition** — private raw learner content categorically
   prohibited from training; consent does not override this.
8. **Pre-help exposure** — append-only trusted-server exposure/assistance event
   must commit before any help byte. Failure yields zero output/evidence and
   exposed work cannot return to unseen.
9. **Frozen D0** — D+1 binds exact problem/source/item/model/prompt/rubric/
   validator/tutor/assistance/measurement/Notebook/Full-Day configuration.
   Mismatch makes evidence stale and restarts D0; security repair invalidates
   rather than silently preserves evidence.
10. **GIII routine** — applicable Practice Golden vertical requires formula,
    extracted values, reset-safe hand-key sequence, expected display,
    unit/sign/rounding, answer transfer and no-program-storage guardrail.
11. **pyBKT** — disposition is `benchmark_only`; shadow requires exact O2 and
    sufficient closed-schema events.

## 6. Focused commands

```bash
node --check tests/appraiser-second-world-class-vertical-contract.test.mjs
node -e "JSON.parse(require('fs').readFileSync('config/dabangil-appraiser-second-world-class-vertical-v1.json','utf8'))"
node --test tests/appraiser-second-world-class-vertical-contract.test.mjs
git diff --check
```

Exact-head repository checks also require:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Fast CI, Full CI, Learner Loop Health, PR Contract, Risk Gate, Runtime Gate and
Vercel must be current for the exact final head. Old-head results are not reused.

## 7. Adversarial source assertions

Focused tests must reject or detect:

- no exact anchor but usable biggest gap
- evaluation completion used as positive evidence
- help bytes returned without committed exposure
- exposed attempt relabeled unseen
- D+1 across a mismatched frozen configuration
- security repair silently preserving incompatible evidence
- Practice Golden missing any required GIII routine field
- pyBKT marked shadow before O2/event sufficiency
- same-surface/guided success counted as transfer
- blocked/stale source released as verified
- raw body allowed into shared/training planes
- default runner omitting the focused contract test

## 8. Non-claims

Passing source checks proves only:

- files exist and agree
- machine mirror parses
- versioned invariants are pinned
- default CI executes focused regression
- active pointer, roadmap and runtime authorization are unchanged

It does not prove:

- runtime behavior
- subject-matter correctness
- Golden content readiness
- learning efficacy
- external usability
- willingness to pay
- commercial readiness
- Production readiness

## 9. Rollback

Rollback is a focused revert/removal of the six additive source artifacts plus
the one-line default-runner registration. No learner data, schema, provider or
deployment cleanup is required.
