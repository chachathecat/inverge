import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const S233B_ACQUISITION_SCHEMA_VERSION = "s233b.official_second_round_acquisition.v1";
export const S233B_QNET_ORIGIN = "https://www.q-net.or.kr";
export const S233B_RIGHTS_NOTICE_ARTICLE_ID = "5259147";
export const S233B_OFFICIAL_PAPER_ARTICLES = Object.freeze([
  { examYear: 2024, articleId: "5213532" },
  { examYear: 2025, articleId: "5239325" },
  { examYear: 2026, articleId: "5268128" },
]);

const SUBJECT_FILE_MARKERS = Object.freeze({
  practice: "감정평가실무",
  theory: "감정평가이론",
  law: "감정평가 및 보상법규",
});

const LAW_TERM_BINDINGS = Object.freeze([
  { lawSourceId: "law-source-admin-appeals-act", terms: ["행정심판법"] },
  { lawSourceId: "law-source-admin-litigation-act", terms: ["행정소송법"] },
  { lawSourceId: "law-source-admin-procedure-act", terms: ["행정절차법"] },
  { lawSourceId: "law-source-appraiser-act", terms: ["감정평가 및 감정평가사에 관한 법률", "감정평가법"] },
  { lawSourceId: "law-source-appraiser-act-enforcement-decree", terms: ["감정평가 및 감정평가사에 관한 법률 시행령"] },
  { lawSourceId: "law-source-appraiser-act-enforcement-rule", terms: ["감정평가 및 감정평가사에 관한 법률 시행규칙"] },
  { lawSourceId: "law-source-land-compensation-act", terms: ["공익사업을 위한 토지 등의 취득 및 보상에 관한 법률", "토지보상법"] },
  { lawSourceId: "law-source-land-compensation-act-enforcement-decree", terms: ["공익사업을 위한 토지 등의 취득 및 보상에 관한 법률 시행령", "토지보상법 시행령"] },
  { lawSourceId: "law-source-land-compensation-act-enforcement-rule", terms: ["공익사업을 위한 토지 등의 취득 및 보상에 관한 법률 시행규칙", "토지보상법 시행규칙"] },
  { lawSourceId: "law-source-real-estate-price-disclosure-act", terms: ["부동산 가격공시에 관한 법률", "부동산공시법"] },
]);

const DETAIL_URL = `${S233B_QNET_ORIGIN}/cst003.do?id=cst00302&gSite=L&gId=60`;
const RIGHTS_NOTICE_URL = `${S233B_QNET_ORIGIN}/cst003.do?id=cst00302&gSite=L&gId=60`;
const EXAM_DATE_URL = `${S233B_QNET_ORIGIN}/rcv003.do?gId=60&gSite=L&id=rcv00305`;

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function decodeHtml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function compactText(value) {
  return decodeHtml(value.replace(/<[^>]*>/gu, " ").replace(/\s+/gu, " ").trim());
}

function detailBody(articleId) {
  return new URLSearchParams({
    page: "1",
    schType: "A",
    schText: "",
    artlSeq: articleId,
    boardId: "Q004",
    code: "1008",
    menuType: "cst00309",
    cst: "Y",
  });
}

async function fetchOfficial(fetchImpl, url, init, counter) {
  counter.count += 1;
  const response = await fetchImpl(url, init);
  if (!response.ok) throw new Error(`Official source request failed: ${response.status} ${response.statusText} ${url}`);
  return response;
}

async function readOfficialHtml(response) {
  const bytes = Buffer.from(await response.arrayBuffer());
  const charset = response.headers.get("content-type")?.match(/charset=([^;\s]+)/iu)?.[1]?.toLowerCase();
  return new TextDecoder(charset === "euc-kr" ? "euc-kr" : "utf-8").decode(bytes);
}

export function parseQnetDetailHtml(html, examYear) {
  const titleMatch = html.match(/<th[^>]*>\s*제목\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/iu);
  const normalizedText = compactText(html);
  const fallbackTitleMatch = normalizedText.match(new RegExp(`${examYear}년도?\\s+제\\d+회\\s+감정평가사\\s+2차(?:시험)?\\s*[^ ]{0,30}`, "u"));
  const postedAtMatch = html.match(/<th[^>]*>\s*(?:등록일|작성일)\s*<\/th>\s*<td[^>]*>([\s\S]*?)<\/td>/iu);
  const attachmentPattern = /fileDown\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*\)/gu;
  const attachments = [];

  for (const match of html.matchAll(attachmentPattern)) {
    const [, filePath, rawFileName, fileSeq] = match;
    const fileName = decodeHtml(rawFileName).replace(/^`/u, "");
    const normalizedFileName = fileName.replace(/\s+/gu, "");
    const subject = Object.entries(SUBJECT_FILE_MARKERS)
      .find(([, marker]) => normalizedFileName.includes(marker.replace(/\s+/gu, "")))?.[0];
    const combined = !subject && fileName.includes("감정평가사 2차시험 문제지.pdf");
    const subjects = subject ? [subject] : [];
    if (!subject && !combined) continue;
    const downloadUrl = new URL("/cst003.do", S233B_QNET_ORIGIN);
    downloadUrl.search = new URLSearchParams({
      id: "cst00302s01",
      gSite: "L",
      gId: "60",
      fileCode: "R001",
      filePath,
      fileName: rawFileName,
      fileSeq,
      artlSeq: "",
      href: "0",
    }).toString();
    attachments.push({ subjects, combined, fileName, fileSeq, filePath, canonicalDownloadUrl: downloadUrl.toString() });
  }

  attachments.sort((a, b) => ["practice", "theory", "law"].indexOf(a.subjects[0]) - ["practice", "theory", "law"].indexOf(b.subjects[0]));
  if (!titleMatch && !fallbackTitleMatch) throw new Error(`Q-Net ${examYear} detail did not expose a title`);
  const subjectCoverage = new Set(attachments.flatMap((item) => item.subjects));
  const hasUnsegmentedCombinedPaper = attachments.some((item) => item.combined);
  if (attachments.length < 1 || (!hasUnsegmentedCombinedPaper && subjectCoverage.size !== 3)) {
    throw new Error(`Q-Net ${examYear} detail must expose an official combined paper or all three subject papers`);
  }

  return {
    title: titleMatch ? compactText(titleMatch[1]) : fallbackTitleMatch[0],
    postedAt: postedAtMatch ? compactText(postedAtMatch[1]).replaceAll(".", "-").replace(/-$/u, "") : null,
    attachments,
  };
}

export function parseQnetRightsNotice(html) {
  const normalized = compactText(html).normalize("NFC");
  const scopedStatements = decodeHtml(html)
    .replace(/<\/(?:p|div|li|tr|h[1-6])>/giu, "\n")
    .replace(/<[^>]*>/gu, " ")
    .split(/\n+/u)
    .map((value) => value.replace(/\s+/gu, " ").trim())
    .filter(Boolean);
  const hasTypeOne = /공공누리\s*(?:제)?1유형/u.test(normalized) || /open\s*type\s*0?1/iu.test(normalized);
  const hasAttribution = /출처\s*표시/u.test(normalized);
  const hasBoundPastQuestionScope = scopedStatements.some((statement) => /기출\s*문제/u.test(statement)
    && /2014\s*(?:년|\.)[^.\n]{0,120}(?:이후|부터)/u.test(statement));
  if (!hasTypeOne || !hasAttribution || !hasBoundPastQuestionScope) {
    throw new Error("Official Q-Net rights notice does not establish scoped 2014-onward KOGL Type 1 attribution terms for past questions");
  }
  return {
    licenseId: "KOGL-TYPE-1",
    rightsStatus: "redistribution_allowed",
    permittedDisplayMode: "full_text_with_attribution",
    attributionRequired: true,
    commercialUseAllowed: true,
    modificationAllowed: true,
    scopeMaterialKind: "qnet_past_questions",
    scopeStartYear: 2014,
    noticeScopeValidated: true,
  };
}

export function parseQnetExamDate(html) {
  const normalized = compactText(html);
  const match = normalized.match(/2차\s*:\s*(20\d{2})년\s*(\d{1,2})월\s*(\d{1,2})일/u);
  if (!match) throw new Error("Official Q-Net schedule does not expose the second-round exam date");
  return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
}

async function inspectPdf(pdfPath, expectedSubjects) {
  const [{ stdout: info }, { stdout: extractedText }, bytes] = await Promise.all([
    execFileAsync("/usr/bin/pdfinfo", [pdfPath], { maxBuffer: 1024 * 1024 }),
    execFileAsync("/usr/bin/pdftotext", [pdfPath, "-"], { maxBuffer: 16 * 1024 * 1024 }),
    readFile(pdfPath),
  ]);
  if (!bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error(`${basename(pdfPath)} is not a PDF`);
  const pagesMatch = info.match(/^Pages:\s+(\d+)$/mu);
  if (!pagesMatch) throw new Error(`${basename(pdfPath)} has no deterministic PDF page count`);
  const normalizedText = extractedText.normalize("NFC").replace(/\s+/gu, " ");
  const detectedSubjects = expectedSubjects.filter((subject) => normalizedText.includes(SUBJECT_FILE_MARKERS[subject]));
  const questionMetadata = [];
  const seenQuestionNumbers = new Set();
  const questionPattern = /[【\[]\s*문제\s*(\d+)\s*[】\]]\s*(?:\(\s*(\d+)\s*점\s*\))?/gu;
  for (const match of normalizedText.matchAll(questionPattern)) {
    const questionNo = Number(match[1]);
    if (seenQuestionNumbers.has(questionNo)) continue;
    seenQuestionNumbers.add(questionNo);
    questionMetadata.push({
      questionNo,
      points: match[2] ? Number(match[2]) : null,
      structuralAnchorSha256: sha256(`${sha256(normalizedText)}:${match.index}:${match[0]}`),
      _startIndex: match.index,
    });
  }
  questionMetadata.sort((a, b) => a.questionNo - b.questionNo);
  questionMetadata.forEach((question, index) => {
    const segment = normalizedText.slice(question._startIndex, questionMetadata[index + 1]?._startIndex ?? normalizedText.length);
    question.lawSourceIds = LAW_TERM_BINDINGS
      .filter((binding) => binding.terms.some((term) => segment.replace(/\s+/gu, "").includes(term.replace(/\s+/gu, ""))))
      .map((binding) => binding.lawSourceId);
    delete question._startIndex;
  });
  const headerDateCandidates = [...normalizedText.slice(0, 1200).matchAll(/(20\d{2})\s*[.년/-]\s*(\d{1,2})\s*[.월/-]\s*(\d{1,2})\s*일?/gu)]
    .map((match) => `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`)
    .filter((value, index, values) => values.indexOf(value) === index);
  return {
    bytes,
    pageCount: Number(pagesMatch[1]),
    detectedSubjects,
    textLayerHashSha256: sha256(normalizedText),
    questionMetadata,
    headerDateCandidates,
  };
}

export async function acquireS233BOfficialSources({
  fetchImpl = globalThis.fetch,
  acquiredAt = new Date().toISOString(),
  outputPath = null,
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(acquiredAt)) {
    throw new Error("acquiredAt must be a canonical UTC ISO-8601 timestamp");
  }

  const counter = { count: 0 };
  const temporaryDirectory = await mkdtemp(join(process.cwd(), "s233b-qnet-"));
  try {
    const rightsResponse = await fetchOfficial(fetchImpl, RIGHTS_NOTICE_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: detailBody(S233B_RIGHTS_NOTICE_ARTICLE_ID),
    }, counter);
    const rightsHtml = await readOfficialHtml(rightsResponse);
    const rights = parseQnetRightsNotice(rightsHtml);

    const examDateResponse = await fetchOfficial(fetchImpl, EXAM_DATE_URL, { method: "GET" }, counter);
    const examDateHtml = await readOfficialHtml(examDateResponse);
    const examDate = parseQnetExamDate(examDateHtml);

    const sources = [];
    for (const target of S233B_OFFICIAL_PAPER_ARTICLES) {
      const detailResponse = await fetchOfficial(fetchImpl, DETAIL_URL, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: detailBody(target.articleId),
      }, counter);
      const detailHtml = await readOfficialHtml(detailResponse);
      const detail = parseQnetDetailHtml(detailHtml, target.examYear);

      for (const attachment of detail.attachments) {
        const downloadUrl = new URL(attachment.canonicalDownloadUrl);
        downloadUrl.searchParams.set("artlSeq", target.articleId);
        const pdfResponse = await fetchOfficial(fetchImpl, downloadUrl.toString(), { method: "GET" }, counter);
        const pdfBytes = Buffer.from(await pdfResponse.arrayBuffer());
        const sourceSubjectKey = attachment.subjects.length === 1 ? attachment.subjects[0] : "combined";
        const pdfPath = join(temporaryDirectory, `${target.examYear}-${sourceSubjectKey}.pdf`);
        await writeFile(pdfPath, pdfBytes);
        const inspected = await inspectPdf(pdfPath, attachment.subjects);
        sources.push({
          sourceId: `qnet-appraiser-second-${target.examYear}-${sourceSubjectKey}`,
          sourceVersion: `${target.articleId}.${attachment.fileSeq}.${sha256(inspected.bytes).slice(0, 16)}`,
          authorityStatus: "official_primary_source",
          examRound: "second",
          examYear: target.examYear,
          subjectCoverage: attachment.subjects,
          coverage: attachment.subjects.length === 1 ? "complete_subject_paper" : "unsegmented_second_round_combined_paper",
          canonicalDetailUrl: `${DETAIL_URL}&artlSeq=${target.articleId}`,
          canonicalDownloadUrl: downloadUrl.toString(),
          articleId: target.articleId,
          fileSeq: attachment.fileSeq,
          officialTitle: detail.title,
          officialFileName: attachment.fileName,
          postedAt: detail.postedAt,
          acquiredAt,
          contentHashSha256: sha256(inspected.bytes),
          byteLength: inspected.bytes.byteLength,
          pageCount: inspected.pageCount,
          coverageEvidence: {
            method: attachment.subjects.length === 0
              ? "official_combined_paper_identity_unsegmented"
              : inspected.detectedSubjects.length === attachment.subjects.length
              ? "deterministic_pdf_text_layer_subject_heading_match"
              : "official_subject_filename",
            detectedSubjects: inspected.detectedSubjects,
            declaredSubjects: attachment.subjects,
            textLayerHashSha256: inspected.textLayerHashSha256,
            rawTextStored: false,
          },
          canonicalQuestionMetadata: inspected.questionMetadata,
          headerDateCandidates: inspected.headerDateCandidates,
          rightsDecisionId: "qnet-kogl-type-1-2014-onward",
          transformationProvenance: {
            method: "deterministic_https_download_and_sha256",
            rawAssetStored: false,
            sourceExcerptStored: false,
            ocrUsed: false,
            llmUsed: false,
            learnerContentUsed: false,
          },
        });
      }
    }

    sources.sort((a, b) => a.examYear - b.examYear || ["practice", "theory", "law", "combined"].indexOf(a.subjectCoverage[0]) - ["practice", "theory", "law", "combined"].indexOf(b.subjectCoverage[0]));
    const coverageUnits = sources.flatMap((source) => source.subjectCoverage.map((subject) => ({
      coverageId: `qnet-appraiser-second-${source.examYear}-${subject}`,
      sourceId: source.sourceId,
      sourceVersion: source.sourceVersion,
      contentHashSha256: source.contentHashSha256,
      examYear: source.examYear,
      subject,
      coverage: "complete_subject_paper",
      canonicalQuestionMetadata: source.canonicalQuestionMetadata,
      headerDateCandidates: source.headerDateCandidates,
    })));
    coverageUnits.sort((a, b) => a.examYear - b.examYear || ["practice", "theory", "law"].indexOf(a.subject) - ["practice", "theory", "law"].indexOf(b.subject));
    const missingYearSubjectPairs = S233B_OFFICIAL_PAPER_ARTICLES.flatMap(({ examYear }) => ["practice", "theory", "law"]
      .filter((subject) => !coverageUnits.some((unit) => unit.examYear === examYear && unit.subject === subject))
      .map((subject) => ({ examYear, subject, blocker: "official_combined_paper_not_deterministically_segmented" })));

    const snapshot = {
      schemaVersion: S233B_ACQUISITION_SCHEMA_VERSION,
      registryVersion: `s233b.qnet.second_round.2024-2026.${sha256(JSON.stringify(sources.map((source) => source.contentHashSha256))).slice(0, 16)}`,
      acquiredAt,
      officialOrigin: S233B_QNET_ORIGIN,
      qualificationId: "gId=60",
      rightsEvidence: {
        rightsDecisionId: "qnet-kogl-type-1-2014-onward",
        noticeArticleId: S233B_RIGHTS_NOTICE_ARTICLE_ID,
        canonicalNoticeUrl: `${RIGHTS_NOTICE_URL}&artlSeq=${S233B_RIGHTS_NOTICE_ARTICLE_ID}`,
        noticeContentHashSha256: sha256(rightsHtml),
        acquiredAt,
        ...rights,
        authorityStatus: "official_rights_notice",
        ambiguityConvertedToPermission: false,
      },
      examDateEvidence: {
        examYear: 2026,
        examRound: "second",
        examDate,
        canonicalUrl: EXAM_DATE_URL,
        contentHashSha256: sha256(examDateHtml),
        acquiredAt,
        authorityStatus: "official_primary_source",
      },
      sources,
      coverageUnits,
      coverage: {
        examYears: [2024, 2025, 2026],
        subjects: ["practice", "theory", "law"],
        completeYearSubjectPairs: coverageUnits.length,
        missingYearSubjectPairs,
      },
      acquisition: {
        fetchCount: counter.count,
        expectedFetchCount: 5 + sources.length,
        rawAssetsStored: false,
        sourceExcerptsStored: false,
        learnerContentIncluded: false,
      },
    };

    if (outputPath) await writeFile(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
    return snapshot;
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

function parseArguments(argv) {
  const args = { outputPath: null, acquiredAt: process.env.S233B_ACQUIRED_AT ?? new Date().toISOString() };
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--output") args.outputPath = argv[++index];
    else if (argv[index] === "--acquired-at") args.acquiredAt = argv[++index];
    else throw new Error(`Unknown argument: ${argv[index]}`);
  }
  if (!args.outputPath) throw new Error("--output is required");
  return args;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const result = await acquireS233BOfficialSources(parseArguments(process.argv.slice(2)));
  process.stdout.write(`${JSON.stringify({ output: process.argv[process.argv.indexOf("--output") + 1], fetchCount: result.acquisition.fetchCount, registryVersion: result.registryVersion })}\n`);
}
