import "dotenv/config";
import { homedir } from "node:os";
import { resolve } from "node:path";

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}

function list(name: string): string[] {
  return (process.env[name] ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export const config = {
  lark: {
    appId: required("LARK_APP_ID"),
    appSecret: required("LARK_APP_SECRET"),
    /** "feishu" for larksuite.cn, "lark" for the global instance. */
    tenant: (process.env.LARK_TENANT?.trim() ?? "feishu") as "feishu" | "lark",
    domain:
      (process.env.LARK_TENANT?.trim() ?? "feishu") === "lark"
        ? "https://open.larksuite.com"
        : "https://open.feishu.cn",
  },
  cursor: {
    apiKey: required("CURSOR_API_KEY"),
    model: process.env.CURSOR_MODEL?.trim() || "composer-2.5",
  },
  /** Directory a fresh session starts in; per-session overrides come from /cd. */
  defaultWorkspace: resolve(process.env.WORKSPACE_DIR?.trim() || homedir()),
  /** Empty means every sender is accepted, which is only safe on a personal machine. */
  allowedUsers: list("ALLOWED_OPEN_IDS"),
  /** Feishu rejects card updates sent faster than a few per second. */
  cardUpdateIntervalMs: Number(process.env.CARD_UPDATE_INTERVAL_MS ?? 1200),
  stateFile: resolve(process.env.STATE_FILE?.trim() || "./state/sessions.json"),
};

export type Config = typeof config;
