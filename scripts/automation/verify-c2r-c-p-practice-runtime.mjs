#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const MODULE_PATH = fileURLToPath(import.meta.url);
const REPOSITORY_ROOT = path.resolve(
  path.dirname(MODULE_PATH),
  "../..",
);
const SOURCE_WORKDIR = path.join(
  REPOSITORY_ROOT,
  "tests/runtime/wcv-c2-supabase",
);
const PRACTICE_MIGRATION_PATH = path.join(
  REPOSITORY_ROOT,
  "supabase/migrations/20260817090000_c2r_c_p_structured_practice_proof.sql",
);
const THEORY_MIGRATION_PATH = path.join(
  REPOSITORY_ROOT,
  "supabase/migrations/20260817113000_c2r_c_t_structural_theory_proof.sql",
);
const THEORY_RUNTIME = process.env.C2R_RUNTIME_SUBJECT === "appraisal_theory";
const RUNTIME_SUBJECT = THEORY_RUNTIME
  ? "appraisal_theory"
  : "appraisal_practical";
const C2_MIGRATION_PATHS = THEORY_RUNTIME
  ? [PRACTICE_MIGRATION_PATH, THEORY_MIGRATION_PATH]
  : [PRACTICE_MIGRATION_PATH];
const BROWSER_CONFIG_PATH = path.join(
  REPOSITORY_ROOT,
  "tests/e2e/c2r-c-p-playwright.config.ts",
);
const BROWSER_RUNTIME_CONFIG_PATH = THEORY_RUNTIME
  ? path.join(
      path.dirname(BROWSER_CONFIG_PATH),
      ".c2r-c-t-playwright.runtime.config.ts",
    )
  : BROWSER_CONFIG_PATH;
const BROWSER_SPEC_PATH = path.join(
  REPOSITORY_ROOT,
  THEORY_RUNTIME
    ? "tests/e2e/c2r-c-t-theory-trusted-repair-runtime.spec.ts"
    : "tests/e2e/c2r-c-p-practice-trusted-repair-runtime.spec.ts",
);
const PROJECT_ID = THEORY_RUNTIME
  ? "c2r-c-t-theory-repair"
  : "c2r-c-p-practice-repair";
const EXPECTED_CLI_VERSION = "2.114.0";
const EXCLUDED_SERVICES = [
  "realtime",
  "storage-api",
  "imgproxy",
  "mailpit",
  "postgres-meta",
  "studio",
  "edge-runtime",
  "logflare",
  "vector",
  "supavisor",
];
const REQUIRED_CONTAINER_PREFIXES = [
  "supabase_db_",
  "supabase_auth_",
  "supabase_rest_",
  "supabase_kong_",
];
const FORBIDDEN_LOCAL_SOURCE = [
  /supabase_access_token/i,
  /supabase_db_password/i,
  /project_ref/i,
  /inverge-beta/i,
  /https?:\/\/[a-z0-9-]+\.supabase\.co/i,
  /\bsupabase\s+(?:login|link)\b/i,
  /\b--linked\b/i,
  /\bsupabase\s+db\s+(?:push|dump|pull)\b/i,
];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const IMAGE_DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/i;
const DIAGNOSTIC_MAX_LINES = 40;
const DIAGNOSTIC_MAX_CHARS = 4_096;
const COMMAND_SENSITIVITY_POLICIES = Object.freeze([
  "synthetic_test_only",
  "repository_metadata_only",
  "local_runtime_metadata_only",
  "local_supabase_control",
  "docker_resource_metadata_only",
  "local_supabase_status_secrets",
  "docker_image_metadata_only",
  "sql_query_body_secret",
  "local_server_metadata_only",
  "browser_assertion_locations_only",
]);

function commandSpec(stageId, commandId, safeLabel, sensitivityPolicy, query = {}) {
  return Object.freeze({
    stageId,
    commandId,
    safeLabel,
    sensitivityPolicy,
    ...query,
  });
}

const COMMAND_SPECS = Object.freeze({
  diagnostic_regression_failure: commandSpec(
    "diagnostic_regression",
    "diagnostic_regression_failure",
    "diagnostic regression failing child",
    "synthetic_test_only",
  ),
  diagnostic_regression_success: commandSpec(
    "diagnostic_regression",
    "diagnostic_regression_success",
    "diagnostic regression successful child",
    "synthetic_test_only",
  ),
  diagnostic_regression_allow_failure: commandSpec(
    "diagnostic_regression",
    "diagnostic_regression_allow_failure",
    "diagnostic regression allowed failure",
    "synthetic_test_only",
  ),
  git_head_verification: commandSpec(
    "exact_head_verification",
    "git_head_verification",
    "exact Git head verification",
    "repository_metadata_only",
  ),
  supabase_cli_version: commandSpec(
    "runtime_preflight",
    "supabase_cli_version",
    "locked local Supabase CLI version",
    "local_runtime_metadata_only",
  ),
  pre_start_supabase_stop: commandSpec(
    "pre_start_cleanup",
    "pre_start_supabase_stop",
    "pre-start local Supabase shutdown",
    "local_supabase_control",
  ),
  pre_start_container_list: commandSpec(
    "pre_start_cleanup",
    "pre_start_container_list",
    "pre-start C2 container inventory",
    "docker_resource_metadata_only",
  ),
  pre_start_volume_list: commandSpec(
    "pre_start_cleanup",
    "pre_start_volume_list",
    "pre-start C2 volume inventory",
    "docker_resource_metadata_only",
  ),
  pre_start_network_list: commandSpec(
    "pre_start_cleanup",
    "pre_start_network_list",
    "pre-start C2 network inventory",
    "docker_resource_metadata_only",
  ),
  first_supabase_start: commandSpec(
    "first_fresh_database_start",
    "first_supabase_start",
    "first fresh isolated local Supabase startup",
    "local_supabase_control",
  ),
  first_supabase_status: commandSpec(
    "first_fresh_database_start",
    "first_supabase_status",
    "first local Supabase status",
    "local_supabase_status_secrets",
  ),
  active_container_list: commandSpec(
    "first_fresh_database_inspection",
    "active_container_list",
    "active C2 container inventory",
    "docker_resource_metadata_only",
  ),
  database_image_inspect: commandSpec(
    "first_fresh_database_inspection",
    "database_image_inspect",
    "local database image identity",
    "docker_image_metadata_only",
  ),
  verify_migrations_psql: commandSpec(
    "first_fresh_database_verification",
    "verify_migrations_psql",
    "verify first fresh migration inventory",
    "sql_query_body_secret",
    { queryId: "verify_migrations", queryDescription: "schema existence predicates" },
  ),
  theory_migration_replay_psql: commandSpec(
    "first_fresh_database_verification",
    "theory_migration_replay_psql",
    "replay Theory migration on the first database",
    "sql_query_body_secret",
    { queryId: "theory_migration_replay", queryDescription: "complete Theory migration replay" },
  ),
  theory_subject_binding_count_psql: commandSpec(
    "first_fresh_database_verification",
    "theory_subject_binding_count_psql",
    "verify one replayed Theory subject-binding constraint",
    "sql_query_body_secret",
    { queryId: "theory_subject_binding_count", queryDescription: "named constraint count" },
  ),
  verify_security_contract_psql: commandSpec(
    "first_fresh_database_verification",
    "verify_security_contract_psql",
    "verify first fresh security contract",
    "sql_query_body_secret",
    { queryId: "verify_security_contract", queryDescription: "forced RLS and grant predicates" },
  ),
  flag_off_session_count_before_psql: commandSpec(
    "default_off_verification",
    "flag_off_session_count_before_psql",
    "count sessions before default-OFF request",
    "sql_query_body_secret",
    { queryId: "flag_off_session_count_before", queryDescription: "aggregate session row count" },
  ),
  next_flag_off_start: commandSpec(
    "default_off_verification",
    "next_flag_off_start",
    "default-OFF local Next server",
    "local_server_metadata_only",
  ),
  flag_off_session_count_after_psql: commandSpec(
    "default_off_verification",
    "flag_off_session_count_after_psql",
    "count sessions after default-OFF request",
    "sql_query_body_secret",
    { queryId: "flag_off_session_count_after", queryDescription: "aggregate session row count" },
  ),
  next_cross_subject_seed_start: commandSpec(
    "cross_subject_start_replay",
    "next_cross_subject_seed_start",
    "both-subject replay-seed local Next server",
    "local_server_metadata_only",
  ),
  browser_cross_subject_seed: commandSpec(
    "cross_subject_start_replay",
    "browser_cross_subject_seed",
    "cross-subject replay seed and exact-subject denial",
    "browser_assertion_locations_only",
  ),
  next_cross_subject_practice_start: commandSpec(
    "cross_subject_start_replay",
    "next_cross_subject_practice_start",
    "Practice-only cross-subject replay local Next server",
    "local_server_metadata_only",
  ),
  browser_cross_subject_practice: commandSpec(
    "cross_subject_start_replay",
    "browser_cross_subject_practice",
    "Theory-disabled cross-subject replay denial",
    "browser_assertion_locations_only",
  ),
  next_initial_start: commandSpec(
    "browser_runtime",
    "next_initial_start",
    "initial local Next server",
    "local_server_metadata_only",
  ),
  browser_acceptance: commandSpec(
    "browser_runtime",
    "browser_acceptance",
    "C2 complete browser acceptance",
    "browser_assertion_locations_only",
  ),
  verify_persisted_runtime_psql: commandSpec(
    "persisted_runtime_verification",
    "verify_persisted_runtime_psql",
    "verify persisted C2 runtime invariants",
    "sql_query_body_secret",
    { queryId: "verify_persisted_runtime", queryDescription: "aggregate bodyless invariant predicates" },
  ),
  recovery_session_lookup_psql: commandSpec(
    "process_restart_recovery",
    "recovery_session_lookup_psql",
    "lookup bodyless recovery session",
    "sql_query_body_secret",
    { queryId: "recovery_session_lookup", queryDescription: "latest partial session identifier lookup" },
  ),
  next_recovery_start: commandSpec(
    "process_restart_recovery",
    "next_recovery_start",
    "recovery local Next server",
    "local_server_metadata_only",
  ),
  browser_recovery: commandSpec(
    "process_restart_recovery",
    "browser_recovery",
    "C2 process-restart browser recovery",
    "browser_assertion_locations_only",
  ),
  first_supabase_stop: commandSpec(
    "first_fresh_database_cleanup",
    "first_supabase_stop",
    "first fresh local Supabase shutdown",
    "local_supabase_control",
  ),
  first_cleanup_container_list: commandSpec(
    "first_fresh_database_cleanup",
    "first_cleanup_container_list",
    "first cleanup C2 container inventory",
    "docker_resource_metadata_only",
  ),
  first_cleanup_volume_list: commandSpec(
    "first_fresh_database_cleanup",
    "first_cleanup_volume_list",
    "first cleanup C2 volume inventory",
    "docker_resource_metadata_only",
  ),
  first_cleanup_network_list: commandSpec(
    "first_fresh_database_cleanup",
    "first_cleanup_network_list",
    "first cleanup C2 network inventory",
    "docker_resource_metadata_only",
  ),
  second_supabase_start: commandSpec(
    "second_fresh_database_start",
    "second_supabase_start",
    "second fresh isolated local Supabase startup",
    "local_supabase_control",
  ),
  second_database_container_list: commandSpec(
    "second_fresh_database_verification",
    "second_database_container_list",
    "second fresh database container inventory",
    "docker_resource_metadata_only",
  ),
  second_verify_migrations_psql: commandSpec(
    "second_fresh_database_verification",
    "second_verify_migrations_psql",
    "verify second fresh migration inventory",
    "sql_query_body_secret",
    { queryId: "second_verify_migrations", queryDescription: "schema existence predicates" },
  ),
  second_verify_security_psql: commandSpec(
    "second_fresh_database_verification",
    "second_verify_security_psql",
    "verify second fresh security contract",
    "sql_query_body_secret",
    { queryId: "second_verify_security", queryDescription: "forced RLS and grant predicates" },
  ),
  second_empty_database_psql: commandSpec(
    "second_fresh_database_verification",
    "second_empty_database_psql",
    "verify second fresh database is empty",
    "sql_query_body_secret",
    { queryId: "second_empty_database", queryDescription: "aggregate session row count" },
  ),
  final_supabase_stop: commandSpec(
    "final_resource_cleanup",
    "final_supabase_stop",
    "final local Supabase shutdown",
    "local_supabase_control",
  ),
  final_cleanup_container_list: commandSpec(
    "final_resource_cleanup",
    "final_cleanup_container_list",
    "final C2 container inventory",
    "docker_resource_metadata_only",
  ),
  final_cleanup_volume_list: commandSpec(
    "final_resource_cleanup",
    "final_cleanup_volume_list",
    "final C2 volume inventory",
    "docker_resource_metadata_only",
  ),
  final_cleanup_network_list: commandSpec(
    "final_resource_cleanup",
    "final_cleanup_network_list",
    "final C2 network inventory",
    "docker_resource_metadata_only",
  ),
  cleanup_only_supabase_stop: commandSpec(
    "workflow_cleanup",
    "cleanup_only_supabase_stop",
    "idempotent workflow local Supabase shutdown",
    "local_supabase_control",
  ),
  cleanup_only_container_list: commandSpec(
    "workflow_cleanup",
    "cleanup_only_container_list",
    "workflow cleanup C2 container inventory",
    "docker_resource_metadata_only",
  ),
  cleanup_only_volume_list: commandSpec(
    "workflow_cleanup",
    "cleanup_only_volume_list",
    "workflow cleanup C2 volume inventory",
    "docker_resource_metadata_only",
  ),
  cleanup_only_network_list: commandSpec(
    "workflow_cleanup",
    "cleanup_only_network_list",
    "workflow cleanup C2 network inventory",
    "docker_resource_metadata_only",
  ),
});

const PRE_START_RESOURCE_SPECS = Object.freeze({
  container: COMMAND_SPECS.pre_start_container_list,
  volume: COMMAND_SPECS.pre_start_volume_list,
  network: COMMAND_SPECS.pre_start_network_list,
});
const FIRST_CLEANUP_RESOURCE_SPECS = Object.freeze({
  container: COMMAND_SPECS.first_cleanup_container_list,
  volume: COMMAND_SPECS.first_cleanup_volume_list,
  network: COMMAND_SPECS.first_cleanup_network_list,
});
const FINAL_RESOURCE_SPECS = Object.freeze({
  container: COMMAND_SPECS.final_cleanup_container_list,
  volume: COMMAND_SPECS.final_cleanup_volume_list,
  network: COMMAND_SPECS.final_cleanup_network_list,
});
const CLEANUP_ONLY_RESOURCE_SPECS = Object.freeze({
  container: COMMAND_SPECS.cleanup_only_container_list,
  volume: COMMAND_SPECS.cleanup_only_volume_list,
  network: COMMAND_SPECS.cleanup_only_network_list,
});

const args = new Set(process.argv.slice(2));
const cleanupOnly = args.has("--cleanup");
const requireCompleteCleanup = args.has("--require-complete");

function required(value, label, pattern) {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new Error(`${label} is invalid`);
  }
  return value;
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sanitizeDiagnosticText(value) {
  let output = String(value ?? "")
    .replace(/\u001b\[[0-?]*[ -\/]*[@-~]/g, "")
    .replace(/(?:\/home\/runner\/work\/_temp|\/runner\/_work\/_temp)(?:\/[^\s'\"]*)?/gi, "<runner-temp-path>")
    .replace(/[A-Za-z]:\\[^\r\n]*?\\_temp(?:\\[^\s'\"]*)?/gi, "<runner-temp-path>")
    .replace(/\/home\/runner\/work\/[^\s'\"]+/gi, "<runner-workspace-path>")
    .replace(new RegExp(REPOSITORY_ROOT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"), "<repository-root>")
    .replace(/\b(?:postgres(?:ql)?|mysql|mariadb|redis|mongodb(?:\+srv)?)?:\/\/[^\s'\"]+/gi, "<redacted-database-url>")
    .replace(/\bhttps?:\/\/[^\s\/@:]+:[^\s\/@]+@[^\s'\"]+/gi, "<redacted-credential-url>")
    .replace(/\bhttps?:\/\/[a-z0-9-]+\.supabase\.co\b[^\s'\"]*/gi, "<redacted-supabase-url>")
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer <redacted-token>")
    .replace(/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, "<redacted-jwt>")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "<redacted-email>")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "<redacted-uuid>")
    .replace(
      /((?:supabase[_ -]?)?(?:anon|service[_ -]?role|secret)?[_ -]?key|password|passwd|token|database_url|connection_string)\s*[=:]\s*(?:\"[^\"]*\"|'[^']*'|[^\s,;}\]]+)/gi,
      "$1=<redacted-secret>",
    )
    .replace(
      /((?:raw[_ -]?)?(?:problem[_ -]?body|learner[_ -]?(?:answer|body)|ocr[_ -]?(?:body|text)|repair[_ -]?(?:submission|body)|fixture[_ -]?body|provider[_ -]?(?:payload|body)|payload|request[_ -]?body|response[_ -]?body))\s*[=:]\s*(?:\"[^\"]*\"|'[^']*'|[^\s,;}\]]+)/gi,
      "$1=<redacted-body>",
    )
    .replace(/'(?:''|[^'])*'/g, "'<redacted-sql-literal>'")
    .replace(
      /\b(?=[A-Za-z0-9_-]{32,}\b)(?=[A-Za-z0-9_-]*[A-Z])(?=[A-Za-z0-9_-]*[a-z])(?=[A-Za-z0-9_-]*\d)[A-Za-z0-9_-]{32,}\b/g,
      "<redacted-long-secret>",
    );
  return output;
}

function boundedSanitizedExcerpt(value) {
  const sanitized = sanitizeDiagnosticText(value).replace(/\r\n?/g, "\n");
  const lines = sanitized.split("\n");
  let truncated = lines.length > DIAGNOSTIC_MAX_LINES;
  const retainedLineCount = truncated
    ? Math.max(1, DIAGNOSTIC_MAX_LINES - 1)
    : DIAGNOSTIC_MAX_LINES;
  let excerpt = lines.slice(-retainedLineCount).join("\n");
  const marker = "<truncated>\n";
  const availableCharacters = truncated
    ? DIAGNOSTIC_MAX_CHARS - marker.length
    : DIAGNOSTIC_MAX_CHARS;
  if (excerpt.length > availableCharacters) {
    excerpt = excerpt.slice(-Math.max(0, DIAGNOSTIC_MAX_CHARS - marker.length));
    truncated = true;
  }
  if (!truncated) return excerpt;
  return `${marker}${excerpt.slice(-Math.max(0, DIAGNOSTIC_MAX_CHARS - marker.length))}`;
}

function validateCommandSpec(specification) {
  for (const field of ["stageId", "commandId", "safeLabel", "sensitivityPolicy"]) {
    if (typeof specification?.[field] !== "string" || specification[field].length === 0) {
      throw new Error(`external command specification is missing ${field}`);
    }
  }
  if (
    !/^[a-z0-9_]+$/.test(specification.stageId) ||
    !/^[a-z0-9_]+$/.test(specification.commandId) ||
    /[\r\n]/.test(specification.safeLabel) ||
    specification.safeLabel.length > 160
  ) {
    throw new Error("external command specification has an unsafe identity field");
  }
  if (!COMMAND_SENSITIVITY_POLICIES.includes(specification.sensitivityPolicy)) {
    throw new Error("external command specification has an unknown sensitivity policy");
  }
  if (
    specification.sensitivityPolicy === "sql_query_body_secret" &&
    (typeof specification.queryId !== "string" ||
      specification.queryId.length === 0 ||
      typeof specification.queryDescription !== "string" ||
      specification.queryDescription.length === 0)
  ) {
    throw new Error("SQL command specification is missing safe query metadata");
  }
  return specification;
}

function safeExecutable(command) {
  const name = path.basename(command);
  if (command === process.execPath || /^node(?:\.exe)?$/i.test(name)) return "node";
  return name || "<external-command>";
}

function sanitizedArgv(command, commandArgs, specification) {
  const safe = [safeExecutable(command)];
  for (let index = 0; index < commandArgs.length; index += 1) {
    const value = String(commandArgs[index]);
    if (value === "--workdir") {
      safe.push(value, "<runner-temp-workdir>");
      index += 1;
      continue;
    }
    if (value === "--command") {
      const sql = String(commandArgs[index + 1] ?? "");
      safe.push(
        value,
        `<sql query_id=${specification.queryId ?? "undeclared"} sha256=${sha256(sql)} shape=${specification.queryDescription ?? "undeclared"}>`,
      );
      index += 1;
      continue;
    }
    if (value === "-e" || value === "--eval") {
      safe.push(value, "<inline-script>");
      index += 1;
      continue;
    }
    const normalized = value.startsWith(`${REPOSITORY_ROOT}${path.sep}`)
      ? `<repository-root>/${path.relative(REPOSITORY_ROOT, value).split(path.sep).join("/")}`
      : value.replace(
        /--config=(?:\/home\/runner\/work\/[^\s]+|[^\s]+)/,
        (match) => match.startsWith("--config=")
          ? `--config=${match.slice("--config=".length).startsWith(REPOSITORY_ROOT)
            ? `<repository-root>/${path.relative(REPOSITORY_ROOT, match.slice("--config=".length)).split(path.sep).join("/")}`
            : "<config-path>"}`
          : match,
      );
    safe.push(sanitizeDiagnosticText(normalized));
  }
  return Object.freeze(safe);
}

class SanitizedCommandFailure extends Error {
  constructor(fields) {
    super("sanitized external command failure");
    this.name = "SanitizedCommandFailure";
    this.stageId = /^[a-z0-9_]+$/.test(fields.stageId) ? fields.stageId : "invalid_stage";
    this.commandId = /^[a-z0-9_]+$/.test(fields.commandId)
      ? fields.commandId
      : "invalid_command";
    this.safeLabel = boundedSanitizedExcerpt(fields.safeLabel)
      .replace(/[\r\n]+/g, " ")
      .slice(0, 160);
    this.status = Number.isInteger(fields.status) ? fields.status : null;
    this.signal = typeof fields.signal === "string" && /^[A-Z0-9]+$/.test(fields.signal)
      ? fields.signal
      : null;
    this.safeArgv = Object.freeze(
      (Array.isArray(fields.safeArgv) ? fields.safeArgv : []).map((value) =>
        sanitizeDiagnosticText(value),
      ),
    );
    this.stdoutExcerpt = boundedSanitizedExcerpt(fields.stdoutExcerpt);
    this.stderrExcerpt = boundedSanitizedExcerpt(fields.stderrExcerpt);
  }

  toSafeObject() {
    return {
      stageId: this.stageId,
      commandId: this.commandId,
      safeLabel: this.safeLabel,
      status: this.status,
      signal: this.signal,
      safeArgv: this.safeArgv,
      stdoutExcerpt: this.stdoutExcerpt,
      stderrExcerpt: this.stderrExcerpt,
    };
  }
}

function sanitizedCommandFailure(command, commandArgs, specification, result, overrides = {}) {
  const spec = validateCommandSpec(specification);
  const errorText = result.error instanceof Error ? result.error.message : "";
  return new SanitizedCommandFailure({
    stageId: spec.stageId,
    commandId: spec.commandId,
    safeLabel: spec.safeLabel,
    status: Number.isInteger(result.status) ? result.status : null,
    signal: typeof result.signal === "string" ? result.signal : null,
    safeArgv: sanitizedArgv(command, commandArgs, spec),
    stdoutExcerpt: boundedSanitizedExcerpt(overrides.stdout ?? result.stdout ?? ""),
    stderrExcerpt: boundedSanitizedExcerpt(
      overrides.stderr ?? [result.stderr ?? "", errorText].filter(Boolean).join("\n"),
    ),
  });
}

function formatRuntimeFailure(error) {
  if (!(error instanceof SanitizedCommandFailure)) {
    return `wcv-c2-runtime-verification: ${boundedSanitizedExcerpt(error?.message ?? error)}`;
  }
  const safe = error.toSafeObject();
  return [
    "wcv-c2-runtime-verification: sanitized command failure",
    `stage_id: ${safe.stageId}`,
    `command_id: ${safe.commandId}`,
    `safe_label: ${safe.safeLabel}`,
    `status: ${safe.status ?? "unavailable"}`,
    `signal: ${safe.signal ?? "none"}`,
    `safe_argv: ${JSON.stringify(safe.safeArgv)}`,
    "stdout_tail:",
    safe.stdoutExcerpt || "<empty>",
    "stderr_tail:",
    safe.stderrExcerpt || "<empty>",
  ].join("\n");
}

function commandEnvironment() {
  const environment = { ...process.env };
  for (const name of Object.keys(environment)) {
    if (
      name.startsWith("SUPABASE_") ||
      /^(?:DATABASE_URL|POSTGRES_URL|POSTGRES_PRISMA_URL|POSTGRES_URL_NON_POOLING)$/.test(name)
    ) {
      delete environment[name];
    }
  }
  environment.CI = "true";
  environment.SUPABASE_TELEMETRY_DISABLED = "1";
  environment.DO_NOT_TRACK = "1";
  return environment;
}

function run(command, commandArgs, options = {}) {
  const specification = validateCommandSpec(options.commandSpec);
  const result = spawnSync(command, commandArgs, {
    cwd: options.cwd ?? REPOSITORY_ROOT,
    encoding: "utf8",
    env: options.env ?? commandEnvironment(),
    maxBuffer: 32 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error) {
    if (options.allowFailure) return result;
    throw sanitizedCommandFailure(command, commandArgs, specification, result);
  }
  if (result.status !== 0 && !options.allowFailure) {
    throw sanitizedCommandFailure(command, commandArgs, specification, result);
  }
  return result;
}

function gitHead() {
  return run("git", ["rev-parse", "HEAD"], {
    commandSpec: COMMAND_SPECS.git_head_verification,
  })
    .stdout.trim().toLowerCase();
}

function verifyExactHead(headSha) {
  if (gitHead() !== headSha) throw new Error("checkout is not the exact PR head");
}

function docker(commandArgs, options = {}) {
  return run("docker", commandArgs, options);
}

function supabase(commandArgs, options = {}) {
  const executable = process.execPath;
  return run(executable, [
    path.join(REPOSITORY_ROOT, "node_modules/supabase/dist/supabase.js"),
    ...commandArgs,
  ], {
    ...options,
  });
}

function runtimeRoot() {
  const root = path.resolve(
    process.env[
      THEORY_RUNTIME
        ? "C2R_C_T_SUPABASE_WORKDIR"
        : "C2R_C_P_SUPABASE_WORKDIR"
    ] ??
      path.join(
        REPOSITORY_ROOT,
        THEORY_RUNTIME
          ? ".agent-factory/c2r-c-t-supabase-runtime"
          : ".agent-factory/c2r-c-p-supabase-runtime",
      ),
  );
  const allowedRoot = path.resolve(
    process.env.RUNNER_TEMP ?? path.join(REPOSITORY_ROOT, ".agent-factory"),
  );
  if (root === allowedRoot || !root.startsWith(`${allowedRoot}${path.sep}`)) {
    throw new Error("C2 runtime workdir is outside the bounded temporary root");
  }
  return root;
}

function prepareRuntimeWorkdir(root) {
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync(root, { recursive: true });
  fs.cpSync(path.join(SOURCE_WORKDIR, "supabase"), path.join(root, "supabase"), {
    recursive: true,
  });
  if (THEORY_RUNTIME) {
    const configPath = path.join(root, "supabase/config.toml");
    const source = fs.readFileSync(configPath, "utf8");
    const expected = 'project_id = "c2r-c-p-practice-repair"';
    if (source.split(expected).length !== 2) {
      throw new Error("C2 runtime project identity source is not exact");
    }
    fs.writeFileSync(
      configPath,
      source.replace(expected, `project_id = "${PROJECT_ID}"`),
      { encoding: "utf8", mode: 0o600 },
    );
    const browserConfigSource = fs.readFileSync(BROWSER_CONFIG_PATH, "utf8");
    const practiceMatch =
      'testMatch: "c2r-c-p-practice-trusted-repair-runtime.spec.ts"';
    if (browserConfigSource.split(practiceMatch).length !== 2) {
      throw new Error("C2 browser runtime test match source is not exact");
    }
    fs.writeFileSync(
      BROWSER_RUNTIME_CONFIG_PATH,
      browserConfigSource.replace(
        practiceMatch,
        'testMatch: "c2r-c-t-theory-trusted-repair-runtime.spec.ts"',
      ),
      { encoding: "utf8", mode: 0o600 },
    );
  }
  for (const migrationPath of C2_MIGRATION_PATHS) {
    fs.copyFileSync(
      migrationPath,
      path.join(root, "supabase/migrations", path.basename(migrationPath)),
    );
  }
}

function localSourceFiles() {
  const files = [];
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else files.push(absolute);
    }
  };
  visit(path.join(SOURCE_WORKDIR, "supabase"));
  files.push(...C2_MIGRATION_PATHS, BROWSER_CONFIG_PATH, BROWSER_SPEC_PATH);
  return files.sort();
}

function verifyLocalOnlySource() {
  for (const file of localSourceFiles()) {
    const content = fs.readFileSync(file, "utf8");
    for (const forbidden of FORBIDDEN_LOCAL_SOURCE) {
      if (forbidden.test(content)) {
        throw new Error(`forbidden remote Supabase surface in ${path.relative(REPOSITORY_ROOT, file)}`);
      }
    }
  }
}

function migrationMetadata() {
  const files = [
    ...fs.readdirSync(path.join(SOURCE_WORKDIR, "supabase/migrations"))
      .map((name) => path.join(SOURCE_WORKDIR, "supabase/migrations", name)),
    ...C2_MIGRATION_PATHS,
  ];
  return files
    .filter((file) => /^\d{14}_[a-z0-9_]+\.sql$/.test(path.basename(file)))
    .sort()
    .map((file) => ({
      identity: path.basename(file).replace(/\.sql$/, ""),
      sha256: sha256(fs.readFileSync(file)),
    }));
}

function matchingDockerResources(kind, specification, options = {}) {
  const format = kind === "container" ? "{{.Names}}" : "{{.Name}}";
  const commandArgs =
    kind === "container"
      ? ["ps", ...(options.includeStopped === false ? [] : ["--all"]), "--format", format]
      : [kind, "ls", "--format", format];
  return docker(commandArgs, { commandSpec: specification }).stdout
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter((value) => value.includes(PROJECT_ID));
}

function dockerResourceSnapshot(resourceSpecs) {
  return {
    containers: matchingDockerResources("container", resourceSpecs.container),
    volumes: matchingDockerResources("volume", resourceSpecs.volume),
    networks: matchingDockerResources("network", resourceSpecs.network),
  };
}

function assertNoDockerResources(label, resourceSpecs) {
  const snapshot = dockerResourceSnapshot(resourceSpecs);
  if (snapshot.containers.length || snapshot.volumes.length || snapshot.networks.length) {
    throw new Error(`${label} left C2 Docker resources behind`);
  }
  return snapshot;
}

function stopStack(root, specification, allowFailure = false) {
  return supabase(
    [
      "stop",
      "--workdir",
      root,
      "--project-id",
      PROJECT_ID,
      "--no-backup",
      "--yes",
    ],
    { allowFailure, commandSpec: specification },
  );
}

function cleanup(root, requireComplete, dependencies = {}) {
  const stopStackFn = dependencies.stopStackFn ?? stopStack;
  const assertNoDockerResourcesFn =
    dependencies.assertNoDockerResourcesFn ?? assertNoDockerResources;
  let snapshot;
  try {
    if (fs.existsSync(path.join(root, "supabase/config.toml"))) {
      // The verifier normally removes the stack itself. A second workflow-level
      // cleanup must therefore be idempotent: the CLI may report no running
      // project, while the resource assertion below remains authoritative.
      stopStackFn(root, COMMAND_SPECS.cleanup_only_supabase_stop, true);
    }
    snapshot = assertNoDockerResourcesFn(
      "local Supabase cleanup",
      CLEANUP_ONLY_RESOURCE_SPECS,
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
    if (THEORY_RUNTIME) {
      fs.rmSync(BROWSER_RUNTIME_CONFIG_PATH, { force: true });
    }
  }
  if (requireComplete && (snapshot.containers.length || snapshot.volumes.length || snapshot.networks.length)) {
    throw new Error("complete C2 cleanup was not established");
  }
  return snapshot;
}

function parseJsonOutput(value, label) {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error(`${label} did not return JSON`);
  try {
    return JSON.parse(value.slice(start, end + 1));
  } catch {
    throw new Error(`${label} returned invalid JSON`);
  }
}

function maskLocalValues(status) {
  for (const [name, value] of Object.entries(status)) {
    if (
      typeof value === "string" &&
      value.length >= 8 &&
      /(?:KEY|SECRET|PASSWORD|TOKEN|DB_URL)/i.test(name)
    ) {
      process.stdout.write(`::add-mask::${value}\n`);
    }
  }
}

function statusValue(status, names, label) {
  for (const name of names) {
    const value = status[name];
    if (typeof value === "string" && value.length > 0) return value;
  }
  throw new Error(`${label} is missing from local Supabase status`);
}

async function apiRequest(apiUrl, anonKey, requestPath, options = {}) {
  const response = await fetch(`${apiUrl}${requestPath}`, {
    method: options.method ?? "GET",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${options.accessToken ?? anonKey}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(options.prefer ? { Prefer: options.prefer } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  let body = null;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(`${options.label ?? "local API request"} returned non-JSON`);
    }
  }
  return { status: response.status, body };
}

async function createSyntheticIdentity(apiUrl, anonKey, suffix) {
  const nonce = crypto.randomBytes(8).toString("hex");
  const password = `WcvC2!${crypto.randomBytes(18).toString("base64url")}9a`;
  const email = `wcv-c2-${suffix}-${nonce}@localhost.test`;
  const result = await apiRequest(apiUrl, anonKey, "/auth/v1/signup", {
    method: "POST",
    body: {
      email,
      password,
    },
    label: "local Auth signup",
  });
  if (result.status !== 200) throw new Error("local Auth signup failed");
  const userId = result.body?.user?.id;
  const accessToken = result.body?.access_token;
  required(userId, "synthetic Auth user id", UUID_PATTERN);
  if (typeof accessToken !== "string" || accessToken.length < 32) {
    throw new Error("local Auth signup returned no session token");
  }
  process.stdout.write(`::add-mask::${accessToken}\n`);
  return { userId, accessToken, email, password };
}

function expectStatus(result, allowed, label) {
  if (!allowed.includes(result.status)) {
    throw new Error(`${label} returned unexpected status ${result.status}`);
  }
}

function activeStackIdentity() {
  const containers = matchingDockerResources(
    "container",
    COMMAND_SPECS.active_container_list,
    { includeStopped: false },
  );
  for (const prefix of REQUIRED_CONTAINER_PREFIXES) {
    if (!containers.some((name) => name.startsWith(prefix))) {
      throw new Error(`required local Supabase service ${prefix} is not running`);
    }
  }
  const databaseContainer = containers.find((name) => name.startsWith("supabase_db_"));
  const identity = docker([
    "inspect",
    "--format",
    "{{.Config.Image}}|{{.Image}}",
    databaseContainer,
  ], { commandSpec: COMMAND_SPECS.database_image_inspect }).stdout.trim();
  const [reference, digest] = identity.split("|");
  if (!reference || !IMAGE_DIGEST_PATTERN.test(digest ?? "")) {
    throw new Error("local database image identity is invalid");
  }
  return { reference, digest, databaseContainer };
}

function databaseQuery(databaseContainer, specification, sql) {
  return docker([
    "exec",
    databaseContainer,
    "psql",
    "--username",
    "postgres",
    "--dbname",
    "postgres",
    "--no-psqlrc",
    "--tuples-only",
    "--no-align",
    "--set",
    "ON_ERROR_STOP=1",
    "--command",
    sql,
  ], { commandSpec: specification }).stdout.trim();
}

function verifyMigrationsApplied(databaseContainer, specification) {
  const result = databaseQuery(
    databaseContainer,
    specification,
    `select concat_ws('|',
      (to_regclass('public.wcv_c2_preflight_tenant_probe') is not null)::text,
      (to_regclass('public.wcv_c2_trusted_repair_sessions') is not null)::text,
      (to_regclass('public.wcv_c2_trusted_repair_private_artifacts') is not null)::text,
      (to_regclass('public.wcv_c2_trusted_repair_exposure_events') is not null)::text,
      (to_regprocedure('public.wcv_c2_apply_trusted_repair_transition_v1(uuid,uuid,uuid,bigint,text,text,jsonb,uuid,text,text,smallint,boolean,jsonb,jsonb)') is not null)::text
    );`,
  );
  if (result !== "true|true|true|true|true") {
    throw new Error("empty-state C2 migrations were not fully applied");
  }
}

function verifyTheoryMigrationReplay(databaseContainer) {
  if (!THEORY_RUNTIME) return;
  databaseQuery(
    databaseContainer,
    COMMAND_SPECS.theory_migration_replay_psql,
    fs.readFileSync(THEORY_MIGRATION_PATH, "utf8"),
  );
  const constraintCount = databaseQuery(
    databaseContainer,
    COMMAND_SPECS.theory_subject_binding_count_psql,
    `select count(*) from pg_constraint
     where conrelid='public.wcv_c2_trusted_repair_sessions'::regclass
       and conname='wcv_c2_trusted_repair_sessions_subject_binding_check';`,
  );
  if (constraintCount !== "1") {
    throw new Error("Theory migration replay did not retain exactly one subject-binding constraint");
  }
}

function verifyDatabaseSecurityContract(databaseContainer, specification) {
  const result = databaseQuery(
    databaseContainer,
    specification,
    `select concat_ws('|',
      (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
       where n.nspname='public' and c.relname like 'wcv_c2_trusted_repair_%'
         and c.relkind='r' and c.relrowsecurity and c.relforcerowsecurity),
      has_table_privilege('authenticated','public.wcv_c2_trusted_repair_sessions','SELECT')::text,
      has_table_privilege('authenticated','public.wcv_c2_trusted_repair_sessions','INSERT')::text,
      has_table_privilege('authenticated','public.wcv_c2_trusted_repair_private_artifacts','SELECT')::text,
      has_function_privilege('authenticated','public.wcv_c2_create_trusted_repair_session_v1(jsonb,jsonb,uuid)','EXECUTE')::text,
      has_function_privilege('service_role','public.wcv_c2_create_trusted_repair_session_v1(jsonb,jsonb,uuid)','EXECUTE')::text
    );`,
  );
  if (result !== "5|false|false|false|false|true") {
    throw new Error("C2 grants, forced RLS, or RPC privileges are not exact");
  }
}

function nextEnvironment(input) {
  const enabledSubjects =
    input.enabledSubjects ?? (THEORY_RUNTIME ? "theory" : "practice");
  if (!["practice", "theory", "both"].includes(enabledSubjects)) {
    throw new Error("local Next server subject mode is invalid");
  }
  return {
    ...commandEnvironment(),
    NEXT_PUBLIC_SUPABASE_URL: input.apiUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: input.anonKey,
    SUPABASE_SERVICE_ROLE_KEY: input.serviceRoleKey,
    ALPHA_ADMIN_EMAILS: `${input.userA.email},${input.userB.email}`,
    WCV_C2R_C_P_OWNER_EMAILS: `${input.userA.email},${input.userB.email}`,
    WCV_C2R_C_P_PRACTICE_ENABLED:
      input.enabled && ["practice", "both"].includes(enabledSubjects)
        ? "true"
        : "false",
    WCV_C2R_C_T_OWNER_EMAILS: `${input.userA.email},${input.userB.email}`,
    WCV_C2R_C_T_THEORY_ENABLED:
      input.enabled && ["theory", "both"].includes(enabledSubjects)
        ? "true"
        : "false",
    NEXT_TELEMETRY_DISABLED: "1",
  };
}

async function waitForHttp(url, processHandle, command) {
  const deadline = Date.now() + 120_000;
  let spawnError = null;
  processHandle.once("error", (error) => {
    spawnError = error;
  });
  while (Date.now() < deadline) {
    if (spawnError) {
      throw sanitizedCommandFailure(
        command.executable,
        command.args,
        command.specification,
        { error: spawnError, status: null, signal: processHandle.signalCode },
      );
    }
    if (processHandle.exitCode !== null) {
      throw sanitizedCommandFailure(
        command.executable,
        command.args,
        command.specification,
        { status: processHandle.exitCode, signal: processHandle.signalCode },
        { stderr: "local Next server exited before becoming ready" },
      );
    }
    try {
      const response = await fetch(`${url}/login`, { redirect: "manual" });
      if (response.status >= 200 && response.status < 500) return;
    } catch {
      // The server may still be compiling its first route.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw sanitizedCommandFailure(
    command.executable,
    command.args,
    command.specification,
    { status: processHandle.exitCode, signal: processHandle.signalCode },
    { stderr: "local Next server did not become ready within the bounded deadline" },
  );
}

async function startNext(input) {
  const port = input.port ?? 3100;
  const baseUrl = `http://127.0.0.1:${port}`;
  const executable = process.execPath;
  const commandArgs = [
    path.join(REPOSITORY_ROOT, "node_modules/next/dist/bin/next"),
    "dev",
    "--hostname",
    "127.0.0.1",
    "--port",
    String(port),
  ];
  const specification = validateCommandSpec(input.commandSpec);
  const processHandle = spawn(
    executable,
    commandArgs,
    {
      cwd: REPOSITORY_ROOT,
      env: nextEnvironment(input),
      stdio: "ignore",
      detached: false,
    },
  );
  await waitForHttp(baseUrl, processHandle, {
    executable,
    args: commandArgs,
    specification,
  });
  return { processHandle, baseUrl };
}

async function stopNext(server) {
  if (!server || server.processHandle.exitCode !== null) return;
  server.processHandle.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => server.processHandle.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 10_000)),
  ]);
  if (server.processHandle.exitCode === null) {
    server.processHandle.kill("SIGKILL");
    await new Promise((resolve) => server.processHandle.once("exit", resolve));
  }
}

async function verifyFlagOffBeforeBodyParsing(nextInput, databaseContainer) {
  const before = Number(
    databaseQuery(
      databaseContainer,
      COMMAND_SPECS.flag_off_session_count_before_psql,
      "select count(*) from public.wcv_c2_trusted_repair_sessions;",
    ),
  );
  const server = await startNext({
    ...nextInput,
    enabled: false,
    commandSpec: COMMAND_SPECS.next_flag_off_start,
  });
  try {
    const response = await fetch(`${server.baseUrl}/api/review-os/trusted-repair`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{this-is-not-json",
    });
    if (response.status !== 404) {
      throw new Error("default-OFF API did not fail closed before body parsing");
    }
    const body = await response.json();
    if (body?.error !== "not_found") {
      throw new Error("default-OFF API returned an unsafe error shape");
    }
  } finally {
    await stopNext(server);
  }
  const after = Number(
    databaseQuery(
      databaseContainer,
      COMMAND_SPECS.flag_off_session_count_after_psql,
      "select count(*) from public.wcv_c2_trusted_repair_sessions;",
    ),
  );
  if (before !== after) throw new Error("default-OFF drill wrote a C2 session");
}

function playwrightEnvironment(input) {
  return {
    ...commandEnvironment(),
    E2E_BASE_URL: input.baseUrl,
    WCV_C2_USER_A_EMAIL: input.userA.email,
    WCV_C2_USER_A_PASSWORD: input.userA.password,
    WCV_C2_USER_B_EMAIL: input.userB.email,
    WCV_C2_USER_B_PASSWORD: input.userB.password,
    WCV_C2_BROWSER_EVIDENCE_PATH: input.browserEvidencePath,
    ...(input.recoverySessionId
      ? { WCV_C2_RECOVERY_SESSION_ID: input.recoverySessionId }
      : {}),
    ...(input.crossSubjectReplayPhase
      ? {
          WCV_C2_CROSS_SUBJECT_REPLAY_PHASE:
            input.crossSubjectReplayPhase,
          WCV_C2_CROSS_SUBJECT_THEORY_COMMAND_ID:
            input.crossSubjectTheoryCommandId,
          WCV_C2_CROSS_SUBJECT_PRACTICE_COMMAND_ID:
            input.crossSubjectPracticeCommandId,
        }
      : {}),
  };
}

function sanitizedBrowserFailureLocations(result) {
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const locations = [];
  const escapedSpec = path
    .basename(BROWSER_SPEC_PATH)
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const match of output.matchAll(
    new RegExp(`${escapedSpec}:(\\d+):\\d+`, "g"),
  )) {
    if (!locations.includes(match[1])) locations.push(match[1]);
  }
  return locations.slice(-5);
}

const THEORY_DIAGNOSTIC_KEYS = Object.freeze([
  "postState",
  "preState",
  "proofEvaluationState",
  "proofReasonCodeIds",
  "recordVersion",
  "responseStatus",
  "safeErrorCode",
  "theoryStructuredConfirmationExisted",
]);
const THEORY_DIAGNOSTIC_STATES = new Set([
  "start",
  "editable_capture_draft",
  "revision_confirmed",
  "prediction_committed",
  "independent_attempt_committed",
  "self_diagnosis_committed",
  "diagnosed",
  "exposure_committed",
  "repair_submitted",
  "verified",
  "partial",
  "blocked",
]);
const THEORY_DIAGNOSTIC_PROOF_STATES = new Set([
  "PASS",
  "PARTIAL",
  "AMBIGUOUS",
  "BLOCKED",
  "UNSUPPORTED",
]);
const THEORY_DIAGNOSTIC_ERROR_CODES = new Set([
  "invalid_input",
  "not_found",
  "stale_record",
  "invalid_transition",
  "temporarily_unavailable",
]);

function validateTheoryConfirmationDiagnostic(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Theory confirmation diagnostic is not an object");
  }
  const keys = Object.keys(value).sort();
  if (JSON.stringify(keys) !== JSON.stringify(THEORY_DIAGNOSTIC_KEYS)) {
    throw new Error("Theory confirmation diagnostic fields are not exact");
  }
  if (!THEORY_DIAGNOSTIC_STATES.has(value.preState)) {
    throw new Error("Theory confirmation diagnostic pre-state is invalid");
  }
  if (
    !Number.isInteger(value.responseStatus) ||
    value.responseStatus < 100 ||
    value.responseStatus > 599
  ) {
    throw new Error("Theory confirmation diagnostic response status is invalid");
  }
  if (
    value.safeErrorCode !== null &&
    !THEORY_DIAGNOSTIC_ERROR_CODES.has(value.safeErrorCode)
  ) {
    throw new Error("Theory confirmation diagnostic error code is invalid");
  }
  if (
    value.postState !== null &&
    !THEORY_DIAGNOSTIC_STATES.has(value.postState)
  ) {
    throw new Error("Theory confirmation diagnostic post-state is invalid");
  }
  if (
    value.proofEvaluationState !== null &&
    !THEORY_DIAGNOSTIC_PROOF_STATES.has(value.proofEvaluationState)
  ) {
    throw new Error("Theory confirmation diagnostic proof state is invalid");
  }
  if (
    !Array.isArray(value.proofReasonCodeIds) ||
    value.proofReasonCodeIds.length > 16 ||
    value.proofReasonCodeIds.some(
      (reason) =>
        typeof reason !== "string" ||
        reason.length > 120 ||
        !/^[a-z0-9_:-]+$/.test(reason),
    )
  ) {
    throw new Error("Theory confirmation diagnostic proof reasons are invalid");
  }
  if (
    value.recordVersion !== null &&
    (!Number.isInteger(value.recordVersion) || value.recordVersion < 1)
  ) {
    throw new Error("Theory confirmation diagnostic record version is invalid");
  }
  if (typeof value.theoryStructuredConfirmationExisted !== "boolean") {
    throw new Error("Theory confirmation diagnostic confirmation flag is invalid");
  }
  return value;
}

function theoryConfirmationDiagnostics(value, requireComplete) {
  if (
    !value ||
    typeof value !== "object" ||
    !Array.isArray(value.finalTheoryConfirmations) ||
    value.finalTheoryConfirmations.length < 1 ||
    value.finalTheoryConfirmations.length > 3
  ) {
    throw new Error("Theory confirmation diagnostic inventory is invalid");
  }
  const diagnostics = value.finalTheoryConfirmations.map(
    validateTheoryConfirmationDiagnostic,
  );
  if (requireComplete) {
    if (diagnostics.length !== 3) {
      throw new Error("Theory confirmation diagnostic inventory is incomplete");
    }
    for (const diagnostic of diagnostics) {
      if (
        diagnostic.preState !== "repair_submitted" ||
        diagnostic.responseStatus !== 200 ||
        diagnostic.safeErrorCode !== null ||
        diagnostic.postState !== "verified" ||
        diagnostic.proofEvaluationState !== "PASS" ||
        diagnostic.proofReasonCodeIds.length !== 0 ||
        diagnostic.recordVersion === null ||
        diagnostic.theoryStructuredConfirmationExisted !== true
      ) {
        throw new Error("Theory confirmation diagnostic did not prove exact success");
      }
    }
  }
  return diagnostics;
}

function browserFailureFromResult(
  executable,
  commandArgs,
  specification,
  result,
  browserEvidencePath,
) {
  const spec = validateCommandSpec(specification);
  if (spec.sensitivityPolicy !== "browser_assertion_locations_only") {
    throw new Error("browser failure command has an invalid sensitivity policy");
  }
  const locations = sanitizedBrowserFailureLocations(result);
  let safeDiagnostic = "";
  if (THEORY_RUNTIME && fs.existsSync(browserEvidencePath)) {
    try {
      const evidence = JSON.parse(fs.readFileSync(browserEvidencePath, "utf8"));
      const diagnostics = theoryConfirmationDiagnostics(evidence, false);
      safeDiagnostic = `; final_theory_confirmation=${JSON.stringify(diagnostics.at(-1))}`;
    } catch {
      safeDiagnostic = "; final_theory_confirmation=unavailable_or_invalid";
    }
  }
  const stderr = (locations.length
    ? `browser assertions failed at sanitized assertion line(s) ${locations.join(",")}`
    : "browser assertions failed with no safe assertion location") + safeDiagnostic;
  return sanitizedCommandFailure(
    executable,
    commandArgs,
    spec,
    result,
    { stdout: "", stderr },
  );
}

function runBrowserSuite(input) {
  const grepArgs = input.recoverySessionId
    ? ["--grep", "process restart recovers"]
    : ["--grep-invert", "process restart recovers"];
  const specification = input.recoverySessionId
    ? COMMAND_SPECS.browser_recovery
    : COMMAND_SPECS.browser_acceptance;
  const executable = process.execPath;
  const commandArgs = [
    path.join(REPOSITORY_ROOT, "node_modules/@playwright/test/cli.js"),
    "test",
    BROWSER_SPEC_PATH,
    `--config=${BROWSER_RUNTIME_CONFIG_PATH}`,
    ...grepArgs,
  ];
  const result = run(
    executable,
    commandArgs,
    {
      commandSpec: specification,
      env: playwrightEnvironment(input),
      allowFailure: true,
    },
  );
  if (result.status !== 0) {
    throw browserFailureFromResult(
      executable,
      commandArgs,
      specification,
      result,
      input.browserEvidencePath,
    );
  }
}

function runCrossSubjectReplayBrowser(input) {
  if (!THEORY_RUNTIME) {
    throw new Error("cross-subject replay browser checks require the Theory runtime");
  }
  const executable = process.execPath;
  const commandArgs = [
    path.join(REPOSITORY_ROOT, "node_modules/@playwright/test/cli.js"),
    "test",
    BROWSER_SPEC_PATH,
    `--config=${BROWSER_RUNTIME_CONFIG_PATH}`,
    "--grep",
    input.testName,
  ];
  const result = run(executable, commandArgs, {
    commandSpec: input.commandSpec,
    env: playwrightEnvironment(input),
    allowFailure: true,
  });
  if (result.status !== 0) {
    throw browserFailureFromResult(
      executable,
      commandArgs,
      input.commandSpec,
      result,
      input.browserEvidencePath,
    );
  }
}

async function verifyDirectRls(input) {
  const anonRead = await apiRequest(
    input.apiUrl,
    input.anonKey,
    "/rest/v1/wcv_c2_trusted_repair_sessions?select=id",
    { label: "anonymous C2 session read" },
  );
  expectStatus(anonRead, [401, 403], "anonymous C2 session read");

  const authenticatedRead = await apiRequest(
    input.apiUrl,
    input.anonKey,
    "/rest/v1/wcv_c2_trusted_repair_sessions?select=id,state_data",
    {
      accessToken: input.userA.accessToken,
      label: "authenticated canonical session read",
    },
  );
  expectStatus(
    authenticatedRead,
    [401, 403],
    "authenticated canonical session read",
  );

  const authenticatedInsert = await apiRequest(
    input.apiUrl,
    input.anonKey,
    "/rest/v1/wcv_c2_trusted_repair_sessions",
    {
      method: "POST",
      accessToken: input.userA.accessToken,
      body: {},
      label: "authenticated canonical session insert",
    },
  );
  expectStatus(authenticatedInsert, [401, 403], "authenticated canonical session insert");

  const privateRead = await apiRequest(
    input.apiUrl,
    input.anonKey,
    "/rest/v1/wcv_c2_trusted_repair_private_artifacts?select=id",
    {
      accessToken: input.userA.accessToken,
      label: "authenticated private artifact read",
    },
  );
  expectStatus(privateRead, [401, 403], "authenticated private artifact read");

  const directRpc = await apiRequest(
    input.apiUrl,
    input.anonKey,
    "/rest/v1/rpc/wcv_c2_create_trusted_repair_session_v1",
    {
      method: "POST",
      accessToken: input.userA.accessToken,
      body: {},
      label: "authenticated direct C2 RPC",
    },
  );
  expectStatus(directRpc, [401, 403, 404], "authenticated direct C2 RPC");
}

function verifyPersistedRuntime(databaseContainer) {
  if (THEORY_RUNTIME) {
    const assertionIds = [
      "sessions_present",
      "private_artifacts_present",
      "exposure_events_present",
      "command_receipts_present",
      "exposure_revision_binding_closed",
      "theory_only_sessions",
      "verified_requires_target_scoped_predicate_pass",
      "private_artifacts_immutable",
      "corrected_partial_retry_verified",
      "second_failed_retry_remains_partial",
      "partial_retry_artifact_limit_enforced",
    ];
    const result = databaseQuery(
      databaseContainer,
      COMMAND_SPECS.verify_persisted_runtime_psql,
      `select concat_ws('|',
        (select (count(*) > 0)::text from public.wcv_c2_trusted_repair_sessions),
        (select (count(*) > 0)::text from public.wcv_c2_trusted_repair_private_artifacts),
        (select (count(*) > 0)::text from public.wcv_c2_trusted_repair_exposure_events),
        (select (count(*) > 0)::text from public.wcv_c2_trusted_repair_command_receipts),
        (select (count(*) = 0)::text from public.wcv_c2_trusted_repair_exposure_events e
          left join public.wcv_c2_trusted_repair_private_artifacts a
            on a.id=e.revision_id and a.session_id=e.session_id and a.user_id=e.user_id
          where a.id is null),
        (select (count(*) = 0)::text from public.wcv_c2_trusted_repair_sessions
          where subject <> 'appraisal_theory'),
        (select (count(*) = 0)::text from public.wcv_c2_trusted_repair_sessions
          where state='verified' and (
            jsonb_typeof(state_data->'structuredClaim') is distinct from 'object'
            or state_data->'structuredClaim'->>'sourceRevisionId'
              is distinct from confirmed_revision_id::text
            or state_data->'structuredClaim'->>'targetScopeId'
              is distinct from 'theory-target:synthetic-income-approach'
            or state_data->'proofEvaluation'->>'state' is distinct from 'PASS'
            or state_data->'proofEvaluation'->>'validatorId'
              is distinct from 'validator:theory-scoped-predicate@1'
            or state_data->'proofEvaluation'->>'targetScopeId'
              is distinct from 'theory-target:synthetic-income-approach'
          )),
        (select (count(*) = 0)::text from public.wcv_c2_trusted_repair_private_artifacts where immutable is not true),
        (select exists(
          select 1 from public.wcv_c2_trusted_repair_sessions s
          where s.state='verified' and (
            select count(*) from public.wcv_c2_trusted_repair_private_artifacts a
            where a.session_id=s.id and a.user_id=s.user_id
              and a.artifact_kind='repair_submission'
          )=2
        )::text),
        (select exists(
          select 1 from public.wcv_c2_trusted_repair_sessions s
          where s.state='partial' and (
            select count(*) from public.wcv_c2_trusted_repair_private_artifacts a
            where a.session_id=s.id and a.user_id=s.user_id
              and a.artifact_kind='repair_submission'
          )=2
        )::text),
        (select (not exists(
          select 1 from public.wcv_c2_trusted_repair_private_artifacts a
          where a.artifact_kind='repair_submission'
          group by a.session_id, a.user_id having count(*) > 2
        ))::text)
      );`,
    );
    const values = result.split("|");
    const failed = assertionIds.filter((_, index) => values[index] !== "true");
    if (failed.length > 0 || values.length !== assertionIds.length) {
      throw new Error(
        `persisted C2 Theory runtime invariants failed: ${failed.join(",") || "shape"}`,
      );
    }
    return;
  }
  const assertionIds = [
    "sessions_present",
    "private_artifacts_present",
    "exposure_events_present",
    "command_receipts_present",
    "exposure_revision_binding_closed",
    "practice_only_sessions",
    "verified_requires_structured_claim_pass",
    "private_artifacts_immutable",
    "corrected_partial_retry_verified",
    "second_failed_retry_remains_partial",
    "partial_retry_artifact_limit_enforced",
    "partial_retry_revision_and_gap_preserved",
  ];
  const result = databaseQuery(
    databaseContainer,
    COMMAND_SPECS.verify_persisted_runtime_psql,
    `select concat_ws('|',
      (select (count(*) > 0)::text from public.wcv_c2_trusted_repair_sessions),
      (select (count(*) > 0)::text from public.wcv_c2_trusted_repair_private_artifacts),
      (select (count(*) > 0)::text from public.wcv_c2_trusted_repair_exposure_events),
      (select (count(*) > 0)::text from public.wcv_c2_trusted_repair_command_receipts),
      (select (count(*) = 0)::text from public.wcv_c2_trusted_repair_exposure_events e
        left join public.wcv_c2_trusted_repair_private_artifacts a
          on a.id=e.revision_id and a.session_id=e.session_id and a.user_id=e.user_id
        where a.id is null),
      (select (count(*) = 0)::text from public.wcv_c2_trusted_repair_sessions
        where subject <> 'appraisal_practical'),
      (select (count(*) = 0)::text from public.wcv_c2_trusted_repair_sessions
        where state='verified' and (
          jsonb_typeof(state_data->'structuredClaim') is distinct from 'object'
          or state_data->'structuredClaim'->>'sourceRevisionId'
            is distinct from confirmed_revision_id::text
          or state_data->'structuredClaim'->'result'
            is distinct from '{"value":100000000,"unit":"KRW_PER_YEAR"}'::jsonb
          or state_data->'structuredClaim'->'rounding'
            is distinct from '{"mode":"HALF_UP","scale":0,"required":false}'::jsonb
          or
          state_data->'proofEvaluation'->>'state' is distinct from 'PASS'
          or state_data->'proofEvaluation'->>'validatorId'
            is distinct from 'validator:practice-calculation-claim@2'
        )),
      (select (count(*) = 0)::text from public.wcv_c2_trusted_repair_private_artifacts where immutable is not true),
      (select exists(
        select 1
        from public.wcv_c2_trusted_repair_sessions s
        where s.state='verified'
          and (
            select count(*)
            from public.wcv_c2_trusted_repair_private_artifacts a
            where a.session_id=s.id and a.user_id=s.user_id
              and a.artifact_kind='repair_submission'
          )=2
      )::text),
      (select exists(
        select 1
        from public.wcv_c2_trusted_repair_sessions s
        where s.state='partial'
          and (
            select count(*)
            from public.wcv_c2_trusted_repair_private_artifacts a
            where a.session_id=s.id and a.user_id=s.user_id
              and a.artifact_kind='repair_submission'
          )=2
      )::text),
      (select (not exists(
        select 1
        from public.wcv_c2_trusted_repair_private_artifacts a
        where a.artifact_kind='repair_submission'
        group by a.session_id, a.user_id
        having count(*) > 2
      ))::text),
      (select (not exists(
        select 1
        from public.wcv_c2_trusted_repair_sessions s
        where (
          select count(*)
          from public.wcv_c2_trusted_repair_private_artifacts a
          where a.session_id=s.id and a.user_id=s.user_id
            and a.artifact_kind='repair_submission'
        )=2
          and (
            s.confirmed_revision_id is null
            or s.primary_gap_id is null
            or exists(
              select 1
              from public.wcv_c2_trusted_repair_private_artifacts a
              where a.session_id=s.id and a.user_id=s.user_id
                and a.artifact_kind='repair_submission'
                and a.revision_number <> (s.state_data->>'revisionNumber')::integer
            )
          )
      ))::text)
    );`,
  );
  const values = result.split("|");
  const failed = assertionIds.filter((_, index) => values[index] !== "true");
  if (failed.length > 0 || values.length !== assertionIds.length) {
    throw new Error(
      `persisted C2 runtime invariants failed: ${failed.join(",") || "shape"}`,
    );
  }
}

async function runFinalRuntime() {
  const headSha = required(process.env.PR_HEAD_SHA, "PR_HEAD_SHA", SHA_PATTERN).toLowerCase();
  const runId = required(process.env.GITHUB_RUN_ID, "GITHUB_RUN_ID", /^\d+$/);
  const runAttempt = required(process.env.GITHUB_RUN_ATTEMPT, "GITHUB_RUN_ATTEMPT", /^\d+$/);
  const evidencePath = path.resolve(
    process.env[
      THEORY_RUNTIME
        ? "C2R_C_T_RUNTIME_EVIDENCE_PATH"
        : "C2R_C_P_RUNTIME_EVIDENCE_PATH"
    ] ??
      path.join(
        REPOSITORY_ROOT,
        THEORY_RUNTIME
          ? ".agent-factory/c2r-c-t-theory-runtime-evidence.json"
          : ".agent-factory/c2r-c-p-practice-runtime-evidence.json",
      ),
  );
  const browserEvidencePath = path.join(
    path.dirname(evidencePath),
    THEORY_RUNTIME
      ? "c2r-c-t-browser-metadata.json"
      : "c2r-c-p-browser-metadata.json",
  );
  const root = runtimeRoot();
  const migrations = migrationMetadata();
  const expectedMigrationCount = THEORY_RUNTIME ? 3 : 2;
  if (migrations.length !== expectedMigrationCount) {
    throw new Error("C2 final migration inventory is not exact");
  }
  verifyExactHead(headSha);
  verifyLocalOnlySource();
  const cliVersion = supabase(["--version"], {
    commandSpec: COMMAND_SPECS.supabase_cli_version,
  })
    .stdout.trim();
  if (cliVersion !== EXPECTED_CLI_VERSION) {
    throw new Error(`Supabase CLI version ${cliVersion || "missing"} is not ${EXPECTED_CLI_VERSION}`);
  }

  stopStack(root, COMMAND_SPECS.pre_start_supabase_stop, true);
  assertNoDockerResources("pre-start cleanup", PRE_START_RESOURCE_SPECS);
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true, mode: 0o700 });
  fs.rmSync(evidencePath, { force: true });
  fs.rmSync(browserEvidencePath, { force: true });

  let runtimeError;
  let databaseImage;
  let browserEvidence;
  let cleanupResult;
  const assertions = [];
  const leakCounts = { crossUserReadRows: 0, crossUserDeleteRows: 0 };
  let server;
  try {
    prepareRuntimeWorkdir(root);
    supabase(
      [
        "start",
        "--workdir",
        root,
        "--exclude",
        EXCLUDED_SERVICES.join(","),
        "--output",
        "json",
        "--yes",
      ],
      { commandSpec: COMMAND_SPECS.first_supabase_start },
    );
    const status = parseJsonOutput(
      supabase(["status", "--workdir", root, "--output", "json"], {
        commandSpec: COMMAND_SPECS.first_supabase_status,
      }).stdout,
      "local Supabase status",
    );
    maskLocalValues(status);
    const apiUrl = statusValue(status, ["API_URL", "api_url"], "local API URL");
    const anonKey = statusValue(
      status,
      ["ANON_KEY", "anon_key", "PUBLISHABLE_KEY", "publishable_key"],
      "local anonymous key",
    );
    const serviceRoleKey = statusValue(
      status,
      ["SERVICE_ROLE_KEY", "service_role_key", "SECRET_KEY", "secret_key"],
      "local service role key",
    );
    process.stdout.write(`::add-mask::${anonKey}\n::add-mask::${serviceRoleKey}\n`);

    const stackIdentity = activeStackIdentity();
    databaseImage = {
      reference: stackIdentity.reference,
      digest: stackIdentity.digest,
    };
    const { databaseContainer } = stackIdentity;
    verifyMigrationsApplied(databaseContainer, COMMAND_SPECS.verify_migrations_psql);
    verifyTheoryMigrationReplay(databaseContainer);
    verifyDatabaseSecurityContract(
      databaseContainer,
      COMMAND_SPECS.verify_security_contract_psql,
    );
    assertions.push({ id: "first_fresh_empty_state_migrations", result: "passed" });
    if (THEORY_RUNTIME) {
      assertions.push({ id: "theory_migration_replay_safe", result: "passed" });
    }
    assertions.push({ id: "forced_rls_and_exact_grants", result: "passed" });
    assertions.push({ id: "minimum_local_services_healthy", result: "passed" });

    const userA = await createSyntheticIdentity(apiUrl, anonKey, "a");
    const userB = await createSyntheticIdentity(apiUrl, anonKey, "b");
    if (userA.userId === userB.userId) throw new Error("synthetic Auth identities are not distinct");
    assertions.push({ id: "two_local_authenticated_identities", result: "passed" });

    const sameUserInsert = await apiRequest(
      apiUrl,
      anonKey,
      "/rest/v1/wcv_c2_preflight_tenant_probe",
      {
        method: "POST",
        accessToken: userA.accessToken,
        prefer: "return=representation",
        body: { user_id: userA.userId, assertion: "same_user_permitted" },
        label: "same-user RLS insert",
      },
    );
    expectStatus(sameUserInsert, [201], "same-user RLS insert");
    const crossUserRead = await apiRequest(
      apiUrl,
      anonKey,
      `/rest/v1/wcv_c2_preflight_tenant_probe?select=id&user_id=eq.${userA.userId}`,
      { accessToken: userB.accessToken, label: "cross-user RLS read" },
    );
    expectStatus(crossUserRead, [200], "cross-user RLS read");
    if (!Array.isArray(crossUserRead.body) || crossUserRead.body.length !== 0) {
      throw new Error("cross-user preflight RLS read leaked rows");
    }
    const crossUserDelete = await apiRequest(
      apiUrl,
      anonKey,
      `/rest/v1/wcv_c2_preflight_tenant_probe?user_id=eq.${userA.userId}`,
      {
        method: "DELETE",
        accessToken: userB.accessToken,
        prefer: "return=representation",
        label: "cross-user RLS delete",
      },
    );
    expectStatus(crossUserDelete, [200], "cross-user RLS delete");
    if (!Array.isArray(crossUserDelete.body) || crossUserDelete.body.length !== 0) {
      throw new Error("cross-user preflight RLS delete affected rows");
    }
    await verifyDirectRls({ apiUrl, anonKey, userA });
    assertions.push({ id: "anonymous_authenticated_and_cross_user_denial", result: "passed" });

    const nextInput = { apiUrl, anonKey, serviceRoleKey, userA, userB };
    await verifyFlagOffBeforeBodyParsing(nextInput, databaseContainer);
    assertions.push({ id: "default_off_before_parse_and_write", result: "passed" });

    const crossSubjectReplay = THEORY_RUNTIME
      ? {
          theoryCommandId: crypto.randomUUID(),
          practiceCommandId: crypto.randomUUID(),
        }
      : null;
    if (crossSubjectReplay) {
      server = await startNext({
        ...nextInput,
        enabled: true,
        enabledSubjects: "both",
        commandSpec: COMMAND_SPECS.next_cross_subject_seed_start,
      });
      runCrossSubjectReplayBrowser({
        baseUrl: server.baseUrl,
        userA,
        userB,
        browserEvidencePath,
        crossSubjectReplayPhase: "seed",
        crossSubjectTheoryCommandId: crossSubjectReplay.theoryCommandId,
        crossSubjectPracticeCommandId: crossSubjectReplay.practiceCommandId,
        testName: "cross-subject start replay seed",
        commandSpec: COMMAND_SPECS.browser_cross_subject_seed,
      });
      await stopNext(server);
      server = null;

      server = await startNext({
        ...nextInput,
        enabled: true,
        enabledSubjects: "practice",
        commandSpec: COMMAND_SPECS.next_cross_subject_practice_start,
      });
      runCrossSubjectReplayBrowser({
        baseUrl: server.baseUrl,
        userA,
        userB,
        browserEvidencePath,
        crossSubjectReplayPhase: "verify_practice",
        crossSubjectTheoryCommandId: crossSubjectReplay.theoryCommandId,
        crossSubjectPracticeCommandId: crossSubjectReplay.practiceCommandId,
        testName: "cross-subject start replay is denied with Theory disabled",
        commandSpec: COMMAND_SPECS.browser_cross_subject_practice,
      });
      await stopNext(server);
      server = null;
    }

    server = await startNext({
      ...nextInput,
      enabled: true,
      commandSpec: COMMAND_SPECS.next_initial_start,
    });
    runBrowserSuite({
      baseUrl: server.baseUrl,
      userA,
      userB,
      browserEvidencePath,
      ...(crossSubjectReplay
        ? {
            crossSubjectReplayPhase: "verify_theory",
            crossSubjectTheoryCommandId: crossSubjectReplay.theoryCommandId,
            crossSubjectPracticeCommandId:
              crossSubjectReplay.practiceCommandId,
          }
        : {}),
    });
    if (!fs.existsSync(browserEvidencePath)) {
      throw new Error("C2 browser suite produced no metadata evidence");
    }
    browserEvidence = JSON.parse(fs.readFileSync(browserEvidencePath, "utf8"));
    if (THEORY_RUNTIME) {
      theoryConfirmationDiagnostics(browserEvidence, true);
      assertions.push({
        id: "cross_subject_start_replay_fails_closed",
        result: "passed",
      });
      assertions.push({
        id: "theory_final_confirmation_metadata_safe",
        result: "passed",
      });
    }
    verifyPersistedRuntime(databaseContainer);
    assertions.push({
      id: THEORY_RUNTIME
        ? "theory_actual_browser_to_postgres_chain"
        : "practice_actual_browser_to_postgres_chain",
      result: "passed",
    });
    assertions.push({ id: "cas_replay_and_exposure_failure_zero_help", result: "passed" });
    assertions.push({ id: "responsive_keyboard_axe_and_input_modes", result: "passed" });
    assertions.push({ id: "new_browser_exact_user_recovery", result: "passed" });
    assertions.push({ id: "bounded_partial_retry_recovery_and_append_only", result: "passed" });

    const recoverySessionId = required(
      databaseQuery(
        databaseContainer,
        COMMAND_SPECS.recovery_session_lookup_psql,
        `select id::text from public.wcv_c2_trusted_repair_sessions
         where user_id='${userA.userId}'::uuid and subject='${RUNTIME_SUBJECT}' and state='partial'
         order by updated_at desc limit 1;`,
      ),
      "bodyless recovery session id",
      UUID_PATTERN,
    );
    await stopNext(server);
    server = await startNext({
      ...nextInput,
      enabled: true,
      commandSpec: COMMAND_SPECS.next_recovery_start,
    });
    runBrowserSuite({
      baseUrl: server.baseUrl,
      userA,
      userB,
      browserEvidencePath,
      recoverySessionId,
    });
    assertions.push({ id: "next_process_restart_recovery", result: "passed" });
    await stopNext(server);
    server = null;

    stopStack(root, COMMAND_SPECS.first_supabase_stop, false);
    assertNoDockerResources(
      "first fresh runtime cleanup",
      FIRST_CLEANUP_RESOURCE_SPECS,
    );
    fs.rmSync(root, { recursive: true, force: true });

    prepareRuntimeWorkdir(root);
    supabase(
      [
        "start",
        "--workdir",
        root,
        "--exclude",
        EXCLUDED_SERVICES.join(","),
        "--output",
        "json",
        "--yes",
      ],
      { commandSpec: COMMAND_SPECS.second_supabase_start },
    );
    const secondDatabaseContainer = matchingDockerResources(
      "container",
      COMMAND_SPECS.second_database_container_list,
    )
      .find((name) => name.startsWith("supabase_db_"));
    if (!secondDatabaseContainer) throw new Error("second fresh database container is missing");
    verifyMigrationsApplied(
      secondDatabaseContainer,
      COMMAND_SPECS.second_verify_migrations_psql,
    );
    verifyDatabaseSecurityContract(
      secondDatabaseContainer,
      COMMAND_SPECS.second_verify_security_psql,
    );
    if (
      databaseQuery(
        secondDatabaseContainer,
        COMMAND_SPECS.second_empty_database_psql,
        "select count(*) from public.wcv_c2_trusted_repair_sessions;",
      ) !== "0"
    ) {
      throw new Error("second fresh database was not empty");
    }
    assertions.push({ id: "second_fresh_empty_state_migrations", result: "passed" });
  } catch (error) {
    runtimeError = error;
  } finally {
    try {
      await stopNext(server);
      stopStack(root, COMMAND_SPECS.final_supabase_stop, true);
      cleanupResult = assertNoDockerResources(
        "post-run cleanup",
        FINAL_RESOURCE_SPECS,
      );
      fs.rmSync(root, { recursive: true, force: true });
    } catch (cleanupError) {
      runtimeError = cleanupError;
    } finally {
      if (THEORY_RUNTIME) {
        fs.rmSync(BROWSER_RUNTIME_CONFIG_PATH, { force: true });
      }
    }
  }

  if (runtimeError) throw runtimeError;
  verifyExactHead(headSha);
  assertions.push({ id: "complete_no_backup_cleanup", result: "passed" });
  assertions.push({ id: "exact_head_unchanged", result: "passed" });

  const evidence = {
    schemaVersion: THEORY_RUNTIME
      ? "c2r_c_t_theory_trusted_repair_runtime_evidence.v1"
      : "c2r_c_p_practice_trusted_repair_runtime_evidence.v1",
    phase: THEORY_RUNTIME
      ? "complete_theory_trusted_repair_vertical"
      : "complete_practice_trusted_repair_vertical",
    headSha,
    runId,
    runAttempt,
    cliVersion,
    databaseImage,
    migrations,
    assertions,
    browser: browserEvidence,
    counts: {
      authenticatedUsers: 2,
      syntheticSubjects: 1,
      freshDatabaseApplications: 2,
      inputModes: 5,
      repairPaths: 6,
      continuationCommands: 3,
      immediatePartialRetries: 1,
    },
    leakCounts,
    cleanup: {
      result: "passed",
      containersRemaining: cleanupResult.containers.length,
      volumesRemaining: cleanupResult.volumes.length,
      networksRemaining: cleanupResult.networks.length,
      backupRetained: false,
    },
    remoteSupabaseUsed: false,
    repositorySecretsUsed: false,
    fixtureBodiesIncluded: false,
    learnerBodiesIncluded: false,
    screenshotsIncluded: false,
    tracesIncluded: false,
    liveProvidersUsed: false,
  };
  fs.mkdirSync(path.dirname(evidencePath), { recursive: true });
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, {
    mode: 0o600,
  });
  fs.rmSync(browserEvidencePath, { force: true });
  process.stdout.write(
    THEORY_RUNTIME
      ? "c2r-c-t-theory-trusted-repair-runtime: pass\n"
      : "c2r-c-p-practice-trusted-repair-runtime: pass\n",
  );
}

async function main() {
  const root = runtimeRoot();
  if (cleanupOnly) {
    if (!fs.existsSync(path.join(root, "supabase/config.toml"))) {
      prepareRuntimeWorkdir(root);
    }
    cleanup(root, requireCompleteCleanup);
    process.stdout.write(
      THEORY_RUNTIME
        ? "c2r-c-t-local-stack-cleanup: pass\n"
        : "c2r-c-p-local-stack-cleanup: pass\n",
    );
    return;
  }
  await runFinalRuntime();
}

if (path.resolve(process.argv[1] ?? "") === MODULE_PATH) {
  main().catch((error) => {
    process.stderr.write(`${formatRuntimeFailure(error)}\n`);
    process.exitCode = 1;
  });
}

export {
  COMMAND_SPECS,
  DIAGNOSTIC_MAX_CHARS,
  DIAGNOSTIC_MAX_LINES,
  SanitizedCommandFailure,
  boundedSanitizedExcerpt,
  browserFailureFromResult,
  cleanup,
  formatRuntimeFailure,
  run,
  sanitizeDiagnosticText,
  sanitizedBrowserFailureLocations,
};
