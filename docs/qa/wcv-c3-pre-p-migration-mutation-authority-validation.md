# WCV-C3 PRE-C3R-P minimal migration-mutation authority validation

Status: local lean validation passed; exact-head GitHub CI and formal review
remain pending.

## Frozen inputs

- Base: `5965ddb0202c5f9effb531824d4d95f775abecc1`
- Base tree: `bcb1017b980a5175e45265080ba25bc4b25c51ff`
- Terminal donors: PR #795 head `e4261bd4ee5cdf6a460023a190db4f4e0d9c7268`
  and PR #796 head `aeeb3cb40cb3102774ef0e8302cf251a073dac93`
- Derived bindings: seven current/future records matched both terminal donors
  byte-for-byte after independent Git-object derivation.
- Inventory: 25 baseline files, 18 unchanged paths, six old rename paths
  replaced by six new paths, one in-place net-zero repair and one future
  append; expected effective count `26`.
- Append:
  `supabase/migrations/20260822120000_c3r_p_practice_common_durable_substrate.sql`
- Remote/Supabase/Production mutation: `0`.

## Closed candidate diff

The frozen owned-path manifest is the exact 12-path `ownedPaths` array in
`C3RPMigrationMutationAuthorityV1`. No `supabase/migrations/**`, workflow,
package, application, API, UI, schema, RLS, Storage, provider, payment or
Production path is owned.

## Lean validation

The candidate passed:

- `node --test tests/wcv-c3-pre-p-migration-mutation-authority.test.mjs` —
  2/2 focused authority and hostile-boundary tests passed;
- `node --test tests/wcv-c3r-a0-migration-dependency-authority.test.mjs
  tests/wcv-c3r-a1-serial-program-authority.test.mjs` — 53/53 A0/A1
  authority regressions passed;
- `node scripts/automation/wcv-c3-pre-p-migration-mutation-authority.mjs` —
  exact base, digest, path, inventory, diff and stage/remote boundary passed;
- changed-file ESLint for the two authority files, PR-contract validator and
  Node test registration — passed; and
- JSON parsing for both changed contracts — passed.

`git diff --check` is the final pre-push whitespace gate and is recorded by the
candidate commit/CI rather than converted into a separate evidence system.

Docker, PostgreSQL execution, browser runtime and broad independent audits are
deliberately outside this source-only validation record.

## Preserved boundary

C3R-P remains `authorized_unstarted`; C3R-T and C3R-L remain receipt-blocked.
The small future migration-authority binding is not a runtime receipt and does
not replace `C3RStageMergeReceiptV1`.
