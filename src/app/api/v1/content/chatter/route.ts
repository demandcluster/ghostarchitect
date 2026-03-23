import { NextResponse } from "next/server";

/**
 * GET /api/v1/content/chatter
 *
 * Returns 3-5 AI-generated witty office one-liner DMs.
 * These are purely cosmetic filler -- no scoring, no choices.
 * Falls back to empty array if AI is unavailable.
 */
export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json([]);
    }

    const prompt = `Generate exactly 5 short, witty, realistic office Slack-style messages from different coworkers. These are ambient background chatter in an IT company. Each should be 1-2 sentences max.

Return a JSON array of objects with these fields:
- "sender": a fun realistic name (e.g. "Dave from Accounting", "Priya Sharma")
- "senderRole": their department/role (e.g. "Marketing Intern", "DevOps")
- "avatar": 2-letter initials
- "text": the message

Keep it light, funny, and relatable. Topics: office quirks, IT frustrations, meetings, coffee, printers, WiFi, etc. No security-related content.

Return ONLY the JSON array, no markdown fences.`;

    const baseURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1/";
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

    const response = await fetch(`${baseURL}chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 1.0,
        max_tokens: 600,
      }),
    });

    if (!response.ok) {
      console.error("[Chatter] OpenAI API error:", response.status);
      return NextResponse.json([]);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content;
    if (!raw) return NextResponse.json([]);

    const parsed = JSON.parse(raw);
    // Handle both { messages: [...] } and direct array
    const messages = Array.isArray(parsed) ? parsed : (parsed.messages || parsed.chatter || Object.values(parsed)[0]);

    if (!Array.isArray(messages)) {
      return NextResponse.json([]);
    }

    const dms = messages.slice(0, 5).map((m: Record<string, string>, i: number) => ({
      id: `ai-chatter-${Date.now()}-${i}`,
      sender: m.sender || "Unknown",
      senderRole: m.senderRole || "Employee",
      avatar: m.avatar || "??",
      text: m.text || "",
      timestamp: -1,
    }));

    return NextResponse.json(dms);
  } catch (error) {
    console.error("[Chatter] Generation failed:", error);
    return NextResponse.json([]);
  }
}
