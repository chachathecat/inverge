const SQLSTATE_CLASSES = Object.freeze({
  "23503": ["foreign_key_violation", "PostgreSQL rejected a foreign-key binding."],
  "23505": ["unique_violation", "PostgreSQL rejected a duplicate durable identity."],
  "42501": ["insufficient_privilege", "PostgreSQL rejected the migration privilege boundary."],
  "42601": ["syntax_error", "PostgreSQL rejected the migration syntax."],
  "42703": ["undefined_column", "PostgreSQL could not resolve a required column."],
  "42710": ["duplicate_object", "PostgreSQL found an incompatible existing object."],
  "42883": ["undefined_function", "PostgreSQL could not resolve a required operator or function."],
  "42P01": ["undefined_table", "PostgreSQL could not resolve a required relation."],
  P0001: ["raise_exception", "A fail-closed migration invariant rejected the operation."],
});

function safeMigrationFilename(value, diagnostic) {
  let candidate = String(value ?? "");
  if (candidate === "auto") {
    const matches = [...String(diagnostic ?? "").matchAll(
      /\b(?:applying migration|failed to apply migration|migration(?: file)?)\s+[`'"]?([0-9][0-9A-Za-z._-]*\.sql)\b/gi,
    )];
    candidate = matches.at(-1)?.[1] ?? "";
  }
  const filename = candidate.split(/[\\/]/).at(-1) ?? "";
  return /^[0-9A-Za-z._-]{1,160}\.sql$/.test(filename)
    ? filename
    : "unknown_migration.sql";
}

function safeStatementIdentifier(value) {
  const identifier = String(value ?? "");
  return /^[a-z0-9_.:-]{1,160}$/i.test(identifier)
    ? identifier
    : "unknown_statement";
}

function sqlstateFrom(value) {
  const diagnostic = String(value ?? "");
  const patterns = [
    /\bSQLSTATE\s*[:=]?\s*([0-9A-Z]{5})\b/i,
    /\bERROR:\s*([0-9A-Z]{5}):/i,
    /\bcode\s*[:=]\s*([0-9A-Z]{5})\b/i,
  ];
  for (const pattern of patterns) {
    const match = diagnostic.match(pattern);
    if (match) return match[1].toUpperCase();
  }
  return "unknown";
}

function classifiedFailure(sqlstate, value) {
  const exact = SQLSTATE_CLASSES[sqlstate];
  if (exact) return exact;
  const diagnostic = String(value ?? "");
  if (/operator does not exist|function .* does not exist/i.test(diagnostic)) {
    return ["undefined_function", "PostgreSQL could not resolve a required operator or function."];
  }
  if (/syntax error/i.test(diagnostic)) {
    return ["syntax_error", "PostgreSQL rejected the migration syntax."];
  }
  return ["migration_apply_failure", "PostgreSQL did not apply the migration."];
}

export function migrationFailureDiagnostic({
  migrationFilename,
  statementIdentifier,
  stdout = "",
  stderr = "",
}) {
  const rawDiagnostic = `${String(stderr)}\n${String(stdout)}`;
  const sqlstate = sqlstateFrom(rawDiagnostic);
  const [errorClass, message] = classifiedFailure(sqlstate, rawDiagnostic);
  return Object.freeze({
    migrationFilename: safeMigrationFilename(migrationFilename, rawDiagnostic),
    statementIdentifier: safeStatementIdentifier(statementIdentifier),
    sqlstate,
    errorClass,
    boundedMessage: message.slice(0, 160),
  });
}

export function formatMigrationFailureDiagnostic(input) {
  const diagnostic = migrationFailureDiagnostic(input);
  return [
    `migration_filename: ${diagnostic.migrationFilename}`,
    `statement_identifier: ${diagnostic.statementIdentifier}`,
    `sqlstate: ${diagnostic.sqlstate}`,
    `error_class: ${diagnostic.errorClass}`,
    `bounded_message: ${diagnostic.boundedMessage}`,
  ].join("\n");
}
