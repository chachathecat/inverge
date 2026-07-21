import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  parseQnetExamDate,
  parseQnetRightsNotice,
} from "../scripts/s233b-acquire-official-second-round.mjs";

const SNAPSHOT_PATH = "reference_corpus/question_archive/second/s233b_official_source_snapshot.json";

function rightsNotice(parts = {}) {
  return `<html><body>
    <h1>Q-Net 기출문제 이용안내</h1>
    <p>${parts.scope ?? "2014년 이후 공개된 기출문제"}</p>
    <p>${parts.license ?? "공공누리 제1유형"}</p>
    <p>${parts.attribution ?? "이용 시 출처 표시가 필요합니다."}</p>
  </body></html>`;
}

test("Q-Net rights parser requires independent license, attribution, material, and date scope evidence", () => {
  const rights = parseQnetRightsNotice(rightsNotice());
  assert.deepEqual(rights, {
    licenseId: "KOGL-TYPE-1",
    rightsStatus: "redistribution_allowed",
    permittedDisplayMode: "full_text_with_attribution",
    attributionRequired: true,
    commercialUseAllowed: true,
    modificationAllowed: true,
    scopeMaterialKind: "qnet_past_questions",
    scopeStartYear: 2014,
    noticeScopeValidated: true,
  });
  assert.throws(() => parseQnetRightsNotice(rightsNotice({ attribution: "자유롭게 이용" })), /scoped 2014-onward/u);
  assert.throws(() => parseQnetRightsNotice(rightsNotice({ scope: "2014년 이후 공개된 자료" })), /scoped 2014-onward/u);
  assert.throws(() => parseQnetRightsNotice(rightsNotice({ scope: "기출문제 이용안내" })), /scoped 2014-onward/u);
  assert.throws(() => parseQnetRightsNotice(rightsNotice({ license: "공공누리 안내" })), /scoped 2014-onward/u);
});

test("committed S233B source snapshot preserves official Q-Net hashes, KOGL attribution, and no raw assets", async () => {
  const snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, "utf8"));
  assert.equal(snapshot.schemaVersion, "s233b.official_second_round_acquisition.v1");
  assert.equal(snapshot.examDateEvidence.examDate, "2026-07-04");
  assert.equal(snapshot.examDateEvidence.authorityStatus, "official_primary_source");
  assert.equal(snapshot.rightsEvidence.licenseId, "KOGL-TYPE-1");
  assert.equal(snapshot.rightsEvidence.rightsStatus, "redistribution_allowed");
  assert.equal(snapshot.rightsEvidence.attributionRequired, true);
  assert.equal(snapshot.rightsEvidence.ambiguityConvertedToPermission, false);
  assert.match(snapshot.rightsEvidence.noticeContentHashSha256, /^[a-f0-9]{64}$/u);
  assert.equal(snapshot.sources.filter((source) => source.examYear === 2026).length, 3);
  assert.equal(snapshot.sources.filter((source) => source.examYear === 2026)
    .every((source) => source.authorityStatus === "official_primary_source"
      && source.coverage === "complete_subject_paper"
      && /^[a-f0-9]{64}$/u.test(source.contentHashSha256)
      && source.transformationProvenance.rawAssetStored === false), true);
  assert.equal(snapshot.acquisition.rawAssetsStored, false);
  assert.equal(snapshot.acquisition.sourceExcerptsStored, false);
  assert.equal(snapshot.acquisition.learnerContentIncluded, false);
});

test("official schedule parser pins the second-round date and rejects nearby first-round dates", () => {
  assert.equal(parseQnetExamDate("<p>1차 : 2026년 4월 4일 / 2차 : 2026년 7월 4일</p>"), "2026-07-04");
  assert.throws(() => parseQnetExamDate("<p>1차 : 2026년 4월 4일</p>"), /second-round exam date/u);
});
