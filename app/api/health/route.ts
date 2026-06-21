import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();

  try {
    const supabase = await createClient();
    // Ping leve — verifica conectividade com o banco sem retornar dados sensíveis
    const { error } = await supabase.from("user_settings").select("id").limit(1);

    if (error) {
      return NextResponse.json(
        { status: "degraded", db: "error", message: error.message },
        { status: 503 },
      );
    }

    return NextResponse.json({
      status: "ok",
      db: "connected",
      latency_ms: Date.now() - start,
      ts: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: String(err) },
      { status: 503 },
    );
  }
}
