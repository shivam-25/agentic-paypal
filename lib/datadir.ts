import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Tiny JSON persistence for the demo — no database. State lives under a
 * gitignored `.data/` dir next to the app. Reads/writes are best-effort: the
 * demo must still render if the disk isn't writable.
 */

const DATA_DIR = process.env.AGENTPAY_DATA_DIR ?? join(process.cwd(), ".data");

function ensureDir() {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  } catch {
    /* ignore */
  }
}

export function readJson<T>(name: string, fallback: T): T {
  try {
    const file = join(DATA_DIR, name);
    if (!existsSync(file)) return fallback;
    return JSON.parse(readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(name: string, value: unknown): void {
  try {
    ensureDir();
    writeFileSync(join(DATA_DIR, name), JSON.stringify(value, null, 2));
  } catch {
    /* best-effort; never fail a request over the log */
  }
}
