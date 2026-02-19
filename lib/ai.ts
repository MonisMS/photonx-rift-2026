import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI }             from "@ai-sdk/openai";
import { generateText }             from "ai";

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

const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite"] as const;

export async function generateWithFallback(prompt: string): Promise<string | null> {
  const googleKeys = getApiKeys();

  // ── 1. Try Gemini (free) — all keys × all models ──────────────────────────
  for (const modelName of GEMINI_MODELS) {
    for (const key of googleKeys) {
      try {
        const google = createGoogleGenerativeAI({ apiKey: key });
        const { text } = await generateText({ model: google(modelName), prompt });
        return text;
      } catch (err) {
        if (isQuotaError(err)) continue;
        throw err;
      }
    }
  }

  // ── 2. Fall back to OpenAI (paid, last resort) ────────────────────────────
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    try {
      const openai = createOpenAI({ apiKey: openaiKey });
      const { text } = await generateText({
        model:  openai("gpt-4o-mini"),  // cheapest capable model (~$0.0003 per batch)
        prompt,
      });
      return text;
    } catch (err) {
      if (!isQuotaError(err)) throw err;
    }
  }

  return null; // all providers exhausted
}

// ─── Key Health Check (for /api/test-keys) ────────────────────────────────────

export function getKeyStatus() {
  const googleKeys = getApiKeys();
  const openaiKey  = process.env.OPENAI_API_KEY;
  return {
    google: {
      total:      googleKeys.length,
      configured: googleKeys.length > 0,
      preview:    googleKeys.map((k) => `...${k.slice(-4)}`),
    },
    openai: {
      configured: !!openaiKey,
      preview:    openaiKey ? `...${openaiKey.slice(-4)}` : null,
    },
    configured: googleKeys.length > 0 || !!openaiKey,
  };
}
