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
    fallback or caller domain/locator override exists. Every declared required binding has an exact closed
    schema for type, enum or pattern, and target type must agree with kind policy. Individual missing, null,
    empty, malformed, wrong-type, ambiguous or inconsistent bindings reject; truthiness-only validation is forbidden.
12. `LEARNER_ATTEMPT_RANGE` and `PRIVATE_SOURCE_RANGE` are owner-bound `LEARNER_PRIVATE` with
    `VAULT_LOCAL_ONLY`; unknown, missing or conflicting mappings reject or hold rather than fall back shared.
    Their owner and vault-target references use exact primitive-string formats and must resolve through one
    closed, server-side authoritative owner boundary. That resolution must match the authenticated learner and
    tenant and bind the exact owner ref, anchor, kind, vault-local target, revision, digest, digest scope and
    locator. Caller truthiness/equality is not evidence; missing, malformed, wrong-type, foreign-owner,
    cross-learner, cross-tenant, ambiguous, conflicting, stale, replayed, unresolved or client-inferred bindings reject.
13. A private target digest is vault-local integrity metadata only. Its non-vault projection is a bodyless
    receipt without excerpt, offset, locator, attempt reference, digest or identifier and cannot enter shared
    graph, analytics, logs, cache index, cross-user or Portable Core content-bearing projection.
14. `CueExposureEvent` reuses the canonical Assistance/Exposure ledger; no parallel cue ledger is allowed.
15. The closed timing/classification map permits only `LOW` or `MATERIAL` for `BEFORE_RESPONSE`;
    `BEFORE_RESPONSE + NONE` is invalid.
16. `NONE` means the attempt has no pre-response cue. Any pre-response event makes independent retrieval,
    far transfer and stable D+7 ineligible for the whole attempt; later events cannot restore independence.
    Cue absence preserves eligibility only and never creates positive evidence. Independent retrieval requires
    an actual submitted-and-evaluated canonical response; far transfer additionally requires a distinct eligible
    non-same-representation task and evaluated result; stable D+7 requires an actually completed D+7 evaluation,
    cue `HIDDEN` with all-surface byte absence, non-same representation and zero unresolved scoring conflicts.
    Before any of those credits, canonical history must supply `preResponseCueExposureCount` as an exact
    nonnegative safe integer with authoritative, non-ambiguous, non-conflicting, fresh, non-client-inferred state.
    Exactly zero preserves eligibility only; a positive count denies all three credits, while missing or invalid
    counts fail closed. Any far-transfer or D+7 count copy must match that history exactly. Zero alone creates no
    affirmative evidence.
17. Timing and classification derive from the canonical Assistance/Exposure ledger, while attempt state
    derives only from the canonical server attempt ledger; untrusted client state is rejected.
18. Every render-capable `BEFORE_RESPONSE` validator, including the separate exposure-event validator,
    delegates to the same `EXACT_PRE_RESPONSE_RENDER_GATE_V1`; alternate routing and weaker duplicate
    policies cannot authorize bytes. That gate requires one non-null exact attempt and learner scope resolving
    through the canonical server attempt ledger to exactly one `INDEPENDENT_ATTEMPT_OPEN` record.
19. The shared gate requires one active deliberate server-recorded single-use confirmation bound exactly to
    learner, attempt, cue, cue revision and one request.
20. Client booleans and preselected consent are insufficient. Missing, cancelled, stale, replayed,
    mismatched or ambiguous confirmations fail closed with no cue bytes.
21. Confirmation consumption, exposure record, `ASSISTED` transition and independent-evidence invalidation
    commit in that exact all-or-nothing order before any cue byte renders.
22. Missing, empty, unknown, ambiguous, cross-learner, cross-attempt, submitted, closed, stale, cancelled,
    replayed, mismatched or client-inferred pre-response references, partial commit, inconsistent ledger state,
    record failure and render/submit race roll back and render no cue bytes. A canonical
    submitted response permits `AFTER_RESPONSE` only. `AFTER_RESPONSE` requires a non-null exact `attemptId`
    resolving through the canonical server ledger to that exact submitted learner attempt. Missing, empty,
    unknown, cross-learner, cross-attempt, mismatched, replayed, pre-submission, client-supplied or latest-inferred
    references fail closed with no cue bytes. Only evidence-neutral `REVIEW_ONLY` may remain attempt-unbound,
    and both render paths delegate to `CANONICAL_REVIEW_ONLY_RENDER_GATE_V1`. Caller labels,
    `canonicalExposureRecordCommitted` booleans, client events and inferred timing do not authorize it. A trusted
    server resolver must prove one exact canonical timing/classification plus committed exposure bound to learner,
    attempt scope, cue, cue revision and request, while the canonical attempt ledger independently proves zero
    matching open independent attempts. Missing, ambiguous, conflicting, cross-learner, stale, client-inferred
    resolution or any matching open attempt fails closed with no cue bytes.
    Independently, every render-capable exposure-event timing requires
    `canonicalRecordCommitted === true`; truthy strings/numbers and every missing, null, false, object, array,
    ambiguous or inferred value fail closed, including on `AFTER_RESPONSE` and `REVIEW_ONLY`.
23. Any decomposition displayed before a response is assistance/exposure.
24. The default collapsed surface exposes only `formalTerm` unless rules 18–22 have passed.
25. `HIDDEN` forbids cue bytes in DOM, SSR, accessibility text, prefetch, cache and direct API output.
26. D+7 stable and timed evidence require cue `HIDDEN` and a non-same representation.
27. Same-cue repetition is not far transfer.
28. Memory Post-it expanded-card maximum is one.
29. Semantic highlights require `ALL_OF`: a non-empty visible text label and a valid computed accessible
    name. Visible text may supply that name, so a redundant `aria-label` is not required.
30. Semantic highlights have closed roles and maximum three primary highlights.
31. Every semantic highlight binds a revision-bound typed anchor and target digest.
32. Color alone never carries meaning.
33. Shared cues attach only to owned, licensed or item-permitted official material.
34. Personal raw annotation bodies remain in Personal Raw Vault and are unconditionally ineligible for
    direct training; consent, opt-in, contract, administrator choice and future O5 cannot override this.
35. Rename, alias or relabel cannot erase raw-body origin or directly promote that body to Cleared Content.
36. Only a separate non-reconstructive signal or separately authored, rights-reviewed Cleared Content Bank
    object may be a future candidate; contribution, promotion and O5 remain three distinct gates. Each future
    approval requires its own independently resolved receipt bound to exact signal, revision, purpose and O5 scope;
    global booleans, cross-candidate/revision/purpose/scope, missing, ambiguous, replayed, stale, revoked or unresolved
    receipts cannot authorize a candidate, and all canonical authorization flags remain false. Even a structurally
    valid candidate-bound mock/future receipt set proves only the future binding contract: it cannot authorize
    current training, offline training or any other current use; `currentlyAuthorized` remains exactly false and
    future activation requires a separately authorized canonical-boundary change. A signal also
    requires `containsRawAnnotationBody`, `containsRawBodyPointer`, `containsExcerptOrFreeText`, `reconstructive`
    and `reconstructiveDerivativeOfRawBody` to be explicitly present on the same validated candidate object,
    primitive boolean and exactly false. Missing, undefined, null, non-boolean, true, ambiguous, cross-object or
    unvalidated values fail closed; the canonical closed signal-schema validator must bind proof to the exact
    signal/revision and client assertions are rejected. Absence of evidence is not content-safety evidence. A signal further
    requires active exact-purpose consent and active finite purpose-scoped retention bound to exact signal,
    revision, purpose and O5 scope. Both expiries are compared at each decision with an exact trusted server-clock
    instant and must be strictly later; caller/candidate/client time, a fixed date, missing or invalid time, and the
    at/after-expiry boundary fail closed. Generic opt-in, contract, administrator choice or O5 cannot substitute;
    missing, mismatched, expired, revoked, indefinite or cross-purpose records fail closed. Raw bodies, raw
    pointers and reconstructive derivatives cannot be renamed, aliased or relabeled into signals.
37. MCAL-2 requires CPF-2A closure and an approved bodyless exposure path.
38. Personal editor is blocked pending CPF, privacy, retention, export/delete, schema/RLS/Storage and hostile runtime gates.
39. Portable Core reuses interfaces only; terminology, definitions, rights and reviews stay profile-owned.
40. MCAL cannot create a fourth Today primary task.
41. MCAL-1 through MCAL-4 remain unauthorized.
42. Every authorization flag and current-use training authorization is exactly boolean false; no fixture,
    hypothetical context or mock receipt can override it, and every hard-gate ceiling is zero.

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
- an exposure event renders when `canonicalRecordCommitted` is missing, null, false, a string such as
  `"true"`/`"false"`, a number, object, array, ambiguous or inferred value;
- a cue ledger is created separately from the canonical Assistance/Exposure ledger;
- `BEFORE_RESPONSE` is paired with `NONE`;
- a later event restores independent evidence after any pre-response event;
- an empty event list, cue absence or an `AFTER_RESPONSE`-only sequence creates positive learning evidence;
- an independent response lacks an actual canonical submission or completed evaluation;
- far transfer lacks a distinct eligible non-same-representation task, independent submission or evaluated result;
- D+7 evidence lacks a completed canonical D+7 evaluation, hidden all-surface cue bytes or conflict-free score;
- missing exposure history/record, failed render, partial commit or ambiguity still creates positive evidence;
- canonical history omits `preResponseCueExposureCount` or supplies a boolean, string, fraction, negative,
  NaN, infinite, unsafe, object, array, ambiguous, conflicting, stale or client-inferred count;
- a positive pre-response count receives independent retrieval, far-transfer or stable-D+7 credit, or exact
  zero creates affirmative evidence without the separate response/transfer/D+7 records;
- an `ASSISTED` attempt receives independent retrieval, far-transfer or stable-D+7 evidence;
- timing/classification comes from untrusted client input;
- a caller label, `canonicalExposureRecordCommitted` boolean, client event or inferred timing selects
  `REVIEW_ONLY` without trusted canonical resolution;
- the request or alternate exposure-event path renders `REVIEW_ONLY` while a matching canonical open independent
  attempt exists;
- attempt state comes from client input instead of the canonical server attempt ledger;
- `BEFORE_RESPONSE` is requested without canonical `INDEPENDENT_ATTEMPT_OPEN`;
- the separate event validator or an alternate render route authorizes `BEFORE_RESPONSE` without the exact
  shared gate;
- a non-empty attempt ID, canonical-record boolean or client/latest-attempt inference authorizes cue bytes;
- a pre-response reference is missing, empty, unknown, ambiguous, cross-learner, cross-attempt, submitted,
  closed, stale, cancelled, replayed or mismatched;
- confirmation is missing, cancelled, stale, replayed, mismatched, ambiguous, a client boolean or preselected;
- cue bytes render before confirmation consumption, exposure, `ASSISTED` and evidence-invalidation commits all succeed;
- partial commit, record failure or render/submit race still renders cue bytes;
- an already submitted attempt is treated as `BEFORE_RESPONSE`;
- `AFTER_RESPONSE` omits `attemptId`, uses client/latest inference, or resolves an unknown, cross-learner,
  cross-attempt, mismatched, replayed or pre-submission attempt reference;
- an attempt-unbound variant other than evidence-neutral `REVIEW_ONLY` renders cue bytes;
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
- a private anchor uses a missing, whitespace, malformed or wrong-type owner/vault reference, caller equality,
  or an unresolved, foreign-owner, cross-learner, cross-tenant, ambiguous, conflicting, stale, replayed,
  client-inferred or non-authoritative owner-boundary result;
- any declared anchor required binding is omitted, null, empty, malformed, wrong-type, ambiguous or inconsistent;
- private excerpt, offset, locator, attempt reference, digest or identifier in a bodyless receipt;
- personal free text in logs, analytics, issue artifacts or training;
- learner opt-in, consent, contract, administrator choice or O5 used to train a raw annotation body;
- a raw annotation body renamed, aliased or directly promoted as Cleared Content;
- a reconstructive signal admitted as non-reconstructive;
- any one of the five signal content-safety fields is omitted, undefined, null, non-boolean or true;
- signal safety proof is ambiguous, taken from another object, or not closed-schema validated;
- a raw pointer or reconstructive derivative renamed, aliased or relabeled as a signal;
- signal consent or retention is missing, generic, mismatched, expired, revoked, indefinite or cross-purpose;
- consent or retention expiry is checked against a fixed/caller time, or is at/before trusted decision time;
- trusted decision time is caller-controlled, missing, invalid, ambiguous or outside the server clock boundary;
- O5, contract, administrator choice or generic opt-in substitutes for exact-purpose consent or finite retention;
- contribution, promotion or O5 treated as interchangeable gates;
- contribution, promotion or O5 uses a global boolean or a missing, mismatched, cross-bound, ambiguous, replayed,
  stale, revoked or independently unresolved approval receipt;
- a structurally valid mock/future receipt set changes any canonical authorization flag or makes
  `currentlyAuthorized` true;
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
- Focused behavioral contract suite: 28/28 passed.
- Strict JSON parse, balanced Markdown fences, cross-artifact assertions and `git diff --check`: passed.
- Typecheck: passed.
- Lint: passed with 0 errors and 9 pre-existing warnings outside the MCAL diff.
- Full Node test suite: 1,232/1,232 passed.
- Production build: passed on repository-standard Node 22 with a workspace-only shim for the unavailable
  host memory-metrics syscall; exact-head GitHub and Vercel builds remain required without that shim.

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
