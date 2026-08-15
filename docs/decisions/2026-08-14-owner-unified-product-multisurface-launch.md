---
document_title: "Owner Decision — Unified Product and Multisurface Launch Convergence"
status: "owner-decision/approved-source-contract-only"
decision_id: "owner_ulc_0_unified_product_multisurface_launch_2026_08_14"
dated: "2026-08-14 KST"
repository: "chachathecat/inverge"
lead_issue: 719
active_master_plan: "V13"
relationship_to_v13: "mandatory subordinate launch amendment"
current_campaign: "C2"
current_replacement_stage: "C2R-A"
current_replacement_stage_issue: 702
runtime_authorization: "none"
learner_activation_authorization: "none"
mobile_activation_authorization: "none"
instructor_activation_authorization: "none"
provider_authorization: "none"
payment_authorization: "none"
store_submission_authorization: "none"
deployment_authorization: "none"
production_authorization: "none"
---

# Owner Decision — Unified Product and Multisurface Launch Convergence

## 1. Decision

V13 remains the sole active master plan. This decision installs one mandatory
subordinate launch-convergence amendment, ULC-0, led by Issue #719. It is not
V14, V13.1, a second active master, or an implementation campaign.

The final public product is:

> 답안길 — 감정평가사 1·2차 통합 합격 운영체계

Its required public surfaces are Web, iOS/iPadOS, and Android. Student
capabilities target all three surfaces. The complete instructor authoring and
review console remains Web-primary; student apps may consume assignments and
approved feedback.

This decision installs authority only. It creates no native project, package,
runtime, learner access, provider access, payment, store submission,
deployment, or Production activation.

## 2. Preserved current implementation authority

This amendment does not change the current implementation selection:

- roadmap item: `WCV-C2`;
- campaign: `C2`;
- structural recovery tracker: #717;
- current replacement stage: `C2R-A`;
- current replacement-stage issue: #702;
- current stage state: authorized and unstarted;
- WCV-C2 state: incomplete;
- merge-producing writer limit: exactly one;
- automatic start: prohibited.

The exact replacement chain remains:

`C2R-A → C2R-B → C2R-C-P → C2R-C-T → C2R-C-L`

PR #718 and the complete 21-row WCV-C2R regression authority remain
unchanged. This Work does not implement or start C2R-A and does not mutate
Tracker #717.

## 3. Free-limited public 1.0

The future `ULC-L1` route is a free-limited public Web/iOS/Android 1.0. For
this exact route only, the former requirement equivalent to
`privateFoundingBetaBeforePublicS225: true` does not apply.

ULC-L1:

- requires no paid cohort or paid-conversion evidence;
- exposes no in-app purchase CTA;
- activates no payment;
- grants no commercial-readiness, retention, efficacy, score-gain,
  pass-rate, or causal claim;
- exposes only capabilities that have passed their exact technical, rights,
  privacy, and domain-quality gates; and
- is not labeled beta solely because market fit or efficacy is unproven.

Every capability must expose an honest state when applicable: `supported`,
`limited`, `AI-assisted`, `human-unreviewed`,
`source-currentness-required`, or `blocked`.

The final free-limited public 1.0 requires:

- Today and Review Queue;
- five-choice first-round MCQ for Civil Law, Economics, Real Estate
  Principles, Appraisal-related Law, and Accounting;
- second-round Trusted Repair for Practice, Theory, and Law;
- camera/PDF capture and editable OCR confirmation;
- direct repair, D+1, D+7, transfer, and reopening;
- Concept Decoder and Formula Graph;
- learner-specific automatic notes;
- data export, answer deletion, and account deletion; and
- AI, source, currentness, and human-review status.

## 4. Separate paid and evidence route

The free route does not absorb or satisfy the paid/evidence path. After
ULC-L1, the separate future order remains:

`O4W → WCV-C5 → WCV-C6 → separate payment/paid-claim activation authority`

That route may later support payment, paid-cohort claims, retention and
commercial-readiness claims, delayed-evidence claims, efficacy or causal
claims, and continuous calibration. ULC-L1 establishes none of those states.
Payment always requires a separate exact Owner authorization.

Existing S225/O4D commercial public-self-serve authority remains attached to
the commercial path. O4D keeps its exact `[S245C, S242V]` dependencies, and
S225 now records both independent terminal prerequisites as `[O4D, WCV-C6]`.
Owner public-self-serve authority alone cannot substitute for terminal paid
evidence, terminal paid evidence alone cannot substitute for Owner authority,
and satisfying either or both authorizes no automatic start, payment,
learner activation, public release, or Production activation. The paid
Founding Beta requirement is not silently deleted or transferred to ULC-L1.

## 5. Future architecture

The future target architecture is:

- existing Next.js and Vercel for Web and the trusted HTTP API;
- Expo React Native for native iOS/iPadOS and Android;
- Expo Router for native navigation, universal/app links, and deep links;
- EAS Build, Submit, and Workflows for mobile build, CI, and store
  submission;
- Maestro for native end-to-end verification; and
- existing Supabase/Postgres for authoritative persistence and tenant
  boundaries.

This authority installs or pins no mobile dependency. The first complete
native learner-outcome PR must install exact versions, licenses, security
evidence, SBOM, lockfile, and rollback together.

The following repository shape is recorded but not created:

- `apps/mobile`;
- `packages/contracts`;
- `packages/domain`;
- `packages/api-client`;
- `packages/design-tokens`;
- `packages/offline-sync`; and
- `packages/release-contracts`.

The current root Next.js app remains in place and is not moved to `apps/web`
by this authority.

The final architecture prohibits:

- a remote-website-only WebView wrapper as the final app;
- static-exporting the current server application as the final native app;
- separate Web and mobile mastery truth;
- client-set mastery, verified, or source-currentness state;
- service-role exposure to mobile;
- raw answer, OCR, concept, score, or private text in push payloads; and
- critical learner behavior available only through framework-private server
  actions without a versioned mobile-consumable HTTP API.

## 6. Future complete-vertical sequence

No future item below starts automatically. After terminal C2R-C-L, the
mandatory order is:

1. `WCV-C3` — durable evidence, D+1/D+7, transfer, reopening, Ledger,
   Review Queue, and Today.
2. `ULC-M1` — native install/authentication, Today, Review Queue, push
   registration, deep link, and in-app account deletion.
3. `ULC-M2` — camera, PDF/photo share, multipage capture, OCR confirmation,
   second-round Trusted Repair, offline draft, and idempotent sync.
4. `ULC-K1` — learner error, Concept Decoder, precise definition, Formula
   Graph, hidden reconstruction, review scheduling, and cross-surface parity.
5. `ULC-F1` — Civil Law MCQ across Web/iOS/Android.
6. `ULC-F2` — Economics across Web/iOS/Android.
7. `ULC-F3` — Real Estate Principles across Web/iOS/Android.
8. `ULC-F4` — Appraisal-related Law across Web/iOS/Android.
9. `ULC-F5` — Accounting across Web/iOS/Android.
10. `ULC-I1` — Web-primary instructor problem/rubric/source/class/
    assignment/AI-pre-review/review/approval outcome.
11. `WCV-C4` — complete final-product Owner proof, red-team, routing, and
    instructional-mode proof, with no paid-cohort prerequisite for ULC-L1.
12. `ULC-R1` — privacy, AI disclosure, deletion, store metadata, app-review
    account, native build evidence, and coordinated-release readiness.
13. `ULC-L1` — free-limited public Web/iOS/Android 1.0, payment false.

The sequence does not replace either authenticated-acceptance gate.
`ULC-M1` consumes second-round roadmap item `S241A`; `ULC-F1`
independently consumes first-round roadmap item `S238B`. Both gates are
required for both-track work. Acceptance evidence and mastery may not
substitute or transfer in either direction.

Every runtime stage is one independently deployable learner or instructor
outcome. Framework-only, API-only, persistence-only, UI-only, and QA-only
mandatory PRs are prohibited.

## 7. Concept Decoder and Formula Graph

`Concept Decoder` is structured learner-error repair, not a generic AI
summary. It must carry term and Hanja/English/symbol decomposition, intuitive
explanation, precise exam definition, analogy and limitations, applicability
conditions, common confusions, exam-writing layer, learner-error provenance,
retrieval prompts, and D+1/D+7 scheduling.

`Formula Graph` is a typed relation object, not free-form formatted text. It
must carry expression, variables, units, causal direction, applicability
conditions, derived forms, rounding/sign constraints, common error patterns,
exact source/version, and a link to the learner's actual failed attempt.

Easy explanation alone creates no mastery evidence. Only learner
reconstruction and later independent performance may change learning state.
All surfaces read one server-authoritative learner state.

## 8. Store, privacy, and disclosure

The final release must support:

- App Store and Google Play in-app account deletion;
- an external Web account-deletion resource;
- privacy policy, Apple App Privacy declarations, and Google Data Safety
  declarations;
- AI-generated/AI-assisted disclosure;
- source/currentness date and human-review state;
- notification privacy;
- least-privilege camera/photo/file permissions;
- an app-review demo account; and
- verified delete and export paths.

No private learner content may appear in notification payloads.

## 9. Coordinated release

One `DabangilReleaseManifestV1` binds release ID, public version, git
head/tree, Web deployment, iOS bundle/version/build/EAS build, Android
package/version/version code/EAS build, API/evidence/validator versions,
migration-set digest, privacy-policy version, AI-disclosure version,
account-deletion verification, store-metadata digest, and per-surface final
gate status.

iOS is approved and held for manual release. Android is approved and held
through managed publishing or the exact available equivalent. Web remains
behind the final public gate. One release command opens all three surfaces
within a maximum 24-hour availability window.

## 10. Acceptance and validation

Acceptance requires machine proof that:

- V13 remains the sole active master and this amendment is subordinate;
- Issue #719 is the single ULC-0 lead;
- the WCV-C2R object, roadmap block, 21-row matrix, current C2R-A selection,
  one-writer limit, and no-auto-start state remain unchanged;
- every future item ID is unique and every dependency resolves;
- no future ULC item is selected or started;
- ULC-L1 does not depend on O4W, WCV-C5, or WCV-C6;
- paid activation still depends on O4W, WCV-C5, WCV-C6, and separate Owner
  authorization;
- O4D remains exactly gated by `[S245C, S242V]` and S225 remains blocked until
  both independent `[O4D, WCV-C6]` dependencies are complete, with no
  substitution, bypass, automatic start, or activation;
- final public and student surfaces are exactly Web/iOS/Android;
- one authoritative learner state serves every surface;
- first-round, instructor, public-release, payment, and Production runtime
  remain unauthorized;
- deletion covers in-app and external Web paths; and
- the coordinated launch window is no more than 24 hours.

Required validation is exact owned-path equality, JSON/YAML parse, focused
launch-authority tests, affected roadmap/authority tests, Agent Factory,
default Node suite, typecheck, lint, production build, `git diff --check`, and
an independent hostile read-only audit. Local actionable P0/P1/P2 must be
exactly `0/0/0`.

Publication is exactly one commit, one ordinary non-force publication, and
one Draft PR led by Issue #719. Merge is allowed only after fresh exact-head
CI and Vercel, one PR-body synchronization, one Draft-to-Ready transition,
and exactly one final exact-head automated review reporting actionable
P0/P1/P2 `0/0/0`. Merge is expected-head-pinned squash only.

## 11. Non-goals, rollback, and current state

This authority PR performs no C2R-A or WCV-C3 implementation; creates no
`apps/mobile`; changes no package, lockfile, application, component, runtime,
API, database, migration, RLS, Storage, workflow, Expo/EAS project, provider,
model, prompt, content, learner, payment, store submission, deployment, or
Production state.

The current activation state is zero for first-round runtime, mobile runtime,
instructor runtime, external learners, public launch, providers, payment, and
Production.

Rollback is one revert of the authority squash commit before any separately
authorized later ULC stage begins. A rollback does not alter the factual PR
#718 merge, Tracker #717, or the WCV-C2R chain.

## 12. Exact owned-path manifest

This authority owns exactly:

1. `AGENTS.md`
2. `config/dabangil-unified-product-multisurface-launch-v1.json`
3. `config/dabangil-unified-program-contract.json`
4. `docs/dabangil-unified-program-contract.md`
5. `docs/decisions/2026-08-14-owner-unified-product-multisurface-launch.md`
6. `docs/inverge-master-roadmap.md`
7. `docs/qa/dabangil-cross-surface-parity-matrix.md`
8. `docs/qa/dabangil-multisurface-launch-validation.md`
9. `docs/qa/dabangil-store-compliance-matrix.md`
10. `docs/qa/wcv-campaign-c1-authority-roadmap-reconciliation-validation.md`
11. `docs/strategy/ACTIVE-MASTER-PLAN.md`
12. `docs/strategy/dabangil-unified-product-multisurface-launch-v1-2026-08-14.md`
13. `roadmap/active-program.yml`
14. `scripts/run-node-tests.mjs`
15. `tests/agent-factory-roadmap-runner.test.mjs`
16. `tests/dabangil-premium-alignment.test.mjs`
17. `tests/dabangil-unified-product-multisurface-launch-authority.test.mjs`
18. `tests/wcv-campaign-authority-roadmap-reconciliation.test.mjs`
19. `tests/theory-answer-review-engine.test.mjs`
20. `tests/practice-answer-review-engine.test.mjs`
21. `tests/s214-reference-answer-pipeline.test.mjs`
22. `tests/s215-reference-answer-release-gate.test.mjs`
23. `tests/s216-error-notebook-gap-taxonomy.test.mjs`
24. `tests/s217-personal-core-concept-graph.test.mjs`
25. `tests/s218-similar-question-review-scheduler.test.mjs`
26. `tests/s219-learner-catalog-usage-ledger.test.mjs`
27. `tests/s220-billing-entitlement-credit-usage.test.mjs`
28. `tests/s221-paid-trust-privacy-cost-guardrails.test.mjs`
29. `tests/s222-academy-answer-operations-tenant-boundary.test.mjs`
30. `tests/s223-three-subject-corpus-reference-quality-acceptance.test.mjs`
31. `tests/s224-three-subject-learner-runtime-acceptance.test.mjs`

No other path is authorized.
