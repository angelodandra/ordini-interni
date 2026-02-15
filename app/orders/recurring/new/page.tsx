"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";

type Customer = {
  id: number;
  name: string;
};

const DAYS = [
  { id: 1, label: "Lun" },
  { id: 2, label: "Mar" },
  { id: 3, label: "Mer" },
  { id: 4, label: "Gio" },
  { id: 5, label: "Ven" },
  { id: 6, label: "Sab" },
  { id: 7, label: "Dom" },
];

export default function NewRecurringOrderPage() {
  const router = useRouter();

  const [customerQuery, setCustomerQuery] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const [days, setDays] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // 🔎 Ricerca cliente (digitando)
  useEffect(() => {
    const q = customerQuery.trim();
    if (q.length < 2) {
      setCustomerResults([]);
      return;
    }

    const load = async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id,name")
        .ilike("name", `%${q}%`)
        .limit(10);

      if (!error) setCustomerResults((data ?? []) as Customer[]);
    };

    load();
  }, [customerQuery]);

  const toggleDay = (id: number) => {
    setDays((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const save = async () => {
    if (!selectedCustomer) return setErr("Seleziona un cliente");
    if (days.length === 0) return setErr("Seleziona almeno un giorno");

    const { error } = await supabase.from("recurring_orders").upsert({
      customer_id: selectedCustomer.id,
      is_active: isActive,
      days_of_week: days,
    });

    if (error) return setErr(error.message);

    router.push("/orders/recurring");
  };

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 20, fontWeight: 900 }}>
        Nuovo ordine ricorrente
      </h1>

      {/* Cliente */}
      <div style={{ marginTop: 20 }}>
        <label style={{ fontWeight: 700 }}>Cliente</label>
        <input
          type="text"
          value={selectedCustomer?.name ?? customerQuery}
          onChange={(e) => {
            setSelectedCustomer(null);
            setCustomerQuery(e.target.value);
          }}
          placeholder="Digita nome cliente..."
          style={{
            width: "100%",
            padding: 10,
            marginTop: 6,
            border: "1px solid #ccc",
            borderRadius: 6,
          }}
        />

        {customerResults.length > 0 && !selectedCustomer && (
          <div
            style={{
              border: "1px solid #ddd",
              marginTop: 4,
              borderRadius: 6,
              background: "#fff",
            }}
          >
            {customerResults.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  setSelectedCustomer(c);
                  setCustomerQuery("");
                  setCustomerResults([]);
                }}
                style={{
                  padding: 10,
                  cursor: "pointer",
                  borderBottom: "1px solid #eee",
                }}
              >
                {c.name}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Giorni */}
      <div style={{ marginTop: 20 }}>
        <label style={{ fontWeight: 700 }}>Giorni attivi</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {DAYS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => toggleDay(d.id)}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
                background: days.includes(d.id) ? "#111" : "#fff",
                color: days.includes(d.id) ? "#fff" : "#000",
                fontWeight: 700,
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {/* Attivo */}
      <div style={{ marginTop: 20 }}>
        <label>
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />{" "}
          Attivo
        </label>
      </div>

      {err && (
        <p style={{ marginTop: 15, color: "red", fontWeight: 700 }}>{err}</p>
      )}

      <div style={{ marginTop: 25 }}>
        <button
          onClick={save}
          style={{
            padding: "10px 18px",
            background: "#111",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontWeight: 800,
          }}
        >
          Salva
        </button>
      </div>
    </div>
  );
}
