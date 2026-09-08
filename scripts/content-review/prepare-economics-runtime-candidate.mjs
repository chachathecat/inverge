import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { prepareEconomicsRuntimeCandidate } from "../../lib/review-os/first-stage/runtime/economics-review-candidate.mjs";
export { prepareEconomicsRuntimeCandidate };

const sha = value => createHash("sha256").update(value).digest("hex");
const invalid = () => { throw new Error("economics_candidate_preparation_failed"); };

function privateDirectory(value) {
  if (!path.isAbsolute(value ?? "")) invalid();
  const root = realpathSync(value);
  for (let current = root;; current = path.dirname(current)) {
    if (existsSync(path.join(current, ".git"))) invalid();
    if (current === path.dirname(current)) break;
  }
  return root;
}
function preserveOrCreate(file, bytes) {
  if (existsSync(file)) {
    if (!lstatSync(file).isFile() || lstatSync(file).isSymbolicLink() || !readFileSync(file).equals(Buffer.from(bytes))) invalid();
    return;
  }
  writeFileSync(file, bytes, { flag: "wx", mode: 0o600 });
}
export function preparePrivateEconomicsFiles(rootPath) {
  const root = privateDirectory(rootPath), review = path.join(root, "issue-883-economics-r3-review");
  const read = file => {
    const resolved = realpathSync(file);
    const rel = path.relative(root, resolved);
    if (path.isAbsolute(rel) || rel === ".." || rel.startsWith(`..${path.sep}`) || lstatSync(resolved).size > 2 * 1024 * 1024) invalid();
    return readFileSync(resolved, "utf8");
  };
  const reviewSource = read(path.join(review, "review-packet-r3.json"));
  const sources = JSON.parse(reviewSource).sources;
  if (!Array.isArray(sources)) invalid();
  for (const source of sources) {
    if (path.basename(source.localFile) !== source.localFile) invalid();
    const file = realpathSync(path.join(root, source.localFile)), rel = path.relative(root, file);
    if (path.isAbsolute(rel) || rel.startsWith("..") || sha(readFileSync(file)) !== source.sha256) invalid();
  }
  const prepared = prepareEconomicsRuntimeCandidate({ reviewSource,
    calculationSource: read(path.join(review, "calculation-results.json")),
    aiEvidenceSource: read(path.join(root, "additional-ai-review-2026-09-07/review-evidence.json")),
    sourceObservationSource: read(path.join(review, "source-observation.json")),
    humanChecklistSource: read(path.join(review, "REVIEW-r3.md")) });
  const candidateFile = path.join(root, "economics-runtime-candidate-r3-v1.json");
  const mappingFile = path.join(root, "economics-runtime-mapping-r3-v1.json");
  preserveOrCreate(candidateFile, prepared.serialized);
  preserveOrCreate(mappingFile, JSON.stringify(prepared.mapping, null, 2) + "\n");
  return { candidateFile, mappingFile, questions: prepared.candidate.questions.length,
    unchangedFields: prepared.mapping.unchangedFields, approved: 0, installed: 0 };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { console.log(JSON.stringify(preparePrivateEconomicsFiles(process.argv[2]))); }
  catch { console.error("economics_candidate_preparation_failed"); process.exitCode = 1; }
}
