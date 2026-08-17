# C2R-C-P Structural Practice-Proof Validation

This is the bounded validation and rollback plan for the structurally distinct
C2R-C-P candidate. Live GitHub state is authoritative; this document is not a
delivery trust root or a substitute for exact-head checks and review.

## Local Windows gate

Use `npm.cmd` and run:

- `node scripts/run-node-tests.mjs tests/c2r-c-p-practice-structured-proof.test.mjs tests/c2r-c-p-practice-runtime-contract.test.mjs tests/c2r-c-p-practice-authority.test.mjs tests/agent-factory-runtime-gate.test.mjs`
- `npm.cmd test`
- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd run build`
- `git diff --check`

The focused suite must prove the exact closed schema; nested duplicate and
unknown field rejection; server-created confirmation time; source/anchor/
validator drift; CAS and replay; the full PR #745–#755 hostile language
matrix; exact structured-field mutation; and the invariant that arbitrary
free-form formatting, wrappers, signs, denials and negation never create or
change canonical verified proof.

## Runtime gate

`C2R-C-P Practice Trusted Repair Runtime` runs on the exact PR head. It uses
synthetic identities and bodies with two sequential disposable local Supabase
stacks and verifies browser → Next → PostgREST/PostgreSQL across 390, 768 and
1440 pixel widths and all five input modes. It must demonstrate forced RLS,
cross-user denial, private-body denial, exact structured confirmation,
idempotent duplicate replay, CAS conflict, restart recovery, default-off
access, no provider traffic and metadata-only evidence cleanup.

The required generic `runtime-gate` selects only the exact structural migration
adapter for this change set. It runs an isolated PostgreSQL 15 container and
proves forced RLS, direct authenticated-access denial, service-only RPCs,
atomic exposure/state persistence, structured proof in private session state,
replay and stale-version rejection.

## Metamorphic invariants

1. Free-form reconstruction alone cannot create canonical `verified`.
2. The exact server-built `PracticeCalculationClaimV2` passes.
3. Every proof-obligation field mutation fails closed.
4. Display formatting does not change a structured outcome.
5. Korean wording, wrapper and punctuation variation cannot change proof.
6. Extraction absence or ambiguity cannot silently become confirmation.
7. Client-supplied `verified`, `PASS`, mastery and transfer fields fail input.
8. Malformed, duplicate, unknown or contradictory closed objects fail.
9. Same-session verification creates no mastery, stability or transfer.
10. Owner access, rights, RLS, runtime, evidence and rollback remain exact.

## Merge and rollback

Merge requires all nine pinned ruleset checks plus the dedicated runtime check,
a fresh exact-head review with P0/P1/P2 `0/0/0`, corrected-thread resolution,
unchanged expected head and squash-only merge. Rollback keeps
`WCV_C2R_C_P_PRACTICE_ENABLED=false`; no remote schema drop, record deletion,
Production mutation or destructive rollback is authorized.
