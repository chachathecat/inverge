import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function read(path) {
  return readFile(new URL(`../${path}`, import.meta.url), "utf8");
}

test("second-write route exposes a real user-visible final confirmation submit control", async () => {
  const page = await read("app/app/write/page.tsx");
  const bridge = await read("components/review-os/second-write-capture-form.tsx");

  assert.ok(page.includes("SecondWriteCaptureForm"));
  assert.ok(bridge.includes('workflow="second-write"'));
  assert.ok(bridge.includes('data-testid="second-write-final-confirmation"'));
  assert.ok(bridge.includes('data-testid="second-write-final-save"'));
  assert.ok(bridge.includes('type="submit"'));
  assert.ok(bridge.includes("form={SECOND_WRITE_FORM_ID}"));
  assert.ok(bridge.includes("저장하고 오늘 할 일에 반영"));
  assert.doesNotMatch(bridge, /requestSubmit\(|fetch\(|\/api\//);
});
