import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("/instructor/source-review route exists and uses existing instructor/admin guard pattern", async () => {
  const source = await readFile(new URL("../app/instructor/source-review/page.tsx", import.meta.url), "utf8");

  assert.ok(source.includes("getServerSessionUser"));
  assert.ok(source.includes("isAllowedAdminEmail"));
  assert.ok(source.includes('redirect("/login?returnTo=%2Finstructor%2Fsource-review")'));
  assert.ok(source.includes("접근 권한이 필요합니다"));
  assert.ok(source.includes("학원용 답안 운영 콘솔 전용"));
});

test("source-review is internal only and not linked from learner app navigation", async () => {
  const appLayout = await readFile(new URL("../app/app/layout.tsx", import.meta.url), "utf8");
  const appHome = await readFile(new URL("../app/app/page.tsx", import.meta.url), "utf8");

  assert.equal(appLayout.includes("/instructor/source-review"), false);
  assert.equal(appHome.includes("/instructor/source-review"), false);
});

test("source-review page includes Korean operator labels and safety/read-only copy", async () => {
  const source = await readFile(new URL("../app/instructor/source-review/page.tsx", import.meta.url), "utf8");

  const required = [
    "Source 문서 ID",
    "과목 / 연도",
    "추출 후보 상태",
    "구조화 후보 상태",
    "연결된 Reference ID",
    "검수 기록",
    "검수 적용 결과",
    "내부 검수용입니다. 공식 답안이나 공식 채점 기준이 아닙니다.",
    "현재 화면은 읽기 전용이며, OCR·업로드·상태 변경은 제공하지 않습니다.",
    'title="Source"',
    'title="Candidate"',
    'title="Review"',
  ];

  for (const token of required) {
    assert.ok(source.includes(token), `missing required field/copy: ${token}`);
  }
});

test("source-review page remains read-only with no mutation/upload/ocr/archive controls", async () => {
  const source = await readFile(new URL("../app/instructor/source-review/page.tsx", import.meta.url), "utf8");

  const forbidden = ["approve", "reject", "onClick", "<form", "upload", "archive", "POST", "PUT", "PATCH"];
  for (const token of forbidden) {
    assert.equal(source.includes(token), false, `forbidden interactive token found: ${token}`);
  }
});

test("source-review page does not include official answer/scoring/pass-fail language", async () => {
  const source = await readFile(new URL("../app/instructor/source-review/page.tsx", import.meta.url), "utf8");

  const forbidden = ["official answer", "official scoring", "pass/fail", "합격", "불합격"];
  for (const token of forbidden) {
    assert.equal(source.includes(token), false, `forbidden token found: ${token}`);
  }
});
