"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

type CustomerLite = { id: number; name: string };

type Item = {
  id: number;
  qty_units: number;
  unit_type: string;
  products: { cod: string | null; description: string | null } | null;
};

type Order = {
  id: number;
  order_date: string; // YYYY-MM-DD
  customers: { name: string } | null;
  order_items: Item[];
};

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function formatDateNice(dateStr: string) {
  const d = new Date(dateStr);
  const giorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
  const dayName = giorni[d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dayName} ${dd}-${mm}`;
}

export default function PrintAllOrdersPage() {
  const [fromDate, setFromDate] = useState(todayISO());
  const [toDate, setToDate] = useState(todayISO());
  const [mode, setMode] = useState<"a5" | "a4" | "thermal">("a5");

  const [step, setStep] = useState<"select" | "print">("select");

  const [customers, setCustomers] = useState<CustomerLite[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const [orders, setOrders] = useState<Order[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const subtitle = useMemo(() => {
    if (!fromDate || !toDate) return "";
    if (fromDate === toDate) return formatDateNice(fromDate);
    return `${fromDate} → ${toDate}`;
  }, [fromDate, toDate]);

  const isThermal = mode === "thermal";
  const isA4 = mode === "a4";

  // misure: termica invariata, A4/A5 un po' più compatte
  const baseFont = isThermal ? 13 : isA4 ? 11 : 12;
  const codeFont = isThermal ? 15 : isA4 ? 13 : 14;
  const descFont = isThermal ? 12 : isA4 ? 10 : 11;

  const codeMinW = isThermal ? 90 : isA4 ? 230 : 170;
  const qtyW = isThermal ? 70 : 90;

  const loadCustomers = async () => {
    setErr(null);
    setLoading(true);
    setCustomers([]);
    setSelectedIds(new Set());
    setOrders([]);
    setStep("select");

    if (!fromDate || !toDate) {
      setLoading(false);
      return setErr("Seleziona DAL e AL");
    }
    if (fromDate > toDate) {
      setLoading(false);
      return setErr("Intervallo non valido");
    }

    // clienti che hanno almeno un ordine nel periodo
    const { data, error } = await supabase
      .from("orders")
      .select("customers!inner(id,name)")
      .gte("order_date", fromDate)
      .lte("order_date", toDate)
      .limit(20000);

    if (error) {
      setLoading(false);
      return setErr(error.message);
    }

    const map = new Map<number, string>();
    for (const r of (data ?? []) as any[]) {
      const c = r.customers;
      if (!c?.id) continue;
      map.set(Number(c.id), (c.name ?? "").toString());
    }

    const list = Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    setCustomers(list);
    setSelectedIds(new Set(list.map((x) => x.id))); // default tutti
    setLoading(false);
  };

  const loadOrdersForSelected = async () => {
    setErr(null);
    setLoading(true);
    setOrders([]);
    setStep("print");

    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      setLoading(false);
      setStep("select");
      return setErr("Seleziona almeno un cliente");
    }

    const { data, error } = await supabase
      .from("orders")
      .select("id,order_date,customers(id,name),order_items(id,qty_units,unit_type,description_override,products(cod,description))")
      .gte("order_date", fromDate)
      .lte("order_date", toDate)
      .in("customer_id", ids)
      .order("order_date", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      setLoading(false);
      setStep("select");
      return setErr(error.message);
    }

    const cleaned: Order[] = (data ?? [])
      .map((o: any) => ({
        id: o.id,
        order_date: o.order_date,
        customers: o.customers,
        order_items: (o.order_items ?? []).filter((x: any) => Number(x.qty_units ?? 0) > 0),
      }))
      .filter((o) => o.order_items.length > 0);

    cleaned.sort((a, b) => {
      const ca = (a.customers?.name ?? "").toString();
      const cb = (b.customers?.name ?? "").toString();
      const c = ca.localeCompare(cb);
      if (c !== 0) return c;
      return a.order_date.localeCompare(b.order_date) || a.id - b.id;
    });

    setOrders(cleaned);
    setLoading(false);
  };

  useEffect(() => {
    loadCustomers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const selectAll = () => setSelectedIds(new Set(customers.map((c) => c.id)));
  const selectNone = () => setSelectedIds(new Set());

  const onPrint = () => window.print();

  return (
    <main style={{ fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @page { size: A5 portrait; margin: 10mm; }

        @media print {
          header { display: none !important; }
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .sheet { max-width: none !important; margin: 0 !important; }
          .order-block { page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid; }
          .a4 @page { size: A4 portrait; margin: 12mm; }
          .thermal .sheet { width: 80mm; padding: 6mm; }
          .thermal @page { size: 80mm auto; margin: 4mm; }
        }

        .bar { padding: 12px 14px; border-bottom: 1px solid #ddd; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .bar input { padding: 10px; border-radius: 10px; border: 1px solid #ddd; }
        .btn { padding: 10px 14px; border-radius: 10px; border: 1px solid #111; background: white; font-weight: 900; cursor: pointer; }
        .chip { padding: 10px 12px; border-radius: 999px; border: 1px solid #111; font-weight: 900; cursor: pointer; background: white; }
        .chip.on { background: black; color: white; }

        .sheet {
          padding: ${isThermal ? 14 : 20}px;
          max-width: ${isThermal ? 420 : isA4 ? "100%" : 900};
          margin: ${isA4 ? "0" : "0 auto"};
          font-size: ${baseFont}px;
        }

        .qty-box {
          display: inline-block;
          padding: 5px 10px;
          border: 2px solid #000;
          border-radius: 10px;
          font-weight: 900;
          white-space: nowrap;
          min-width: 58px;
          text-align: center;
          font-size: ${isA4 ? "12px" : "13px"};
        }

        .pen-line { height: 20px; position: relative; width: 100%; }
        .pen-line::before { content: ""; position: absolute; left: 0; right: 0; top: 14px; border-bottom: 1px dashed #000; }

        /* ✅ anti-split riga prodotto */
        .row {
          border-bottom: 1px solid #000;
          padding: 6px 0;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .title { text-align: center; margin-bottom: 12px; }
        .title .name { font-size: ${isThermal ? 18 : isA4 ? 20 : 20}px; font-weight: 900; }
        .title .date { margin-top: 6px; font-size: ${isThermal ? 14 : isA4 ? 14 : 16}px; font-weight: 800; }

        .cols { display: grid; grid-template-columns: ${codeMinW}px ${qtyW}px 1fr; gap: 10px; font-weight: 900; border-bottom: 2px solid #000; padding-bottom: 6px; align-items: end; }

        .checklist { padding: 16px; max-width: 900px; margin: 0 auto; }
        .check-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
        .list { margin-top: 12px; border: 1px solid #ddd; border-radius: 14px; overflow: hidden; }
        .li { display: flex; align-items: center; gap: 10px; padding: 12px 12px; border-bottom: 1px solid #eee; }
        .li:last-child { border-bottom: none; }
        .li .nm { font-weight: 900; }
      `}</style>

      <div className="no-print bar">
        <strong>Stampa ordini cumulativa</strong>

        <label style={{ fontWeight: 900 }}>
          Dal <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </label>

        <label style={{ fontWeight: 900 }}>
          Al <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </label>

        <div style={{ display: "flex", gap: 8 }}>
          <button className={`chip ${mode === "a5" ? "on" : ""}`} onClick={() => setMode("a5")}>A5</button>
          <button className={`chip ${mode === "a4" ? "on" : ""}`} onClick={() => setMode("a4")}>A4</button>
          <button className={`chip ${mode === "thermal" ? "on" : ""}`} onClick={() => setMode("thermal")}>Termica</button>
        </div>

        <button className="btn" onClick={loadCustomers}>Cerca clienti</button>

        {step === "print" ? (
          <button className="btn" onClick={onPrint}>🖨️ Stampa</button>
        ) : (
          <button className="btn" onClick={loadOrdersForSelected}>Procedi</button>
        )}

        <span style={{ opacity: 0.75, fontWeight: 800 }}>
          {loading ? "Carico..." : step === "select" ? `${customers.length} clienti` : `${orders.length} ordini`}
        </span>
      </div>

      {step === "select" ? (
        <div className="checklist">
          <h1 style={{ fontSize: 20, fontWeight: 900, margin: 0 }}>Seleziona clienti</h1>
          <div style={{ marginTop: 6, fontWeight: 800, opacity: 0.8 }}>{subtitle}</div>

          {err ? <pre style={{ color: "crimson", fontSize: 12 }}>{err}</pre> : null}

          <div className="check-actions">
            <button className="btn" onClick={selectAll}>Seleziona tutti</button>
            <button className="btn" onClick={selectNone}>Nessuno</button>
            <div style={{ fontWeight: 900, alignSelf: "center", opacity: 0.8 }}>
              Selezionati: {selectedIds.size}
            </div>
          </div>

          <div className="list">
            {customers.map((c) => (
              <label key={c.id} className="li" style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(c.id)}
                  onChange={() => toggle(c.id)}
                  style={{ width: 18, height: 18 }}
                />
                <span className="nm">{c.name}</span>
              </label>
            ))}
            {customers.length === 0 && !err && !loading ? (
              <div style={{ padding: 12, opacity: 0.7 }}>Nessun cliente nel periodo.</div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className={mode === "thermal" ? "thermal" : mode === "a4" ? "a4" : ""}>
          <div className="sheet">
            {err ? <pre style={{ color: "crimson", fontSize: 12 }}>{err}</pre> : null}

            {orders.map((o) => (
              <div key={o.id} className="order-block">
                <div className="title">
                  <div className="name">{o.customers?.name ?? ""}</div>
                  <div className="date">{formatDateNice(o.order_date)}</div>
                </div>

                <div className="cols">
                  <div>COD</div>
                  <div style={{ textAlign: "center" }}>Q.TÀ</div>
                  <div>PESO / NOTE</div>
                </div>

                {o.order_items.map((it) => (
                  <div key={it.id} className="row">
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `${codeMinW}px ${qtyW}px 1fr`,
                        gap: 10,
                        alignItems: "center",
                      }}
                    >
                      <div style={{ fontWeight: 900, fontSize: codeFont }}>
                        {it.products?.cod ?? ""}
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <span className="qty-box">
                          {it.qty_units} {(it.unit_type ?? "").toString().toUpperCase()}
                        </span>
                      </div>

                      <div><div className="pen-line" /></div>
                    </div>

                    <div style={{ marginTop: 4, fontSize: descFont }}>
                      {(it.description_override ?? (it.description_override ?? it.products?.description)) ?? ""}
                    </div>
                  </div>
                ))}

                {/* ✅ NOTE anti-split: tutto il blocco insieme */}
                <div style={{ marginTop: 12, pageBreakInside: "avoid", breakInside: "avoid" as any }}>
                  <div style={{ fontWeight: 900 }}>NOTE:</div>
                  <div style={{ marginTop: 6 }}>
                    <div className="pen-line" />
                    <div className="pen-line" />
                  </div>
                </div>
              </div>
            ))}

            {orders.length === 0 && !err && !loading ? (
              <div style={{ padding: 12, opacity: 0.7 }}>Nessun ordine nell’intervallo.</div>
            ) : null}
          </div>
        </div>
      )}
    </main>
  );
}
