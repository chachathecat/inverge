import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import * as qf0a1 from "../lib/question-foundry/quarantine/bounded-canonical-json.ts";
import * as qf0a2Contracts from "../lib/question-foundry/quarantine/trust-contracts.ts";
import * as qf0a2Core from "../lib/question-foundry/quarantine/trust-core.ts";
import * as contracts from "../lib/question-foundry/quarantine/scarcity-contracts.ts";
import * as core from "../lib/question-foundry/quarantine/scarcity-core.ts";

const {
  QF0B_CONTRACT_VERSION,
  QF0B_LIMITS,
  QF0B_REGISTRY_REF_KINDS,
  QF0B_SOURCE_ONLY_BOUNDARY_RECEIPT,
} = contracts;

const {
  assertBodylessBankScarcityEventV1,
  assertOpaqueRegistryRefV1,
  createBodylessBankScarcityEventV1,
  createOpaqueRegistryRefV1,
} = core;

const ROOT_URL = new URL("../", import.meta.url);
const ROOT_PATH = fileURLToPath(ROOT_URL);
const BASE_SHA = "daebb7d2b58ad464ed43ff06a75fe36f2ac8765a";
const BASE_TREE = "628660cac8c4afc0b2fe50b555177eabd5787a96";
const CONFIG_PATH =
  "config/dabangil-qf0b-opaque-registry-bodyless-scarcity-v1.json";
const CONTRACTS_PATH =
  "lib/question-foundry/quarantine/scarcity-contracts.ts";
const CORE_PATH = "lib/question-foundry/quarantine/scarcity-core.ts";
const EXPECTED_CONFIG_DIGEST =
  "90b29227472b7d6337ebef9c651a9e9a3e5b2ae222dabe4dc9f5533081cb7156";

const EXACT_PATHS = [
  "docs/product/dabangil-qf0b-opaque-registry-bodyless-scarcity-v1.md",
  CONFIG_PATH,
  "docs/qa/dabangil-qf0b-opaque-registry-bodyless-scarcity-validation.md",
  CONTRACTS_PATH,
  CORE_PATH,
  "tests/qf0b-opaque-registry-bodyless-scarcity.test.mjs",
];

const QF0A1_PATHS = [
  "config/dabangil-qf0a1-bounded-canonical-json-v1.json",
  "docs/product/dabangil-qf0a1-bounded-canonical-json-v1.md",
  "docs/qa/dabangil-qf0a1-bounded-canonical-json-validation.md",
  "lib/question-foundry/quarantine/bounded-canonical-json.ts",
  "tests/qf0a1-bounded-canonical-json.test.mjs",
];

const QF0A2_PATHS = [
  "config/dabangil-qf0a2-rights-time-model-identity-v1.json",
  "docs/product/dabangil-qf0a2-rights-time-model-identity-v1.md",
  "docs/qa/dabangil-qf0a2-rights-time-model-identity-validation.md",
  "lib/question-foundry/quarantine/trust-contracts.ts",
  "lib/question-foundry/quarantine/trust-core.ts",
  "tests/qf0a2-rights-time-model-identity.test.mjs",
];

const EVENT_SLOT_KINDS = {
  examPackageRef: "EXAM_PACKAGE",
  subjectRef: "SUBJECT",
  skillConceptRef: "SKILL_CONCEPT",
  problemFamilyRef: "PROBLEM_FAMILY",
  difficultyBandRef: "DIFFICULTY_BAND",
  taskProfileRef: "TASK_PROFILE",
  policyRef: "POLICY",
};

const REGISTRY_REF_FIELDS = [
  "contractVersion",
  "refKind",
  "registryId",
  "objectId",
  "version",
  "objectDigest",
  "refDigest",
];

const EVENT_FIELDS = [
  "contractVersion",
  "eventId",
  "eventDigest",
  "examPackageRef",
  "subjectRef",
  "skillConceptRef",
  "problemFamilyRef",
  "difficultyBandRef",
  "taskProfileRef",
  "policyRef",
  "capacityShortageCount",
  "occurredAt",
];

function read(path, encoding = "utf8") {
  return readFileSync(new URL(path, ROOT_URL), encoding);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function reverseRecord(value) {
  return Object.fromEntries(Object.entries(value).reverse());
}

function digest(character) {
  return `sha256:${character.repeat(64)}`;
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

function gitPathObjects(reference, paths) {
  return paths.map((path) => {
    const result = spawnSync("git", ["ls-tree", reference, "--", path], {
      cwd: ROOT_PATH,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    const match = /^(\d+) (\w+) ([0-9a-f]+)\t(.+)\r?\n?$/u.exec(result.stdout);
    assert.ok(match, path);
    return { path: match[4], mode: match[1], type: match[2], objectId: match[3] };
  });
}

function refMaterial(refKind = "SUBJECT", marker = "1", overrides = {}) {
  return {
    contractVersion: "OpaqueRegistryRefV1",
    refKind,
    registryId: `reg_${marker.repeat(32)}`,
    objectId: `obj_${marker.repeat(32)}`,
    version: 1,
    objectDigest: digest(marker),
    ...overrides,
  };
}

function createSlotRefs() {
  const markers = ["1", "2", "3", "4", "5", "6", "7"];
  return Object.fromEntries(
    Object.entries(EVENT_SLOT_KINDS).map(([slot, kind], index) => [
      slot,
      createOpaqueRegistryRefV1(refMaterial(kind, markers[index])),
    ]),
  );
}

function eventMaterial(overrides = {}) {
  return {
    contractVersion: "BodylessBankScarcityEventV1",
    ...createSlotRefs(),
    capacityShortageCount: 3,
    occurredAt: "2026-08-29T00:00:00.000Z",
    ...overrides,
  };
}

function trapProxy(target) {
  let traps = 0;
  const handler = {
    getPrototypeOf(value) {
      traps += 1;
      return Reflect.getPrototypeOf(value);
    },
    ownKeys(value) {
      traps += 1;
      return Reflect.ownKeys(value);
    },
    getOwnPropertyDescriptor(value, key) {
      traps += 1;
      return Reflect.getOwnPropertyDescriptor(value, key);
    },
    get(value, key, receiver) {
      traps += 1;
      return Reflect.get(value, key, receiver);
    },
  };
  return { value: new Proxy(target, handler), traps: () => traps };
}

test("QF0B-CONTRACT-001 binds exact dependencies, issue, base, and six paths", () => {
  const contractText = read(CONFIG_PATH);
  const contract = JSON.parse(contractText);
  assert.equal(
    contract.contractVersion,
    "dabangil.qf0b.opaque_registry_bodyless_scarcity.v1",
  );
  assert.equal(contract.stage, "QF-0B");
  assert.equal(contract.tracking.closesIssue, 864);
  assert.deepEqual(
    [
      contract.tracking.qf0Umbrella,
      contract.tracking.questionFoundryProgram,
      contract.tracking.cognitiveProductReference,
    ],
    [857, 811, 714],
  );
  assert.equal(contract.dependencies.qf0a1.resultingMainSha, "62268861dcc6a60126700c5259c662c55bd1a4ee");
  assert.equal(contract.dependencies.qf0a1.resultingMainTree, "996b1e7ea30f31f21782e765be644798aad8d548");
  assert.equal(contract.dependencies.qf0a2.resultingMainSha, BASE_SHA);
  assert.equal(contract.dependencies.qf0a2.resultingMainTree, BASE_TREE);
  assert.deepEqual(contract.changedPathsExactly, EXACT_PATHS);
  assert.deepEqual(changedPaths(), [...EXACT_PATHS].sort());
  assert.equal(sha256(contractText), EXPECTED_CONFIG_DIGEST);
});

test("QF0B-DEPENDENCY-002 recomputes exact QF-0A1 identities and exports", () => {
  const contract = JSON.parse(read(CONFIG_PATH));
  const dependency = contract.dependencies.qf0a1;
  const pathObjects = gitPathObjects("HEAD", QF0A1_PATHS);
  assert.equal(sha256(read(QF0A1_PATHS[0], null)), dependency.configSha256);
  assert.equal(sha256(read(QF0A1_PATHS[3], null)), dependency.implementationSha256);
  assert.deepEqual(pathObjects, dependency.pathObjectsExactly);
  assert.equal(
    qf0a1.digestCanonicalJsonV1(pathObjects),
    dependency.fivePathIdentity,
  );
  assert.deepEqual(Object.keys(qf0a1), dependency.requiredExportsExactly);
  assert.equal(
    qf0a1.digestCanonicalJsonV1(clone(qf0a1.QF0A1_SOURCE_ONLY_BOUNDARY_RECEIPT)),
    dependency.sourceOnlyBoundaryReceiptDigest,
  );
});

test("QF0B-DEPENDENCY-003 recomputes exact QF-0A2 identities, exports, and boundary", () => {
  const contract = JSON.parse(read(CONFIG_PATH));
  const dependency = contract.dependencies.qf0a2;
  const pathObjects = gitPathObjects("HEAD", QF0A2_PATHS);
  assert.equal(sha256(read(QF0A2_PATHS[0], null)), dependency.configSha256);
  assert.equal(
    sha256(read(QF0A2_PATHS[3], null)),
    dependency.implementationPathDigests[QF0A2_PATHS[3]],
  );
  assert.equal(
    sha256(read(QF0A2_PATHS[4], null)),
    dependency.implementationPathDigests[QF0A2_PATHS[4]],
  );
  assert.deepEqual(pathObjects, dependency.pathObjectsExactly);
  assert.equal(qf0a1.digestCanonicalJsonV1(pathObjects), dependency.sixPathIdentity);
  assert.deepEqual(Object.keys(qf0a2Contracts), dependency.contractExportsExactly);
  assert.deepEqual(Object.keys(qf0a2Core), dependency.coreExportsExactly);
  assert.equal(
    qf0a1.digestCanonicalJsonV1(
      clone(qf0a2Contracts.QF0A2_SOURCE_ONLY_BOUNDARY_RECEIPT),
    ),
    dependency.sourceOnlyBoundaryReceiptDigest,
  );
});

test("QF0B-SURFACE-004 exposes only the closed constants and pure helpers", () => {
  const contract = JSON.parse(read(CONFIG_PATH));
  assert.deepEqual(Object.keys(contracts), [
    "QF0B_CONTRACT_VERSION",
    "QF0B_LIMITS",
    "QF0B_REGISTRY_REF_KINDS",
    "QF0B_SOURCE_ONLY_BOUNDARY_RECEIPT",
  ]);
  assert.deepEqual(Object.keys(core), [
    "assertBodylessBankScarcityEventV1",
    "assertOpaqueRegistryRefV1",
    "createBodylessBankScarcityEventV1",
    "createOpaqueRegistryRefV1",
  ]);
  assert.equal(QF0B_CONTRACT_VERSION, "QF0BOpaqueRegistryBodylessScarcityCoreV1");
  assert.equal(Object.isFrozen(QF0B_LIMITS), true);
  assert.equal(Object.isFrozen(QF0B_SOURCE_ONLY_BOUNDARY_RECEIPT), true);
  assert.equal(QF0B_SOURCE_ONLY_BOUNDARY_RECEIPT.runtimeActivation, "OFF");
  assert.equal(QF0B_SOURCE_ONLY_BOUNDARY_RECEIPT.network, "OFF");
  assert.equal(QF0B_SOURCE_ONLY_BOUNDARY_RECEIPT.remoteMutation, "ZERO");
  assert.equal(QF0B_SOURCE_ONLY_BOUNDARY_RECEIPT.productionMutation, "ZERO");
  assert.deepEqual(QF0B_SOURCE_ONLY_BOUNDARY_RECEIPT.releasableLifecycleStates, []);
  assert.deepEqual(
    QF0B_SOURCE_ONLY_BOUNDARY_RECEIPT.publicExportsExactly,
    contract.publicExportsExactly,
  );
});

test("QF0B-REF-005 creates a deterministic valid OpaqueRegistryRefV1", () => {
  const first = createOpaqueRegistryRefV1(refMaterial());
  const second = createOpaqueRegistryRefV1(refMaterial());
  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.deepEqual(Object.keys(first), REGISTRY_REF_FIELDS);
  assert.match(first.registryId, /^reg_[a-f0-9]{32}$/u);
  assert.match(first.objectId, /^obj_[a-f0-9]{32}$/u);
  assert.match(first.refDigest, /^sha256:[a-f0-9]{64}$/u);
  assert.deepEqual(assertOpaqueRegistryRefV1(first), first);
});

test("QF0B-REF-006 ignores input field order without changing reference identity", () => {
  const forward = createOpaqueRegistryRefV1(refMaterial());
  const reverse = createOpaqueRegistryRefV1(reverseRecord(refMaterial()));
  assert.equal(forward.refDigest, reverse.refDigest);
  assert.deepEqual(forward, reverse);
});

test("QF0B-REF-007 rejects every changed material field with the old digest", () => {
  const reference = createOpaqueRegistryRefV1(refMaterial());
  const mutations = {
    refKind: "POLICY",
    registryId: `reg_${"2".repeat(32)}`,
    objectId: `obj_${"3".repeat(32)}`,
    version: 2,
    objectDigest: digest("4"),
  };
  for (const [field, value] of Object.entries(mutations)) {
    const changed = clone(reference);
    changed[field] = value;
    assert.throws(
      () => assertOpaqueRegistryRefV1(changed),
      /REGISTRY_REF_DIGEST_MISMATCH/,
      field,
    );
  }
});

test("QF0B-REF-008 rejects human-readable, URL, path, base64-like, and variable IDs", () => {
  const invalid = [
    { registryId: "reg_official_questions" },
    { objectId: "obj_subject_accounting" },
    { registryId: "https://example.test/registry" },
    { objectId: "C:\\private\\question.txt" },
    { registryId: `reg_${Buffer.from("private payload").toString("base64")}` },
    { objectId: `obj_${"a".repeat(31)}` },
    { objectId: `obj_${"a".repeat(33)}` },
  ];
  for (const override of invalid) {
    assert.throws(() => createOpaqueRegistryRefV1(refMaterial("SUBJECT", "1", override)), /FORMAT_INVALID/);
  }
});

test("QF0B-REF-009 rejects missing, extra, and generic reference fields", () => {
  const missing = refMaterial();
  delete missing.objectDigest;
  assert.throws(() => createOpaqueRegistryRefV1(missing), /FIELD_SET_INVALID/);
  for (const extra of [
    { label: "Accounting" },
    { url: "https://example.test" },
    { metadata: { hidden: "payload" } },
    { extensions: {} },
  ]) {
    assert.throws(
      () => createOpaqueRegistryRefV1({ ...refMaterial(), ...extra }),
      /FIELD_SET_INVALID/,
    );
  }
  assert.throws(
    () => assertOpaqueRegistryRefV1({ ...createOpaqueRegistryRefV1(refMaterial()), note: "x" }),
    /FIELD_SET_INVALID/,
  );
});

test("QF0B-REF-010 fails on proxy, accessor, symbol, and hostile prototype without traps", () => {
  const proxied = trapProxy(refMaterial());
  assert.throws(() => createOpaqueRegistryRefV1(proxied.value), /PROXY_UNSUPPORTED/);
  assert.equal(proxied.traps(), 0);

  let getterCalls = 0;
  const accessor = refMaterial();
  Object.defineProperty(accessor, "objectId", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return `obj_${"1".repeat(32)}`;
    },
  });
  assert.throws(() => createOpaqueRegistryRefV1(accessor), /DATA_PROPERTY_REQUIRED/);
  assert.equal(getterCalls, 0);

  const symbol = refMaterial();
  symbol[Symbol("body")] = "hidden";
  assert.throws(() => createOpaqueRegistryRefV1(symbol), /SYMBOL_KEY_UNSUPPORTED/);

  const hostilePrototype = refMaterial();
  Object.setPrototypeOf(hostilePrototype, { label: "inherited" });
  assert.throws(
    () => createOpaqueRegistryRefV1(hostilePrototype),
    /PROTOTYPE_UNSUPPORTED/,
  );
});

test("QF0B-REF-011 accepts every closed kind without creating the referenced object", () => {
  assert.deepEqual(QF0B_REGISTRY_REF_KINDS, [
    "EXAM_PACKAGE",
    "SUBJECT",
    "SKILL_CONCEPT",
    "PROBLEM_FAMILY",
    "DIFFICULTY_BAND",
    "TASK_PROFILE",
    "BLUEPRINT",
    "ANSWER_SPECIFICATION",
    "VALIDATOR_PROFILE",
    "POLICY",
  ]);
  for (const kind of QF0B_REGISTRY_REF_KINDS) {
    const reference = createOpaqueRegistryRefV1(refMaterial(kind));
    assert.equal(reference.refKind, kind);
    assert.deepEqual(Object.keys(reference), REGISTRY_REF_FIELDS);
  }
  assert.throws(
    () => createOpaqueRegistryRefV1(refMaterial("QUESTION_BODY")),
    /KIND_UNSUPPORTED/,
  );
});

test("QF0B-REF-012 enforces positive bounded safe object versions", () => {
  for (const version of [0, -1, 0.5, Number.MAX_SAFE_INTEGER, 1_000_001]) {
    assert.throws(
      () => createOpaqueRegistryRefV1(refMaterial("SUBJECT", "1", { version })),
      /VERSION_INVALID/,
    );
  }
  assert.equal(
    createOpaqueRegistryRefV1(
      refMaterial("SUBJECT", "1", { version: QF0B_LIMITS.maxRegistryObjectVersion }),
    ).version,
    QF0B_LIMITS.maxRegistryObjectVersion,
  );
});

test("QF0B-EVENT-013 creates a deterministic fully opaque bodyless event", () => {
  const first = createBodylessBankScarcityEventV1(eventMaterial());
  const second = createBodylessBankScarcityEventV1(eventMaterial());
  assert.deepEqual(first, second);
  assert.equal(Object.isFrozen(first), true);
  assert.deepEqual(Object.keys(first), EVENT_FIELDS);
  assert.match(first.eventId, /^bse_[a-f0-9]{64}$/u);
  assert.match(first.eventDigest, /^sha256:[a-f0-9]{64}$/u);
  assert.deepEqual(assertBodylessBankScarcityEventV1(first), first);
});

test("QF0B-EVENT-014 ignores event field order without changing identity", () => {
  const input = eventMaterial();
  const forward = createBodylessBankScarcityEventV1(input);
  const reverse = createBodylessBankScarcityEventV1(reverseRecord(input));
  assert.equal(forward.eventId, reverse.eventId);
  assert.equal(forward.eventDigest, reverse.eventDigest);
});

test("QF0B-EVENT-015 rejects every wrong fixed slot-kind permutation", () => {
  for (const [slot, requiredKind] of Object.entries(EVENT_SLOT_KINDS)) {
    for (const wrongKind of QF0B_REGISTRY_REF_KINDS) {
      if (wrongKind === requiredKind) continue;
      const wrongRef = createOpaqueRegistryRefV1(refMaterial(wrongKind, "8"));
      assert.throws(
        () => createBodylessBankScarcityEventV1(eventMaterial({ [slot]: wrongRef })),
        /REF_KIND_MISMATCH/,
        `${slot}:${wrongKind}`,
      );
    }
  }
});

test("QF0B-EVENT-016 independently validates every nested reference digest", () => {
  const input = eventMaterial();
  for (const slot of Object.keys(EVENT_SLOT_KINDS)) {
    const changedRef = clone(input[slot]);
    changedRef.objectDigest = digest("f");
    assert.throws(
      () => createBodylessBankScarcityEventV1({ ...input, [slot]: changedRef }),
      /REGISTRY_REF_DIGEST_MISMATCH/,
      slot,
    );
  }
});

test("QF0B-EVENT-017 rejects zero, negative, fractional, unsafe, and excessive shortages", () => {
  for (const capacityShortageCount of [
    0,
    -1,
    0.5,
    Number.MAX_SAFE_INTEGER,
    QF0B_LIMITS.maxCapacityShortageCount + 1,
  ]) {
    assert.throws(
      () => createBodylessBankScarcityEventV1(eventMaterial({ capacityShortageCount })),
      /CAPACITY_SHORTAGE_COUNT_INVALID/,
    );
  }
  assert.equal(
    createBodylessBankScarcityEventV1(
      eventMaterial({ capacityShortageCount: QF0B_LIMITS.maxCapacityShortageCount }),
    ).capacityShortageCount,
    QF0B_LIMITS.maxCapacityShortageCount,
  );
});

test("QF0B-EVENT-018 rejects malformed and noncanonical timestamps", () => {
  for (const occurredAt of [
    "2026-08-29T00:00:00Z",
    "2026-08-29T09:00:00.000+09:00",
    "2026-02-30T00:00:00.000Z",
    "29 August 2026",
    "",
  ]) {
    assert.throws(
      () => createBodylessBankScarcityEventV1(eventMaterial({ occurredAt })),
      /SCARCITY_OCCURRED_AT_(FORMAT_)?INVALID/,
      occurredAt,
    );
  }
});

test("QF0B-BODYLESS-019 rejects raw question, answer, OCR, and learner material", () => {
  const fields = [
    "question",
    "questionBody",
    "answer",
    "answerSpecificationBody",
    "ocrText",
    "handwriting",
    "learnerAnswer",
    "learnerNote",
    "learnerId",
    "accountId",
    "email",
    "phone",
    "externalUserId",
  ];
  for (const field of fields) {
    assert.throws(
      () => createBodylessBankScarcityEventV1({ ...eventMaterial(), [field]: "forbidden" }),
      /FIELD_SET_INVALID/,
      field,
    );
  }
});

test("QF0B-BODYLESS-020 rejects textbook, academy, source, provider, and location material", () => {
  const fields = [
    "textbookText",
    "academyMaterial",
    "sourceExcerpt",
    "providerPrompt",
    "providerResponse",
    "providerRawPayload",
    "url",
    "uri",
    "signedUrl",
    "filePath",
    "sourceLocator",
    "displayName",
    "label",
    "description",
    "note",
    "reason",
    "summary",
  ];
  for (const field of fields) {
    assert.throws(
      () => createBodylessBankScarcityEventV1({ ...eventMaterial(), [field]: "forbidden" }),
      /FIELD_SET_INVALID/,
      field,
    );
  }
});

test("QF0B-BODYLESS-021 rejects generic nested metadata and extension bags", () => {
  for (const extra of [
    { metadata: { question: "hidden" } },
    { extensions: { body: "hidden" } },
    { payload: { arbitrary: true } },
    { context: ["hidden"] },
  ]) {
    assert.throws(
      () => createBodylessBankScarcityEventV1({ ...eventMaterial(), ...extra }),
      /FIELD_SET_INVALID/,
    );
  }
});

test("QF0B-EVENT-022 rejects altered event material with old IDs or digests", () => {
  const event = createBodylessBankScarcityEventV1(eventMaterial());
  const changedCount = clone(event);
  changedCount.capacityShortageCount = 4;
  assert.throws(() => assertBodylessBankScarcityEventV1(changedCount), /EVENT_ID_MISMATCH/);

  const changedTime = clone(event);
  changedTime.occurredAt = "2026-08-29T00:00:01.000Z";
  assert.throws(() => assertBodylessBankScarcityEventV1(changedTime), /EVENT_ID_MISMATCH/);

  const changedReference = clone(event);
  changedReference.subjectRef = createOpaqueRegistryRefV1(refMaterial("SUBJECT", "a"));
  assert.throws(
    () => assertBodylessBankScarcityEventV1(changedReference),
    /EVENT_ID_MISMATCH/,
  );

  const changedId = clone(event);
  changedId.eventId = `bse_${"a".repeat(64)}`;
  assert.throws(() => assertBodylessBankScarcityEventV1(changedId), /EVENT_ID_MISMATCH/);

  const changedDigest = clone(event);
  changedDigest.eventDigest = digest("a");
  assert.throws(
    () => assertBodylessBankScarcityEventV1(changedDigest),
    /EVENT_DIGEST_MISMATCH/,
  );
});

test("QF0B-EVENT-023 rejects missing, extra, proxy, accessor, symbol, and prototype shapes", () => {
  const missing = eventMaterial();
  delete missing.policyRef;
  assert.throws(() => createBodylessBankScarcityEventV1(missing), /FIELD_SET_INVALID/);

  const proxied = trapProxy(eventMaterial());
  assert.throws(
    () => createBodylessBankScarcityEventV1(proxied.value),
    /PROXY_UNSUPPORTED/,
  );
  assert.equal(proxied.traps(), 0);

  const nestedProxy = trapProxy(createSlotRefs().subjectRef);
  assert.throws(
    () => createBodylessBankScarcityEventV1(eventMaterial({ subjectRef: nestedProxy.value })),
    /PROXY_UNSUPPORTED/,
  );
  assert.equal(nestedProxy.traps(), 0);

  let getterCalls = 0;
  const accessor = eventMaterial();
  Object.defineProperty(accessor, "occurredAt", {
    enumerable: true,
    get() {
      getterCalls += 1;
      return "2026-08-29T00:00:00.000Z";
    },
  });
  assert.throws(() => createBodylessBankScarcityEventV1(accessor), /DATA_PROPERTY_REQUIRED/);
  assert.equal(getterCalls, 0);

  const symbol = eventMaterial();
  symbol[Symbol("body")] = "hidden";
  assert.throws(() => createBodylessBankScarcityEventV1(symbol), /SYMBOL_KEY_UNSUPPORTED/);

  const hostilePrototype = eventMaterial();
  Object.setPrototypeOf(hostilePrototype, { inheritedBody: "hidden" });
  assert.throws(
    () => createBodylessBankScarcityEventV1(hostilePrototype),
    /PROTOTYPE_UNSUPPORTED/,
  );
});

test("QF0B-DETERMINISM-024 is process-locale independent", () => {
  const probe = `
    import { createOpaqueRegistryRefV1, createBodylessBankScarcityEventV1 } from "./${CORE_PATH}";
    const digest = (value) => \`sha256:\${value.repeat(64)}\`;
    const kinds = ${JSON.stringify(Object.values(EVENT_SLOT_KINDS))};
    const slots = ${JSON.stringify(Object.keys(EVENT_SLOT_KINDS))};
    const refs = Object.fromEntries(slots.map((slot, index) => {
      const marker = String(index + 1);
      return [slot, createOpaqueRegistryRefV1({
        contractVersion:"OpaqueRegistryRefV1", refKind:kinds[index],
        registryId:\`reg_\${marker.repeat(32)}\`, objectId:\`obj_\${marker.repeat(32)}\`,
        version:1, objectDigest:digest(marker)
      })];
    }));
    const event = createBodylessBankScarcityEventV1({
      contractVersion:"BodylessBankScarcityEventV1", ...refs,
      capacityShortageCount:3, occurredAt:"2026-08-29T00:00:00.000Z"
    });
    process.stdout.write(JSON.stringify([refs.subjectRef.refDigest, event.eventId, event.eventDigest]));
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

test("QF0B-BOUNDARY-025 serializes only closed metadata and grants no authority", () => {
  const event = createBodylessBankScarcityEventV1(eventMaterial());
  const serialized = JSON.stringify(event);
  const parsed = JSON.parse(serialized);
  assert.deepEqual(Object.keys(parsed), EVENT_FIELDS);
  for (const slot of Object.keys(EVENT_SLOT_KINDS)) {
    assert.deepEqual(Object.keys(parsed[slot]), REGISTRY_REF_FIELDS);
  }
  const forbiddenKeys = [
    "candidate",
    "questionBody",
    "answerBody",
    "learnerId",
    "bankAssignment",
    "releaseState",
    "providerPayload",
  ];
  for (const key of forbiddenKeys) assert.equal(serialized.includes(`\"${key}\"`), false);
  assert.equal(QF0B_SOURCE_ONLY_BOUNDARY_RECEIPT.questionCandidateAuthorityAbsent, true);
  assert.equal(QF0B_SOURCE_ONLY_BOUNDARY_RECEIPT.generationAuthorityAbsent, true);
  assert.equal(QF0B_SOURCE_ONLY_BOUNDARY_RECEIPT.releaseAuthorityAbsent, true);
  assert.equal(QF0B_SOURCE_ONLY_BOUNDARY_RECEIPT.learnerAssignmentAbsent, true);
  assert.equal(QF0B_SOURCE_ONLY_BOUNDARY_RECEIPT.bankAssignmentAbsent, true);
  assert.equal(QF0B_SOURCE_ONLY_BOUNDARY_RECEIPT.registryResolutionAuthorityAbsent, true);
});

test("QF0B-SOURCE-026 has no runtime, provider, network, database, filesystem, or env entrypoint", () => {
  const sources = [read(CONTRACTS_PATH), read(CORE_PATH)];
  const imports = sources.flatMap((source) =>
    [...source.matchAll(/from\s+"([^"]+)"/gu)].map((match) => match[1]),
  );
  assert.deepEqual([...new Set(imports)].sort(), [
    "./bounded-canonical-json",
    "./scarcity-contracts",
    "./trust-contracts",
    "./trust-core",
    "node:util",
  ]);
  const joined = sources.join("\n");
  for (const pattern of [
    /process\.env/u,
    /\bfetch\s*\(/u,
    /node:fs/u,
    /node:http/u,
    /node:https/u,
    /@supabase/u,
    /\bstripe\b/iu,
    /writeFile/u,
    /createClient\s*\(/u,
    /new\s+URL\s*\(/u,
  ]) {
    assert.doesNotMatch(joined, pattern);
  }
  assert.deepEqual(changedPaths(), [...EXACT_PATHS].sort());
  assert.equal(EXACT_PATHS.some((path) => path === "package.json" || path.endsWith("lock.json")), false);
  assert.equal(EXACT_PATHS.some((path) => path.startsWith("app/")), false);
});

test("QF0B-SOURCE-027 defines no candidate, release, learner, or bank assignment API", () => {
  const runtimeExports = [...Object.keys(contracts), ...Object.keys(core)];
  for (const forbidden of [
    "Candidate",
    "Release",
    "LearnerAssignment",
    "BankAssignment",
    "Provider",
    "RegistryResolver",
  ]) {
    assert.equal(runtimeExports.some((name) => name.includes(forbidden)), false);
  }
  const contract = JSON.parse(read(CONFIG_PATH));
  assert.equal(contract.bodylessBankScarcityEventV1.candidateCreation, false);
  assert.equal(contract.bodylessBankScarcityEventV1.releaseAuthorization, false);
  assert.equal(contract.bodylessBankScarcityEventV1.learnerAssignment, false);
  assert.equal(contract.bodylessBankScarcityEventV1.bankAssignment, false);
  assert.equal(contract.successorGate.qf0i, "BLOCKED");
  assert.equal(contract.successorGate.automaticStart, false);
});
