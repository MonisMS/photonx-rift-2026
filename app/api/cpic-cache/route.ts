/**
 * CPIC API Cache Management Endpoint
 * 
 * GET  /api/cpic-cache           → Get cache stats and health
 * POST /api/cpic-cache?action=warm → Pre-warm cache with all drug data
 * POST /api/cpic-cache?action=clear → Clear all cached data
 */

import { NextResponse } from "next/server";
import { warmCache, checkAPIHealth, getCacheStats, clearCache } from "@/lib/cpic-api";

export const dynamic = "force-dynamic";

export async function GET() {
  const startTime = Date.now();
  
  const [isHealthy, stats] = await Promise.all([
    checkAPIHealth(),
    Promise.resolve(getCacheStats()),
  ]);
  
  return NextResponse.json({
    apiHealthy: isHealthy,
    cache: {
      ...stats,
      oldestEntryAge: stats.oldestEntry 
        ? `${Math.round((Date.now() - stats.oldestEntry) / 1000 / 60)} minutes ago`
        : null,
    },
    latency: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  
  if (action === "warm") {
    const startTime = Date.now();
    const result = await warmCache();
    
    return NextResponse.json({
      action: "warm",
      success: result.success,
      errors: result.errors,
      latency: Date.now() - startTime,
      cache: getCacheStats(),
      timestamp: new Date().toISOString(),
    });
  }
  
  if (action === "clear") {
    clearCache();
    
    return NextResponse.json({
      action: "clear",
      success: true,
      cache: getCacheStats(),
      timestamp: new Date().toISOString(),
    });
  }
  
  return NextResponse.json(
    { error: "Invalid action. Use ?action=warm or ?action=clear" },
    { status: 400 }
  );
}
