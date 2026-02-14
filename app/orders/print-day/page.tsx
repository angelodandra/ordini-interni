"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import Link from "next/link";

type Row = {
product_id: number;
  cod: string;
  description: string;
  kg: number;
  cs: number;
  pz: number;
  has_override: boolean;
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

export default function PrintDayByProductPage() {
  const [fromDate, setFromDate] = useState(todayISO());
  const [toDate, setToDate] = useState(todayISO());
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const subtitle = useMemo(() => {
    if (!fromDate || !toDate) return "";
    if (fromDate === toDate) return formatDateNice(fromDate);
    return `${fromDate} → ${toDate}`;
  }, [fromDate, toDate]);

  const load = async () => {
    setErr(null);
    setRows([]);

    if (!fromDate || !toDate) return setErr("Seleziona DAL e AL");
    if (fromDate > toDate) return setErr("Intervallo non valido");

    const { data, error } = await supabase
      .from("order_items")
      .select("id,unit_type,qty_units,description_override,product_id,products(cod,description),orders!inner(order_date)")
      .gte("orders.order_date", fromDate)
      .lte("orders.order_date", toDate)
      .limit(20000);

    if (error) return setErr(error.message);

    const map = new Map<number, Row>();

    for (const it of (data ?? []) as any[]) {
      const pid = Number(it.product_id);
      const cod = (it.products?.cod ?? "").toString();
      const description = (it.products?.description ?? "").toString();
      const unit = (it.unit_type ?? "").toString().toUpperCase();
      const qty = Number(it.qty_units ?? 0);

      if (!map.has(pid)) map.set(pid, { product_id: pid, cod, description, kg: 0, cs: 0, pz: 0, has_override: false });
      const r = map.get(pid)!;

      if ((it as any).description_override) r.has_override = true;

      if (unit === "KG") r.kg += qty;
      else if (unit === "CS") r.cs += qty;
      else if (unit === "PZ") r.pz += qty;
    }

    const out = Array.from(map.values()).sort(
      (a, b) => (a.cod || "").localeCompare(b.cod || "") || (a.description || "").localeCompare(b.description || "")
    );

    setRows(out);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPrint = () => window.print();

  return (
    <main style={{ fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        @page { size: A4 portrait; margin: 10mm; }
        @media print { .no-print { display: none !important; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }

        .wrap { padding: 14px; }
        .title { text-align: center; margin-bottom: 10px; }
        .title h1 { margin: 0; font-size: 18px; font-weight: 900; }
        .title .sub { margin-top: 4px; font-weight: 800; font-size: 12px; }

        table { width: 100%; border-collapse: collapse; table-layout: fixed; border-left: 1px solid #000; }
        th, td { border-bottom: 1px solid #000; border-right: 1px solid #000; padding: 5px 6px; vertical-align: middle; font-size: 11px; }
        th { border-bottom: 2px solid #000; text-align: left; font-size: 11px; }

        .cod { font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .desc { font-weight: 400; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .num { text-align: right; font-weight: 900; white-space: nowrap; }

        col.cod { width: 90px; }
        col.kg, col.cs, col.pz { width: 55px; }

        .bar { padding: 12px 14px; border-bottom: 1px solid #ddd; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
        .bar strong { margin-right: 8px; }
        .bar input { padding: 10px; border-radius: 10px; border: 1px solid #ddd; }
        .btn { padding: 10px 14px; border-radius: 10px; border: 1px solid #111; background: white; font-weight: 900; cursor: pointer; }
        .link { color: #111; text-decoration: underline; font-weight: 900; }
      `}</style>

      <div className="no-print bar">
        <strong>Riepilogo prodotti</strong>

        <label style={{ fontWeight: 900 }}>
          Dal <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </label>

        <label style={{ fontWeight: 900 }}>
          Al <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </label>

        <button className="btn" onClick={load}>Cerca</button>
        <button className="btn" onClick={onPrint}>🖨️ Stampa A4</button>
      </div>

      <div className="wrap">
        <div className="title">
          <h1>RIEPILOGO PRODOTTI</h1>
          <div className="sub">{subtitle}</div>
        </div>

        {err ? <pre style={{ color: "crimson", fontSize: 12 }}>{err}</pre> : null}

        <table>
          <colgroup>
            <col className="cod" />
            <col />
            <col className="kg" />
            <col className="cs" />
            <col className="pz" />
          </colgroup>
          <thead>
            <tr>
              <th>COD</th>
              <th>DESCRIZIONE</th>
              <th className="num">KG</th>
              <th className="num">CS</th>
              <th className="num">PZ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.product_id}>
                <td className="cod">
                  <Link
                    className="link"
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`/products/print-one?cod=${encodeURIComponent(r.cod)}&from=${fromDate}&to=${toDate}`}
                  >
                    {r.cod}{r.has_override ? " ✎" : ""}
                  </Link>
                </td>
                <td className="desc" title={r.description}>{r.description}</td>
                <td className="num">{r.kg ? r.kg : ""}</td>
                <td className="num">{r.cs ? r.cs : ""}</td>
                <td className="num">{r.pz ? r.pz : ""}</td>
              </tr>
            ))}

            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 10, opacity: 0.7 }}>
                  Nessun dato per questo intervallo.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </main>
  );
}
