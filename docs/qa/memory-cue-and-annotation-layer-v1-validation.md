# Memory Cue & Annotation Layer v1 — Source-only Validation

## Scope

This record validates the V13 follow-up contract only:

- `docs/strategy/ACTIVE-MASTER-PLAN.md`
- `docs/strategy/dabangil-memory-cue-and-annotation-layer-v1-2026-08-06.md`
- `docs/decisions/2026-08-06-owner-memory-cue-and-annotation-layer.md`
- `config/dabangil-memory-cue-and-annotation-layer-v1.json`
- `tests/memory-cue-and-annotation-layer-contract.test.mjs`

No runtime, UI, API, schema, persistence, provider, dependency, real content, roadmap or
PR #692 mutation is included.

## Static assertions

1. V13 remains the sole active master plan; MCAL is a mandatory follow-up annex, not V14.
2. The exact development order is:
   `core engines → attempt/repair/transfer/D+7 → Memory Post-it → semantic highlight → personal editor`.
3. `formalTerm`, `literalGloss`, `memoryGloss`, `exactDefinitionRef` and independent evidence are distinct.
4. `exactDefinitionRef` resolves only to a released, versioned VESG concept/evidence projection.
5. MCAL cannot create, override or release a second definition authority.
6. MCAL-1 terms require released, versioned VESG concepts.
7. A mnemonic cannot become official definition, answer, scoring or mastery authority.
8. Hanja/root decomposition has profile-scoped evidence and a fail-closed held state.
9. `DISPUTED` and `UNKNOWN` decomposition are not learner-visible.
10. Every cue binds profile, VESG node, graph, norm, rights and review state.
11. The closed per-kind anchor-policy key set exactly equals the eight declared anchor kinds; no default,
    fallback or caller domain/locator override exists.
12. `LEARNER_ATTEMPT_RANGE` and `PRIVATE_SOURCE_RANGE` are owner-bound `LEARNER_PRIVATE` with
    `VAULT_LOCAL_ONLY`; unknown, missing or conflicting mappings reject or hold rather than fall back shared.
13. A private target digest is vault-local integrity metadata only. Its non-vault projection is a bodyless
    receipt without excerpt, offset, locator, attempt reference, digest or identifier and cannot enter shared
    graph, analytics, logs, cache index, cross-user or Portable Core content-bearing projection.
14. `CueExposureEvent` reuses the canonical Assistance/Exposure ledger; no parallel cue ledger is allowed.
15. The closed timing/classification map permits only `LOW` or `MATERIAL` for `BEFORE_RESPONSE`;
    `BEFORE_RESPONSE + NONE` is invalid.
16. `NONE` means the attempt has no pre-response cue. Any pre-response event makes independent retrieval,
    far transfer and stable D+7 ineligible for the whole attempt; later events cannot restore independence.
17. Timing and classification derive from the canonical ledger. Untrusted client values, ambiguous ordering,
    record failure and render/submit races fail closed.
18. Any decomposition displayed before a response is assistance/exposure.
19. Exposure is atomically recorded before cue bytes render; failure renders no cue bytes.
20. The default collapsed surface exposes only `formalTerm` unless rule 19 has passed.
21. `HIDDEN` forbids cue bytes in DOM, SSR, accessibility text, prefetch, cache and direct API output.
22. D+7 stable and timed evidence require cue `HIDDEN` and a non-same representation.
23. Same-cue repetition is not far transfer.
24. Memory Post-it expanded-card maximum is one.
25. Semantic highlights require `ALL_OF`: a non-empty visible text label and a valid computed accessible
    name. Visible text may supply that name, so a redundant `aria-label` is not required.
26. Semantic highlights have closed roles and maximum three primary highlights.
27. Every semantic highlight binds a revision-bound typed anchor and target digest.
28. Color alone never carries meaning.
29. Shared cues attach only to owned, licensed or item-permitted official material.
30. Personal note body remains Personal Raw Vault and is not shared, trained or analyzed by default.
31. MCAL-2 requires CPF-2A closure and an approved bodyless exposure path.
32. Personal editor is blocked pending CPF, privacy, retention, export/delete, schema/RLS/Storage and hostile runtime gates.
33. Portable Core reuses interfaces only; terminology, definitions, rights and reviews stay profile-owned.
34. MCAL cannot create a fourth Today primary task.
35. MCAL-1 through MCAL-4 remain unauthorized.
36. Every authorization flag is false and every hard-gate ceiling is zero.

## Hostile review

### Terminology

- invented Hanja;
- literal meaning that contradicts professional use;
- pedagogic metaphor presented as etymology;
- stale definition after legal/standard drift;
- mnemonic treated as a keyed answer.

All fail closed or hold.

### Evidence

- learner receives a decomposition in a collapsed card before answering but no exposure is recorded;
- a cue ledger is created separately from the canonical Assistance/Exposure ledger;
- `BEFORE_RESPONSE` is paired with `NONE`;
- a later event restores independent evidence after any pre-response event;
- timing/classification comes from untrusted client input;
- ambiguous ordering or a render/submit race receives independent credit;
- exposure is recorded after render or record failure still reveals cue bytes;
- `HIDDEN` cue bytes remain in DOM, SSR, accessibility text, prefetch, cache or direct API output;
- assisted repair relabeled independent;
- visible cue at D+7;
- same card counted as far transfer;
- highlight click counted as mastery.

All are rejected.

### Source and privacy

- private textbook range exported as a shared selector;
- learner-attempt range paired with a shared domain or non-vault locator;
- private excerpt, offset, locator, attempt reference, digest or identifier in a bodyless receipt;
- personal free text in logs, analytics, issue artifacts or training;
- cross-user note reuse;
- editor activation before export/delete and access evidence.

All are blocking defects.

### UX and accessibility

- color-only highlight;
- visible text label without a valid computed accessible name;
- computed accessible name without a non-empty visible text label;
- semantic highlight with an untyped or unversioned anchor;
- more than three primary highlights;
- multiple expanded cards;
- card covering answer input;
- Memory Post-it becoming a fourth primary task;
- cue available by default in timed GS.

All are blocking defects.

## Focused and repository validation commands

```text
node --check tests/memory-cue-and-annotation-layer-contract.test.mjs
node --test tests/memory-cue-and-annotation-layer-contract.test.mjs
JSON.parse(config/dabangil-memory-cue-and-annotation-layer-v1.json)
balanced Markdown fences
npm run typecheck
npm run lint
npm test
npm run build
```

Current correction-source evidence:

- JavaScript syntax check: passed.
- Focused behavioral contract suite: 12/12 passed.
- Strict JSON parse, balanced Markdown fences, cross-artifact assertions and `git diff --check`: passed.
- Typecheck: passed.
- Lint: passed with 0 errors and 9 pre-existing warnings outside the MCAL diff.
- Full Node test suite: 1,232/1,232 passed.
- Production build: passed. The local sandbox's missing `uv_resident_set_memory` metric was supplied by
  an untracked process-memory shim outside the repository; no tracked source or dependency byte changed.

The repository PR Contract, Fast CI, Full CI, Learner Loop Health, Risk Gate and Runtime
Gate must also pass on the same exact head.

## Runtime evidence

None required and none claimed. Source checks do not establish cognitive efficacy,
terminology correctness, annotation persistence, accessibility or runtime safety.

## Merge posture

PR #692 is merged at `512bfdb9232a86bf4f7d4cfbc076a9df1c8a7da2`. Its late P2 thread
`PRRT_kwDOSMHn8M6W-xVE` remains deliberately unresolved and is reserved for the first
CPF-2A integrated commit; this MCAL Work does not modify that test or resolve the thread.
Exact-head CI and automated review are required before any externally authorized closeout.
This record itself grants no Ready, merge, roadmap, CPF-2A or runtime authority.
