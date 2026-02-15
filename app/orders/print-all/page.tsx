"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { OrderPrintLayout, PrintMode } from "@/app/components/OrderPrintLayout";

type OrderRow = {
  id: number;
  order_date: string;
  customer_id: number | null;
  customers: { name: string | null } | null;
};

type ItemRow = {
  id: number;
  unit_type: string;
  qty_units: number;
  description_override: string | null;
  products: { cod: string | null; description: string | null } | null;
};

function isoToday() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function labelFromISO(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  const days = ["Domenica","Lunedì","Martedì","Mercoledì","Giovedì","Venerdì","Sabato"];
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  return `${days[d.getDay()]} ${dd}-${mm}`;
}

type ClientGroup = {
  key: string; // customer_id o fallback
  customerName: string;
  dates: string[]; // date presenti nel range
  items: ItemRow[];
};

export default function PrintAllPage() {
  const [fromDate, setFromDate] = useState(isoToday());
  const [toDate, setToDate] = useState(isoToday());
  const [mode, setMode] = useState<PrintMode>("a5");

  const [groups, setGroups] = useState<ClientGroup[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const rangeLabel = useMemo(() => {
    if (fromDate === toDate) return labelFromISO(fromDate);
    return `Dal ${labelFromISO(fromDate)} al ${labelFromISO(toDate)}`;
  }, [fromDate, toDate]);

  const load = async () => {
    setLoading(true);
    setErr(null);

    
    const { data: o, error: e1 } = await supabase
      .from("orders")
      .select("id,order_date,customer_id,customers(name)")
      .gte("order_date", fromDate)
      .lte("order_date", toDate)
      .order("customer_id", { ascending: true })
      .order("id", { ascending: true });

    if (e1) {
      setLoading(false);
      setErr(e1.message);
      return;
    }

    const orders = (o ?? []) as OrderRow[];
    const ids = orders.map((x) => x.id);

    if (ids.length === 0) {
      setGroups([]);
      setSelected({});
      setLoading(false);
      return;
    }

    const { data: it, error: e2 } = await supabase
      .from("order_items")
      .select("id,order_id,unit_type,qty_units,description_override,products(cod,description)")
      .in("order_id", ids)
      .order("order_id", { ascending: true })
      .order("id", { ascending: true });

    if (e2) {
      setLoading(false);
      setErr(e2.message);
      return;
    }

    // indicizza items per order_id
    const itemsByOrder: Record<number, ItemRow[]> = {};
    for (const r of (it ?? []) as any[]) {
      const oid = r.order_id as number;
      if (!itemsByOrder[oid]) itemsByOrder[oid] = [];
      itemsByOrder[oid].push({
        id: r.id,
        unit_type: r.unit_type,
        qty_units: r.qty_units,
        description_override: r.description_override,
        products: r.products,
      });
    }

    // raggruppa per cliente + data (un foglio per giorno)
    const map: Record<string, ClientGroup> = {};
    for (const ord of orders) {
      const cname = (ord.customers?.name || "").toString().trim() || "—";
      const orderItems = itemsByOrder[ord.id] ?? [];
      // se l'ordine è vuoto, lo ignoriamo (evita stampe vuote)
      if (orderItems.length === 0) continue;

      const key = `${ord.customer_id != null ? String(ord.customer_id) : "order-" + ord.id}|${ord.order_date}`;

      // ogni chiave è (cliente,data) -> NON accorpiamo più giorni insieme
      map[key] = {
        key,
        customerName: cname,
        dates: [ord.order_date],
        items: orderItems,
      };
    }

    // lista ordinata per nome
    const list = Object.values(map).sort((a, b) => {
      const da = [...a.dates].sort()[0];
      const db = [...b.dates].sort()[0];
      if (da !== db) return da.localeCompare(db);
      return a.customerName.localeCompare(b.customerName, "it");
    });

    setGroups(list);

    // preseleziona tutti
    const sel: Record<string, boolean> = {};
    for (const g of list) sel[g.key] = true;
    setSelected(sel);

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleAll = (v: boolean) => {
    const n: Record<string, boolean> = {};
    for (const g of groups) n[g.key] = v;
    setSelected(n);
  };

  const selectedGroups = groups.filter((g) => selected[g.key]);

  return (
    <div style={{ paddingBottom: 40 }}>
      <div className="no-print" style={{ maxWidth: 1100, margin: "12px auto 0", padding: "0 14px" }}>
        <h1 style={{ fontSize: 18, fontWeight: 900, margin: "6px 0 10px" }}>Stampa cumulativa</h1>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 4 }}>Dal</div>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={inp} />
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 4 }}>Al</div>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={inp} />
          </div>

          <button type="button" onClick={load} style={btn(true)}>Cerca</button>

          <div style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap" }}>
            <button type="button" onClick={() => setMode("a5")} style={btn(mode === "a5")}>A5</button>
            <button type="button" onClick={() => setMode("a4")} style={btn(mode === "a4")}>A4</button>
            <button type="button" onClick={() => setMode("thermal")} style={btn(mode === "thermal")}>Termica</button>
            <button type="button" onClick={() => window.print()} style={btn(false, true)}>🖨 Stampa</button>
          </div>
        </div>

        {err ? <div style={{ marginTop: 10, color: "crimson", fontWeight: 900 }}>{err}</div> : null}

        <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900 }}>Clienti da stampare</div>
          <button type="button" onClick={() => toggleAll(true)} style={btn(false)}>Seleziona tutti</button>
          <button type="button" onClick={() => toggleAll(false)} style={btn(false)}>Deseleziona tutti</button>
          <div style={{ opacity: 0.7 }}>
            ({selectedGroups.length} / {groups.length})
          </div>
        </div>

        <div style={{ marginTop: 10, border: "1px solid #e5e5e5", borderRadius: 14, overflow: "hidden" }}>
          {loading ? (
            <div style={{ padding: 12, opacity: 0.7 }}>Caricamento…</div>
          ) : groups.length === 0 ? (
            <div style={{ padding: 12, opacity: 0.7 }}>Nessun cliente con righe nell’intervallo.</div>
          ) : (
            groups.map((g) => {
              const uniqueDates = Array.from(new Set(g.dates)).sort();
              const dateInfo = uniqueDates.length === 1 ? labelFromISO(uniqueDates[0]) : rangeLabel;
              return (
                <label
                  key={g.key}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "center",
                    padding: "10px 12px",
                    borderTop: "1px solid #eee",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!selected[g.key]}
                    onChange={(e) => setSelected((p) => ({ ...p, [g.key]: e.target.checked }))}
                  />
                  <div style={{ fontWeight: 900, flex: 1 }}>{g.customerName}</div>
                  <div style={{ fontWeight: 900, opacity: 0.7 }}>{dateInfo}</div>
                  <div style={{ fontWeight: 900, opacity: 0.7 }}>{g.items.length} righe</div>
                </label>
              );
            })
          )}
        </div>
      </div>

      {/* STAMPE: 1 FOGLIO PER CLIENTE */}
      <div style={{ marginTop: 14 }}>
        {selectedGroups.map((g, idx) => {
          const uniqueDates = Array.from(new Set(g.dates)).sort();
          const dateInfo = uniqueDates.length === 1 ? labelFromISO(uniqueDates[0]) : rangeLabel;
          return (
            <div
            key={g.key}
            style={{
              pageBreakAfter: idx === selectedGroups.length - 1 ? "auto" : "always",
            }}
          >
            <OrderPrintLayout
              customerName={g.customerName}
              workDateLabel={dateInfo}
              items={g.items}
              mode={mode}
            />
          </div>
        );
        })}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #111",
  fontWeight: 900,
};

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
