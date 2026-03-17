import { NextRequest, NextResponse } from "next/server";
import { OpenAIClient } from "@/lib/openaiAI";
import type { GenerationConfig } from "@/services/contentGenerator";

// Simple in-memory rate limiting for API route
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 120000; // 2 minutes
const RATE_LIMIT_MAX_REQUESTS = 4; // Max 4 requests per 2 minutes per IP

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
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const body = (await request.json()) as GenerationConfig;

    // Create client with server-side API key
    const openaiClient = new OpenAIClient({
      apiKey,
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini"
    });

    // Generate content using batch API
    const result = await openaiClient.generateBatch(body);

    // Debug: Log raw response
    console.log('[OpenAI Content Generation] Raw API response:', JSON.stringify(result, null, 2));

    // Validate that all required fields exist and are arrays
    // Note: openaiClient.generateBatch already parses JSON, so we just validate arrays
    try {
      const parsedResult = {
        preBreachEmails: Array.isArray(result.preBreachEmails) ? result.preBreachEmails : [],
        breachEmails: Array.isArray(result.breachEmails) ? result.breachEmails : [],
        logEntries: Array.isArray(result.logEntries) ? result.logEntries : [],
        socialEngineeringDMs: Array.isArray(result.socialEngineeringDMs) ? result.socialEngineeringDMs : [],
        npcBadAdvice: Array.isArray(result.npcBadAdvice) ? result.npcBadAdvice : [],
        lolbins: Array.isArray(result.lolbins) ? result.lolbins : [],
        wifi: Array.isArray(result.wifi) ? result.wifi : [],
        sessionId: result.sessionId,
        isOfflineContent: result.isOfflineContent
      };

      console.log('[OpenAI Content Generation] Parsed result:', {
        preBreachEmails: parsedResult.preBreachEmails.length,
        breachEmails: parsedResult.breachEmails.length,
        logEntries: parsedResult.logEntries.length,
        socialEngineeringDMs: parsedResult.socialEngineeringDMs.length,
        npcBadAdvice: parsedResult.npcBadAdvice.length,
        lolbins: parsedResult.lolbins.length,
        wifi: parsedResult.wifi.length
      });

      return NextResponse.json(parsedResult);
    } catch (parseError: any) {
      console.error('[OpenAI Content Generation] Validation error:', parseError.message);
      return NextResponse.json(
        {
          error: 'Failed to validate generated content. API returned invalid format.',
          rawResponse: result
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("OpenAI content generation error:", error);

    // Handle various error types with appropriate responses
    if (error.statusCode === 429) {
      return NextResponse.json(
        {
          error:
            error.message ||
            "Rate limit exceeded. Please wait a few minutes before retrying.",
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
