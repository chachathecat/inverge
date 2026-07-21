import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

import ts from "typescript";

const repositorySource = await readFile(
  new URL("../lib/review-os/repository.ts", import.meta.url),
  "utf8",
);

function loadTimestampNormalizer() {
  const start = repositorySource.indexOf("export function normalizePostgrestTimestamp");
  const end = repositorySource.indexOf("\n}\n", start);
  assert.notEqual(start, -1, "timestamp normalizer must exist");
  assert.notEqual(end, -1, "timestamp normalizer must have a complete body");

  const source = `${repositorySource.slice(start, end + 2)}\nexport { normalizePostgrestTimestamp };`;
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const commonJsModule = { exports: {} };
  vm.runInNewContext(transpiled, {
    Date,
    Number,
    String,
    exports: commonJsModule.exports,
    module: commonJsModule,
  });
  return commonJsModule.exports.normalizePostgrestTimestamp;
}

test("PostgREST UTC offsets and microseconds normalize to strict canonical ISO timestamps", () => {
  const normalizePostgrestTimestamp = loadTimestampNormalizer();

  assert.equal(
    normalizePostgrestTimestamp("2026-07-16T08:09:10.123456+00:00"),
    "2026-07-16T08:09:10.123Z",
  );
  assert.equal(
    normalizePostgrestTimestamp("2026-07-16T17:09:10.123456+09:00"),
    "2026-07-16T08:09:10.123Z",
  );
  assert.equal(
    normalizePostgrestTimestamp("2026-07-16T08:09:10Z"),
    "2026-07-16T08:09:10.000Z",
  );
  assert.equal(normalizePostgrestTimestamp("not-a-timestamp"), "not-a-timestamp");
});

test("wrong-answer capture receipts normalize both mapped persistence timestamps", () => {
  const mapperStart = repositorySource.indexOf("function mapWrongAnswerItem");
  const mapperEnd = repositorySource.indexOf("function mapWrongAnswerNote", mapperStart);
  const mapper = repositorySource.slice(mapperStart, mapperEnd);

  assert.match(mapper, /createdAt: normalizePostgrestTimestamp\(row\.created_at\)/);
  assert.match(mapper, /updatedAt: normalizePostgrestTimestamp\(row\.updated_at\)/);
});
