import crypto from "node:crypto";

const MIGRATION_PATH = /^supabase\/migrations\/[0-9]{12,14}_s233a_[a-z0-9_]+\.sql$/;
const DESTRUCTIVE_SQL = [
  /\bdrop\s+(table|column|constraint|function|policy|index|schema|type)\b/i,
  /\btruncate\b/i,
  /\bdelete\s+from\b/i,
  /\balter\s+table\b[\s\S]{0,160}\bdrop\b/i,
  /\balter\s+table\b[\s\S]{0,160}\brename\b/i,
];
const RPC_NAMES = [
  "claim_s233a_answer_review_v1",
  "transition_s233a_answer_review_v1",
] as const;

export type S233aTrustedAdditiveMigrationReview = {
  reviewId: string;
  path: string;
  changeKind: "added";
  gitMode: "100644";
  contentSha256: string;
  reviewVersion: "s233.additive_migration_review.v1";
  validatorId: "trusted_sql_additivity_validator";
  verdict: "additive_only";
  destructiveOperationsDetected: false;
  validationEvidenceRefId: string;
};

export function validateS233aAdditiveMigrationSql(input: {
  path: string;
  sql: string;
}): S233aTrustedAdditiveMigrationReview {
  if (!MIGRATION_PATH.test(input.path)) throw new Error("s233a-additivity-invalid-path");
  const sql = input.sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--[^\n\r]*/g, "");
  if (DESTRUCTIVE_SQL.some((pattern) => pattern.test(sql))) {
    throw new Error("s233a-additivity-destructive-operation");
  }
  const required = [
    "create table if not exists public.s233a_answer_reviews",
    "create table if not exists public.s233a_answer_review_revisions",
    "create table if not exists public.s233a_evidence_state_records",
    "alter table public.s233a_answer_reviews enable row level security",
    "request_active boolean not null default true",
    "'retry_claimed'::text",
    "'in_progress'::text",
    "security invoker",
    "claim_s233a_answer_review_v1",
    "transition_s233a_answer_review_v1",
    "transition_personal_concept_node_v1",
    "p_user_id uuid",
    "current_user::text <> 'service_role'",
    "set_config('request.jwt.claim.sub', v_user_id::text, true)",
    "'request.jwt.claims'",
    "create policy \"s233a review queue rpc insert namespace\" on public.review_queue_items",
    "create policy \"s233a review queue rpc update namespace\" on public.review_queue_items",
    "create policy \"s233a review queue rpc delete namespace\" on public.review_queue_items",
    "create policy \"s233a today seed rpc insert namespace\" on public.action_seeds",
    "create policy \"s233a today seed rpc update namespace\" on public.action_seeds",
    "create policy \"s233a today seed rpc delete namespace\" on public.action_seeds",
    "as restrictive for insert to authenticated",
    "as restrictive for update to authenticated",
    "as restrictive for delete to authenticated",
    "coalesce(source_kind, '') <> 's233a_answer_review'",
    "coalesce(source_type, '') <> 's233a_answer_review'",
    "revoke insert, update, delete on table public.s233a_answer_reviews from public, anon, authenticated",
    "grant select on table public.s233a_answer_reviews to authenticated",
    "to service_role",
  ];
  if (required.some((fragment) => !sql.includes(fragment))) {
    throw new Error("s233a-additivity-required-boundary-missing");
  }
  if (/grant\s+[^;]*\b(?:all(?:\s+privileges)?|insert|update|delete)\b[^;]*\bto\s+authenticated\s*;/i.test(sql)) {
    throw new Error("s233a-additivity-authenticated-direct-write");
  }
  if (/as\s+restrictive\s+for\s+select\s+to\s+authenticated/i.test(sql)) {
    throw new Error("s233a-additivity-queue-today-read-blocked");
  }
  for (const [table, column, prefix] of [
    ["review_queue_items", "source_kind", "s233a review queue rpc"],
    ["action_seeds", "source_type", "s233a today seed rpc"],
  ] as const) {
    const predicate = `coalesce\\(${column},\\s*''\\)\\s*<>\\s*'s233a_answer_review'`;
    const insert = new RegExp(`create\\s+policy\\s+"${prefix} insert namespace"\\s+on\\s+public\\.${table}\\s+as\\s+restrictive\\s+for\\s+insert\\s+to\\s+authenticated\\s+with\\s+check\\s*\\(${predicate}\\)`, "i");
    const update = new RegExp(`create\\s+policy\\s+"${prefix} update namespace"\\s+on\\s+public\\.${table}\\s+as\\s+restrictive\\s+for\\s+update\\s+to\\s+authenticated\\s+using\\s*\\(${predicate}\\)\\s+with\\s+check\\s*\\(${predicate}\\)`, "i");
    const remove = new RegExp(`create\\s+policy\\s+"${prefix} delete namespace"\\s+on\\s+public\\.${table}\\s+as\\s+restrictive\\s+for\\s+delete\\s+to\\s+authenticated\\s+using\\s*\\(${predicate}\\)`, "i");
    if (!insert.test(sql) || !update.test(sql) || !remove.test(sql)) {
      throw new Error("s233a-additivity-queue-today-write-boundary");
    }
  }
  const functionStarts = [...sql.matchAll(/create\s+or\s+replace\s+function\s+public\.([a-z0-9_]+)\s*\(/gi)];
  const securityInvokerCount = sql.match(/\bsecurity\s+invoker\b/gi)?.length ?? 0;
  if (/\bsecurity\s+definer\b/i.test(sql) || securityInvokerCount !== RPC_NAMES.length) {
    throw new Error("s233a-additivity-privileged-function-boundary");
  }
  for (const name of RPC_NAMES) {
    const startIndex = functionStarts.find((match) => match[1] === name)?.index;
    if (startIndex === undefined) throw new Error("s233a-additivity-required-boundary-missing");
    const nextIndex = functionStarts.find((match) => (match.index ?? 0) > startIndex)?.index ?? sql.length;
    const definition = sql.slice(startIndex, nextIndex);
    if (!/\bsecurity\s+invoker\b/i.test(definition) || !/set\s+search_path\s*=\s*''/i.test(definition)) {
      throw new Error("s233a-additivity-privileged-function-boundary");
    }
  }
  const contentSha256 = crypto.createHash("sha256").update(input.sql, "utf8").digest("hex");
  return {
    reviewId: `sql-additivity-review-${contentSha256.slice(0, 24)}`,
    path: input.path,
    changeKind: "added",
    gitMode: "100644",
    contentSha256,
    reviewVersion: "s233.additive_migration_review.v1",
    validatorId: "trusted_sql_additivity_validator",
    verdict: "additive_only",
    destructiveOperationsDetected: false,
    validationEvidenceRefId: `sql-additivity-report-${contentSha256.slice(0, 24)}`,
  };
}
