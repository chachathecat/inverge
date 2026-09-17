-- Exact pre-real-estate constraint from 53bfa38b, disposable regression only.
    alter table public.first_stage_private_sessions add constraint first_stage_reviewed_bank_binding check (
      reviewed_bank_assignment is null or (
        jsonb_typeof(reviewed_bank_assignment)='object' and octet_length(reviewed_bank_assignment::text)<=8192 and
        payload->>'schemaVersion'='first_stage.private_session.v1' and
        payload->'state'->'examCycle'->'questionReferences'->0->>'subjectId'='economics_principles' and
        reviewed_bank_assignment->>'contractVersion'='QFI1BankFirstAssignmentV1' and
        reviewed_bank_assignment->>'status'='ASSIGNED' and
        reviewed_bank_assignment->>'purpose'='LEARNING_PRACTICE' and
        reviewed_bank_assignment->>'bankClass'='LEARNING_PRACTICE' and
        reviewed_bank_assignment->>'contentAuthority'='LEARNING_ONLY' and
        reviewed_bank_assignment->>'learnerUse'='LEARNING_ONLY' and
        reviewed_bank_assignment->>'origin'='BANK_STOCK' and
        reviewed_bank_assignment->>'learnerScopeId'=session_id and
        reviewed_bank_assignment->>'candidateId'=payload->'state'->'examCycle'->'questionReferences'->0->>'questionId' and
        reviewed_bank_assignment->'transferClaimAllowed'='false'::jsonb and
        reviewed_bank_assignment->'measurementClaimAllowed'='false'::jsonb and
        reviewed_bank_assignment->'generationAuthorized'='false'::jsonb and
        reviewed_bank_assignment->'chronologyDigest'='null'::jsonb and
        reviewed_bank_assignment ?& array['assignedAt','assignmentId','assignmentDigest','candidateDigest','familyId','surfaceId'] and
        reviewed_bank_assignment - array['contractVersion','purpose','learnerScopeId','candidateId','candidateDigest',
          'familyId','surfaceId','bankClass','origin','contentAuthority','chronologyDigest','assignedAt','status',
          'assignmentId','assignmentDigest','learnerUse','transferClaimAllowed','measurementClaimAllowed','generationAuthorized']='{}'::jsonb and
        reviewed_bank_assignment->>'assignmentId' ~ '^qfa_[0-9a-f]{64}$' and
        reviewed_bank_assignment->>'assignmentDigest' ~ '^sha256:[0-9a-f]{64}$' and
        reviewed_bank_assignment->>'candidateDigest' ~ '^sha256:[0-9a-f]{64}$' and
        length(reviewed_bank_assignment->>'familyId') between 1 and 160 and
        length(reviewed_bank_assignment->>'surfaceId') between 1 and 160 and
        reviewed_bank_assignment->>'assignedAt' ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.][0-9]{3}Z$'
      ) is true
    );
