import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as qf0a1 from "../lib/question-foundry/quarantine/bounded-canonical-json.ts";

const {
  QF0A1_LIMITS,
  QF0A1_SOURCE_ONLY_BOUNDARY_RECEIPT,
  canonicalizeBoundedJsonV1,
  compareUtf8BytesV1,
  digestCanonicalJsonV1,
} = qf0a1;

const ROOT_URL = new URL("../", import.meta.url);
const ROOT_PATH = fileURLToPath(ROOT_URL);
const BASE_SHA = "fd8d0039bbeb2981935fdb671094e37d73a34400";
const CONFIG_PATH = "config/dabangil-qf0a1-bounded-canonical-json-v1.json";
const MODULE_PATH = "lib/question-foundry/quarantine/bounded-canonical-json.ts";
const MAX_BYTES = 262_144;
const EXPECTED_CONFIG_DIGEST = "846f0afde2d3547d34e9118d4472278036bbdc0dde894bbfe2d922955aaeb396";
const EXACT_PATHS = [
  CONFIG_PATH,
  "docs/product/dabangil-qf0a1-bounded-canonical-json-v1.md",
  "docs/qa/dabangil-qf0a1-bounded-canonical-json-validation.md",
  MODULE_PATH,
  "tests/qf0a1-bounded-canonical-json.test.mjs",
];

function read(path) {
  return readFileSync(new URL(path, ROOT_URL), "utf8");
}

function sha256(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function defineData(target, key, value) {
  Object.defineProperty(target, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  });
}

function nullRecord(entries) {
  const value = Object.create(null);
  for (const [key, entry] of entries) defineData(value, key, entry);
  return value;
}

function captureInspection(operation) {
  const descriptor = Object.getOwnPropertyDescriptor(String.prototype, "charCodeAt");
  assert.ok(descriptor && typeof descriptor.value === "function");
  let inspections = 0;
  let result;
  let rejection;
  Object.defineProperty(String.prototype, "charCodeAt", {
    ...descriptor,
    value(index) {
      inspections += 1;
      return Reflect.apply(descriptor.value, this, [index]);
    },
  });
  try {
    result = operation();
  } catch (error) {
    rejection = error;
  } finally {
    Object.defineProperty(String.prototype, "charCodeAt", descriptor);
  }
  return { inspections, rejection, result };
}

function changedPaths() {
  const commands = [
    ["diff", "--name-only", `${BASE_SHA}...HEAD`],
    ["diff", "--name-only"],
    ["diff", "--cached", "--name-only"],
    ["ls-files", "--others", "--exclude-standard"],
  ];
  const paths = new Set();
  for (const arguments_ of commands) {
    const result = spawnSync("git", arguments_, {
      cwd: ROOT_PATH,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    for (const path of result.stdout.split(/\r?\n/u).filter(Boolean)) paths.add(path);
  }
  return [...paths].sort();
}

test("QF0A1-CONTRACT-001 binds the closed five-path inert source-only contract", () => {
  const contractText = read(CONFIG_PATH);
  const contract = JSON.parse(contractText);
  assert.equal(contract.contractVersion, "dabangil.qf0a1.bounded_canonical_json.v1");
  assert.equal(contract.stage, "QF-0A1");
  assert.equal(contract.tracking.childIssue, 861);
  assert.deepEqual(
    [
      contract.tracking.qf0aUmbrella,
      contract.tracking.qf0Umbrella,
      contract.tracking.questionFoundryProgram,
      contract.tracking.cognitiveProductReference,
    ],
    [859, 857, 811, 714],
  );
  assert.equal(contract.sourceOnlyBoundary.inertUtility, true);
  assert.equal(contract.sourceOnlyBoundary.runtimeActivation, "OFF");
  assert.equal(contract.sourceOnlyBoundary.remoteMutationCount, 0);
  assert.equal(contract.sourceOnlyBoundary.productionMutationCount, 0);
  assert.equal(contract.sourceOnlyBoundary.domainAuthorityInstalled, false);
  assert.equal(contract.successorGate.stage, "QF-0A2");
  assert.equal(contract.successorGate.state, "BLOCKED");
  assert.equal(contract.successorGate.requires, "VALIDATED_QF0A1_RESULTING_MAIN_RECEIPT");
  assert.equal(contract.successorGate.automaticStart, false);
  assert.deepEqual(contract.changedPathsExactly, EXACT_PATHS);
  assert.deepEqual(changedPaths(), [...EXACT_PATHS].sort());
  assert.equal(sha256(contractText), EXPECTED_CONFIG_DIGEST);
});

test("QF0A1-CONTRACT-002 exposes only the bounded primitive surface and frozen limits", () => {
  assert.deepEqual(Object.keys(qf0a1), [
    "QF0A1_LIMITS",
    "QF0A1_SOURCE_ONLY_BOUNDARY_RECEIPT",
    "canonicalizeBoundedJsonV1",
    "compareUtf8BytesV1",
    "digestCanonicalJsonV1",
  ]);
  assert.deepEqual(QF0A1_LIMITS, {
    contractVersion: "QF0A1BoundedCanonicalJsonV1",
    maxCanonicalOutputBytes: MAX_BYTES,
    maxInspectedUtf16CodeUnits: MAX_BYTES,
    maxEntries: 10_000,
    maxDepth: 32,
    maxComparisonSteps: 524_288,
    surrogateLookaheadOutsideInspectionLimit: 0,
  });
  assert.equal(Object.isFrozen(QF0A1_LIMITS), true);
  assert.equal(Object.isFrozen(QF0A1_SOURCE_ONLY_BOUNDARY_RECEIPT), true);
  assert.equal(QF0A1_SOURCE_ONLY_BOUNDARY_RECEIPT.scope, "INERT_SOURCE_ONLY_UTILITY");
  assert.equal(QF0A1_SOURCE_ONLY_BOUNDARY_RECEIPT.activation, "OFF");
  assert.equal(QF0A1_SOURCE_ONLY_BOUNDARY_RECEIPT.remoteMutation, "ZERO");
  assert.equal(QF0A1_SOURCE_ONLY_BOUNDARY_RECEIPT.downstreamAuthorityInstalled, false);
});

test("QF0A1-BOUND-003 shares one cumulative inspection budget across keys and values", () => {
  const hostile = Object.create(null);
  const firstKey = `a_${"x".repeat(198)}`;
  defineData(hostile, firstKey, "v".repeat(400_000));
  let keyCodeUnits = firstKey.length;
  for (let index = 0; index < 999; index += 1) {
    const key = `b_${String(index).padStart(4, "0")}_${"x".repeat(193)}`;
    keyCodeUnits += key.length;
    defineData(hostile, key, null);
  }
  const hostileCodeUnits = keyCodeUnits + 400_000;
  assert.ok(hostileCodeUnits >= 461_939);
  const observation = captureInspection(() => canonicalizeBoundedJsonV1(hostile));
  assert.match(observation.rejection?.message ?? "", /LIMIT_EXCEEDED/);
  assert.ok(observation.inspections <= QF0A1_LIMITS.maxInspectedUtf16CodeUnits);
  assert.ok(observation.inspections < hostileCodeUnits);
});

test("QF0A1-BOUND-004 sorting cached key bytes performs no original-string rescan", () => {
  const entries = [
    ["z", null],
    ["ä", null],
    ["β", null],
    ["a", null],
    ["__proto__", { safe: true }],
  ];
  const value = nullRecord(entries);
  const expectedInspections =
    entries.reduce((total, [key]) => total + key.length, 0) + "safe".length;
  const observation = captureInspection(() => canonicalizeBoundedJsonV1(value));
  assert.equal(observation.rejection, undefined);
  assert.equal(observation.inspections, expectedInspections);
});

test("QF0A1-BOUND-005 rejects oversized ASCII, BMP, and valid pairs at bounded prefixes", () => {
  const cases = [
    ["ASCII", "a".repeat(MAX_BYTES * 4)],
    ["BMP", "\u0800".repeat(MAX_BYTES * 2)],
    ["PAIR", "😀".repeat(MAX_BYTES)],
  ];
  for (const [label, value] of cases) {
    assert.ok(value.length > MAX_BYTES, label);
    const observation = captureInspection(() => canonicalizeBoundedJsonV1(value));
    assert.match(observation.rejection?.message ?? "", /LIMIT_EXCEEDED/, label);
    assert.ok(observation.inspections <= MAX_BYTES, label);
    assert.ok(observation.inspections < value.length, label);
  }
});

test("QF0A1-BOUND-006 rejects malformed surrogates without scanning beyond a prior cap", () => {
  for (const value of ["prefix\ud800suffix", "prefix\udfffsuffix"]) {
    const observation = captureInspection(() => canonicalizeBoundedJsonV1(value));
    assert.match(observation.rejection?.message ?? "", /UNPAIRED_(HIGH|LOW)_SURROGATE/);
    assert.ok(observation.inspections <= "prefix".length + 2);
  }
  const malformedAfterCap = `${"a".repeat(MAX_BYTES * 2)}\ud800`;
  const observation = captureInspection(() => canonicalizeBoundedJsonV1(malformedAfterCap));
  assert.match(observation.rejection?.message ?? "", /LIMIT_EXCEEDED/);
  assert.ok(observation.inspections <= MAX_BYTES);
  assert.ok(observation.inspections < malformedAfterCap.indexOf("\ud800"));
});

test("QF0A1-BOUND-007 accepts exact output-byte boundaries and rejects boundary plus one", () => {
  const exactValues = [
    "a".repeat(MAX_BYTES - 2),
    `${"\u0800".repeat(87_380)}\u0080`,
    `${"😀".repeat(65_535)}\u0080`,
  ];
  for (const value of exactValues) {
    const canonical = canonicalizeBoundedJsonV1(value);
    assert.equal(new TextEncoder().encode(canonical).length, MAX_BYTES);
    assert.equal(digestCanonicalJsonV1(value), digestCanonicalJsonV1(value));
    assert.throws(() => canonicalizeBoundedJsonV1(`${value}a`), /LIMIT_EXCEEDED/);
  }
});

test("QF0A1-BOUND-008 fails while cumulatively inspecting many short keys", () => {
  const value = Object.create(null);
  let totalKeyCodeUnits = 0;
  for (let index = 0; index < 9_000; index += 1) {
    const key = `key_${String(index).padStart(4, "0")}_${"x".repeat(22)}`;
    totalKeyCodeUnits += key.length;
    defineData(value, key, null);
  }
  assert.ok(totalKeyCodeUnits > MAX_BYTES);
  const observation = captureInspection(() => canonicalizeBoundedJsonV1(value));
  assert.match(observation.rejection?.message ?? "", /LIMIT_EXCEEDED/);
  assert.ok(observation.inspections <= MAX_BYTES);
  assert.ok(observation.inspections < totalKeyCodeUnits);
});

test("QF0A1-BOUND-009 fails while cumulatively inspecting many values", () => {
  const value = Array.from({ length: 100 }, () => "v".repeat(3_000));
  const totalValueCodeUnits = value.reduce((total, entry) => total + entry.length, 0);
  assert.ok(totalValueCodeUnits > MAX_BYTES);
  const observation = captureInspection(() => canonicalizeBoundedJsonV1(value));
  assert.match(observation.rejection?.message ?? "", /LIMIT_EXCEEDED/);
  assert.ok(observation.inspections <= MAX_BYTES);
  assert.ok(observation.inspections < totalValueCodeUnits);
});

test("QF0A1-BYTES-010 accounts exactly for JSON quotes, slashes, and control escapes", () => {
  const escaped = '"\\\b\t\n\f\r\u0000';
  const canonical = canonicalizeBoundedJsonV1(escaped);
  assert.equal(canonical, JSON.stringify(escaped));
  assert.equal(new TextEncoder().encode(canonical).length, 22);

  const twoByteBoundary = (MAX_BYTES - 2) / 2;
  for (const character of ['"', "\\"]) {
    const value = character.repeat(twoByteBoundary);
    assert.equal(new TextEncoder().encode(canonicalizeBoundedJsonV1(value)).length, MAX_BYTES);
    assert.throws(() => canonicalizeBoundedJsonV1(`${value}${character}`), /LIMIT_EXCEEDED/);
  }

  const controlBoundary = `${"\u0000".repeat(43_690)}\u0080`;
  assert.equal(
    new TextEncoder().encode(canonicalizeBoundedJsonV1(controlBoundary)).length,
    MAX_BYTES,
  );
  assert.throws(() => canonicalizeBoundedJsonV1(`${controlBoundary}a`), /LIMIT_EXCEEDED/);
});

test("QF0A1-ORDER-011 is insertion-order and locale independent", () => {
  const entries = [
    ["z", 1],
    ["ä", 2],
    ["β", true],
    ["a", { alpha: null }],
  ];
  const forward = nullRecord(entries);
  const reverse = nullRecord([...entries].reverse());
  const expected = '{"a":{"alpha":null},"z":1,"ä":2,"β":true}';
  assert.equal(canonicalizeBoundedJsonV1(forward), expected);
  assert.equal(canonicalizeBoundedJsonV1(reverse), expected);
  assert.equal(digestCanonicalJsonV1(forward), digestCanonicalJsonV1(reverse));

  const probe = `
    import { canonicalizeBoundedJsonV1, digestCanonicalJsonV1 } from "./${MODULE_PATH}";
    const value = Object.create(null);
    for (const [key, entry] of [["ä",2],["z",1],["β",true],["a",null]]) {
      Object.defineProperty(value, key, { value: entry, enumerable: true });
    }
    process.stdout.write(JSON.stringify([canonicalizeBoundedJsonV1(value), digestCanonicalJsonV1(value)]));
  `;
  const outputs = ["en_US.UTF-8", "sv_SE.UTF-8"].map((locale) => {
    const result = spawnSync(
      process.execPath,
      [
        "--experimental-strip-types",
        "--loader",
        "./tests/ts-extension-loader.mjs",
        "--input-type=module",
        "--eval",
        probe,
      ],
      {
        cwd: ROOT_PATH,
        env: { ...process.env, LANG: locale, LC_ALL: locale },
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  });
  assert.equal(outputs[0], outputs[1]);
});

test("QF0A1-ORDER-012 preserves the established valid fixture identity", () => {
  const fixture = nullRecord([
    ["z", 1],
    ["ä", 2],
    ["a", nullRecord([["β", true], ["alpha", null]])],
  ]);
  assert.equal(canonicalizeBoundedJsonV1(fixture), '{"a":{"alpha":null,"β":true},"z":1,"ä":2}');
  assert.equal(
    digestCanonicalJsonV1(fixture),
    "sha256:47bfb996512d74f9214b232b721f043944e631221371e6323645a4f0ae8a9caf",
  );
  assert.ok(compareUtf8BytesV1("z", "ä") < 0);
  assert.ok(compareUtf8BytesV1("ä", "β") < 0);
});

test("QF0A1-ORDER-013 fails closed when cached-byte comparison work overflows", () => {
  const value = Object.create(null);
  const prefix = "p".repeat(34);
  for (let index = 4_999; index >= 0; index -= 1) {
    defineData(value, `${prefix}${String(index).padStart(4, "0")}`, null);
  }
  assert.throws(() => canonicalizeBoundedJsonV1(value), /COMPARISON_STEP_LIMIT_EXCEEDED/);
});

test("QF0A1-DOMAIN-014 rejects non-JSON values and non-finite numbers", () => {
  for (const value of [undefined, 1n, () => null, Symbol("x"), NaN, Infinity, -Infinity]) {
    assert.throws(() => canonicalizeBoundedJsonV1(value), /QF0A1_FAIL_CLOSED/);
  }
  assert.equal(canonicalizeBoundedJsonV1(-0), "0");
});

test("QF0A1-DOMAIN-015 rejects cycles, accessors, symbols, and hostile objects", () => {
  const cycle = {};
  cycle.self = cycle;
  assert.throws(() => canonicalizeBoundedJsonV1(cycle), /CYCLIC_VALUE_UNSUPPORTED/);

  const accessor = {};
  Object.defineProperty(accessor, "value", { enumerable: true, get: () => 1 });
  assert.throws(() => canonicalizeBoundedJsonV1(accessor), /PROPERTY_DESCRIPTOR_UNSUPPORTED/);

  const symbolKey = { safe: true };
  symbolKey[Symbol("hidden")] = true;
  assert.throws(() => canonicalizeBoundedJsonV1(symbolKey), /SYMBOL_KEY_UNSUPPORTED/);

  const nonEnumerable = {};
  Object.defineProperty(nonEnumerable, "hidden", { value: true });
  assert.throws(() => canonicalizeBoundedJsonV1(nonEnumerable), /PROPERTY_DESCRIPTOR_UNSUPPORTED/);

  assert.throws(
    () => canonicalizeBoundedJsonV1(Object.create({ inherited: true })),
    /OBJECT_PROTOTYPE_UNSUPPORTED/,
  );
});

test("QF0A1-DOMAIN-016 rejects sparse, extended, and hostile-prototype arrays", () => {
  const sparse = new Array(2);
  sparse[1] = true;
  assert.throws(() => canonicalizeBoundedJsonV1(sparse), /DENSE_WITHOUT_EXTRA_KEYS/);

  const extended = [true];
  extended.extra = false;
  assert.throws(() => canonicalizeBoundedJsonV1(extended), /DENSE_WITHOUT_EXTRA_KEYS/);

  const hostile = [true];
  Object.setPrototypeOf(hostile, null);
  assert.throws(() => canonicalizeBoundedJsonV1(hostile), /ARRAY_PROTOTYPE_UNSUPPORTED/);
});

test("QF0A1-DOMAIN-017 enforces entry and depth bounds", () => {
  const tooMany = Object.create(null);
  for (let index = 0; index <= QF0A1_LIMITS.maxEntries; index += 1) {
    defineData(tooMany, `k${index}`, null);
  }
  assert.throws(() => canonicalizeBoundedJsonV1(tooMany), /ENTRY_LIMIT_EXCEEDED/);

  let tooDeep = null;
  for (let index = 0; index < QF0A1_LIMITS.maxDepth + 2; index += 1) {
    tooDeep = [tooDeep];
  }
  assert.throws(() => canonicalizeBoundedJsonV1(tooDeep), /DEPTH_LIMIT_EXCEEDED/);
});

test("QF0A1-DOMAIN-018 keeps valid nested arrays and objects deterministic", () => {
  const value = {
    nested: [null, true, false, 1.25, -0, { b: "β", a: "alpha" }],
    emptyArray: [],
    emptyObject: {},
  };
  const first = canonicalizeBoundedJsonV1(value);
  const second = canonicalizeBoundedJsonV1(value);
  assert.equal(first, second);
  assert.equal(JSON.stringify(JSON.parse(first)), first);
  assert.equal(digestCanonicalJsonV1(value), digestCanonicalJsonV1(value));
});

test("QF0A1-BOUNDARY-019 contains no locale API or downstream operational contract", () => {
  const moduleSource = read(MODULE_PATH);
  assert.doesNotMatch(moduleSource, /localeCompare|Intl\.Collator|\.sort\s*\(/u);
  assert.doesNotMatch(
    moduleSource,
    /RightsManifestRefV1|SourceEligibilityDecisionV1|ModelExecutionIdentityV1/u,
  );
  assert.doesNotMatch(
    moduleSource,
    /\b(candidate|scarcity|release|learnerAssignment|bankAssignment)\b/iu,
  );
});

test("QF0A1-BOUNDARY-020 has no network, provider, database, or remote mutation path", () => {
  const moduleSource = read(MODULE_PATH);
  assert.match(moduleSource, /from "node:crypto"/u);
  assert.doesNotMatch(
    moduleSource,
    /node:https|node:http|\bfetch\s*\(|supabase|stripe|postgres|database|provider/iu,
  );
  const product = read("docs/product/dabangil-qf0a1-bounded-canonical-json-v1.md");
  const qa = read("docs/qa/dabangil-qf0a1-bounded-canonical-json-validation.md");
  assert.match(product, /inert source-only utility/);
  assert.match(product, /QF-0A2 stays blocked/);
  assert.match(qa, /remote and Production mutation: zero/);
});
