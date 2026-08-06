# S236P Live Source Reconciliation — Acceptance Blocked

- Reconciled at: `2026-08-06` KST
- Status: `blocked / acceptance_blocked`
- Acceptance completed: `false`
- Reconciliation base: `main@cea76b3886c18e5e886c866d158937b43577552b`
- Source PR: `#676` (superseded after this reconciliation; never merge)
- Exact source head: `66fdb97532e24e06e2c6a2562983724d65e4f3f9`
- Exact source tree: `5ce54beeb56ecbba70b638acf01a0dbd639f7d25`
- Exact source parent: `95ce6e5fa6920b297c23076c9fd1dc83df9a9896`
- Supabase project: `inverge-beta`
- Real content: off
- Production: off
- S236A: queued and unstarted

This record reconciles source with four SQL byte sequences already applied to
the live project. It does not perform or authorize a Supabase call, migration
repair, ledger mutation, replay, retry, cleanup, count, canary, diagnostic, or
Owner-local execution. It does not establish live acceptance.

## Exact live-version migration quadruple

The repository paths use the already-observed live ledger versions. Their SQL
bytes are unchanged from PR #676.

| Order | PR #676 source filename | Reconciled repository filename | Live version | Bytes | SHA-256 | Blob |
| --- | --- | --- | --- | ---: | --- | --- |
| 1 | `20260730023248_s236p_lean_owner_private.sql` | `20260730025332_s236p_lean_owner_private.sql` | `20260730025332` | 21,073 | `476ef1b0d6a100fb6e4803b812b049b44252ca5f25301d3f781cee8827b1545b` | `24daf5f60e9ded267820724a113ea8f15baca923` |
| 2 | `20260730053324_s236p_owner_private_lifecycle_hardening.sql` | `20260730060233_s236p_owner_private_lifecycle_hardening.sql` | `20260730060233` | 13,691 | `e20440dfa0d880ad591b8c9fdff287cd66fcdbbe4f96f07a549a730fd8920de1` | `bc51b271b8c3631e40855bda690c4927bf2d614f` |
| 3 | `20260730065040_s236p_owner_private_authenticated_download_info.sql` | `20260730065744_s236p_owner_private_authenticated_download_info.sql` | `20260730065744` | 1,068 | `632cc7ee563aa29a573425e396f6f539e35a3c8834955ba66ccd01723bb3cbcb` | `8b756778dfa91620cf5c89cf7a370d28ab1f998a` |
| 4 | `20260730113505_s236p_owner_private_expiry_read_gate.sql` | `20260730151052_s236p_owner_private_expiry_read_gate.sql` | `20260730151052` | 2,705 | `416fa80acea48bf4d170661a4f5259632b4d9e3fd740007bd65cbf1ded6103f1` | `f1a756b3f5c433a7cb64c9e3fe22098ce4ac73cc` |

The obsolete local-timestamp paths are intentionally absent. A future local
and remote migration comparison must see the live versions above rather than
classify already-applied SQL as pending. Applied migration files and live
ledger rows must not be deleted, renamed, replayed, reverted, or repaired.

The source runtime-evidence adapter is
`s236p.postgres.owner-private.v5`. It binds only the exact path order above,
the exact source blobs at the evaluated head, and the existing closed 17
assertions. Its CI environment is disposable local PostgreSQL with synthetic
fixtures and no connection to `inverge-beta`.

## Atomic closeout result

Atomic closeout run `5ae4a46e-b254-4b04-8181-35f3a720c148` was invoked once
and is consumed.

| Field | Observed value |
| --- | --- |
| Result | `failed_no_rerun_pending_independent_closure` |
| Failure code | `LIVE_NODE_RESULT_NOT_PASS` |
| Phase | `ONE_ATOMIC_LIVE_NODE_INVOCATION` |
| Live Node exit code | `1` |
| Live Node invocations | `1` |
| Bounded Git fetch invocations | `1` |
| `ownerLocalResult` | `null` |
| Consumption marker | created |
| Object acquisition | verified |
| Repository state | preserved |
| GitHub mutations | `0` |
| Schema mutations | `0` |
| Production mutations | `0` |
| Retry #4 invocations from this run | `0` |
| Prior consumed-command invocations | `0` |
| Rerun | prohibited |

The failure envelope did not retain the parsed matrix result. No exact matrix
assertion failure can be recovered from this record, and that evidence loss
does not authorize a rerun.

## Cleanup-only result

The wrapper invoked cleanup-only exactly once after the live Node failure.

- status: `passed`;
- exact metadata rows observed: `0`;
- exact metadata rows removed: `0`;
- reconciled principal IDs: none;
- synthetic-principal absence: verified;
- cleanup project calls: `13`;
- blocked external calls: `0`;
- cleanup failures: none.

This cleanup result does not itself establish a complete five-count residue
vector.

## Independent failure closure

The separately authorized failure closure used its single count-only query.
The response could not be validated as five integer counts, so its result is
`unavailable` and the closure verdict is fail-closed. It is not an observed or
inferred `0/0/0/0/0`.

The same closure found zero canary-prefix matches on eight inspected
surfaces:

1. API;
2. Auth;
3. Postgres;
4. Realtime;
5. Storage;
6. Edge Function;
7. branch action; and
8. the agent's current scratch workspace.

The workspace result does not represent the Owner's complete Windows
filesystem. The raw canary prefix is not retained in Git, this document, or
another repository artifact. This eight-surface failure-closure scan is not
the canonical independent canary acceptance and does not satisfy it.

Wrapper, matrix, and cleanup reruns during this failure closure were each
exactly `0`.

## Canonical state

- publishable-key HTTP acceptance: incomplete;
- post-run exact `object/metadata/event/session/principal` vector: unavailable;
- canonical independent cross-surface canary: incomplete;
- independent failure closure: incomplete / fail-closed;
- terminal pass: false;
- next live attempt: not authorized;
- PR #676 Ready or merge: prohibited;
- S236A start: prohibited;
- real content and Production: off.

After this source reconciliation merges, PR #676 is closed as
`superseded / never merged` and its branch is preserved for audit history.

## Forward disable and rollback

This source reconciliation has no live rollout and no live rollback. A source
revert cannot undo already-live SQL and must not delete the ledger-aligned
migration files. Any future infrastructure disable or policy change requires
a separately approved forward migration with its own exact acceptance and
cleanup evidence.

## Remaining risks

- Live publishable-key behavior lacks a complete acceptance pass.
- The only atomic closeout is failed, consumed, and non-rerunnable.
- The exact five-count independent closure is unavailable.
- The SQL remains live while S236P acceptance is blocked.
- S236A, real content, external users, and Production remain ineligible.
