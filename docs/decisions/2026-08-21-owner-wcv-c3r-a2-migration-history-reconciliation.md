# Owner Decision — WCV-C3R-A2 append-aware migration-history reconciliation

- Decision date: 2026-08-21 KST
- Stage: `C3R-A2`
- Kind: independently complete source-only authority
- Repository authority: only after expected-head-pinned squash merge and a
  validated live GitHub receipt
- Runtime, migration-file and remote mutation in this Work: none

## Decision

The attempted C3R-P start correctly stopped because A0's exact-25 live-current
inventory and A1's immutable A0 receipt could not authorize the repairs,
renames and one append required for a reproducible fresh migration history.
C3R-A2 resolves only that authority conflict.

C3R-A2 preserves PR #785/A0 and PR #786/A1 as immutable historical truth. A0
remains the exact 25-file PostgreSQL migration baseline and its decision,
manifest, analyzer and focused test remain byte-exact. A1 remains the exact
serial-program receipt for `C3R-P → C3R-T → C3R-L`. A2 does not reorder that
chain or install runtime.

A2 narrowly supersedes A0's former live-current exact-25-forever role. The
current append-aware inventory authority is:

> A0 historical baseline + valid A2 repair/rename receipts + valid versioned
> append receipts - exact retired-alias receipts

Unregistered additions, omissions, renames and content changes; duplicate
canonical versions; consumer-before-producer at the migration checkpoint;
missing append receipts; and A0 receipt drift fail closed. Remote mutation is
always a separate gate.

## Historical receipts

The exact A0 receipt is PR #785, reviewed head
`f7f959368525f8a5895026f1361f6e13fd6226e0`, reviewed/resulting tree
`543f8dfb5fdd026c1361e1a502376945912e6c5c`, and squash/resulting-main SHA
`3a7047cf4c7fc68247137bafbca2434abdadbc7f`. Required checks passed, final
actionable P0/P1/P2 was `0/0/0`, and unresolved actionable threads were zero.
The final clean review artifact is GitHub issue comment `5364991468`.

The exact A1 receipt is PR #786, base
`3a7047cf4c7fc68247137bafbca2434abdadbc7f`, reviewed head
`ff9dfbebea182d647daa84a349fcc50610f0ed1b`, reviewed/resulting tree
`3c48da6fe991d8c02e3991e0a571b3b12139932c`, and squash/resulting-main SHA
`54afffcc539981ded65591f1f027171343bfce40`. Required checks passed, final
actionable P0/P1/P2 was `0/0/0`, and unresolved actionable threads were zero.
The final clean review artifact is GitHub issue comment `5365845668`.

All A0 and A1 artifact blobs and SHA-256 values are frozen in the machine
contract. A reverted merge, mismatched tree, digest drift or candidate-only
state invalidates dependency use.

## Fresh read-only remote receipts

The linked logical project is `inverge-beta`, classified by repository
authority as non-Production Owner-private/synthetic-only. A bounded
`LIVE_READ_ONLY` observation used only Supabase project/migration/extension
metadata and SELECT-only `pg_catalog`, `information_schema` and
`supabase_migrations.schema_migrations` queries.

The ledger was observed at `2026-08-21T07:17:37.805066Z`. The non-secret
project fingerprint is
`5a58c1e637d9cacb4bc8a71c377a57c4c7863ef9e87a6dfc3597bc83e56770d4`.
Its exact ordered 15-row digest is
`45bcc29f8a21eb53e153e6d106250883ae843daa1057869390fd92cabc2a35c4`.
The applied versions are exactly:

`20260422`, `20260423`, `20260424`, `20260426`, `20260427`, `20260429`,
`20260430`, `20260605`, `20260622`, `20260623`, `202606232130`,
`20260730025332`, `20260730060233`, `20260730065744`, and
`20260730151052`.

Exactly ten baseline files are ledger-absent:

1. `20260608_create_personal_learning_states.sql`
2. `20260615_legal_grounding.sql`
3. `20260615_legal_article_chunk_identity.sql`
4. `20260615_legal_retrieval.sql`
5. `20260615_legal_grounding_guard.sql`
6. `20260616_legal_grounding_guard_service_role_grant.sql`
7. `20260721060237_s233a_answer_review_persistence.sql`
8. `20260817090000_c2r_c_p_structured_practice_proof.sql`
9. `20260817113000_c2r_c_t_structural_theory_proof.sql`
10. `20260817170000_c2r_c_l_exact_law_applicability.sql`

The schema observation window ended at `2026-08-21T07:18:36.763633Z`.
Relation, function and extension result digests bind a composite receipt digest
of `cbe27ce7e921f310e6ec7d0f243060cc919e2bfd8bc8299cacac43d88f15aabd`.
`pgcrypto` is version `1.3` in `extensions`; `vector` is version `0.8.0` in
`public`. The observation read no learner/private row body, no answer, OCR or
note body, and no secret or credential. Remote mutation count is zero.

Ledger and schema are independent axes. The new exact distribution is 15
`LEDGER_APPLIED` / ten `LEDGER_ABSENT`, and 20
`SCHEMA_PRESENT_UNVERIFIED` / five `SCHEMA_ABSENT`. No record is
`SCHEMA_MATCH_VERIFIED`. Presence does not establish migration equivalence;
ledger absence does not establish schema absence.

## Exact repair authority

`20260608_create_personal_learning_states.sql` is ledger-absent,
schema-absent, and fails fresh history with SQLSTATE `42P19`: its recursive CTE
has multiple recursive terms. C3R-P may replace it with one PostgreSQL-valid
recursive structure preserving the intended result and RLS boundary, and
rename it to `20260608090000_create_personal_learning_states.sql`. A2 performs
neither change. Any remote path is a future forward-reconciliation Owner gate.

The five ledger-absent legal files are schema-present-unverified. Their exact
future canonical order is:

1. `20260615090000_legal_grounding.sql`
2. `20260615100000_legal_article_chunk_identity.sql`
3. `20260615110000_legal_retrieval.sql`
4. `20260615120000_legal_grounding_guard.sql`
5. `20260616100000_legal_grounding_guard_service_role_grant.sql`

Local canonical rename and replay do not authorize remote execution. Before a
later history-only repair, an Owner packet must prove exact object, function,
index, policy, grant and extension equivalence. If equivalence is not proven,
one reviewed forward reconciliation is required. Remote deploy stays blocked.

Both concept-graph versions are ledger-applied and may not be renamed. Actual
lexical order places `202606232130...rpc_only_write_boundary.sql` before
`20260623...atomic_transition.sql`, causing historical SQLSTATE `42883`. At
the C3R-P checkpoint the early boundary becomes a compatibility-safe step that
grants no unsafe access before the producer. The atomic-transition file remains
the producer. The sole later C3R-P append reasserts the exact final RPC-only
boundary after the producer exists.

The S233A and three C2R files are ledger- and schema-absent. Their unique
14-digit versions and source remain preserved, while remote deploy remains
blocked pending separate per-record continuity packets.

## C3R-P append authority

There is exactly one future `C3RPAppendReceiptV1`. It binds one publication-
time unique 14-digit version greater than `20260817170000`, its filename and
SQL digest, every exact canonical predecessor, migration-sensitive path
closure, schema/RPC/RLS inventory, two distinct exact isolated Supabase
reset/replay receipts, and exact-head central and dedicated runtime evidence.

That one append must combine both purposes:

- final concept-graph RPC-boundary reassertion; and
- C3R-P durable-learning schema/RPC/RLS installation.

A second migration is not authorized. One replay, an embedded PostgreSQL
compile, a donor result or an overlay outside the active chain is insufficient.
The receipt grants no remote apply or migration-history repair authority.

## Historical test transition

The A0 focused test remains byte-exact and registered once as
`HISTORICAL_ONLY_TESTS`; it is directly runnable during A2 while the baseline
is unchanged but no longer executes as current default inventory enforcement.
The active A2 suite binds the exact A0 test blob, frozen baseline digest and an
exact coverage map for all 37 historical tests, including dependency,
identifier, extension, external-function, external-object, filename,
occurrence, scope and PR-contract invariants. This is an explicit transition,
not silent skipped coverage.

## Post-merge state and stop

After a clean protected A2 merge and validated receipt:

- A0 is `installed_immutable_historical_baseline`;
- A1 is `installed_immutable_serial_program_receipt`;
- A2 is `installed_current_append_aware_migration_authority`;
- C3R-P requires validated A0+A1+A2 receipts and is
  `dependency_ready_unstarted_after_validated_a2_receipt`;
- C3R-T and C3R-L remain blocked on their unchanged runtime receipts;
- WCV-C3 remains incomplete;
- #706/#707/#708/#714/#781 remain open; and
- remote mutation, Production, payment, provider, learner activation and
  successor-runtime-start counts remain zero.

This Work stops after the terminal A2 merge receipt. It is an exact exception
to routine automatic non-Production continuation and does not start C3R-P.
