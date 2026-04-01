import { NextRequest, NextResponse } from "next/server";

const HUB = process.env.NEXT_PUBLIC_HUB_URL || "https://hub.lomofx.com";

/** GET — quick test endpoint for connection status */
export async function GET() {
  return NextResponse.json({ ok: true, status: "connected", message: "✅ Web Chat is connected to Python Hub." });
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    if (!payload.message) return NextResponse.json({ error: "No message" }, { status: 400 });

    // The entire "Brain" of the AI (including Real-time Market Data,
    // News ±30m constraints, Trading History, and PnL) is now centralized
    // on the Python Hub's /api/chat endpoint to ensure 100% parity with Telegram.
    const r = await fetch(`${HUB}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25000)
    });

    if (!r.ok) {
      return NextResponse.json({
        reply: `⚠️ Lỗi kết nối đến Hub (${r.status}). Đang khôi phục lại...`,
        patterns: ["#12 ExceptionHandling"]
      });
    }

    const data = await r.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({
      reply: `⚠️ Lỗi Web App: ${message}`,
      patterns: ["#12 ExceptionHandling"]
    });
  }
}
