# WCV-C3 C3R-P Practice/common durable runtime validation

Status: candidate evidence plan; effective only after an expected-head-pinned squash merge and validated `C3RStageMergeReceiptV1`.

## Closed scope

- Base SHA/tree: `342d3795c8ea51aeb6f94751a5db913a9dbfcffd` / `1ed5a3a103cd9994c395a61ab81c36db4366e687`.
- Subject: PostgreSQL-enforced `PRACTICE` only.
- Migration reconciliation: the six exact authority-bound renames, the one exact in-place compatibility repair, and the sole append `20260822120000_c3r_p_practice_common_durable_substrate.sql`.
- Effective migration inventory: exactly 26 files; every unlisted path and byte remains unchanged.
- Feature boundary: `WCV_C3R_P_PRACTICE_ENABLED` defaults OFF, requires the Owner allowlist, and is hard-denied in Production.
- Remote Supabase, Production, provider, payment, public-user and successor-stage mutations: zero.

Local Docker was not available on the implementation host. Classification:

`LOCAL_DOCKER_UNAVAILABLE_NONBLOCKING`

The authoritative database and browser evidence is therefore produced only on the exact PR head by the GitHub-hosted dedicated workflow.

## Phase 1 replay diagnosis and clean-replan correction

Closed-unmerged PR #798 is read-only donor evidence at head/tree `15cecd184b849837b9cb3c03cf0fa07170b7cd5b` / `5f7a8a86bfd299e8106e1e0667ac21703a2bbd90`. Its dedicated cycle stopped at immutable A0-inventory migration `20260730025332_s236p_lean_owner_private.sql` before the C3R-P append or browser journey.

The failure was a runtime-harness substrate mismatch, not authority drift or a defect that this stage may repair in S236P: the inherited local Supabase config disabled Storage, the donor runner also excluded `storage-api`, and then it replayed a history whose A0 registry correctly declares `storage.buckets`, `storage.objects`, `storage.allow_only_operation(text)` and `storage.allow_any_operation(text[])` as external database objects. The existing generic Runtime Gate succeeded because its isolated fixture establishes those external objects before applying S236P.

This clean replan therefore enables the real local Supabase Storage substrate, removes `storage-api` from the excluded services, installs only the two missing A0-registry external Storage operation helpers using the existing Runtime Gate semantics, and fail-closed preflights the exact A0 external-object registry before the 26-file replay. PR #799's first exact-head run confirmed that the current Supabase CLI supplies the Storage tables and RLS but not those two repository-declared external helpers; the bounded adapter correction addresses that exact gap. It does not mutate S236P, add an eighth historical operation, create another append, or repeat PRE-C3R-P authority or PostgreSQL-oracle work. The already-installed immutable oracle remains a downstream exact-cycle verifier.

The clean design also resolves every terminal #798 review finding before runtime evidence:

- D0 freezes the server-owned model/prompt/rubric/validator, review, assistance, measurement, ledger, scheduler and content-release policy versions; every later transition must match its immutable digest;
- verified Practice attempts accept learner-entered structured values and persist only the server-rendered sentence derived from that same validated claim;
- the D+7 attempt keeps the record/source/revision/artifact ownership binding while using server-owned primary/transfer surface identities and a database-checked distinct transfer item;
- the append guards its added foreign key and replaces same-name policies, and the native evidence path reapplies it;
- dashboard reads return persisted plans with blocks and rebuild `currentPlan` after navigation or restart;
- export/delete success UI is reached only after a successful server response, with a hostile browser failure case proving failed deletion leaves the record visible.

## Practice outcome evidence

| Issue | Evidence | Exact runtime binding |
| --- | --- | --- |
| #706 | Frozen D0; assisted success excluded; D+1 unaided reconstruction; sealed different-item/different-surface D+7; recurrence; later-failure reopen | `PRACTICE_RUNTIME:c3r-p-practice-common-durable-runtime-v1#706:*` |
| #707 | Forced-RLS private ledger; exact source/attempt/artifact/item identity; bodyless projection; private failure note; restore/export/delete | `PRACTICE_RUNTIME:c3r-p-practice-common-durable-runtime-v1#707:*` |
| #708 | Deterministic Review Queue, Today and Full-Day inside the validated 30–720 minute envelope; CoreOutcome maximum three; support blocks within available time; evidence/planner separation; accept/edit/reject; stale eligibility | `PRACTICE_RUNTIME:c3r-p-practice-common-durable-runtime-v1#708:*` |

The independent verifier recomputes the artifact SHA-256 and Practice evidence digest and returns the exact artifact reference, every Practice reference, browser-to-Postgres reference, every per-item runtime reference, candidate head/tree and digest. Missing, duplicated, reordered, arbitrary, unrelated or self-attested references fail closed. This directly resolves the mandatory acceptance defect preserved from PR #796 without treating that donor artifact or CI as current authority.

## Database and privacy boundary

Every new learner-private table enables and forces RLS. `anon` has no table access. `authenticated` receives only the same-user SELECT policy and no direct mutation or RPC execution. `service_role` is the only mutation caller, and every RPC also checks `current_user`. Foreign keys bind records to `auth.users`; subject-bearing records carry the closed `c3r_p_subject` enum and `PRACTICE` checks. The runtime validates owner/BYPASSRLS catalog state, same-user service behavior, bidirectional cross-user denial, anonymous denial and authenticated direct-table denial.

Raw attempts and failure notes remain in private tables and the learner export only. Uploaded runtime evidence contains synthetic receipt identities, digests, booleans, catalog summaries and assertion results—no raw learner body, failure note, credential, email, source body or provider body.

## Two-cycle exact-head runtime

The dedicated workflow performs two serial but independently fresh cycles. Each cycle uses a distinct work directory, Supabase project identity, database container/volume, synthetic row state and receipt identity. It copies and applies all 26 migrations in order, requires PostgreSQL `server_version_num = 150008`, verifies the final catalog/security state, executes the complete learner journey through Chromium → Next.js → service-only RPC → PostgreSQL, restarts Next.js, restores from a new session, verifies cross-user denial, exports and deletes, stops the stack, invokes the installed immutable PostgreSQL 15.8 oracle in its own zero-network disposable container, and removes the entire cycle directory.

The native `Runtime Gate` separately executes the sole append twice against the installed digest-pinned PostgreSQL 15.8 image with fresh zero-network/tmpfs containers. It verifies the exact 26-file head inventory, closed Practice subject enum, all nine forced-RLS tables, grants, service-only command success, idempotent replay, direct-mutation denial and complete cleanup. This native adapter is not a second oracle or a second receipt system.

## Rollback

Runtime rollback is the independent default-OFF kill switch. Schema rollback is forward-only; do not drop or destructively rewrite learner data. The candidate closes no governed issue, does not mark the Draft Ready, does not merge, and does not start C3R-T.
