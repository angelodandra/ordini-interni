"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

type OrderRow = {
  id: number;
  order_date: string;
  customers: { name: string } | null;
  status: string | null;
};

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

function formatDateNice(dateStr: string) {
  const d = new Date(dateStr);
  const giorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
  const dayName = giorni[d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dayName} ${dd}-${mm}`;
}

export default function OrdersPage() {
  const [fromDate, setFromDate] = useState<string>(todayISO());
  const [toDate, setToDate] = useState<string>(todayISO());
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const subtitle = useMemo(() => {
    if (!fromDate || !toDate) return "";
    if (fromDate === toDate) return formatDateNice(fromDate);
    return `${fromDate} → ${toDate}`;
  }, [fromDate, toDate]);

  const load = async (fd?: string, td?: string) => {
    const f = fd ?? fromDate;
    const t = td ?? toDate;

    setErr(null);
    setLoading(true);
    setRows([]);

    if (!f || !t) {
      setLoading(false);
      return setErr("Seleziona DAL e AL");
    }
    if (f > t) {
      setLoading(false);
      return setErr("Intervallo non valido");
    }

    const { data, error } = await supabase
      .from("orders")
      .select("id,order_date,status,customers(name),order_items(id,qty_units)")
      .gte("order_date", f)
      .lte("order_date", t)
      .order("order_date", { ascending: true })
      .order("id", { ascending: true })
      .limit(2000);

    if (error) {
      setLoading(false);
      return setErr(error.message);
    }

    // escludi ordini vuoti
    const cleaned = (data ?? [])
      .map((o: any) => ({
        id: o.id,
        order_date: o.order_date,
        status: o.status,
        customers: o.customers,
        _count: (o.order_items ?? []).filter((x: any) => Number(x.qty_units ?? 0) > 0).length,
      }))
      .filter((o: any) => o._count > 0)
      .map(({ _count, ...rest }: any) => rest);

    setRows(cleaned as any);
    setLoading(false);
  };

  useEffect(() => {
    load(fromDate, toDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setToday = async () => {
    const t = todayISO();
    setFromDate(t);
    setToDate(t);
    await load(t, t);
  };

  const setTomorrow = async () => {
    const t = tomorrowISO();
    setFromDate(t);
    setToDate(t);
    await load(t, t);
  };

  return (
    <main style={{ padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900, margin: 0 }}>Ordini</h1>
      <div style={{ marginTop: 6, fontWeight: 800, opacity: 0.8 }}>{subtitle}</div>

      <div
        style={{
          marginTop: 14,
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 14,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <label style={{ fontWeight: 900 }}>
          Dal{" "}
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", marginLeft: 6 }}
          />
        </label>

        <label style={{ fontWeight: 900 }}>
          Al{" "}
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", marginLeft: 6 }}
          />
        </label>

        <button
          type="button"
          onClick={setToday}
          style={{
            padding: "10px 12px",
            borderRadius: 999,
            border: "1px solid #111",
            fontWeight: 900,
            background: "white",
            cursor: "pointer",
          }}
        >
          Oggi
        </button>

        <button
          type="button"
          onClick={setTomorrow}
          style={{
            padding: "10px 12px",
            borderRadius: 999,
            border: "1px solid #111",
            fontWeight: 900,
            background: "white",
            cursor: "pointer",
          }}
        >
          Domani
        </button>

        <button
          type="button"
          onClick={() => load()}
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #111",
            background: "black",
            color: "white",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Cerca
        </button>

        <Link
          href="/orders/new"
          style={{
            marginLeft: "auto",
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #111",
            textDecoration: "none",
            fontWeight: 900,
            color: "#111",
          }}
        >
          + Nuovo ordine
        </Link>
      </div>

      {err ? <pre style={{ color: "crimson", marginTop: 12 }}>{err}</pre> : null}
      {loading ? <div style={{ marginTop: 12, opacity: 0.7, fontWeight: 800 }}>Carico...</div> : null}

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {rows.map((o) => (
          <Link
            key={o.id}
            href={`/orders/${o.id}`}
            style={{
              display: "block",
              padding: 14,
              borderRadius: 14,
              border: "1px solid #ddd",
              textDecoration: "none",
              color: "#111",
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 900 }}>{o.customers?.name ?? ""}</div>
            <div style={{ marginTop: 4, opacity: 0.75, fontWeight: 800 }}>
              {formatDateNice(o.order_date)}
            </div>
          </Link>
        ))}

        {rows.length === 0 && !err && !loading ? (
          <div style={{ padding: 12, opacity: 0.7 }}>Nessun ordine in questo intervallo.</div>
        ) : null}
      </div>
    </main>
  );
}
