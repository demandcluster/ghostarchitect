import { NextRequest, NextResponse } from "next/server";

const FLAG_DESCRIPTIONS: Record<string, string> = {
  clicked_phishing_link: "clicked a phishing link during email triage",
  fell_for_social_engineering: "fell for a social engineering attempt and gave away credentials",
  over_quarantined: "quarantined a legitimate PowerShell process during investigation",
  failed_ioc_extraction: "attempted IOC extraction solo and missed most of the indicators, forcing CSIRT to redo the work",
  gave_creds_to_vendor: "shared their password with a vendor impersonator",
  chose_strong_password: "chose an exceptionally strong password",
  caught_all_phishing: "correctly identified every phishing email",
  avoided_evil_twin: "spotted the evil twin WiFi access point",
  extracted_all_iocs: "extracted all indicators of compromise from the logs",
  deferred_to_csirt: "correctly escalated IOC extraction to CSIRT instead of freelancing the forensics",
};

export async function GET(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return NextResponse.json({ remark: "" });

    const { searchParams } = new URL(req.url);
    const flags = (searchParams.get("flags") || "").split(",").filter(Boolean);
    const handle = searchParams.get("handle") || "the analyst";
    const verdict = searchParams.get("verdict") || "neutral";

    const priorityOrder = [
      "clicked_phishing_link", "fell_for_social_engineering", "over_quarantined",
      "failed_ioc_extraction", "gave_creds_to_vendor", "chose_strong_password",
      "caught_all_phishing", "avoided_evil_twin", "extracted_all_iocs",
      "deferred_to_csirt",
    ];
    const bestFlag = priorityOrder.find((f) => flags.includes(f));
    const flagDesc = bestFlag ? FLAG_DESCRIPTIONS[bestFlag] : `received a ${verdict} verdict`;

    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        max_tokens: 120,
        temperature: 1.0,
        messages: [
          { role: "system", content: "You write dry, witty analyst notes for corporate incident reports. One to two sentences max. Professional but funny, like a tired security analyst writing notes at 2am. Never use emojis." },
          { role: "user", content: `Write an analyst note about ${handle}, who ${flagDesc} during a cybersecurity incident response exercise. Verdict: ${verdict}.` },
        ],
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) return NextResponse.json({ remark: "" });
    const data = await res.json();
    const remark = data.choices?.[0]?.message?.content?.trim() || "";
    return NextResponse.json({ remark: remark.replace(/^["']|["']$/g, "") });
  } catch {
    return NextResponse.json({ remark: "" });
  }
}
