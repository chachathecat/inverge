# Owner Decision — WCV-C3R-A2 semantic-preserving append-aware migration-history reconciliation

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

## Closed-unmerged donor

PR #790 is preserved only as a closed-unmerged read-only donor. Its terminal
head is `12c5e6e6f92275db2d5429b3e8c1c3fd2648f72a`, its tree is
`5544277009b94738e542257644e49ccac1073b56`, and formal review `4991671874`
is anchored to that exact head. The terminal review contained two actionable
P1 roots and no P0/P2: thread comment `3828953460` required a closed,
SQL-derived bidirectional semantic-preservation proof for the `20260608`
repair; thread comment `3828953466` required an ordered effective-final-state
proof for RLS, policies and privileges. PR #790, its ancestry, CI and thread
state are not repository authority and satisfy no A2 dependency.

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

Clean replan 1 independently refreshed the same bounded receipts. The ledger
was observed at `2026-08-21T10:01:53.058414Z`; relation/function presence at
`2026-08-21T10:04:57.620234Z`; and the material table/RPC boundary at
`2026-08-21T10:05:28.582667Z`. The ordered ledger digest remains
`45bcc29f8a21eb53e153e6d106250883ae843daa1057869390fd92cabc2a35c4`,
the composite schema digest remains
`cbe27ce7e921f310e6ec7d0f243060cc919e2bfd8bc8299cacac43d88f15aabd`,
and every targeted count and object fingerprint matches the frozen content
receipt. The refresh again read zero learner/private bodies and zero secrets
and made zero remote mutations.

## Exact repair authority

`20260608_create_personal_learning_states.sql` is ledger-absent,
schema-absent, and fails fresh history with SQLSTATE `42P19`: its recursive CTE
has multiple recursive terms. `PersonalLearningMigrationSemanticInventoryV1`
derives a closed canonical inventory from that exact baseline SQL: the
`pgcrypto` extension; the exact JSONB forbidden-key function identity,
signature, return/language/volatility and observable traversal contract; the
exact 20-column table; every PK/FK/unique/check constraint; four exact
indexes; authenticated CRUD grant; four exact owner-bound policies; and the
historical enabled-but-not-forced RLS state. It binds the exact forbidden-key
family and proves recursive object/array/mixed traversal while testing keys,
never scalar values. Canonical digest and hostile fixture replay are
deterministic.

C3R-P may rename the file only to
`20260608090000_create_personal_learning_states.sql` and replace the invalid
two-term recursion only with the exact authorized PostgreSQL-valid single
recursive-term implementation. Baseline and repaired inventories are compared
in both directions. The only other permitted changes are separately declared
security hardening: FORCE RLS and explicit privilege revocation/grant closure.
Those deltas are intentional and are never represented as byte or baseline-
semantic equivalence. Missing, extra, reordered, renamed, retyped, widened or
broadened behavior, including receipt-digest rebinding, fails closed. A2
performs neither the file repair nor rename. Any remote path is a future
forward-reconciliation Owner gate.

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
The path closure is the exact non-empty set of seven repair/rename sources and
targets plus the sole append path. The schema/RPC/RLS inventory is the exact
non-empty SQL-derived object projection, not a caller-supplied placeholder.
Every newly produced durable-learning table must have both exact
`ENABLE ROW LEVEL SECURITY` and the separate PostgreSQL
`FORCE ROW LEVEL SECURITY` operation. Ordinary RLS enablement alone is
insufficient. The concept-boundary evidence must contain exactly the
`public.transition_personal_concept_node_v1(text, text, text, text, text,
text, text, text, integer, timestamptz)` execute boundary: revoke from
`public` and `anon`, grant only to `authenticated`, and no unsafe extra
grantee. Evidence for another RPC cannot substitute.
The A0 analyzer must derive a zero-failure dependency closure over the actual
repaired/appended SQL inventory before the receipt can validate.

`MigrationFinalSecurityStateV1` evaluates the exact canonical active sequence
in statement order. Every recognized security operation binds canonical
migration order, filename/version, statement ordinal and source span, exact
object identity, operation kind and before/after state. It applies ENABLE,
DISABLE, FORCE and NO FORCE RLS; CREATE, ALTER and DROP POLICY; explicit and
default table privileges; and exact table/function GRANT/REVOKE operations.
Comments, ordinary/escape strings and inert dollar bodies cannot contribute
state. Quoted identifiers retain PostgreSQL case identity. Dynamic or
unsupported protected-object security DDL produces a typed fail-closed
diagnostic.

Default privileges are never collapsed across creator roles: `FOR ROLE` and
`FOR USER` forms fail closed because the evaluator does not model their
separate PostgreSQL namespaces. Dynamic security DDL in any mutable repair or
append migration fails even when the target name is assembled from fragments.
An immutable A0 dynamic statement may be ignored only while its exact source
binding is intact and neither a protected qualified/unqualified identifier nor
default-privilege mutation is present. Policy roles are derived only from
executable masked SQL, so a commented `TO authenticated` clause cannot replace
PostgreSQL's default `PUBLIC` policy role.

For every protected private table, only the computed final state counts: the
table exists, RLS is enabled and forced, the declared final policy set remains
present with only `authenticated`, and no final table privilege grantee other
than `authenticated` remains. Every protected function, including the exact
transition RPC signature, must end with exactly authenticated EXECUTE and no
other grantee. A later weakening or broad grant overrides earlier safe
presence and fails. The append receipt binds the complete ordered trace and
final projection; the analyzer independently recomputes both digests, so
receipt rebinding cannot conceal an unsafe final state.

Each replay receipt binds the candidate head and tree, actual ordered
migration-inventory digest and count, A0-derived dependency-closure digest,
execution-output digest, resulting schema-state digest, isolated-environment
fingerprint, ordered cycle number, start/finish timestamps and a canonical
receipt digest. Both cycles require a fresh database, the exact Supabase
engine, successful execution, zero linked-remote use, zero remote mutation and
zero learner/private-body reads. Evidence copied from another head, tree,
inventory or closure fails even when its internal digest is recomputed.

That one append must combine both purposes:

- final concept-graph RPC-boundary reassertion; and
- C3R-P durable-learning schema/RPC/RLS installation.

A second migration, ordinary-but-not-forced RLS, a wrong RPC target or
grantee, an empty path or object inventory, comment-only repair, unbound replay
object, one replay, embedded PostgreSQL compile, donor result or overlay
outside the active chain is insufficient. `purposeExactly` is part of the
closed required receipt-field inventory. The receipt grants no remote apply or
migration-history repair authority.

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
- A2 is `installed_current_semantic_preserving_append_aware_migration_authority`;
- C3R-P requires validated A0+A1+A2 receipts and is
  `dependency_ready_unstarted_after_validated_a2_receipt`;
- C3R-T and C3R-L remain blocked on their unchanged runtime receipts;
- WCV-C3 remains incomplete;
- #706/#707/#708/#714/#781 remain open; and
- remote mutation, Production, payment, provider, learner activation and
  successor-runtime-start counts remain zero.

This Work stops after the terminal A2 merge receipt. It is an exact exception
to routine automatic non-Production continuation and does not start C3R-P.
