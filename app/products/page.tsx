"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

type Product = {
  id: number;
  cod: string | null;
  description: string;
  is_active: boolean;
};

export default function ProductsPage() {
  const [rows, setRows] = useState<Product[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [q, setQ] = useState("");

  const qDebounced = useDebouncedValue(q, 250);

  const load = async () => {
    const base = supabase
      .from("products")
      .select("id,cod,description,is_active")
      .order("description", { ascending: true })
      .limit(3000);

    const qTrim = qDebounced.trim();

    let res;

    if (qTrim.length >= 2) {
      const b = showInactive ? base : base.eq("is_active", true);
      res = await b.or(`description.ilike.%${qTrim}%,cod.ilike.%${qTrim}%`);
    } else {
      res = showInactive ? await base : await base.eq("is_active", true);
    }

    const { data, error } = res;

    if (error) setErr(error.message);
    else {
      setErr(null);
      setRows((data ?? []) as Product[]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive, qDebounced]);

  const subtitle = useMemo(() => {
    const t = qDebounced.trim();
    if (t.length >= 2) return `Risultati ricerca: "${t}"`;
    return "Anagrafica prodotti";
  }, [qDebounced]);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Prodotti</h1>
          <p style={{ marginTop: 8, opacity: 0.75 }}>{subtitle}</p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href="/products/new"
            style={{
              padding: "10px 12px",
              background: "black",
              color: "white",
              textDecoration: "none",
              borderRadius: 8,
              whiteSpace: "nowrap",
              fontWeight: 800,
            }}
          >
            + Nuovo Prodotto
          </Link>

          <Link
            href="/products/import"
            style={{
              padding: "10px 12px",
              border: "1px solid #111",
              color: "#111",
              textDecoration: "none",
              borderRadius: 8,
              whiteSpace: "nowrap",
              fontWeight: 800,
            }}
          >
            Import Prodotti
          </Link>
        </div>
      </div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
          maxWidth: 720,
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca prodotto per descrizione o COD..."
          style={{
            padding: 10,
            border: "1px solid #ddd",
            borderRadius: 10,
            flex: 1,
            minWidth: 240,
          }}
          inputMode="search"
        />

        <label style={{ display: "flex", gap: 8, alignItems: "center", whiteSpace: "nowrap" }}>
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
          />
          Mostra disattivati
        </label>

        <button
          onClick={load}
          style={{
            padding: 10,
            border: "1px solid #ddd",
            background: "white",
            cursor: "pointer",
            borderRadius: 10,
            whiteSpace: "nowrap",
          }}
        >
          Aggiorna
        </button>
      </div>

      {err ? (
        <pre style={{ marginTop: 16, color: "crimson" }}>{err}</pre>
      ) : (
        <div style={{ marginTop: 16, overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", minWidth: 820 }}>
            <thead>
              <tr>
                {["COD", "Descrizione", "Stato"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid #ddd",
                      padding: "10px 8px",
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "10px 8px", fontWeight: 900 }}>
                    <Link href={`/products/${p.id}`} style={{ textDecoration: "none", color: "#111" }}>
                      {p.cod ?? ""}
                    </Link>
                  </td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "10px 8px" }}>
                    {p.description}
                  </td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "10px 8px" }}>
                    <span style={{ color: p.is_active ? "green" : "crimson", fontWeight: 800 }}>
                      {p.is_active ? "ATTIVO" : "DISATT."}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: 12, opacity: 0.7 }}>
                    Nessun risultato.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return v;
}
