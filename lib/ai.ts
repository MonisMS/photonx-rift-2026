import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";

// ─── Lazy Key Pool ────────────────────────────────────────────────────────────
// Keys are loaded at request time, not at module load time.
// This avoids crashes during Next.js build or cold starts.

export function getApiKeys(): string[] {
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

// ─── Resilient Generate ───────────────────────────────────────────────────────
// Tries every key × every model before giving up.
// Handles both 429 rate limits and free-tier quota exhaustion.

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("rate limit")
  );
}

const MODEL_SEQUENCE = ["gemini-2.0-flash", "gemini-2.0-flash-lite"] as const;

export async function generateWithFallback(prompt: string): Promise<string | null> {
  const keys = getApiKeys();
  if (keys.length === 0) return null;

  // Try each model, then each key within that model
  for (const modelName of MODEL_SEQUENCE) {
    for (const key of keys) {
      try {
        const google = createGoogleGenerativeAI({ apiKey: key });
        const { text } = await generateText({ model: google(modelName), prompt });
        return text;
      } catch (err) {
        if (isQuotaError(err)) continue; // try next key / model
        throw err;                        // non-quota errors bubble up immediately
      }
    }
  }

  return null; // all keys + models exhausted
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
