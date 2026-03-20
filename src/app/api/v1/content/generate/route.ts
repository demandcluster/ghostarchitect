import { NextRequest, NextResponse } from "next/server";
import { ContentPoolManager } from "@/lib/contentPool";
import type { GenerationConfig } from "@/services/contentGenerator";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as GenerationConfig;

    if (!body.sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const poolManager = ContentPoolManager.getInstance();

    // 1. Fetch branded content from the audited pool
    const result = await poolManager.fetchBrandedContent({
      sessionId: body.sessionId,
      teamName: body.teamName || "NexusCorp",
      fakeDomain: body.fakeDomain || "nexuscorp.com",
      playerHandle: body.playerHandle || "User"
    });

    // 2. Trigger background refill/audit if necessary
    // We don't await this to keep the response instant
    poolManager.refillPool(body.section || 'all').catch(err => {
      console.error("[PoolManager] Background refill error:", err);
    });

    return NextResponse.json(result);

  } catch (error: any) {
    console.error("[Content Generation] Error:", error);
    
    return NextResponse.json(
      {
        error: error.message || "Failed to generate content",
        isOffline: true
      },
      { status: 500 }
    );
  }
}
