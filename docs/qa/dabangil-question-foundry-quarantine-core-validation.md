# Question Foundry Quarantine Core V1 Validation

The machine contract is
`config/dabangil-question-foundry-quarantine-core-v1.json`. The executable
contract is split between `lib/question-foundry/quarantine-contracts.ts` and
`lib/question-foundry/quarantine-core.ts`.

## Fixed checklist

- Every successfully constructed candidate is exactly `QUARANTINED` and has
  no release, learner, or bank assignment.
- Source and rights identities, validity, class, purpose, policy, and digests
  resolve exactly; missing, stale, disputed, blocked, revoked, expired, or
  mismatched bindings fail closed.
- Private learner and commercial-academy sources receive no shared blueprint,
  bank, training, or cross-user reuse eligibility. Unknown and blocked sources
  are generation-ineligible.
- Candidate identity is deterministic and binds solution-first,
  validator-profile, source, rights, generator, content, and blueprint facts.
- A generator execution identity cannot reappear as a solver or judge.
- Scarcity events accept only the exact bodyless metadata allowlist.
- The implementation imports no network, provider, database, persistence, API,
  UI, migration, RLS, auth, payment, or Production capability.
- The exact six-path manifest excludes the shared test runner.

## Focused evidence

Run QF-0 directly without registering it in the shared runner:

`node scripts/run-node-tests.mjs tests/question-foundry-quarantine-core.test.mjs`

Run the directly adjacent rights contract once on the completed candidate:

`node scripts/run-node-tests.mjs tests/rights-safe-adaptive-variant-foundry-contract.test.mjs`

Parse the machine contract, run typecheck and changed-file lint, verify the
six-path manifest, and finish with `git diff --check`. No PostgreSQL, browser,
remote Supabase, provider, or Production evidence applies to this source-only
stage.
