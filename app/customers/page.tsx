"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

type Customer = {
  id: number;
  code: string | null;
  name: string;
  phone: string | null;
  is_active: boolean;
};

export default function CustomersPage() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [q, setQ] = useState("");

  const qDebounced = useDebouncedValue(q, 250);

  const load = async () => {
    const query = supabase
      .from("customers")
      .select("id,code,name,phone,is_active")
      .order("name", { ascending: true })
      .limit(2000);

    const qTrim = qDebounced.trim();

    let res;
    if (qTrim.length >= 2) {
      // ricerca
      const base = showInactive ? query : query.eq("is_active", true);
      res = await base.or(`name.ilike.%${qTrim}%,code.ilike.%${qTrim}%`);
    } else {
      // lista normale
      res = showInactive ? await query : await query.eq("is_active", true);
    }

    const { data, error } = res;

    if (error) setErr(error.message);
    else {
      setErr(null);
      setRows((data ?? []) as Customer[]);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showInactive, qDebounced]);

  const subtitle = useMemo(() => {
    const t = qDebounced.trim();
    if (t.length >= 2) return `Risultati ricerca: "${t}"`;
    return "Anagrafica clienti";
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
          <h1 style={{ fontSize: 22, fontWeight: 800 }}>Clienti</h1>
          <p style={{ marginTop: 8, opacity: 0.75 }}>{subtitle}</p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href="/customers/new"
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
            + Nuovo Cliente
          </Link>

          <Link
            href="/customers/import"
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
            Import Clienti
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
          placeholder="Cerca cliente per nome o codice..."
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
                {["Codice", "Nome", "Telefono", "Stato"].map((h) => (
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
              {rows.map((c) => (
                <tr key={c.id}>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "10px 8px" }}>
                    {c.code ?? ""}
                  </td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "10px 8px", fontWeight: 800 }}>
                    <Link href={`/customers/${c.id}`} style={{ textDecoration: "none", color: "#111" }}>
                      {c.name}
                    </Link>
                  </td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "10px 8px" }}>
                    {c.phone ?? ""}
                  </td>
                  <td style={{ borderBottom: "1px solid #f0f0f0", padding: "10px 8px" }}>
                    <span style={{ color: c.is_active ? "green" : "crimson", fontWeight: 800 }}>
                      {c.is_active ? "ATTIVO" : "DISATT."}
                    </span>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: 12, opacity: 0.7 }}>
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
