async function run() {
  const taxonomyModule = await loadTaxonomyModule();
  if (!taxonomyModule) {
    console.warn("[check:taxonomy] Skipped: taxonomy module could not be loaded in this Node runtime.");
    return;
  }

  const { searchTaxonomyCandidates } = taxonomyModule;

  const samples = [
    {
      label: "회계학 재고자산 저가법이 헷갈림",
      mode: "first",
      subject: "회계학",
      text: "회계학 재고자산 저가법이 헷갈림",
    },
    {
      label: "민법 물권 변동 요건이 헷갈림",
      mode: "first",
      subject: "민법",
      text: "민법 물권 변동 요건이 헷갈림",
    },
    {
      label: "보상법규 사업인정 절차가 약함",
      mode: "second",
      subject: "감정평가 및 보상법규",
      text: "보상법규 사업인정 절차가 약함",
    },
  ];

  for (const sample of samples) {
    const candidates = searchTaxonomyCandidates({
      mode: sample.mode,
      subject: sample.subject,
      text: sample.text,
    }).slice(0, 3);

    const top = candidates[0] ?? null;
    const confidence = top ? normalizeConfidence(top.score, top.matchedKeywords.length) : 0;

    console.log(`\n[Sample] ${sample.label}`);
    console.log(`status=${top && confidence >= 0.45 ? "ai_suggested" : "needs_review"}, confidence=${confidence}`);

    if (!top) {
      console.log("- no candidates");
      continue;
    }

    console.log(`- top: ${top.node.subject} · ${top.node.unit} · ${top.node.topic} (${top.node.examSkill})`);
    console.log(`- node: ${top.node.id} / score=${top.score} / confidence=${confidence}`);
  }
}

async function loadTaxonomyModule() {
  try {
    return await import("../lib/review-os/appraisal-taxonomy.ts");
  } catch (firstError) {
    if (!isUnsupportedTypeScriptRuntime(firstError)) {
      throw firstError;
    }
  }

  try {
    return await import("../lib/review-os/appraisal-taxonomy");
  } catch (secondError) {
    if (!isUnsupportedTypeScriptRuntime(secondError)) {
      throw secondError;
    }
  }

  return null;
}

function isUnsupportedTypeScriptRuntime(error) {
  if (!error || typeof error !== "object") return false;
  const row = error;
  const code = typeof row.code === "string" ? row.code : "";
  const message = typeof row.message === "string" ? row.message : "";
  return (
    code === "ERR_UNKNOWN_FILE_EXTENSION" ||
    code === "ERR_MODULE_NOT_FOUND" ||
    /Unknown file extension|Cannot find module/.test(message)
  );
}

function normalizeConfidence(score, matchedKeywordsLength) {
  const normalizedScore = Math.min(1, score / 24);
  const normalizedMatch = Math.min(1, matchedKeywordsLength / 6);
  return Number((normalizedScore * 0.8 + normalizedMatch * 0.2).toFixed(2));
}

run().catch((error) => {
  console.error("[check:taxonomy] Failed", error);
  process.exitCode = 1;
});
