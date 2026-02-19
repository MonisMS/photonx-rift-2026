import { NextResponse }             from "next/server";
import { getKeyStatus, generateWithFallback } from "@/lib/ai";

export const runtime = "nodejs";

export async function GET() {
  const status = getKeyStatus();

  if (!status.configured) {
    return NextResponse.json({
      ok:    false,
      error: "No API keys configured.",
      keys:  status,
    }, { status: 500 });
  }

  // Test using the resilient path (tries all keys + models before failing)
  try {
    const text = await generateWithFallback('Reply with only the word "ok"');

    if (!text) {
      return NextResponse.json({
        ok:    false,
        error: "All providers exhausted. Gemini free-tier quota exceeded and no OpenAI key configured (or also exhausted). Wait for daily quota reset or add OPENAI_API_KEY.",
        keys:  status,
      }, { status: 500 });
    }

    return NextResponse.json({
      ok:     true,
      gemini: text.trim(),
      keys:   status,
    });
  } catch (err) {
    return NextResponse.json({
      ok:    false,
      error: err instanceof Error ? err.message : String(err),
      keys:  status,
    }, { status: 500 });
  }
}
