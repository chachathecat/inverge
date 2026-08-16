import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalTextBytes,
  normalizeLineEndings,
  normalizeRepositoryPath,
} from "./platform-text.mjs";

test("platform text normalization treats LF, CRLF, and CR inputs identically", () => {
  const expected = "first\nsecond\nthird\n";

  assert.equal(normalizeLineEndings(expected), expected);
  assert.equal(
    normalizeLineEndings("first\r\nsecond\r\nthird\r\n"),
    expected,
  );
  assert.equal(normalizeLineEndings("first\rsecond\rthird\r"), expected);
});

test("canonical text bytes are stable across checkout line endings", () => {
  assert.deepEqual(
    canonicalTextBytes(Buffer.from("alpha\r\nbeta\r\n", "utf8")),
    Buffer.from("alpha\nbeta\n", "utf8"),
  );
});

test("repository paths use one slash convention on Windows and Linux", () => {
  assert.equal(
    normalizeRepositoryPath("app\\app\\items\\[itemId]\\page.tsx"),
    "app/app/items/[itemId]/page.tsx",
  );
  assert.equal(
    normalizeRepositoryPath("app/app/items/[itemId]/page.tsx"),
    "app/app/items/[itemId]/page.tsx",
  );
});
