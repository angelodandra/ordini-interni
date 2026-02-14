import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type Body =
  | { mode: "range"; from: string; to: string }
  | { mode: "all" };

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    let from = "";
    let to = "";

    if (body.mode === "range") {
      from = (body.from || "").slice(0, 10);
      to = (body.to || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
        return NextResponse.json({ ok: false, error: "Date non valide (YYYY-MM-DD)" }, { status: 400 });
      }
    }

    let q = supabaseServer.from("orders").select("id", { count: "exact" });

    if (body.mode === "range") q = q.gte("order_date", from).lte("order_date", to);

    const { data: orders, error: e1, count } = await q;
    if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 500 });

    const ids = (orders ?? []).map((o: any) => o.id);
    if (ids.length === 0) return NextResponse.json({ ok: true, orders: 0, items: 0 });

    const { count: itemsCount, error: e2 } = await supabaseServer
      .from("order_items")
      .select("id", { count: "exact", head: true })
      .in("order_id", ids);

    if (e2) return NextResponse.json({ ok: false, error: e2.message }, { status: 500 });

    return NextResponse.json({ ok: true, orders: count ?? ids.length, items: itemsCount ?? 0 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Errore" }, { status: 500 });
  }
}
