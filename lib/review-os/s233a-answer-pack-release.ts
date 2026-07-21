import type {
  S233AnswerPackIdentity,
  S233AnswerPackRegistryContext,
} from "./s233-parallel-execution-contract";

export function isS233aReleasedAnswerPack(
  pack: S233AnswerPackIdentity,
  registry: S233AnswerPackRegistryContext,
): boolean {
  const proof = pack.releaseProof;
  if (
    pack.verificationStatus !== "verified_learning_reference" ||
    !proof ||
    proof.s214Status !== "ready_for_s215_consensus" ||
    proof.s215Status !== "released" ||
    proof.unresolvedBlockerCodes.length !== 0
  ) return false;
  const pipeline = registry.s214PipelineRecords.find(
    (record) =>
      record.pipelineId === proof.s214PipelineId &&
      record.packId === pack.packId &&
      record.packVersion === pack.packVersion &&
      record.contentHashSha256 === pack.contentHashSha256 &&
      record.status === "ready_for_s215_consensus",
  );
  const gate = registry.s215GateRecords.find(
    (record) =>
      record.gateId === proof.s215GateId &&
      record.pipelineId === proof.s214PipelineId &&
      record.packId === pack.packId &&
      record.packVersion === pack.packVersion &&
      record.contentHashSha256 === pack.contentHashSha256 &&
      record.status === "released" &&
      record.unresolvedBlockerCodes.length === 0,
  );
  return Boolean(pipeline && gate);
}
