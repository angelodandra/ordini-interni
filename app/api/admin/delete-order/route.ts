import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { id?: number };
    const id = Number(body?.id);

    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }

    const supabase = supabaseServer;

    // 1) cancella righe ordine
    const { error: e1, count: rowsDeleted } = await supabase
      .from("order_items")
      .delete({ count: "exact" })
      .eq("order_id", id);

    if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 500 });

    // 2) cancella testata ordine
    const { error: e2, count: ordersDeleted } = await supabase
      .from("orders")
      .delete({ count: "exact" })
      .eq("id", id);

    if (e2) return NextResponse.json({ ok: false, error: e2.message }, { status: 500 });

    return NextResponse.json({ ok: true, ordersDeleted: ordersDeleted ?? 0, rowsDeleted: rowsDeleted ?? 0 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? "Unknown" }, { status: 500 });
  }
}
