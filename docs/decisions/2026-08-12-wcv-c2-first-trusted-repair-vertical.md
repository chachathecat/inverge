# 2026-08-12 WCV-C2 First Trusted Repair Vertical

## Decision

Implement Issues #702–#705 as one default-OFF, Owner/test-only, synthetic
three-subject repair vertical. The single rollback unit includes the contract,
rights-safe fixtures, server-owned state machine, isolated persistence and RLS,
service-only repository, API, learner UI, focused hostile tests, and the exact-
head local Supabase/browser runtime gate.

The server flag is `WCV_C2_TRUSTED_REPAIR_ENABLED`. Only the exact string
`true` can pass the flag gate, and authenticated Owner/test identity is still
required. No Preview, Production, remote Supabase, real learner, or provider
activation is authorized.

## Learner outcome

The supported flow is:

1. choose one rights-safe canonical synthetic fixture;
2. edit and confirm a capture draft as an immutable revision;
3. view stable semantic anchors;
4. commit a prediction, an independent attempt, and a self-diagnosis;
5. receive up to three evidence-bound gaps with one deterministic primary gap;
6. atomically commit an exposure before receiving one bounded scaffold;
7. reconstruct and submit one repair;
8. choose verify-and-continue, defer, or guided mode;
9. when verification is honestly `partial`, append at most one immediate
   same-session repair retry against the unchanged revision and primary gap;
10. after a second `partial`, keep defer and guided mode available without
    clearing the session; and
11. recover the canonical state after refresh, another browser, or a Next
   process restart.

A successful result is same-session criterion evidence only. It is not
mastery, transfer, stability, gap elimination, score improvement, or pass
evidence.

Required semantic concepts count only from a clean positive aggregate.
Negated and antonym forms such as `합리적이지 않다`, `가능하지 않다`,
`비합리적`, and `불가능` do not satisfy their positive concepts; materially
ambiguous polarity fails closed. Canonical required concepts, acceptable
alternatives, and forbidden false claims all use the same bounded deterministic
assertion-state evaluator. Nonnumeric concepts must be complete semantic
tokens, valid Korean inflections, or explicit measurement/unit attachments;
arbitrary lexical substrings do not count.

Every occurrence is retained before reduction. The evaluator derives a capped
local Korean subject/scope key from `은`, `는`, `이`, or `가`, strips bounded
discourse connectors, and resolves `이는`, `그것은`, `해당 이용은`, and
`본건은` to the nearest preceding explicit non-anaphoric scope. Conflicting
polarity in one clause or across sentences for the same explicit target is
`ambiguous`; anaphoric and unscoped contradictions fail closed. A clearly
distinct explicit counterexample such as a `반례`, `다른`, `비교대상`, or
`대안` scope does not erase a clean target-positive assertion. Merely writing
the word `반례` cannot give the same target a distinct scope. No external NLP,
model, embedding, or provider call is used.

The 12,000-character accepted input is scanned completely. No clause or
per-clause occurrence is silently truncated: the clause 64/65 boundary and
occurrence 32/33 boundary retain late same-target negation, ambiguity, and
positive forbidden claims. Every retained semantic budget therefore either
completes its scan or fails closed; omitted late evidence can never produce a
verified result.

An alternative counts only when its aggregate is positive and satisfies only
its explicitly mapped required concepts. A forbidden claim blocks whenever
any positive occurrence exists, including when a same-target negation or
uncertainty makes the public aggregate `ambiguous`; appended contradictory
wording cannot neutralize the false claim. Pure negated and pure ambiguous
forbidden mentions remain nonblocking diagnostic metadata, and contradictory
positive evidence has its own diagnostic reason.
The binding versions are
`wcv_c2_rights_safe_fixtures.2026-08-12.v2` and
`wcv_c2_semantic_anchor_rubric.v2`.

## Rights and source boundary

The repository contains 21 Inverge-original synthetic fixtures: seven per
subject across canonical, near-miss, counterexample, flip-condition, two
sealed future variants, and timed integration. Only the three canonical
Learning fixtures are executable in C2. The 18 Gold items are regression
candidates and remain `REGRESSION_CANDIDATE_NOT_OWNER_REVIEWED`.

Academy, textbook, mock-exam, lecture, learner-private, and rights-unknown
content is rejected. Raw-body training, reconstruction of denied sources,
near copies, sharing, self-publication, and self-promotion are prohibited.

The existing Law registry does not provide a verified current-law binding for
the selected source and anchor. Therefore the Law walkthrough remains
`blocked`, with zero verified release. This PR does not invent a source,
version, effective date, or currentness claim.

For a real Law binding, release-facing source and version status each reduce
the source record and the exact selected anchor with the fail-closed order
`blocked` > `unresolved_conflict` > `needs_official_verification` >
`verified`; an incompatible synthetic status blocks. Diagnosis and
continuation share one release predicate requiring both effective statuses to
be `verified`, current Law to be verified, the exact fixture anchor identity,
and zero referenced open blocking blockers. Resolved and warning blocker IDs
remain provenance and do not bypass any of those gates. The resulting
effective statuses and anchor identity remain in the source-version
fingerprint, so an anchor-state change invalidates an old session.

## Storage and authority

The canonical session table is bodyless. Learner bodies live only in an
append-only private-artifact table. Assistance lives in an append-only,
bodyless exposure table. Authenticated clients can read only their bodyless
session row and cannot directly mutate canonical state, private artifacts,
exposure effects, or RPCs. The server authenticates first and then uses an
exact-user, exact-session-kind service repository with CAS and idempotency
receipts. There is no user-client fallback.

The retry limit is reconstructed from append-only `repair_submission`
artifacts rather than client state. The first failed repair and its bounded
retry remain distinct artifacts; replay cannot duplicate either one. The
server evaluates the latest eligible artifact only against the same current
source binding, confirmed revision, and primary gap. `partial`, retry, defer,
or guided transitions create no mastery, transfer, stability, score, pass, or
independent-success evidence.

The API returns explicit allowlisted DTOs. It never returns stored private
artifact bodies, hidden references, checksums, policy secrets, credentials,
or provider payloads. A scaffold is assembled only after the corresponding
exposure transaction commits; a failed exposure returns zero help bytes.

## Validation and rollback

The dedicated `wcv-c2-trusted-repair-runtime` check is a read-only, secret-free
`pull_request` workflow for both same-repository and fork pull requests. It
checks out the exact pull-request head on a GitHub-hosted ephemeral runner;
`pull_request_target` and write-capable authority are prohibited. The check
protects the exact C2 migration, exact Law registry, and the three exact
shared-shell integration paths (`app/app/layout.tsx`,
`components/review-os/app-shell.tsx`, and
`components/learner/learner-ui.tsx`); every delegated path is machine-bound to
the literal workflow trigger. The check
applies both C2 migrations to a fresh isolated runner-local Supabase stack
twice. Its full pass exercises two Auth identities, grants and forced RLS,
direct CRUD/RPC denial, tenant isolation, CAS, replay, exposure atomicity, all
subjects, all input modes, 390/768/1440 widths, 200% reflow, keyboard
completion, Axe serious/critical zero, bounded partial retry,
cross-sentence same-target Theory conflict → `partial` → clean retry
verification, refresh/new-browser/process-restart recovery, and zero
live-provider browser requests. Published evidence is metadata-only.

Rollback is forward disable first: keep
`WCV_C2_TRUSTED_REPAIR_ENABLED` absent or false. The migration is applied only
to fresh ephemeral local databases in this Work. Reverting the source and
migration in another fresh isolated environment is the destructive rollback
test boundary; no remote rollback is authorized. Fixture and rubric bindings
remain semantic v2. This correction changes no learner state, API, server, Law
source or behavior, database, migration, schema, provider, or Production
activation.

## Resulting-on-merge authority

On merge, WCV-C2 is completed and WCV-C3 / Issue #706 becomes the sole next
implementation campaign and lead. Issue #714 remains open; only its exact
eight C2 allocations are evidence-mapped. C3, C4, and C6 allocations remain
open. O4W remains queued and unapproved; CPF-1 and S236P remain blocked; V13
remains the sole active master and WCV `1.0.8` remains subordinate.
