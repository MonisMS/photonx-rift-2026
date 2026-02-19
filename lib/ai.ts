import { createGoogleGenerativeAI } from "@ai-sdk/google";

// ─── Lazy Key Pool ────────────────────────────────────────────────────────────
// Keys are loaded at request time, not at module load time.
// This avoids crashes during Next.js build or cold starts.

function getApiKeys(): string[] {
  return [
    process.env.GOOGLE_API_KEY_1,
    process.env.GOOGLE_API_KEY_2,
    process.env.GOOGLE_API_KEY_3,
    process.env.GOOGLE_API_KEY_4,
  ].filter(Boolean) as string[];
}

// ─── Round-Robin Counter ──────────────────────────────────────────────────────
let keyIndex = 0;

function getNextProvider() {
  const keys = getApiKeys();
  if (keys.length === 0) {
    throw new Error(
      "No Gemini API keys found. Set GOOGLE_API_KEY_1 (and optionally 2-4) in your environment variables."
    );
  }
  const key = keys[keyIndex % keys.length];
  keyIndex++;
  return createGoogleGenerativeAI({ apiKey: key });
}

// ─── Model Getter ─────────────────────────────────────────────────────────────

export type ModelKey = "flash" | "flash_lite";

export function getModel(modelKey: ModelKey = "flash") {
  const google = getNextProvider();
  const models = {
    flash:      google("gemini-2.0-flash"),
    flash_lite: google("gemini-2.0-flash-lite"),
  };
  return models[modelKey];
}

// ─── Key Health Check (for /api/test-keys) ────────────────────────────────────

export function getKeyStatus() {
  const keys = getApiKeys();
  return {
    total:       keys.length,
    configured:  keys.length > 0,
    // Show only last 4 chars of each key for debugging — never expose full keys
    preview:     keys.map((k) => `...${k.slice(-4)}`),
  };
}
