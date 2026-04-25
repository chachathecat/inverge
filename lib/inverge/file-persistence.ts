import "server-only";

import fs from "node:fs";
import path from "node:path";

export type FileRepository<T> = {
  read(): T;
  write(next: T): void;
  update<R>(updater: (current: T) => { next: T; result: R }): R;
};

const DATA_ROOT = path.join(process.cwd(), ".data", "inverge");
const LOCK_RETRY_COUNT = 200;
const LOCK_RETRY_MS = 10;

function ensureDataRoot() {
  fs.mkdirSync(DATA_ROOT, { recursive: true });
}

function writeJsonAtomic(filePath: string, value: unknown) {
  ensureDataRoot();
  const tempPath = `${filePath}.tmp`;
  fs.writeFileSync(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, filePath);
}

function sleepSync(ms: number) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function withFileLock<T>(filePath: string, action: () => T): T {
  const lockPath = `${filePath}.lock`;

  for (let attempt = 0; attempt < LOCK_RETRY_COUNT; attempt += 1) {
    try {
      fs.mkdirSync(lockPath);
      try {
        return action();
      } finally {
        fs.rmSync(lockPath, { recursive: true, force: true });
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
      sleepSync(LOCK_RETRY_MS);
    }
  }

  throw new Error(`file-lock-timeout:${path.basename(filePath)}`);
}

export function createJsonFileRepository<T>(fileName: string, seed: () => T): FileRepository<T> {
  const filePath = path.join(DATA_ROOT, fileName);

  function read(): T {
    ensureDataRoot();

    if (!fs.existsSync(filePath)) {
      const seeded = seed();
      writeJsonAtomic(filePath, seeded);
      return seeded;
    }

    try {
      const raw = fs.readFileSync(filePath, "utf8");
      return JSON.parse(raw) as T;
    } catch {
      const seeded = seed();
      writeJsonAtomic(filePath, seeded);
      return seeded;
    }
  }

  function write(next: T) {
    withFileLock(filePath, () => writeJsonAtomic(filePath, next));
  }

  function update<R>(updater: (current: T) => { next: T; result: R }) {
    return withFileLock(filePath, () => {
      const current = read();
      const { next, result } = updater(current);
      writeJsonAtomic(filePath, next);
      return result;
    });
  }

  return {
    read,
    write,
    update,
  };
}
