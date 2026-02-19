import { createGoogleGenerativeAI } from "@ai-sdk/google";

// ─── Key Pool ────────────────────────────────────────────────────────────────
const apiKeys = [
  process.env.GOOGLE_API_KEY_1,
  process.env.GOOGLE_API_KEY_2,
  process.env.GOOGLE_API_KEY_3,
  process.env.GOOGLE_API_KEY_4,
].filter(Boolean) as string[];

if (apiKeys.length === 0) {
  throw new Error("No Gemini API keys configured in environment variables.");
}

// ─── Round-Robin Rotation ────────────────────────────────────────────────────
let keyIndex = 0;

function getNextProvider() {
  const key = apiKeys[keyIndex % apiKeys.length];
  keyIndex++;
  return createGoogleGenerativeAI({ apiKey: key });
}

// ─── Model ───────────────────────────────────────────────────────────────────
export type ModelKey = "flash" | "flash_lite";

export function getModel(modelKey: ModelKey = "flash") {
  const google = getNextProvider();
  const models = {
    flash:      google("gemini-2.0-flash"),
    flash_lite: google("gemini-2.0-flash-lite"),
  };
  return models[modelKey];
}
