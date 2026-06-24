# Supabase guidelines

- Do not alter Supabase migrations, RLS policies, or database schema without a human decision.
- All migrations must be idempotent, include rollback instructions, and respect data privacy boundaries.
- Never expose service-role keys, database URLs, or credentials in code or logs.
- Do not modify personal data policies or retention periods without explicit approval.
- Any change to authentication or row-level security requires a human-decision.
