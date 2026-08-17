# C2R-C-T Structural Theory-Proof Validation

This is the bounded validation and rollback plan for the structurally distinct
C2R-C-T candidate. Live GitHub state is authoritative; this document is not a
delivery trust root or a substitute for exact-head checks and review.

## Local Windows gate

Use `npm.cmd` and run:

- `node scripts/run-node-tests.mjs tests/wcv-c2r-theory-target-scope-validator.test.mjs tests/c2r-c-t-theory-runtime-contract.test.mjs tests/c2r-c-t-theory-authority.test.mjs tests/c2r-c-p-practice-structured-proof.test.mjs tests/c2r-c-p-practice-runtime-contract.test.mjs tests/agent-factory-runtime-gate.test.mjs`
- `npm.cmd test`
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`
- `git diff --check`

The focused suite must prove exact target scope, explicit assertion polarity,
same-target aggregation, isolated counterexamples, unresolved anaphora,
unscoped assertions, closed overflow, exact source/anchor/validator identity,
nested duplicate and unknown-field rejection, server-created confirmation
time, CAS and replay, and the five direct Theory regression rows. Free-form
text is candidate diagnosis only and cannot create canonical verified proof.

## Runtime gate

`C2R-C-T Theory Trusted Repair Runtime` runs on the exact PR head. It uses
synthetic identities and bodies with two sequential disposable local Supabase
stacks and verifies browser → Next → PostgREST/PostgreSQL across 390, 768 and
1440 pixel widths and all five input modes. It must demonstrate forced RLS,
cross-user and private-body denial, exact structured confirmation, bounded
partial retry, idempotent duplicate replay, CAS conflict, restart recovery,
default-off subject-exact access, no provider traffic and metadata-only
evidence cleanup.

The required generic `runtime-gate` selects the exact C2R-C-T forward migration
adapter for this change set. It first installs the C2R-C-P prerequisite and
then the Theory delta in an isolated PostgreSQL 15 container. It proves that
Practice remains valid while Theory gains subject-exact forced-RLS,
service-only RPC, structured proof, replay and stale-version protection.

## Metamorphic invariants

1. Free-form reconstruction alone cannot create canonical `verified`.
2. Only an exact target-scoped `TheoryPredicateClaimV1` can pass.
3. A negated required predicate cannot pass.
4. Same-target mixed polarity fails closed as `AMBIGUOUS`.
5. Cross-target evidence cannot satisfy the target.
6. A distinct declared counterexample does not contaminate target proof.
7. Unresolved anaphora, unscoped claims and overflow cannot pass.
8. Forbidden positive or mixed-polarity evidence remains release-blocking.
9. Client-supplied `verified`, `PASS`, mastery and transfer fields fail input.
10. Practice behavior, Owner access, RLS, evidence and rollback stay exact.

## Merge and rollback

Merge requires every pinned ruleset check plus the dedicated Theory runtime
check, a fresh exact-head review with P0/P1/P2 `0/0/0`, corrected-thread
resolution, unchanged expected head and squash-only merge. Rollback keeps
`WCV_C2R_C_T_THEORY_ENABLED=false` without disabling Practice. No remote
schema drop, record deletion, Production mutation or destructive rollback is
authorized.
