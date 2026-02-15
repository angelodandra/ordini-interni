"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { useSearchParams } from "next/navigation";

type Product = { id: number; cod: string | null; description: string };
type CustomerRow = {
  customer_name: string;
  kg: number;
  cs: number;
  pz: number;
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

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return v;
}

export default function PrintOneProductPage() {
  const sp = useSearchParams();

  const [fromDate, setFromDate] = useState(todayISO());
  const [toDate, setToDate] = useState(todayISO());

  const [productQuery, setProductQuery] = useState("");
  const debouncedQuery = useDebouncedValue(productQuery, 220);
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // ✅ leggi parametri da URL una volta
  useEffect(() => {
    const urlCod = (sp.get("cod") ?? "").trim();
    const urlFrom = (sp.get("from") ?? "").trim();
    const urlTo = (sp.get("to") ?? "").trim();

    if (urlFrom) setFromDate(urlFrom);
    if (urlTo) setToDate(urlTo);

    if (urlCod) {
      const q = urlCod.toUpperCase();
      setProductQuery(q);

      (async () => {
        const { data, error } = await supabase
          .from("products")
          .select("id,cod,description")
          .eq("is_active", true)
          .eq("cod", q)
          .single();

        if (!error && data) {
          const p = data as Product;
          setSelectedProduct(p);
          setProductQuery(`${p.cod ?? ""} - ${p.description}`);
          setProductResults([]);
          setActiveIndex(-1);
          setErr(null);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subtitle = useMemo(() => {
    if (!fromDate || !toDate) return "";
    if (fromDate === toDate) return formatDateNice(fromDate);
    return `${fromDate} → ${toDate}`;
  }, [fromDate, toDate]);

  const totals = useMemo(() => {
    let kg = 0, cs = 0, pz = 0;
    for (const r of rows) {
      kg += r.kg;
      cs += r.cs;
      pz += r.pz;
    }
    return { kg, cs, pz };
  }, [rows]);

  // --- ricerca prodotti (priorità COD) ---
  useEffect(() => {
    const raw = debouncedQuery.trim();
    if (raw.length < 2) {
      setProductResults([]);
      setActiveIndex(-1);
      return;
    }

    const q = raw.toUpperCase();
    const looksLikeCode = !/\s/.test(raw) && raw.length <= 10;

    (async () => {
      setErr(null);

      const { data: exactHits, error: e0 } = await supabase
        .from("products")
        .select("id,cod,description")
        .eq("is_active", true)
        .eq("cod", q)
        .limit(5);

      if (e0) return setErr(e0.message);

      const { data: prefixHits, error: e1 } = await supabase
        .from("products")
        .select("id,cod,description")
        .eq("is_active", true)
        .ilike("cod", `${q}%`)
        .order("cod", { ascending: true })
        .limit(15);

      if (e1) return setErr(e1.message);

      let merged: Product[] = [];
      const seen = new Set<number>();

      for (const p of (exactHits ?? []) as Product[]) {
        if (!seen.has(p.id)) { merged.push(p); seen.add(p.id); }
      }
      for (const p of (prefixHits ?? []) as Product[]) {
        if (!seen.has(p.id)) { merged.push(p); seen.add(p.id); }
      }

      if (!looksLikeCode || merged.length === 0) {
        const { data: descHits, error: e2 } = await supabase
          .from("products")
          .select("id,cod,description")
          .eq("is_active", true)
          .ilike("description", `%${raw}%`)
          .order("description", { ascending: true })
          .limit(20);

        if (e2) return setErr(e2.message);

        for (const p of (descHits ?? []) as Product[]) {
          if (!seen.has(p.id)) { merged.push(p); seen.add(p.id); }
          if (merged.length >= 20) break;
        }
      }

      setProductResults(merged.slice(0, 20));
      setActiveIndex(merged.length > 0 ? 0 : -1);
    })();
  }, [debouncedQuery]);

  useEffect(() => {
    if (activeIndex >= 0 && activeIndex < productResults.length) {
      itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, productResults.length]);

  const chooseProduct = (p: Product) => {
    setSelectedProduct(p);
    setProductQuery(`${p.cod ?? ""} - ${p.description}`);
    setProductResults([]);
    setActiveIndex(-1);
    setRows([]);
    setErr(null);
  };

  const onProductKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (productResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, productResults.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const idx = activeIndex >= 0 ? activeIndex : 0;
      const p = productResults[idx];
      if (p) chooseProduct(p);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setProductResults([]);
      setActiveIndex(-1);
      return;
    }
  };

  const load = async () => {
    setErr(null);
    setRows([]);

    if (!selectedProduct) return setErr("Seleziona un prodotto");
    if (!fromDate || !toDate) return setErr("Seleziona DAL e AL");
    if (fromDate > toDate) return setErr("Intervallo non valido: DAL è dopo AL");

    const { data, error } = await supabase
      .from("order_items")
      .select("qty_units,unit_type,orders!inner(order_date,customers(name))")
      .eq("product_id", selectedProduct.id)
      .gte("orders.order_date", fromDate)
      .lte("orders.order_date", toDate)
      .limit(20000);

    if (error) return setErr(error.message);

    const map = new Map<string, CustomerRow>();

    for (const r of (data ?? []) as any[]) {
      const customer = (r.orders?.customers?.name ?? "").toString();
      const unit = (r.unit_type ?? "").toString().toUpperCase();
      const qty = Number(r.qty_units ?? 0);

      if (!customer) continue;

      if (!map.has(customer)) map.set(customer, { customer_name: customer, kg: 0, cs: 0, pz: 0 });
      const row = map.get(customer)!;

      if (unit === "KG") row.kg += qty;
      else if (unit === "CS") row.cs += qty;
      else if (unit === "PZ") row.pz += qty;
    }

    const out = Array.from(map.values()).sort((a, b) => a.customer_name.localeCompare(b.customer_name));
    setRows(out);
  };

  const onPrint = () => window.print();

  // ✅ se arrivo con param cod e ho già selectedProduct, carico automaticamente
  useEffect(() => {
    if (selectedProduct && rows.length === 0) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct]);

  return (
    <main style={{ fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }

@media screen and (max-width: 520px){
          table th:nth-child(5),
          table td:nth-child(5){
            display:none;
          }
        }

        .bar { padding: 12px 14px; border-bottom: 1px solid #ddd; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .bar input { padding: 10px; border-radius: 10px; border: 1px solid #ddd; }
        .btn { padding: 10px 14px; border-radius: 10px; border: 1px solid #111; background: white; font-weight: 900; cursor: pointer; }

        .wrap { padding: 14px; }
        .title { text-align: center; margin-bottom: 10px; }
        .title h1 { margin: 0; font-size: 18px; font-weight: 900; }
        .title .sub { margin-top: 4px; font-weight: 800; font-size: 12px; }

        .totals { display: flex; gap: 10px; justify-content: center; margin: 10px 0 14px; }
        .pill { border: 2px solid #000; border-radius: 999px; padding: 6px 12px; font-weight: 900; }

        table { width: 100%; border-collapse: collapse; table-layout: fixed; border-left: 1px solid #000; }

@media screen and (max-width: 520px){
          table { table-layout: auto; }
          th:first-child, td:first-child { width: 50%; }
          .cust { white-space: normal; }
        }
        th, td { border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 6px 6px; vertical-align: middle; font-size: 11px; }
        th { border-bottom: 2px solid #000; text-align: left; }
        .num { text-align: right; font-weight: 900; white-space: nowrap; }
        .cust { font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .pen-line { height: 20px; position: relative; }
        .pen-line:before { content:""; position:absolute; left:0; right:0; top:14px; border-bottom: 1px dashed #000; }
      `}</style>

      <div className="no-print bar">
        <strong>Stampa singolo prodotto</strong>

        <div style={{ position: "relative", minWidth: 320 }}>
          <input
            value={productQuery}
            onChange={(e) => {
              setProductQuery(e.target.value);
              setSelectedProduct(null);
            }}
            onKeyDown={onProductKeyDown}
            placeholder="Scrivi COD (priorità) o descrizione..."
            style={{ width: 320 }}
            inputMode="search"
            autoComplete="off"
          />

          {productResults.length > 0 && (
            <div
              style={{
                position: "absolute",
                zIndex: 10,
                left: 0,
                right: 0,
                top: "46px",
                border: "1px solid #ddd",
                borderRadius: 10,
                background: "white",
                overflow: "hidden",
                maxHeight: 260,
                overflowY: "auto",
              }}
            >
              {productResults.map((p, idx) => (
                <button
                  key={p.id}
                  ref={(el) => { itemRefs.current[idx] = el; }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => chooseProduct(p)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 12px",
                    border: "none",
                    cursor: "pointer",
                    background: idx === activeIndex ? "#111" : "white",
                    color: idx === activeIndex ? "white" : "#111",
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{p.cod ?? ""}</div>
                  <div style={{ fontSize: 12, opacity: idx === activeIndex ? 0.9 : 0.7 }}>
                    {p.description}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <label style={{ fontWeight: 900 }}>
          Dal <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} style={{ marginLeft: 8 }} />
        </label>

        <label style={{ fontWeight: 900 }}>
          Al <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} style={{ marginLeft: 8 }} />
        </label>

        <button className="btn" onClick={load}>Cerca</button>
        <button className="btn" onClick={() => window.print()}>🖨️ Stampa</button>
      </div>

      <div className="wrap">
        <div className="title">
          <h1>{selectedProduct?.cod ? `PRODOTTO ${selectedProduct.cod}` : "PRODOTTO"}</h1>
          <div className="sub">{selectedProduct?.description ?? ""}</div>
          <div className="sub">{subtitle}</div>
        </div>

        <div className="totals">
          <div className="pill">KG: {totals.kg || 0}</div>
          <div className="pill">CS: {totals.cs || 0}</div>
          <div className="pill">PZ: {totals.pz || 0}</div>
        </div>

        {err ? <pre style={{ color: "crimson", fontSize: 12 }}>{err}</pre> : null}

        <table>
          <thead>
            <tr>
              <th>CLIENTE</th>
              <th style={{ width: 70 }} className="num">KG</th>
              <th style={{ width: 70 }} className="num">CS</th>
              <th style={{ width: 70 }} className="num">PZ</th>
              <th style={{ width: 120 }}>PESO / NOTE</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr key={idx}>
                <td className="cust" title={r.customer_name}>{r.customer_name}</td>
                <td className="num">{r.kg ? r.kg : ""}</td>
                <td className="num">{r.cs ? r.cs : ""}</td>
                <td className="num">{r.pz ? r.pz : ""}</td>
                <td><div className="pen-line" /></td>
              </tr>
            ))}

            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 10, opacity: 0.7 }}>
                  Nessun dato per questo prodotto nell’intervallo selezionato.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
