# PR #681 — Ephemeral Source Copyright Firewall Strategy Validation

## Scope

This record validates the documentation-only change that adds:

- `docs/decisions/2026-08-05-owner-ephemeral-source-copyright-firewall.md`
- `docs/strategy/dabangil-copyright-safe-ephemeral-source-pipeline-master-plan-v10-2026-08-05.md`

Tracking issue: `#682`.

No runtime, API, schema, migration, RLS, Storage, provider, dependency, deployment,
real copyrighted content, external learner, payment or Production change is included.

## Baseline

- repository: `chachathecat/inverge`
- base branch: `main`
- exact base at branch creation: `cea76b3886c18e5e886c866d158937b43577552b`
- strategy integration base: merged v8 and additive v9
- source mode under amendment: `transient_personal_study`

## Static assertions

The added decision and strategy must jointly preserve these assertions:

1. unlicensed third-party raw images, OCR, source expression, prompts, provider
   response bodies, source embeddings and problem-specific answer caches are not
   persistent server data;
2. persistence prohibition covers DB, Storage, object store, durable cache, queue,
   logs, traces, replay, analytics, backup, CI artifacts and support tooling;
3. the raw processor has no general persistent-store credentials;
4. remote full-source processing is blocked unless the exact provider route has
   current contractual zero-content-retention eligibility and written legal approval;
5. retained, stale or unknown routes never receive a silent fallback;
6. full transient explanation is client-only or local-vault-only;
7. cloud persistence is limited to closed, non-reconstructable learning evidence and
   bodyless operational/deletion receipts;
8. PDF, multiple pages, answer keys, bulk extraction and coordinated reconstruction
   are blocked;
9. source and output are not used for RAG, training, evaluation or cross-user reuse;
10. output release blocks source restatement and publisher-answer imitation;
11. transient user items cannot become verified held-out measurement evidence;
12. written Korean copyright/privacy review remains mandatory before a real-source
    pilot.

## Repository contract correction

The first PR event used a free-form description and therefore failed the repository's
mandatory PR-contract validator. The PR body has been corrected to contain:

- exactly one `Closes #<issue>` reference;
- all ten required headings;
- exactly one `- Risk: [low|medium|high]` line; and
- exactly one checked merge recommendation.

This commit intentionally creates a new `synchronize` event so the corrected PR body
is validated from a fresh event payload rather than an earlier workflow snapshot.

## Evidence expectations

For this docs-only change:

- Typecheck, lint and focused tests remain unchanged and must pass.
- Feature-specific runtime acceptance may skip.
- Runtime Gate, Risk Gate, Learner Loop Health, PR Contract, Fast CI and Full CI must
  be evaluated on the exact head.
- Vercel may build, but no runtime behavior or Production activation is authorized.

## Merge posture

Human approval required. The PR remains Draft. Passing automated checks does not
replace legal/product review and does not authorize implementation or merge.
