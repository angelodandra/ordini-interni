import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type Body = { order_date: string }; // YYYY-MM-DD

function isoDow(dateISO: string) {
  // JS: 0=Dom..6=Sab -> ISO: 1=Lun..7=Dom
  const d = new Date(dateISO + "T00:00:00");
  const js = d.getDay();
  return js === 0 ? 7 : js; // Dom -> 7
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const order_date = (body.order_date || "").slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(order_date)) {
      return NextResponse.json({ ok: false, error: "order_date non valida (YYYY-MM-DD)" }, { status: 400 });
    }

    const dow = isoDow(order_date);

    // 1) prendo ricorrenti attivi che includono quel giorno
    const { data: recs, error: e1 } = await supabaseServer
      .from("recurring_orders")
      .select("id,customer_id,is_active,days_of_week")
      .eq("is_active", true)
      .overlaps("days_of_week", [dow]);

    if (e1) return NextResponse.json({ ok: false, error: e1.message }, { status: 500 });

    const recurring = recs ?? [];
    if (recurring.length === 0) {
      return NextResponse.json({ ok: true, created: 0, skipped: 0 });
    }

    let created = 0;
    let skipped = 0;

    
    
    for (const r of recurring) {
      const recurringId = r.id;

      const { data: orderInserted, error: eIns } = await supabaseServer
        .from("orders")
        .insert({
          customer_id: r.customer_id,
          order_date,
          status: "open",
          is_recurring: true,
          recurring_order_id: r.id,
        })
        .select("id")
        .single();

      if (eIns) {
        if ((eIns as any).code === "23505") {
          await supabaseServer
            .from("recurring_orders")
            .update({ last_materialized_at: order_date })
            .eq("id", recurringId);

          skipped++;
          continue;
        }
        return NextResponse.json({ ok: false, error: eIns.message }, { status: 500 });
      }

      const newOrderId = orderInserted?.id;
      if (!newOrderId) continue;

      const { data: items, error: eIt } = await supabaseServer
        .from("recurring_order_items")
        .select("product_id,unit_type,qty_units,description_override,position")
        .eq("recurring_order_id", r.id)
        .order("position", { ascending: true });

      if (eIt) return NextResponse.json({ ok: false, error: eIt.message }, { status: 500 });

      const rows = (items ?? []).map((it) => ({
        order_id: newOrderId,
        product_id: it.product_id,
        unit_type: it.unit_type,
        qty_units: it.qty_units,
        qty_kg: 0,
        description_override: it.description_override ?? null,
      }));

      if (rows.length > 0) {
        const { error: eInsRows } = await supabaseServer.from("order_items").insert(rows);
        if (eInsRows) return NextResponse.json({ ok: false, error: eInsRows.message }, { status: 500 });
      }

      created++;

      await supabaseServer
        .from("recurring_orders")
        .update({ last_materialized_at: order_date })
        .eq("id", recurringId);
    }

    return NextResponse.json({ ok: true, created, skipped });

  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? "Errore" }, { status: 500 });
  }
}
