"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

type OrderRow = {
  id: number;
  order_date: string;
  customers: { name: string } | null;
  status: string | null;

  is_recurring?: boolean | null;
  recurring_order_id?: number | null;
};

function italyISO(d: Date) {
  return d.toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
}

function todayISO() {
  return italyISO(new Date());
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return italyISO(d);
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
  const [myRole, setMyRole] = useState<string>("viewer");

  const subtitle = useMemo(() => {
    if (!fromDate || !toDate) return "";
    if (fromDate === toDate) return formatDateNice(fromDate);
    return `${fromDate} → ${toDate}`;
  }, [fromDate, toDate]);

    const loadMyRole = async () => {
    const { data } = await supabase.auth.getUser();
    const uid = data?.user?.id;
    if (!uid) return setMyRole("viewer");
    const { data: p } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
    setMyRole((p?.role ?? "viewer").toString());
  };

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
      .select("id,order_date,status,recurring_order_id,is_recurring,customers(name),order_items(id,qty_units)")
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
        is_recurring: o.is_recurring,
        recurring_order_id: o.recurring_order_id,
        _count: (o.order_items ?? []).filter((x: any) => Number(x.qty_units ?? 0) > 0).length,
      }))
      .filter((o: any) => o._count > 0)
      .map(({ _count, ...rest }: any) => rest);

    setRows(cleaned as any);
    setLoading(false);
  };

  const deleteOrder = async (id: number) => {
    if (!confirm("Eliminare definitivamente questo ordine?")) return;

    const { error: e1 } = await supabase
      .from("order_items")
      .delete()
      .eq("order_id", id);

    if (e1) return alert(e1.message);

    const { error: e2 } = await supabase
      .from("orders")
      .delete()
      .eq("id", id);

    if (e2) return alert(e2.message);

    await load();
  };

  useEffect(() => {
    load(fromDate, toDate);
    loadMyRole();
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


  const materializeRecurring = async (dateISO: string) => {
    try {
      const r = await fetch("/api/admin/materialize-recurring", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ order_date: dateISO }),
      });

      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Errore");

      alert(`Ricorrenti creati: ${j.created} | Saltati: ${j.skipped}`);
      await load();
    } catch (e: any) {
      alert(e?.message ?? "Errore");
    }
  };

  return (
    <main style={{ padding: 20, fontFamily: "system-ui, sans-serif" }}>



      <style>{`
        .btn-ric{ cursor:pointer; transition:opacity 120ms ease; }
        .btn-ric:hover{ opacity:0.85; }
      `}</style>
<div style={{ marginBottom: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
  <button className="btn-ric"
    type="button"
    onClick={() => materializeRecurring(todayISO())}
    style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #111", background: "#fff", fontWeight: 900 }}
  >
    Genera ricorrenti OGGI
  </button>

  <button className="btn-ric"
    type="button"
    onClick={() => {
      materializeRecurring(tomorrowISO());
    }}
    style={{ padding: "10px 14px", borderRadius: 12, border: "1px solid #111", background: "#fff", fontWeight: 900  }}
  >
    Genera ricorrenti DOMANI
  </button>
</div>

<h1 style={{ fontSize: 22, fontWeight: 900, margin: 0  }}>Ordini</h1>

      <div style={{ marginTop: 6, fontWeight: 800, opacity: 0.8 }}>{subtitle}</div>

      <div
        style={{
          marginTop: 14,
          padding: 12,
          border: "1px solid var(--brand-100)",
              background: "var(--card)",
              boxShadow: "var(--shadow)",
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
            style={{ padding: 10, borderRadius: 10, border: "1px solid var(--brand-100)",
              background: "var(--card)",
              boxShadow: "var(--shadow)", marginLeft: 6 }}
          />
        </label>

        <label style={{ fontWeight: 900 }}>
          Al{" "}
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            style={{ padding: 10, borderRadius: 10, border: "1px solid var(--brand-100)",
              background: "var(--card)",
              boxShadow: "var(--shadow)", marginLeft: 6 }}
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
            marginLeft: 0,
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

        <Link
          href="/orders/recurring"
          style={{
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #111",
            textDecoration: "none",
            fontWeight: 900,
            color: "#111",
            background: "#f5f5f5"
          }}
        >
          🔁 Clienti ricorrenti
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
              padding: "10px 12px",
              paddingRight: 90,
              position: "relative",
              borderRadius: 14,
              border: "1px solid var(--brand-100)",
              background: "var(--card)",
              boxShadow: "var(--shadow)",
              textDecoration: "none",
              color: "#111",
            }}
          >
            
            <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, fontWeight: 900 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {o.customers?.name ?? ""}
                </span>

                {o.is_recurring ? (
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 999,
                      background: "#111",
                      color: "#fff",
                      fontWeight: 900,
                      fontSize: 12,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      flex: "0 0 auto",
                    }}
                  >
                    🔁 RIC
                  </span>
                ) : null}
              </div>

              <div style={{ marginLeft: "auto", fontWeight: 800, opacity: 0.75, whiteSpace: "nowrap" }}>
                {formatDateNice(o.order_date)}
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                deleteOrder(o.id);
              }}
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                padding: "4px 8px",
                borderRadius: 10,
                border: "1px solid #d11",
                background: "#fff",
                color: "#d11",
                fontWeight: 900,
                fontSize: 12,
                lineHeight: 1,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Elimina
            </button>
</Link>
        ))}

        {rows.length === 0 && !err && !loading ? (
          <div style={{ padding: 12, opacity: 0.7 }}>Nessun ordine in questo intervallo.</div>
        ) : null}
      </div>
    </main>
  );
}
