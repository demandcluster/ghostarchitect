import { NextRequest, NextResponse } from "next/server";
import { GeminiAIClient } from "@/lib/geminiAI";
import type { GenerationConfig } from "@/services/contentGenerator";

// Simple in-memory rate limiting for API route
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 300000; // 5 minutes (more aggressive)
const RATE_LIMIT_MAX_REQUESTS = 1; // Max 1 request per 5 minutes per IP (very conservative)

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting per IP
    const clientIP =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";
    const now = Date.now();

    const rateLimitInfo = rateLimitStore.get(clientIP);
    if (rateLimitInfo) {
      if (now > rateLimitInfo.resetTime) {
        // Window expired, reset counter
        rateLimitStore.set(clientIP, {
          count: 1,
          resetTime: now + RATE_LIMIT_WINDOW
        });
      } else if (rateLimitInfo.count >= RATE_LIMIT_MAX_REQUESTS) {
        // Rate limit exceeded
        const resetTime = Math.ceil((rateLimitInfo.resetTime - now) / 1000);
        return NextResponse.json(
          {
            error: `Rate limit exceeded. Please wait ${resetTime} seconds before generating new content.`
          },
          { status: 429 }
        );
      } else {
        // Increment counter within window
        rateLimitInfo.count++;
      }
    } else {
      rateLimitStore.set(clientIP, {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW
      });
    }

    // Use server-side environment variable (not NEXT_PUBLIC_*)
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const body = (await request.json()) as GenerationConfig;

    // Create client with server-side API key
    const geminiClient = new GeminiAIClient({
      apiKey,
      model: (process.env.GEMINI_MODEL as any) || "gemini-1.5-flash"
    });

    // Generate content using the batch API
    const result = await geminiClient.generateBatch(body);

    // Parse JSON strings from batch API response into arrays
    const parsedResult = {
      preBreachEmails: JSON.parse(result.preBreachEmails),
      breachEmails: JSON.parse(result.breachEmails),
      logEntries: JSON.parse(result.logEntries),
      socialEngineeringDMs: JSON.parse(result.socialEngineeringDMs),
      npcBadAdvice: JSON.parse(result.npcBadAdvice),
      lolbins: JSON.parse(result.lolbins),
      wifi: JSON.parse(result.wifi),
      sessionId: result.sessionId,
      isOfflineContent: result.isOfflineContent
    };

    return NextResponse.json(parsedResult);
  } catch (error: any) {
    console.error("Content generation error:", error);

    // Handle various error types with appropriate responses
    if (error.statusCode === 429) {
      return NextResponse.json(
        {
          error: error.message || "Rate limit exceeded. Please wait a few minutes before retrying.",
          isOffline: true
        },
        { status: 429 }
      );
    }

    // Handle network errors
    if (error.statusCode >= 500) {
      return NextResponse.json(
        {
          error: error.message || "Network error. Please try again later.",
          isOffline: true
        },
        { status: 502 }
      );
    }

    // Handle validation errors
    if (error.statusCode === 400) {
      return NextResponse.json(
        {
          error: error.message || "Invalid request format.",
          isOffline: true
        },
        { status: 400 }
      );
    }

    // Unknown errors
    return NextResponse.json(
      {
        error: error.message || "Failed to generate content",
        isOffline: true
      },
      { status: 500 }
    );
  }
}
