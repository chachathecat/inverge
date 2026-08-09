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

Machine contract version: `1.0.21`.

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
    Anchor ambiguity/conflict metadata is also closed: `requiredBindingsAmbiguous` must be exact primitive
    `false`, while `conflictingRequiredBindings` must be an exact empty array. Missing, malformed or wrong-type
    state, genuine ambiguity and non-empty conflicts reject.
    `OFFICIAL_PERMITTED_RANGE.itemRightsManifestId` is an exact trimmed primitive string in the closed `irm_`
    format. One separate authoritative item-rights resolution must bind that ID and the anchor's kind, domain,
    target type, general rights manifest and exact target revision. A bare truthy ID, caller equality, fallback,
    unresolved, ambiguous, conflicting, stale, replayed, cross-revision or client-inferred binding rejects.
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
15. The cue-render request and exposure-event validators use the same closed timing/classification map.
    It permits only `LOW` or `MATERIAL` for `BEFORE_RESPONSE`; a request with the classification omitted
    or set to `NONE` is invalid. A submitted-attempt `AFTER_RESPONSE` request must likewise provide one of
    its mapped `NONE`, `LOW` or `MATERIAL` values before success; omission and arbitrary values reject.
16. `NONE` means the attempt has no pre-response cue. Any pre-response event makes independent retrieval,
    far transfer and stable D+7 ineligible for the whole attempt; later events cannot restore independence.
    Cue absence preserves eligibility only and never creates positive evidence. Independent retrieval requires
    an actual submitted-and-evaluated canonical response; far transfer additionally requires a distinct eligible
    non-same-representation task and evaluated result; stable D+7 requires an actually completed D+7 evaluation,
    cue `HIDDEN` with all-surface byte absence, non-same representation and zero unresolved scoring conflicts.
    Before any credit, base canonical history must carry exact valid non-null attempt and learner IDs bound to the
    evaluated attempt. Far-transfer and D+7 each require a separate canonical history bound respectively to
    `transferAttemptId` or `d7AttemptId` and the authenticated learner scope; source-attempt history and an unbound
    copied count cannot substitute. Every applicable history is independently authoritative, complete, single-record,
    non-ambiguous, non-conflicting, fresh, non-replayed, non-client-inferred and non-caller-paired, and carries its own
    exact nonnegative-safe-integer `preResponseCueExposureCount`. Exactly zero preserves eligibility only; a positive
    count or invalid/cross-bound history denies the affected credit. Zero alone creates no affirmative evidence.
    Before those checks can grant credit, base `evidence.attempt` itself must be a closed canonical server-ledger record
    with exact attempt, learner and submission IDs plus canonical `submittedAt`: server-side, authoritative,
    independently-resolved, known and resolved are exact true; ambiguous, conflicting, mismatched, stale and
    client/caller-inferred are exact false; and `matchingRecordCount` is exactly one. A base-specific safe-state gate also
    requires `crossLearner`, `crossAttempt`, `replayed` and `cancelled` to exist as exact primitive false without
    expanding the shared generic resolution helper or changing review-only absence semantics. Missing, malformed, wrong-type, opposite
    state, zero-record or multi-record attempts fail closed before independent retrieval and deny dependent far-transfer
    and stable-D+7 credit.
    Far transfer additionally resolves the source attempt's closed `taskBinding` from the canonical server attempt-task
    binding resolver as exactly one fresh, non-inferred, non-ambiguous, non-conflicting, non-mismatched record bound to
    the same attempt and learner. It separately resolves the actual `transferAttemptId` to exactly one submitted
    canonical transfer attempt and its independently resolved task binding from the same authoritative server ledgers.
    That transfer attempt and binding must bind exactly to the transfer record's attempt ID and authenticated learner,
    and a source attempt or source binding cannot substitute for either transfer record. The supplied `originTaskId`
    must equal the canonical source `taskId`; the supplied `transferTaskId` must equal the canonical transfer `taskId`;
    and those two canonical task identities must differ by exact field-for-field comparison without trimming,
    case-folding, aliases, inference or normalization. Merely supplying two different task IDs is insufficient, as are
    `distinctEligibleTask: true` and `NON_SAME_REPRESENTATION`. Missing, malformed, wrong-source, extra-field,
    ambiguous, conflicting, stale, inferred, mismatched, cross-attempt, cross-learner, unresolved, zero-record or
    multi-record transfer-attempt/task bindings deny far-transfer only and preserve otherwise valid independent
    retrieval and stable D+7.
    Independently of evaluation ordering, the canonical transfer attempt's `submittedAt` must be at or after the
    canonical base/source attempt's `submittedAt`. Only those two trusted canonical attempt-record timestamps may
    satisfy the comparison; one millisecond before rejects far-transfer, equality and later pass, and outer/caller
    source or transfer timestamps cannot substitute. This failure preserves otherwise valid independent retrieval
    and stable D+7.
    Independent retrieval resolves a candidate-owned closed `canonicalResponseEvaluation` that is single,
    authoritative, server-side, independently resolved, known, resolved and fresh, with every unsafe state exact false.
    It binds to the base attempt's exact attempt, learner and submission IDs and the candidate evaluation ID; caller
    source labels or outer success flags cannot substitute. Invalid response resolution denies its dependent transfer
    and D+7 credits. Far transfer independently resolves an equivalent closed `canonicalTransferEvaluation` bound to
    the source and transfer attempts plus learner, submission, evaluation, result and task IDs; its failure denies only
    far-transfer. Stable D+7 resolves one canonical source attempt from `evidence.attempt` and a separate candidate-owned
    closed `canonicalD7Evaluation`.
    Each canonical evaluation completion must be at or after its own bound canonical submission: response uses the base
    attempt, transfer uses the canonical transfer attempt and D+7 uses the canonical D+7 attempt. Both values are exact
    RFC3339 UTC millisecond fields from those records; one millisecond before rejects, equality and later completion pass,
    and outer/caller timestamp substitution cannot satisfy the ordering gate. Response failure denies all dependent
    credits, while transfer and D+7 ordering failures remain isolated to their own credits.
    The actual D+7 candidate also carries one separately resolved authoritative `canonicalD7Attempt` bound exactly to
    `d7AttemptId`, authenticated learner scope, submission ID and canonical `submittedAt`, distinct from the base/source attempt, exactly `SUBMITTED` and
    `INDEPENDENT`, with known/resolved exact true and ambiguous, conflicting, cross-learner, cross-attempt, mismatched,
    stale, replayed, cancelled and client/caller-inferred exact false. Missing, malformed, wrong-source, zero/multiple,
    foreign, reused, unsubmitted, assisted or unsafe resolution denies stable D+7 only and preserves otherwise valid
    independent retrieval and far transfer; outer claims and the base attempt cannot substitute.
    That canonical D+7 attempt's `submittedAt` must also be at or after the canonical base/source attempt's
    `submittedAt`. Only those two trusted canonical attempt-record timestamps may satisfy the comparison; one
    millisecond before rejects stable D+7, equality and later pass, and outer/caller source or D+7 timestamps cannot
    substitute. This failure preserves otherwise valid independent retrieval and far-transfer credit.
    The interval uses only the bound source attempt's canonical `submittedAt` and the bound
    `canonicalD7Evaluation.d7EvaluationCompletedAt`, both exact RFC3339 UTC millisecond instants, and requires at least
    604800000 ms. An outer or independently supplied timestamp, source label, timing label, caller elapsed value,
    missing/mismatched/malformed/unresolved provenance,
    non-UTC timestamp, reversal or shorter interval creates no credit.
    Exact false alone creates no evidence.
17. Timing and classification derive from the canonical Assistance/Exposure ledger, while attempt state
    derives only from the canonical server attempt ledger; untrusted client state is rejected.
18. Every render-capable `BEFORE_RESPONSE` validator, including the separate exposure-event validator,
    delegates to the same `EXACT_PRE_RESPONSE_RENDER_GATE_V1`; alternate routing and weaker duplicate
    policies cannot authorize bytes. That gate requires one non-null exact attempt and learner scope resolving
    through the canonical server attempt ledger to exactly one closed, authoritative, server-side, independently
    resolved `INDEPENDENT_ATTEMPT_OPEN` record. Extra fields, zero/multiple records and non-boolean resolution state fail.
    Its resolution and the `REVIEW_ONLY` nested open-attempt absence resolution each pass the same generic
    canonical-attempt-resolution state gate independently: `known === true`, `resolved === true`,
    `ambiguous === false`, `conflicting === false`, `stale === false` and `clientInferred === false` by exact
    primitive equality. Missing, defaulted, coerced or merely truthy state cannot satisfy that gate. Submitted
    attempts additionally use the stricter record-specific gate in rule 22; the generic state subset is not
    authoritative or sufficient for submitted rendering.
    The authenticated request-context learner scope, subject learner scope, canonical open-attempt learner scope
    and canonical confirmation learner scope are each independently validated against the same exact identifier
    schema and must all be field-for-field equal. Matching malformed values, a foreign learner shared by the
    subject/attempt/confirmation but not the authenticated context, client/caller aliases and inferred scope all
    reject across both render validators.
19. The shared gate requires one closed, single, authoritative, server-side, independently resolved, active deliberate
    server-recorded single-use confirmation bound exactly to learner, attempt, cue, cue revision and one request.
    known/resolved are exact true; ambiguous, conflicting, cross-learner, cross-attempt, mismatched, stale, replayed,
    cancelled and client/caller-inferred are exact false. Its `cancelled` field must be exact primitive `false`;
    missing, null, strings, numbers, objects, arrays, `true` and every other malformed value fail closed across
    both render-capable validators. Before equality comparison, `cueId`, `cueRevisionId` and `requestId` on both
    request and confirmation must independently pass the exact trimmed canonical identifier schema. Matching
    missing, null, wrong-type, empty, whitespace or malformed values cannot authorize reveal.
20. Client booleans, preselected consent, source labels and outer success state are insufficient. Missing, extra-field,
    wrong-source, zero/multiple, cancelled, stale, replayed, conflicting, inferred, mismatched or ambiguous confirmations
    fail closed with no cue bytes. The actual pre-response race state must also be exact primitive `false`.
21. Confirmation consumption, exposure record, `ASSISTED` transition and independent-evidence invalidation
    commit in that exact all-or-nothing order before any cue byte renders.
22. Missing, empty, unknown, unresolved, ambiguous, conflicting, cross-learner, cross-attempt, submitted, closed,
    stale, cancelled, replayed, mismatched or client-inferred pre-response references, partial commit, inconsistent ledger state,
    record failure and render/submit race roll back and render no cue bytes. A canonical
    submitted response permits `AFTER_RESPONSE` only. Request, exposure-event and optional bound-review consumers
    all delegate to `EXACT_CANONICAL_SUBMITTED_ATTEMPT_RESOLUTION_GATE_V1`. It accepts only one non-null, non-array,
    additional-field-free record from `CANONICAL_SERVER_ATTEMPT_LEDGER`, with count 1 and exact state `SUBMITTED`.
    `serverSide`, `authoritative`, `independentlyResolved`, `known`, `resolved`, `submitted` and
    `submittedBeforeExposure` are exact primitive true. `crossLearner`, `crossAttempt`, `mismatched`, `replayed`,
    `preSubmission`, `closed`, `stale`, `cancelled`, `ambiguous`, `conflicting`, `clientInferred` and
    `callerInferred` are exact primitive false. The request/event subject and canonical record each independently
    validate `attemptId` and `learnerPrivateScopeId` against the same exact trimmed canonical identifier schema
    before equality. Subject and record learner scope must both exactly match server-authenticated
    `authenticatedLearnerPrivateScopeId`; client/caller aliases cannot substitute. Matching missing, whitespace, malformed or
    wrong-type values cannot bind. Wrong source/state/count, extra fields, foreign IDs, untrusted booleans and outer
    source/state/success substitution fail closed with no cue bytes or positive learning evidence. Only
    evidence-neutral `REVIEW_ONLY` may remain attempt-unbound,
    and both render paths delegate to `CANONICAL_REVIEW_ONLY_RENDER_GATE_V1`. Caller labels,
    `canonicalExposureRecordCommitted` booleans, client events and inferred timing do not authorize it. A trusted
    server resolver must prove one exact canonical timing/classification plus committed exposure bound to learner,
    attempt scope, cue, cue revision and request, while the canonical attempt ledger independently proves zero
    matching open independent attempts. The outer resolution and nested zero-count absence result are independently
    non-null, non-array closed canonical records with no undeclared fields. The outer record requires its exact resolver,
    one authoritative/server-side/independently-resolved match and exact request/scope/timing/classification bindings.
    The nested record requires the exact server attempt resolver, exact open-independent query, the same learner-private
    and attempt scopes, and exactly zero matches. Safe states are exact primitive true and every declared ambiguity,
    conflict, cross-scope, mismatch, stale, replay, cancellation or client/caller inference state is exact primitive false.
    Missing, malformed, extra-field, non-boolean, unresolved, foreign-scope or nonzero records fail with no cue bytes.
    The authenticated request-context learner scope, subject learner scope, outer canonical review-only resolution
    learner scope and nested zero-match absence-record learner scope are each independently canonical identifiers and
    must all be field-for-field equal. Matching malformed scopes, a coordinated foreign learner that differs from the
    authenticated context, client/caller aliases and inferred scope reject across both render validators.
    For review-only identified by either outer timing or nested canonical timing, both validators require the actual
    subject's `renderSubmitRaceDetected === false` by exact primitive equality before routing or any other early return,
    and the shared review-only authorizer revalidates it. Missing, undefined, null, true, strings, numbers, objects,
    arrays, defaulting or coercion reject with no cue bytes; exact false preserves an otherwise valid review-only render.
    Before an exposure event can take that early `REVIEW_ONLY` route, it must independently carry exact canonical
    Assistance/Exposure-ledger provenance and `ordering === "ORDERED"`; omission, client provenance or ambiguous
    ordering rejects. The request validator remains free of those event-only fields.
    Independently, every render-capable request and exposure-event timing require
    `canonicalRecordCommitted === true`; truthy strings/numbers and every missing, null, false, object, array,
    ambiguous or inferred value fail closed, including on `AFTER_RESPONSE` and `REVIEW_ONLY`.
    `canonicalExposureRecordCommitted` and every alternate alias are ignored as commit evidence. Exact true
    satisfies only this prerequisite and bypasses no other gate.
23. Any decomposition displayed before a response is assistance/exposure.
24. The default collapsed surface exposes only `formalTerm` unless rules 18–22 have passed.
25. `HIDDEN` forbids cue bytes in DOM, SSR, accessibility text, prefetch, cache and direct API output.
26. D+7 stable and timed evidence require cue `HIDDEN`, a non-same representation and the trusted actual
    elapsed-interval proof defined in rule 16.
27. Same-cue repetition is not far transfer.
28. Memory Post-it expanded-card maximum is one.
29. Semantic highlights require three exact `ALL_OF` conditions on the same candidate: a non-empty visible
    text label, a valid computed accessible name and `colorOnlyMeaning` exactly primitive `false`. Missing or
    malformed candidate state, coercion, defaulting, inference or global `colorOnlyMeaningAllowed: false`
    cannot satisfy the third condition. Visible text may supply the computed name, so a redundant `aria-label`
    is not required.
30. Semantic highlights have closed roles and maximum three primary highlights.
31. Every semantic highlight binds a revision-bound typed anchor and target digest.
32. Color alone never carries meaning.
33. Shared cues attach only to owned, licensed or item-permitted official material.
34. Personal raw annotation bodies remain in Personal Raw Vault and are unconditionally ineligible for
    direct training; consent, opt-in, contract, administrator choice and future O5 cannot override this.
35. Rename, alias or relabel cannot erase raw-body origin or directly promote that body to Cleared Content.
36. Only a separate non-reconstructive signal or separately authored, rights-reviewed Cleared Content Bank
    object may be a future candidate; contribution, promotion and O5 remain three distinct gates. Each future
    approval requires its own independently resolved receipt bound to exact signal, revision, purpose and O5 scope.
    The receipt set is a closed object containing exactly contribution, promotion and O5 fields, and every receipt is a
    closed canonical record with exact kind-specific source, one match, a distinct canonical nonempty receipt ID and no
    undeclared fields. Server-side, authoritative, independently-resolved, known, resolved and active are exact true;
    ambiguity, conflict, replay, stale, revocation, client/caller inference and declared cross-scope states are exact false.
    Global booleans, duplicate IDs, cross-candidate/revision/purpose/scope, missing, extra, malformed, wrong-source,
    non-boolean or unresolved receipts make `hypotheticalReceiptsValid` and `currentlyAuthorized` false while preserving
    an otherwise safe candidate's eligibility. All canonical authorization flags remain false. Even a structurally
    valid candidate-bound mock/future receipt set proves only the future binding contract: it cannot authorize
    current training, offline training or any other current use; `currentlyAuthorized` remains exactly false and
    future activation requires a separately authorized canonical-boundary change. A signal also
    requires `containsRawAnnotationBody`, `containsRawBodyPointer`, `containsExcerptOrFreeText`, `reconstructive`
    and `reconstructiveDerivativeOfRawBody` to be explicitly present on the same validated candidate object,
    primitive boolean and exactly false. Missing, undefined, null, non-boolean, true, ambiguous, cross-object or
    unvalidated values fail closed; the canonical closed signal-schema validator must bind proof to the exact
    signal/revision and validate the actual candidate's exact top-level and nested field sets. Candidate-supplied
    `closedValueSchema`, safety booleans, source labels or proof markers are non-authoritative echoes. Eligibility also
    requires exactly one additional-field-free `CANONICAL_SIGNAL_ORIGIN_CONTENT_SAFETY_RESOLVER` decision-context
    record bound to exact signal, revision, purpose and O5 scope. It must resolve the separate non-reconstructive origin;
    server-side, authoritative, independently-resolved, known, resolved and separate-object states are exact true,
    while every raw/reconstructive/rename/direct-promotion, ambiguous, conflicting, mismatched, cross-bound, stale,
    replayed, cancelled and client/caller-inferred state is exact false. Missing, extra, wrong-source, non-single,
    foreign or unsafe resolution fails before eligibility. Undeclared raw-answer, free-text or reconstructive fields
    also fail closed. Client assertions are rejected. Absence of evidence is not content-safety evidence.
    A Cleared Content Bank candidate separately uses an identifier-only closed candidate schema. Caller-controlled
    authorship, rights, review or separate-object booleans, unknown fields and private-raw/free-text fields such as
    `rawAnswer` are rejected. Eligibility requires one additional-field-free closed canonical promotion/rights/
    provenance record bound field-for-field to the exact candidate, revision, purpose and O5 scope. Server-side,
    authoritative, independently-resolved, known and resolved are exact true; ambiguity, conflict, stale, replay,
    cancellation, mismatch, client/caller inference and every cross-bound state are exact false. The record must prove
    separate object identity, separate authorship, actual rights ownership, rights/provenance review and absence of
    personal/private raw content. Missing, malformed, extra, unsafe, inferred, mismatched, zero-record or multi-record
    provenance fails closed before hypothetical receipts; the valid separately authored and rights-owned candidate path
    remains available.
    A signal further requires separate closed canonical consent and retention decision-context records; candidate nested
    objects are non-authoritative echoes. Each record has an exact source and canonical ID, one match, server-side,
    authoritative, independently-resolved, known and resolved exact true, all unsafe/inferred/cross states exact false,
    exact signal/revision/purpose/O5 binding and field-for-field agreement with its candidate echo. Consent must be active
    and exact-purpose; retention must be active, finite and purpose-scoped. Expiry uses only their canonical `expiresAt`
    values and one closed trusted-clock record with exact source/ID/count, server-side, authoritative,
    independently-resolved, trusted, known and resolved true and every unsafe/inferred state false. Both expiries must be
    strictly later than its canonical `evaluatedAt`; caller/candidate/client time, a fixed date, missing, extra, unsafe or
    invalid canonical records and the at/after-expiry boundary fail closed. Generic opt-in, contract, administrator
    choice or O5 cannot substitute;
    `consent.expired`, `consent.revoked`, `retention.expired` and `retention.revoked` must each be exact primitive
    boolean false. Missing, undefined, null, true, strings, numbers, objects, arrays, mismatched, indefinite or
    cross-purpose records fail closed before candidate eligibility or hypothetical receipts. Exact false preserves
    eligibility only after every other gate passes and creates no consent, receipt or authorization. Raw bodies, raw
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
- D+7 candidate lacks one exact canonical D+7 attempt, reuses the base attempt, crosses scope, is unsubmitted/assisted,
  or carries any ambiguous, conflicting, mismatched, stale, replayed, cancelled or inferred resolution state;
- base `evidence.attempt` is missing, malformed, unresolved, ambiguous, conflicting, stale, client-inferred or does
  not resolve to exactly one canonical server attempt, yet independent retrieval or dependent transfer receives credit;
- base `evidence.attempt` omits or coerces `crossLearner`, `crossAttempt`, `replayed` or `cancelled`, or any is not exact
  primitive false, yet any positive credit is granted;
- D+7 relies on `D_PLUS_7` or a caller elapsed value without trusted source/evaluation timestamps proving at
  least 604800000 ms, accepts malformed, non-UTC, reversed or shorter timestamps, or trusts an independently
  supplied older source timestamp that is not bound to one resolved canonical source attempt;
- missing exposure history/record, failed render, partial commit or ambiguity still creates positive evidence;
- base exposure history omits attempt/learner identity or borrows a zero-count history from another attempt or learner;
- far-transfer or D+7 uses missing history, source-attempt history, foreign-attempt history or an unbound count copy;
- canonical history omits `preResponseCueExposureCount` or supplies a boolean, string, fraction, negative,
  NaN, infinite, unsafe, object, array, ambiguous, conflicting, stale, replayed, client-inferred or caller-paired state;
- a positive pre-response count receives independent retrieval, far-transfer or stable-D+7 credit, or exact
  zero creates affirmative evidence without the separate response/transfer/D+7 records;
- independent response, far-transfer or stable-D+7 omits `ambiguous` or supplies null, true, a string, number,
  object or array, or exact false alone creates affirmative evidence;
- an `ASSISTED` attempt receives independent retrieval, far-transfer or stable-D+7 evidence;
- timing/classification comes from untrusted client input;
- a `BEFORE_RESPONSE` request omits assistance classification or supplies `NONE` but still renders or records exposure;
- an `AFTER_RESPONSE` request omits assistance classification or supplies an arbitrary value but still renders;
- a caller label, `canonicalExposureRecordCommitted` boolean, client event or inferred timing selects
  `REVIEW_ONLY` without trusted canonical resolution;
- the request or alternate exposure-event path renders `REVIEW_ONLY` while a matching canonical open independent
  attempt exists;
- an outer- or nested-timing `REVIEW_ONLY` path reaches routing or another early return without the actual subject's
  exact primitive `renderSubmitRaceDetected: false`, or the shared authorizer does not revalidate it;
- attempt state comes from client input instead of the canonical server attempt ledger;
- `BEFORE_RESPONSE` is requested without canonical `INDEPENDENT_ATTEMPT_OPEN`;
- the separate event validator or an alternate render route authorizes `BEFORE_RESPONSE` without the exact
  shared gate;
- a non-empty attempt ID, canonical-record boolean or client/latest-attempt inference authorizes cue bytes;
- a pre-response reference is missing, empty, unknown, ambiguous, cross-learner, cross-attempt, submitted,
  closed, stale, cancelled, replayed or mismatched;
- a pre-response attempt resolution has `resolved !== true`, `conflicting !== false` or
  `clientInferred !== false` but either render validator still authorizes cue bytes;
- confirmation is missing, cancelled, stale, replayed, mismatched, ambiguous, a client boolean or preselected,
  its `cancelled` field is anything other than exact primitive `false`, or matching missing/malformed cue or
  request identifiers pass through equality;
- a confirmation explicitly carries `replayed: true` while `consumed: false` and `singleUse: true` but either
  render validator still treats it as a deliberate non-replayed override;
- any decisive confirmation/open-attempt/base-attempt/exposure-history/response-evaluation/transfer-evaluation/
  transfer-attempt/task-binding/D+7-attempt/D+7-evaluation record omits a required field, adds an undeclared field,
  uses a wrong source or zero/multiple count, supplies a non-boolean safe state, or carries conflicting, stale,
  replayed, cancelled, inferred, foreign or unbound identity state but still authorizes cue bytes or positive credit;
- an invalid canonical response evaluation preserves independent retrieval or unlocks dependent transfer/D+7 credit;
- an invalid canonical transfer evaluation weakens independent retrieval or stable D+7 instead of failing transfer only;
- a D+7 evaluation uses an outer/source-labeled completion time, an unbound evaluation ID or a substituted source
  attempt timestamp instead of its own bound canonical completion record, or its failure weakens other valid credits;
- cue bytes render before confirmation consumption, exposure, `ASSISTED` and evidence-invalidation commits all succeed;
- partial commit, record failure or render/submit race still renders cue bytes;
- an already submitted attempt is treated as `BEFORE_RESPONSE`;
- `AFTER_RESPONSE` or optional bound `REVIEW_ONLY` omits either identifier, accepts matching malformed identifiers,
  borrows another learner/attempt binding, uses client/latest/caller inference, accepts an open or additional-field
  record, or resolves a non-single, non-server-side, non-authoritative, dependently resolved, unknown, ambiguous,
  conflicting, cross-scope, mismatched, stale, replayed, cancelled, unresolved, pre-submission or caller-inferred
  canonical attempt while still rendering or creating positive learning evidence;
- request-side `AFTER_RESPONSE` accepts `canonicalExposureRecordCommitted: true` while
  `canonicalRecordCommitted` is missing, false or malformed;
- exposure-event `AFTER_RESPONSE` accepts `canonicalRecordCommitted: true` together with `recordFailure: true`;
- a `REVIEW_ONLY` request omits `canonicalRecordCommitted` or supplies a non-boolean/non-true value but still renders;
- a `REVIEW_ONLY` exposure event omits canonical provenance or exact ordering but reaches the shared gate and renders;
- an attempt-unbound variant other than evidence-neutral `REVIEW_ONLY` renders cue bytes;
- an outer canonical `REVIEW_ONLY` timing/classification resolution omits `resolved` or has `resolved !== true`
  while a valid nested open-attempt absence proof still authorizes cue bytes;
- a `REVIEW_ONLY` nested zero-count open-attempt absence resolution has `resolved !== true`,
  `conflicting !== false` or `clientInferred !== false` but is accepted as canonical proof;
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
- any declared anchor required binding is omitted, null, empty, malformed, wrong-type, ambiguous or inconsistent,
  or its ambiguity/conflict state is missing, wrong-type, malformed, genuinely ambiguous or non-empty;
- an official-permitted anchor uses a missing, empty, whitespace, malformed or wrong-type item manifest ID, a bare
  truthy ID, caller assertion, or an unresolved, ambiguous, conflicting, stale, replayed, cross-revision or
  client-inferred item-rights binding;
- private excerpt, offset, locator, attempt reference, digest or identifier in a bodyless receipt;
- personal free text in logs, analytics, issue artifacts or training;
- learner opt-in, consent, contract, administrator choice or O5 used to train a raw annotation body;
- a raw annotation body renamed, aliased or directly promoted as Cleared Content;
- a reconstructive signal admitted as non-reconstructive;
- a candidate-supplied closed-schema/proof marker substitutes for validation of the actual signal object, or an
  undeclared raw-answer, free-text, reconstructive or nested field reaches candidate eligibility;
- a Cleared Content Bank candidate supplies provenance booleans, an unknown/private-raw field, or a missing, extra,
  non-server-side, non-authoritative, independently-unresolved, caller-inferred, cross-bound, ambiguous, conflicting,
  stale, mismatched or non-single canonical promotion/rights/provenance record and still reaches candidate eligibility
  or hypothetical receipts;
- any one of the five signal content-safety fields is omitted, undefined, null, non-boolean or true;
- candidate safety booleans/source markers substitute for a missing, extra, non-server-side, non-authoritative,
  independently-unresolved, inferred, cross-bound or unsafe canonical origin/content-safety resolution;
- signal safety proof is ambiguous, taken from another object, or not closed-schema validated;
- a raw pointer or reconstructive derivative renamed, aliased or relabeled as a signal;
- signal consent or retention is missing, generic, mismatched, indefinite or cross-purpose, or any consent/retention
  `expired`/`revoked` field is missing, undefined, null, true, a string, number, object or array instead of exact false;
- a candidate-nested consent/retention object substitutes for a missing, extra, wrong-source, non-single,
  non-server-side, non-authoritative, independently-unresolved, inferred or foreign canonical decision-context record;
- consent or retention expiry is checked against a fixed/caller time, or is at/before trusted decision time;
- trusted decision time is caller-controlled, missing, extra, invalid, non-single, non-server-side, non-authoritative,
  independently-unresolved, inferred, ambiguous or outside the server clock boundary;
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
- semantic highlight whose own `colorOnlyMeaning` is missing or anything other than exact primitive `false`;
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

Cycle 3 source-only workspace evidence:

- JavaScript syntax check: passed.
- Focused behavioral contract suite: 62/62 passed.
- Strict JSON parse, balanced Markdown fences, cross-artifact assertions and `git diff --check`: passed.
- Mutation coverage rejects missing, malformed, foreign, aliased or inferred authenticated learner scope across
  pre-response and review-only request/event validators. Review-only independently binds authenticated, subject,
  outer canonical resolution and nested zero-match absence-record learner scopes.
- Canonical transfer and canonical D+7 attempts must each be at or after their canonical source attempt. Predating
  downstream attempts and outer/caller timestamp substitution reject only the affected far-transfer or stable-D+7
  credit; equality and later submissions pass and otherwise valid independent credits remain isolated.
- This materialized source-only workspace does not contain the repository dependency tree or the non-MCAL source
  files needed to rerun typecheck, lint, the full Node suite or production build before push. The cycle-3 base exact
  head `d9b9d00180e1ec7c714eab7b433a4f95a19c05d7` passed PR Contract, Fast CI, Full CI, Learner Loop Health,
  Risk Gate, Runtime Gate and Vercel deployment. Those base-head results do not substitute for the required seven
  exact-head gates on the cycle-3 corrective commit.

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
