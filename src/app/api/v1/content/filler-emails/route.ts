import { NextResponse } from "next/server";
import { createOpenAIClient } from "@/lib/openaiAI";
import type { Email } from "@/content/types";

const FILLER_PROMPT = `Generate exactly 3 funny, lighthearted corporate office emails for a cybersecurity training simulation inbox.

These are NOT phishing emails. They are humorous "office life" filler to make an inbox feel realistic.

Ideas: potluck signups, passive-aggressive fridge notes, reply-all accidents, lost items, printer complaints, someone's birthday celebration gone wrong, vending machine issues.

Each email must be short (3-6 sentences), genuinely funny, and feel like a real corporate email.

Use "[teamName]" for the company name and "[fakeDomain]" for the email domain.

Return a JSON object with key "emails" containing an array of exactly 3 emails with this structure:
{
  "id": "ai-filler-N",
  "from": "firstname.lastname@[fakeDomain]",
  "to": "all-staff@[fakeDomain]",
  "subject": "...",
  "date": "2026-03-10 HH:MM",
  "body": "email body text",
  "isPhishing": false,
  "indicators": [],
  "difficulty": "easy",
  "headers": {
    "returnPath": "<firstname.lastname@[fakeDomain]>",
    "spf": "pass",
    "dkim": "pass",
    "dmarc": "pass (p=reject)"
  }
}`;

export async function GET() {
  try {
    const client = createOpenAIClient();
    if (!client) {
      return NextResponse.json({ emails: [] });
    }

    const response = await fetch(
      `${(client as unknown as { config: { baseURL: string } }).config?.baseURL || "https://api.openai.com/v1/"}chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [{ role: "user", content: FILLER_PROMPT }],
          response_format: { type: "json_object" },
          temperature: 1.0,
        }),
      }
    );

    if (!response.ok) {
      console.warn("[Filler Emails] OpenAI request failed:", response.status);
      return NextResponse.json({ emails: [] });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json({ emails: [] });
    }

    const parsed = JSON.parse(content) as { emails?: Email[] };
    const emails = Array.isArray(parsed.emails) ? parsed.emails : [];

    return NextResponse.json({ emails });
  } catch (error) {
    console.warn("[Filler Emails] Generation failed, returning empty:", error);
    return NextResponse.json({ emails: [] });
  }
}
