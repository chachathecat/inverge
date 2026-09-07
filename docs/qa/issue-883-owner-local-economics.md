# Issue #883: first private local economics use

This is a small continuation of #883, not a new plan or approval system.
The integrated #891/#893/#895 consumers are preserved. Code preparation,
content approval, installation and observed use are separate outcomes.

## Current boundary

The Owner's 2026-09-07 instruction conditionally permits one economics bundle
on the Owner's PC ONLY after actual content approval and required evidence.
The reviewer is explicitly **unassigned**; do not register the Owner implicitly.
All six checks remain pending. Approved and installed content counts are zero.
No actual account, database, environment variable, content path or feature is
created/activated by this preparation. Remote Supabase/Vercel/Production,
public deployment, external providers, extra cost/payment and others' data
remain excluded.

## Candidate, not approval

`scripts/content-review/prepare-economics-runtime-candidate.mjs` reuses the
existing private r3 JSON, calculations, supplied AI review, source observation
and six-item human checklist. It does not solve the questions again, rebuild the
review ZIP, alter source text or issue an approval. It verifies the preserved
official PDF/HWP hashes locally. Output is allowed only outside Git directories;
existing output is reused if identical and never silently overwritten.

The private outputs are `economics-runtime-candidate-r3-v1.json` and
`economics-runtime-mapping-r3-v1.json`, beside the existing r3 review folder.
The mapping records all 50 body/choice/key/explanation field comparisons,
source/lineage and evidence hashes. It also preserves concepts, calculation
bases, variant differences and the still-proposed feedback classifications.
All six human reviewer/date/decision entries are null. These bodies and hashes
stay private; do not upload them to Git, CI artifacts or public comments.

The loader candidate uses neutral `private_review_candidate` and question
identities with no `verified` fields. The same economics loader/adapter path can
exercise it with exact-file/version synthetic receipts in isolated tests only.
Real r3 candidates remain explicitly blocked even with a well-formed human
six-check receipt: the 2025 full official-key/per-item final-release consumer is
still a required code dependency. No HTTP option selects the test mode or installs
approval. The candidate bytes need no fabricated human-review label or rewrite
after review. Legacy content and all other subject consumers remain unchanged.

The original and retry keys stay distinct. All five original key observations
and five separately calculated retry proposals remain proposals until actual
review. This conversion is NOT a substitute for the existing final release or
full 200-position official-key obligations; none is declared satisfied by a
five-question sample or by general checks. Before actual use, resolve the exact
required source/key/release evidence and any conflict; never invent missing
official key evidence. Keep 53's normalized transcription and the official
key's lack of an explicit A label visible. Every retry remains LEARNING_ONLY.

## Dedicated persistent local environment — not yet started

Use a separate directory and Supabase project/volume, never the synthetic test
container, tmpfs or test cleanup scripts. Proposed application address is
`http://127.0.0.1:3883`; it is NOT currently a listening or validated endpoint.
Choose separate unused local Supabase ports at installation, and record the
actual bound addresses then. Suggested dedicated data directory on this PC:
`C:/Users/jmg91/AppData/Local/Inverge/owner-economics` (not provisioned here).

After the missing 2025 final-release consumer is implemented/verified and genuine
approval is secured, perform the following in one dedicated local environment:

1. Revalidate the reviewed code, exact content bytes, human decisions and source
   evidence. Install only the genuine existing approval shape via the trusted
   server installation boundary. Do not add private body hashes or reviewer
   details to public Git. An install setting alone is not content approval.
2. Initialize a separate local Supabase project with dedicated persistent volume
   and loopback bindings. The CLI is already installed; inspect its current help
   and local configuration. Start no remote link, pull, push, migration or repair.
   Do not copy existing secret/environment files. [Supabase local guidance](https://supabase.com/docs/guides/local-development)
   requires loopback isolation; verify actual Docker port bindings, not just
   the browser URL. Keep unused services and external integrations disabled.
3. Apply ONLY `supabase/local-designs/first-stage-owner-local-sessions.sql` to that
   verified local instance. Its explicit context marker is an accidental-use
   guard, not proof of approval or locality. The original synthetic-only SQL is
   unchanged. Both have the same table constraints, forced RLS, service-only
   SELECT/INSERT/UPDATE and denied learner writes. Do not reuse the test Auth
   table: this environment must use real local Supabase Auth.
4. Prepare the Owner's own local account using the existing Supabase Auth path;
   let the Owner enter the password privately, never in a command or report.
   Existing `/login` → `/api/auth/sign-in` → `signInWithPassword` → server
   `getUser`/cookies stays authoritative. No smoke cookie, fake session, header
   fallback, test catalog injection or new auth policy is allowed for actual use.
5. Only then configure the separate local app with its local Supabase URL/keys,
   exact approved content path, existing Owner/admin email allowlists and
   first-stage flag. Use development runtime bound to loopback. Keep
   `DEV_SMOKE_AUTH` disabled, no Vercel environment, no provider keys and no
   inherited operational configuration. Verify all network destinations before
   use; never pull Vercel/remote Supabase environment settings.
6. Preserve data across app/database restarts. Disable the local feature or stop
   the app for rollback; do not delete users/rows/volumes, reset the database,
   run synthetic cleanup or infer deletion permission from this runbook.

## Actual use sequence and evidence

Once the endpoint really exists, use
`/login?returnTo=/app/first-stage/practice`, log in with the genuine local
account, choose one of the five originals, open it and answer before requesting
feedback. Only a durable response allows the reviewed explanation. Preserve the
resulting session URL, close/reopen the browser and confirm the stored response
and pending review time. D+1 opens the separately reviewed practice retry and
preserves completed state on further retries. Do not silently schedule a new
item when the finite reviewed retry stock is exhausted.

Record actual login, question/feedback disclosure order, save/reconnect and
review separately from synthetic tests. D+1 clock-controlled automatic evidence
is not next-day observation. The latter requires the actual wall-clock day and
Owner use; leave it unobserved until it happens. No learning efficacy, mastery,
transfer or measurement claim follows from completing a local practice item.

Current actual-use result: **not executed; no endpoint or account provisioned**.
The genuine reviewer/content decision remains the external gate. The 2025 r3
final-release consumer remains a code dependency, not an Owner approval to waive.
Code tests and integration can proceed without requesting those files again.
