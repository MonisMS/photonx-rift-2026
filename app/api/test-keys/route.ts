import { NextResponse }                        from "next/server";
import { getKeyStatus, generateWithFallback }  from "@/lib/ai";

export const runtime = "nodejs";

export async function GET() {
  const status = getKeyStatus();

  if (!status.configured) {
    return NextResponse.json({
      ok:    false,
      error: "No API keys configured. Set at least one of: GOOGLE_API_KEY_1, OPENROUTER_API_KEY, OPENAI_API_KEY",
      keys:  status,
    }, { status: 500 });
  }

  try {
    const text = await generateWithFallback('Reply with only the word "ok"');

    if (!text) {
      return NextResponse.json({
        ok:    false,
        error: "All providers exhausted (Gemini quota + OpenRouter down + no OpenAI key). Wait for daily quota reset.",
        keys:  status,
      }, { status: 500 });
    }

    return NextResponse.json({
      ok:       true,
      response: text.trim(),
      keys:     status,
    });
  } catch (err) {
    return NextResponse.json({
      ok:    false,
      error: err instanceof Error ? err.message : String(err),
      keys:  status,
    }, { status: 500 });
  }
}
