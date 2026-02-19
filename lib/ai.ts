import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI }             from "@ai-sdk/openai";
import { generateText }             from "ai";

// ─────────────────────────────────────────────────────────────────────────────
// Provider configuration
// All keys are read lazily at request time to avoid build-time crashes.
// ─────────────────────────────────────────────────────────────────────────────

// Gemini: up to 4 free keys in round-robin
const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-2.0-flash-lite"] as const;

// OpenRouter: free-tier models, tried in order of quality
// The :free suffix guarantees $0 cost — no credit card charges possible.
const OPENROUTER_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free", // best quality, 128K ctx
  "meta-llama/llama-3.1-8b-instruct:free",  // faster fallback
  "mistralai/mistral-7b-instruct:free",      // last-resort free model
] as const;

// OpenAI: paid last resort only
const OPENAI_MODEL = "gpt-4o-mini"; // ~$0.0003 per 6-drug batch

// ─────────────────────────────────────────────────────────────────────────────
// Key helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getGeminiKeys(): string[] {
  return [
    process.env.GOOGLE_API_KEY_1,
    process.env.GOOGLE_API_KEY_2,
    process.env.GOOGLE_API_KEY_3,
    process.env.GOOGLE_API_KEY_4,
  ].filter(Boolean) as string[];
}

function getOpenRouterKey(): string | undefined {
  return process.env.OPENROUTER_API_KEY || undefined;
}

function getOpenAIKey(): string | undefined {
  return process.env.OPENAI_API_KEY || undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error classifier
// ─────────────────────────────────────────────────────────────────────────────

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("429")               ||
    msg.includes("quota")             ||
    msg.includes("RESOURCE_EXHAUSTED")||
    msg.includes("rate limit")        ||
    msg.includes("overloaded")
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider modules — each returns the generated text or null on soft failure.
// Hard errors (auth, malformed request) are re-thrown immediately.
// ─────────────────────────────────────────────────────────────────────────────

/** Try every Gemini key × every Gemini model. Returns null when all are quota-exhausted. */
async function tryGemini(prompt: string): Promise<string | null> {
  const keys = getGeminiKeys();
  if (keys.length === 0) return null;

  for (const modelName of GEMINI_MODELS) {
    for (const key of keys) {
      try {
        const google = createGoogleGenerativeAI({ apiKey: key });
        const { text } = await generateText({ model: google(modelName), prompt });
        console.log(`[ai] Gemini ${modelName} succeeded`);
        return text;
      } catch (err) {
        if (isQuotaError(err)) {
          console.warn(`[ai] Gemini ${modelName} key ...${key.slice(-4)} quota hit — trying next`);
          continue;
        }
        throw err; // auth error, bad request etc — bail immediately
      }
    }
  }

  console.warn("[ai] All Gemini keys exhausted");
  return null;
}

/** Try every OpenRouter free model. Returns null if all fail. */
async function tryOpenRouter(prompt: string): Promise<string | null> {
  const key = getOpenRouterKey();
  if (!key) return null;

  const openrouter = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey:  key,
    headers: {
      "HTTP-Referer": "https://pharmaguard-app.vercel.app",
      "X-Title":      "PharmaGuard",
    },
  });

  for (const model of OPENROUTER_MODELS) {
    try {
      const { text } = await generateText({ model: openrouter(model), prompt });
      console.log(`[ai] OpenRouter ${model} succeeded`);
      return text;
    } catch (err) {
      console.warn(`[ai] OpenRouter ${model} failed:`, err instanceof Error ? err.message : err);
      continue; // try next free model
    }
  }

  console.warn("[ai] All OpenRouter models failed");
  return null;
}

/** Try OpenAI gpt-4o-mini as the paid last resort. Returns null on quota. */
async function tryOpenAI(prompt: string): Promise<string | null> {
  const key = getOpenAIKey();
  if (!key) return null;

  try {
    const openai   = createOpenAI({ apiKey: key });
    const { text } = await generateText({ model: openai(OPENAI_MODEL), prompt });
    console.log("[ai] OpenAI gpt-4o-mini succeeded");
    return text;
  } catch (err) {
    if (isQuotaError(err)) {
      console.warn("[ai] OpenAI quota hit");
      return null;
    }
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// Waterfall: Gemini (free) → OpenRouter (free) → OpenAI (paid last resort)
// ─────────────────────────────────────────────────────────────────────────────

export async function generateWithFallback(prompt: string): Promise<string | null> {
  // 1. Gemini — 4 free keys × 2 models
  const geminiResult = await tryGemini(prompt);
  if (geminiResult) return geminiResult;

  // 2. OpenRouter — 3 free models (Llama 3.3 70B → 3.1 8B → Mistral 7B)
  const openRouterResult = await tryOpenRouter(prompt);
  if (openRouterResult) return openRouterResult;

  // 3. OpenAI gpt-4o-mini — paid, last resort
  const openAIResult = await tryOpenAI(prompt);
  if (openAIResult) return openAIResult;

  console.error("[ai] All providers exhausted — returning null");
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Health check (used by /api/test-keys)
// ─────────────────────────────────────────────────────────────────────────────

export function getKeyStatus() {
  const geminiKeys      = getGeminiKeys();
  const openRouterKey   = getOpenRouterKey();
  const openAIKey       = getOpenAIKey();

  return {
    gemini: {
      configured: geminiKeys.length > 0,
      total:      geminiKeys.length,
      models:     GEMINI_MODELS,
      preview:    geminiKeys.map((k) => `...${k.slice(-4)}`),
    },
    openrouter: {
      configured: !!openRouterKey,
      models:     OPENROUTER_MODELS,
      cost:       "free",
      preview:    openRouterKey ? `...${openRouterKey.slice(-4)}` : null,
    },
    openai: {
      configured: !!openAIKey,
      model:      OPENAI_MODEL,
      preview:    openAIKey ? `...${openAIKey.slice(-4)}` : null,
    },
    // true if at least one provider is configured
    configured: geminiKeys.length > 0 || !!openRouterKey || !!openAIKey,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy exports — kept for any existing imports
// ─────────────────────────────────────────────────────────────────────────────

/** @deprecated use getGeminiKeys() */
export const getApiKeys = getGeminiKeys;
