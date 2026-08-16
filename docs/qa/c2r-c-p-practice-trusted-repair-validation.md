# C2R-C-P Practice Trusted Repair Validation

This is the bounded validation and rollback contract for the C2R-C-P
candidate. Live GitHub state is authoritative; this file does not reproduce
check records and is not an independent receipt.

## Merge gate

The candidate may merge only when the active `main-pr-only` ruleset accepts
the current PR head and every required GitHub-native check is green from its
pinned App source. The exact head must also have a fresh clean Codex review,
zero actionable P0/P1/P2 findings, and all actionable threads resolved.

Local Windows verification uses `npm.cmd` and must include:

- `npm.cmd run typecheck`
- `npm.cmd run lint`
- `npm.cmd test`
- `npm.cmd run build`
- `node scripts/run-node-tests.mjs tests/c2r-c-p-practice-trusted-repair.test.mjs tests/c2r-c-p-practice-runtime-contract.test.mjs tests/agent-factory-runtime-gate.test.mjs`

The complete database/browser acceptance requires Docker and therefore runs
on the exact PR head in GitHub-hosted Linux through
`C2R-C-P Practice Trusted Repair Runtime`. It creates two disposable local
Supabase stacks sequentially, uses only synthetic identities and bodies,
captures metadata-only evidence, stops all processes, removes containers,
volumes, networks and temporary workdirs, and rechecks the exact Git head and
unchanged dependency declarations.

The separately required `Runtime Gate` must select the exact C2R-C-P migration
adapter on every PR that changes the migration. It uses a disposable
network-isolated PostgreSQL 15 container and fails closed if any other
runtime-sensitive path is mixed into the unsupported change set.

## Acceptance assertions

The Practice unit suite binds the assigned matrix rows to:

| Assertion | Obligation |
|---|---|
| `C2R-C-P-R01` | migration is always runtime-gated; forced RLS, service-only mutation and atomic persistence remain exact |
| `C2R-C-P-R02` | larger numeric tokens cannot satisfy the exact relation by substring |
| `C2R-C-P-R04` | the newest level-three guided exposure is selected after oldest-first reload |
| `C2R-C-P-R06` | partial preserves session identity and permits only one immediate retry |
| `C2R-C-P-R08` | a fork PR cannot skip both generic and dedicated runtime evidence |
| `C2R-C-P-R09` | negated negative-sign language is nonblocking while asserted or mixed negative sign fails closed |
| `C2R-C-P-R10` | no semantic alternative group is declared without an exact binding; typed operand roles remain authoritative |
| `C2R-C-P-R11` | every shared shell integration path triggers browser/runtime evidence and remains Owner-only |
| `C2R-C-P-R12` | `원/년` is a bounded unit and `원인` cannot satisfy it |
| `C2R-C-P-R14` | checkout persists no GitHub credential before PR-controlled code runs |
| `C2R-C-P-R19` | disconnected numbers are `UNSUPPORTED` and cannot verify |

The exact-head browser suite additionally verifies one visible primary action,
keyboard-only operation, serious/critical axe count zero, 200% text zoom,
390/768/1440 widths, all five input modes, no provider-origin requests,
default-off before body parsing, forged-field and non-Practice denial,
idempotent command replay, a CAS race, no-store owner recovery, cross-user
404, one successful partial correction, one exhausted partial retry, and
recovery after a Next process restart.

## Rollback

The first rollback action is to keep
`WCV_C2R_C_P_PRACTICE_ENABLED=false`. That removes the API/page and navigation
surface without deleting data or reversing a migration. A later focused PR
may remove code and navigation after the flag is disabled, while preserving
the migration history and any append-only records. No remote migration apply,
schema drop, row deletion, Production environment change or destructive
rollback is authorized by this stage.

Theory and Law remain separate future verticals. Rolling back Practice must
not require reverting or changing either subject.
