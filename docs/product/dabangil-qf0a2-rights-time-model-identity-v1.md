# QF-0A2 rights-time and model-identity core v1

QF-0A2 is an inert source-only trust boundary. It consumes the merged QF-0A1 bounded canonical JSON, SHA-256 identity, and UTF-8 byte-order primitive. It neither replaces nor modifies QF-0A1.

## Rights identity and source eligibility

`RightsManifestRefV1` binds one opaque manifest identity and version, exact digest, source class, status, permitted purpose, canonical UTC validity interval, and policy version/digest. All fields are closed. Identifiers are bounded machine-safe tokens; prompt bodies, response bodies, source text, learner text, credentials, raw provider payloads, and arbitrary notes are not fields. A manifest is rebuilt and validated with QF-0A1 canonicalization and digesting, and altered material cannot retain an old digest.

For `QUESTION_FOUNDRY_QUARANTINED_CANDIDATE_CREATION`, only `INVERGE_ORIGINAL`, `RIGHTS_CLEARED_OFFICIAL`, `CONTRACTED_EXPERT_ORIGINAL`, and `CLEARED_DETERMINISTIC_TEMPLATE` can be eligible. `USER_PRIVATE_ONLY`, `ACADEMY_OR_COMMERCIAL_TEXTBOOK`, `RIGHTS_UNKNOWN`, and `BLOCKED` are always denied by this shared Foundry authority. This grants no authority over a future separately approved private-learning path.

`SourceEligibilityDecisionV1` derives its outcome, denial reasons, deterministic decision ID, digest, and eligibility interval in code. A caller cannot supply or suppress an outcome or denial reason. Eligibility requires a `CURRENT` decision, an eligible source class, an `ACTIVE` exact rights binding, exact purpose and policy agreement, evaluation inside both validity intervals, and a nonempty intersection. Its interval starts at the maximum of evaluation time, rights start, and policy start; it ends at the minimum of rights end and policy end.

## Exact at-use gate

`assertSourceEligibilityAtUseV1` revalidates the decision and the exact at-use manifest object. It requires the same manifest ID, version, and digest; an active status; exact source class, purpose, policy version, and policy digest; a canonical use time no earlier than evaluation; and membership in the derived, rights, and policy intervals. Expired rights, expired policy, prior-decision replay, or a changed, stale, disputed, blocked, revoked, expired, or replaced manifest fails closed.

QF-0A2 does not fetch a live rights authority. It validates only the at-use authority object supplied by a future trusted caller. It cannot detect a later revocation without a fresh authority snapshot.

## Immutable model execution identity

`ModelExecutionIdentityV1` binds a closed role, bounded provider/model/version identifiers, exact model and execution artifact digests, an opaque execution ID, configuration digest, canonical execution time, and a QF-0A1-derived identity digest. It stores no prompt, response, learner text, source excerpt, credential, or raw provider payload.

`assertDistinctModelExecutionIdentitiesV1` proves only exact execution-identity separation. The generator must be `GENERATOR`; every supplied independent execution must have a different role, execution ID, and identity digest, and independent executions must also be mutually unique. The same model and version may participate more than once only through distinct immutable execution identities. This does not prove different model families, independent organizations, human independence, release sufficiency, or correctness by consensus.

## Boundary

The core is in-memory and source-only. Runtime activation, provider execution, network, database, persistence, remote mutation, and Production mutation are off or absent. It defines no candidate-construction, scarcity, similarity, release, learner-assignment, bank-assignment, or releasable lifecycle authority. QF-0B and QF-0I remain blocked until a validated QF-0A2 resulting-main receipt, and neither starts automatically.
