import { NextResponse }  from "next/server";
import { getKeyStatus }  from "@/lib/ai";
import { generateText }  from "ai";
import { getModel }      from "@/lib/ai";

export const runtime = "nodejs";

export async function GET() {
  const status = getKeyStatus();

  if (!status.configured) {
    return NextResponse.json({
      ok:      false,
      error:   "No API keys configured.",
      keys:    status,
    }, { status: 500 });
  }

  // Make a minimal live test call to Gemini
  try {
    const { text } = await generateText({
      model:  getModel("flash"),
      prompt: 'Reply with only the word "ok"',
    });

    return NextResponse.json({
      ok:       true,
      gemini:   text.trim(),
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
