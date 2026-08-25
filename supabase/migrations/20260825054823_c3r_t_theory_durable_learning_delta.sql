-- C3R-T Theory durable-learning subject extension v1.
--
-- PostgreSQL does not permit a newly added enum label to be consumed safely by
-- later statements in the same migration transaction. The following migration
-- installs the subject-aware constraints and Theory RPCs. Both files are
-- forward-only and perform no remote operation.

alter type public.c3r_p_subject add value if not exists 'THEORY';
