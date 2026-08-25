-- Add the Law subject without using the new enum value in this transaction.
-- The following integration migration installs the complete Owner-only,
-- default-off C3R-L durable-learning vertical.
alter type public.c3r_p_subject add value if not exists 'LAW';
