import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";

import {
  fetchCurrentLawArticleById,
  fetchCurrentLawBodyById,
  normalizeArticleJo,
  searchCurrentLawByTitle,
} from "../lib/legal/law-open-api.ts";
import {
  extractLawSearchHits,
  normalizeLawDate,
  pickExactLaw,
} from "../lib/legal/legal-normalizer.ts";
import { extractArticleChunks } from "../lib/legal/parse-law-xml.ts";

const seedPath = "reference_corpus/legal/appraiser/legal_sources.seed.json";
const migrationPath = "supabase/migrations/20260615_legal_grounding.sql";
const docsPath = "docs/inverge-legal-source-ingest.md";
const testRunnerPath = "scripts/run-node-tests.mjs";
const packagePath = "package.json";
const openApiPath = "lib/legal/law-open-api.ts";
const ingestScriptPath = "scripts/legal/ingest-legal-sources.ts";

const requiredTitles = [
  "민법",
  "감정평가 및 감정평가사에 관한 법률",
  "감정평가 및 감정평가사에 관한 법률 시행령",
  "감정평가 및 감정평가사에 관한 법률 시행규칙",
  "공익사업을 위한 토지 등의 취득 및 보상에 관한 법률",
  "공익사업을 위한 토지 등의 취득 및 보상에 관한 법률 시행령",
  "공익사업을 위한 토지 등의 취득 및 보상에 관한 법률 시행규칙",
  "부동산 가격공시에 관한 법률",
  "부동산 가격공시에 관한 법률 시행령",
  "국토의 계획 및 이용에 관한 법률",
  "건축법",
  "도시 및 주거환경정비법",
  "행정절차법",
  "행정소송법",
  "행정심판법",
];

const forbiddenSeedFields = new Set([
  "rawUserText",
  "rawOcrText",
  "rawAnswerText",
  "rawQuestionText",
  "userAnswer",
  "problemText",
  "questionText",
  "answerText",
  "ocrFullText",
  "officialAnswer",
  "officialAnswerBody",
  "modelAnswer",
  "score",
  "passFail",
  "serviceRoleKey",
]);

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function assertNoForbiddenFields(value, path = "root") {
  if (Array.isArray(value)) {
    value.forEach((child, index) => assertNoForbiddenFields(child, `${path}[${index}]`));
    return;
  }

  if (!value || typeof value !== "object") {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    assert.equal(forbiddenSeedFields.has(key), false, `${path}.${key} must not be stored in legal seed`);
    assertNoForbiddenFields(child, `${path}.${key}`);
  }
}

test("legal source seed exists with required appraiser legal sources only as metadata", async () => {
  assert.equal(existsSync(seedPath), true);
  const seed = await readJson(seedPath);
  assert.equal(Array.isArray(seed), true);
  assert.equal(seed.length, requiredTitles.length);

  const titles = new Set(seed.map((item) => item.title));
  for (const title of requiredTitles) {
    assert.equal(titles.has(title), true, `${title} must be seeded`);
  }

  for (const item of seed) {
    assert.equal(typeof item.sourceKey, "string");
    assert.equal(typeof item.title, "string");
    assert.equal(item.sourceType, "current_law");
    assert.equal(item.provider, "moleg_law_open_api");
    assert.equal(typeof item.priority, "number");
    assert.equal(Array.isArray(item.examSubjects), true);
    assert.equal(item.examSubjects.length > 0, true);
    assert.equal(item.needsOfficialVerification, true);
  }

  assertNoForbiddenFields(seed);
});

test("legal grounding migration creates corpus tables with authenticated read and no client writes", async () => {
  assert.equal(existsSync(migrationPath), true);
  const migration = await readFile(migrationPath, "utf8");

  for (const table of [
    "legal_sources",
    "legal_versions",
    "legal_article_chunks",
    "legal_concept_nodes",
    "legal_concept_anchors",
    "legal_sync_runs",
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`grant select on table public\\.${table} to authenticated`));
    assert.doesNotMatch(
      migration,
      new RegExp(`grant select, insert, update, delete on table public\\.${table} to authenticated`),
      `${table} must not grant authenticated client writes`,
    );
    assert.doesNotMatch(
      migration,
      new RegExp(`on public\\.${table}[\\s\\S]{0,160}for (insert|update|delete)[\\s\\S]{0,80}to authenticated`, "i"),
      `${table} must not define authenticated write policies`,
    );
  }

  assert.match(migration, /create extension if not exists "pgcrypto"/);
  assert.match(migration, /create extension if not exists vector/);
  assert.match(migration, /embedding vector\(1536\)/);
  assert.match(migration, /raw_xml_sha256 text not null/);
});

test("law Open API helpers request XML only and never require HTML scraping", async () => {
  const requests = [];
  const fetchImpl = async (url) => {
    requests.push(new URL(String(url)));
    return new Response("<ok />", { status: 200 });
  };

  await searchCurrentLawByTitle("민법", { oc: "test-open-api-client", fetchImpl });
  await fetchCurrentLawBodyById("LAW123", { oc: "test-open-api-client", fetchImpl });
  await fetchCurrentLawArticleById("LAW123", "제1조의2", { oc: "test-open-api-client", fetchImpl });

  assert.equal(requests.length, 3);
  assert.equal(requests[0].pathname.endsWith("/lawSearch.do"), true);
  assert.equal(requests[1].pathname.endsWith("/lawService.do"), true);
  assert.equal(requests[2].pathname.endsWith("/lawService.do"), true);

  for (const request of requests) {
    assert.equal(request.searchParams.get("target"), "law");
    assert.equal(request.searchParams.get("type"), "XML");
    assert.notEqual(request.searchParams.get("type"), "HTML");
    assert.equal(request.searchParams.get("OC"), "test-open-api-client");
  }

  assert.equal(requests[2].searchParams.get("JO"), "000102");
  assert.equal(normalizeArticleJo("12"), "001200");
  assert.equal(normalizeArticleJo("000300"), "000300");

  const source = await readFile(openApiPath, "utf8");
  assert.doesNotMatch(source, /type:\s*["']HTML["']/);
  assert.match(source, /LAW_OPEN_API_OC/);
});

test("legal normalizer extracts current-law search hits and exact title matches", () => {
  const parser = new XMLParser({ ignoreAttributes: false, parseTagValue: false });
  const parsed = parser.parse(`
    <LawSearch>
      <law>
        <법령ID>CIVIL_ACT_ID</법령ID>
        <법령일련번호>12345</법령일련번호>
        <법령명한글>민법</법령명한글>
        <법령약칭명>민법</법령약칭명>
        <공포일자>20260101</공포일자>
        <시행일자>20260203</시행일자>
        <소관부처명>법무부</소관부처명>
      </law>
    </LawSearch>
  `);

  const hits = extractLawSearchHits(parsed);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].lawId, "CIVIL_ACT_ID");
  assert.equal(hits[0].title, "민법");
  assert.equal(hits[0].promulgationDate, "2026-01-01");
  assert.equal(hits[0].effectiveDate, "2026-02-03");
  assert.equal(pickExactLaw(hits, "민법")?.lawId, "CIVIL_ACT_ID");
  assert.equal(pickExactLaw(hits, "민 법")?.lawId, "CIVIL_ACT_ID");
  assert.equal(pickExactLaw(hits, "행정소송법"), null);
  assert.equal(normalizeLawDate("20260304"), "2026-03-04");
});

test("legal parser extracts article-like chunks from synthetic XML fixture", () => {
  const parser = new XMLParser({ ignoreAttributes: false, trimValues: true, parseTagValue: false });
  const parsed = parser.parse(`
    <법령>
      <법령명_한글>학습용 합성법</법령명_한글>
      <조문>
        <조문단위>
          <조문번호>1</조문번호>
          <조문가지번호>0</조문가지번호>
          <조문키>000100</조문키>
          <조문제목>목적</조문제목>
          <조문내용>제1조(목적) 이 합성 조문은 파서 테스트를 위한 학습용 문장입니다.</조문내용>
          <항>
            <항내용>① 학습자는 저장 전 내용을 직접 확인합니다.</항내용>
          </항>
        </조문단위>
        <조문단위>
          <조문번호>2</조문번호>
          <조문가지번호>0</조문가지번호>
          <조문키>000200</조문키>
          <조문제목>확인</조문제목>
          <조문내용>제2조(확인) 이 조문은 공식 자료가 아닌 합성 테스트 문장입니다.</조문내용>
        </조문단위>
      </조문>
    </법령>
  `);

  const chunks = extractArticleChunks(parsed);
  assert.equal(chunks.length, 2);
  assert.equal(chunks[0].lawTitle, "학습용 합성법");
  assert.equal(chunks[0].articleNo, "제1조");
  assert.equal(chunks[0].articleTitle, "목적");
  assert.match(chunks[0].normalizedText, /저장 전 내용을 직접 확인/);
  assert.match(chunks[0].embeddingText, /학습용 합성법 제1조 목적/);
  assert.equal(chunks[0].metadata.provider, "moleg_law_open_api");
  assert.equal(chunks[0].metadata.sourceKind, "current_law_article");
});

test("legal source ingest docs preserve Open API and source-grounded boundaries", async () => {
  assert.equal(existsSync(docsPath), true);
  const docs = await readFile(docsPath, "utf8");
  const lowerDocs = docs.toLowerCase();

  assert.match(docs, /Open API/);
  assert.match(docs, /Do not scrape 국가법령정보센터 HTML pages/);
  assert.match(lowerDocs, /no source, no legal claim/);
  assert.match(docs, /Service role key must not be exposed/);
  assert.match(docs, /LAW_OPEN_API_OC/);
  assert.match(docs, /Raw user OCR text/);
  assert.match(docs, /Raw learner answers/);
  assert.match(docs, /official grading/i);
  assert.match(docs, /official model answers/i);
});

test("ingest script and test runner are wired without exposing provider secrets", async () => {
  const packageJson = await readJson(packagePath);
  const runner = await readFile(testRunnerPath, "utf8");
  const ingestScript = await readFile(ingestScriptPath, "utf8");

  assert.equal(packageJson.scripts["ingest:legal"], "tsx scripts/legal/ingest-legal-sources.ts");
  assert.match(runner, /tests\/legal-source-ingest\.test\.mjs/);
  assert.match(ingestScript, /LAW_OPEN_API_OC/);
  assert.match(ingestScript, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(ingestScript, /rawXmlSha256/);
  assert.doesNotMatch(ingestScript, /console\.(log|info|error)\([^)]*LAW_OPEN_API_OC/);
  assert.doesNotMatch(ingestScript, /console\.(log|info|error)\([^)]*SUPABASE_SERVICE_ROLE_KEY/);
});
