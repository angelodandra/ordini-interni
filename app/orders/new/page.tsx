"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export default function NewOrderPage() {
  const router = useRouter();

  const [orderDate, setOrderDate] = useState<string>(tomorrowISO());
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);

  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ricerca clienti
  useEffect(() => {
    const q = customerQuery.trim();
    if (q.length < 2) {
      setCustomerResults([]);
      return;
    }

    (async () => {
      const { data } = await supabase
        .from("customers")
        .select("id,name")
        .eq("is_active", true)
        .ilike("name", `%${q}%`)
        .order("name", { ascending: true })
        .limit(20);

      setCustomerResults(data ?? []);
    })();
  }, [customerQuery]);

  const createOrder = async () => {
    setErr(null);
    if (!selectedCustomer) return setErr("Seleziona un cliente");
    if (!orderDate) return setErr("Seleziona la data");

    setSaving(true);

    const { data, error } = await supabase
      .from("orders")
      .insert({
        customer_id: selectedCustomer.id,
        order_date: orderDate,
        status: "open",
      })
      .select("id")
      .single();

    if (error || !data) {
      setSaving(false);
      return setErr(error?.message ?? "Errore creazione ordine");
    }

    setSaving(false);
    router.push(`/orders/${data.id}`);
  };

  return (
    <main style={{ padding: 20, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 20, fontWeight: 900 }}>Nuovo ordine</h1>

      <div style={{ marginTop: 14 }}>
        <div style={{ fontWeight: 900 }}>Data esecuzione</div>
        <input
          type="date"
          value={orderDate}
          onChange={(e) => setOrderDate(e.target.value)}
          style={{ marginTop: 6, padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
        />
      </div>

      <div style={{ marginTop: 20 }}>
        <div style={{ fontWeight: 900 }}>Cliente</div>
        <input
          value={customerQuery}
          onChange={(e) => {
            setCustomerQuery(e.target.value);
            setSelectedCustomer(null);
          }}
          placeholder="Scrivi almeno 2 lettere..."
          style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #ddd", marginTop: 6 }}
        />

        {customerResults.length > 0 && !selectedCustomer && (
          <div style={{ marginTop: 8, border: "1px solid #eee", borderRadius: 12, overflow: "hidden" }}>
            {customerResults.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setSelectedCustomer(c);
                  setCustomerQuery(c.name);
                  setCustomerResults([]);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: 12,
                  border: "none",
                  borderBottom: "1px solid #eee",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: 900,
                }}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {err && <pre style={{ color: "crimson", marginTop: 12 }}>{err}</pre>}

      <button
        type="button"
        onClick={createOrder}
        disabled={saving}
        style={{
          marginTop: 20,
          padding: "12px 14px",
          borderRadius: 12,
          border: "1px solid #111",
          background: "black",
          color: "white",
          fontWeight: 900,
          cursor: "pointer",
          opacity: saving ? 0.6 : 1,
        }}
      >
        {saving ? "Creo..." : "Crea ordine"}
      </button>
    </main>
  );
}
