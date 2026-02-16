"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";
import { OrderPrintLayout, PrintMode } from "@/app/components/OrderPrintLayout";
import { getWorkDateISO } from "@/lib/workDate";

type OrderRow = {
  id: number;
  order_date: string;
  customers: { name: string | null } | null;
};

type ItemRow = {
  id: number;
  unit_type: string;
  qty_units: number;
  description_override: string | null;
  products: { cod: string | null; description: string | null } | null;
};

export default function OrderPrintPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const search = useSearchParams();

  const orderId = Number(params.id);
  const mode = (search.get("mode") as PrintMode) || "a5";

  // supabase client


  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;

    (async () => {
      setErr(null);

      const { data: o, error: e1 } = await supabase
        .from("orders")
        .select("id,order_date,customers(name)")
        .eq("id", orderId)
        .single();

      if (e1) {
        setErr(e1.message);
        return;
      }

      const { data: it, error: e2 } = await supabase
        .from("order_items")
        .select("id,unit_type,qty_units,description_override,products(cod,description)")
        .eq("order_id", orderId)
        .order("id", { ascending: true });

      if (e2) {
        setErr(e2.message);
        return;
      }

      setOrder(o as any);
      setItems((it ?? []) as any);
    })();
  }, [orderId, supabase]);

  const customerName = (order?.customers?.name || "").toString().trim() || "—";
  const dateISO = (order?.order_date ? String(order.order_date).slice(0,10) : getWorkDateISO());
  const dateLabel = labelFromISO(dateISO);

  const setMode = (m: PrintMode) => {
    const u = new URL(window.location.href);
    u.searchParams.set("mode", m);
    router.replace(u.pathname + "?" + u.searchParams.toString());
  };

  return (
    <div style={{ paddingBottom: 30 }}>
      {/* CONTROLLI (nascosti in stampa da @media print) */}
      <div className="no-print" style={{ maxWidth: 980, margin: "12px auto 0", padding: "0 14px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900 }}>
            {customerName} - {dateLabel}
          </div>

          <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
            <button type="button" onClick={() => setMode("a5")} style={btn(mode === "a5")}>A5</button>
            <button type="button" onClick={() => setMode("a4")} style={btn(mode === "a4")}>A4</button>
            <button type="button" onClick={() => setMode("thermal")} style={btn(mode === "thermal")}>Termica</button>

            <button type="button" onClick={() => window.print()} style={btn(false, true)}>🖨 Stampa</button>
            <button type="button" onClick={() => router.back()} style={btn(false)}>Chiudi</button>
          </div>
        </div>

        {err ? <div style={{ marginTop: 10, color: "crimson", fontWeight: 900 }}>{err}</div> : null}
      </div>

      {/* CONTENUTO STAMPA */}
      <div style={{ marginTop: 10 }}>
        <OrderPrintLayout customerName={customerName} workDateLabel={dateLabel} items={items} mode={mode} />
      </div>
    </div>
  );
}

function labelFromISO(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  const days = ["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"];
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  return `${days[d.getDay()]} ${dd}-${mm}`;
}

function btn(active: boolean, primary?: boolean): React.CSSProperties {
  if (primary) {
    return {
      padding: "10px 14px",
      borderRadius: 12,
      border: "1px solid #111",
      background: "white",
      fontWeight: 900,
      cursor: "pointer",
    };
  }

  return {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #111",
    background: active ? "black" : "white",
    color: active ? "white" : "#111",
    fontWeight: 900,
    cursor: "pointer",
  };
}
