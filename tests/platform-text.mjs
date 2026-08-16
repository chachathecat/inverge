import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";

export function normalizeLineEndings(value) {
  const text =
    typeof value === "string" ? value : Buffer.from(value).toString("utf8");
  return text.replace(/\r\n?/g, "\n");
}

export function canonicalTextBytes(value) {
  return Buffer.from(normalizeLineEndings(value), "utf8");
}

export function readTextFileSync(path) {
  return normalizeLineEndings(readFileSync(path, "utf8"));
}

export async function readTextFile(path) {
  return normalizeLineEndings(await readFile(path, "utf8"));
}

export function normalizeRepositoryPath(value) {
  return value.replace(/\\/g, "/");
}
