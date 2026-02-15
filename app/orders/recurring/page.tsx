"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import Link from "next/link";

type Recurring = {
  id: number;
  is_active: boolean;
  days_of_week: number[];
  customers: { name: string } | null;

  last_materialized_at: string | null;};

function formatDays(days: number[] = []) {
  const map: Record<number, string> = {
    1: "Lun",
    2: "Mar",
    3: "Mer",
    4: "Gio",
    5: "Ven",
    6: "Sab",
    7: "Dom",
  };
  return days.map((d) => map[d] ?? d).join(", ");
}

export default function RecurringOrdersPage() {
  const [rows, setRows] = useState<Recurring[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const toggleActive = async (id: number, next: boolean) => {
    const { error } = await supabase.from("recurring_orders").update({ is_active: next }).eq("id", id);
    if (error) return alert(error.message);
    load();
  };

  const deleteRecurring = async (id: number) => {
    if (!confirm("Eliminare questo ricorrente? (cancella anche le righe)")) return;
    const { error } = await supabase.from("recurring_orders").delete().eq("id", id);
    if (error) return alert(error.message);
    load();
  };

  const load = async () => {
    const { data, error } = await supabase
      .from("recurring_orders")
      .select("id,is_active,days_of_week,customers(name),last_materialized_at")
      .order("id", { ascending: false });

    if (error) setErr(error.message);
    else setRows((data ?? []) as Recurring[]);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 20, fontWeight: 900 }}>Ordini ricorrenti</h1>

      <div style={{ marginTop: 15 }}>
        <Link
          href="/orders/recurring/new"
          style={{
            padding: "8px 14px",
            background: "#111",
            color: "#fff",
            borderRadius: 6,
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          + Nuovo ordine ricorrente
        </Link>
      </div>

      {err && <p style={{ color: "red" }}>{err}</p>}

      <div style={{ marginTop: 20 }}>
        {rows.length === 0 ? (
          <p style={{ opacity: 0.7 }}>Nessun ordine ricorrente.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8 }}>Cliente</th>
                <th style={{ textAlign: "left", padding: 8 }}>Giorni</th>
                <th style={{ textAlign: "left", padding: 8 }}>Stato</th>
                <th style={{ textAlign: "left", padding: 8 }}>Ultima generazione</th>
                <th style={{ textAlign: "left", padding: 8 }}>Azioni</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => (window.location.href = `/orders/recurring/${r.id}`)}
                >
                  <td style={{ padding: 8, borderTop: "1px solid #eee" }}>
                    {r.customers?.name ?? "-"}
                  </td>

                  <td style={{ padding: 8, borderTop: "1px solid #eee" }}>
                    {formatDays(r.days_of_week)}
                  </td>

                  <td style={{ padding: 8, borderTop: "1px solid #eee", whiteSpace: "nowrap" }}>
                    {r.is_active ? "Attivo" : "Disattivo"}
                  </td>

                  <td style={{ padding: 8, borderTop: "1px solid #eee", whiteSpace: "nowrap" }}>
                    {(r as any).last_materialized_at
                      ? new Date((r as any).last_materialized_at).toLocaleDateString("it-IT")
                      : "-"}
                  </td>

                  <td style={{ padding: 8, borderTop: "1px solid #eee", whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleActive(r.id, !r.is_active);
                      }}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 10,
                        border: "1px solid #111",
                        background: r.is_active ? "#fff" : "#111",
                        color: r.is_active ? "#111" : "#fff",
                        fontWeight: 900,
                        marginRight: 8,
                      }}
                    >
                      {r.is_active ? "Sospendi" : "Riattiva"}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        deleteRecurring(r.id);
                      }}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 10,
                        border: "1px solid #d11",
                        background: "#fff",
                        color: "#d11",
                        fontWeight: 900,
                      }}
                    >
                      Elimina
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
