"use client";

import { useEffect, useMemo, useState } from "react";

type Item = {
  id: number;
  code: string;
  description: string | null;
  qty_kg: number;
};

function fmtKg(n: number) {
  const v = Number(n ?? 0);
  return v.toLocaleString("it-IT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  async function loadInventory() {
    const res = await fetch("/api/inventory/list", { cache: "no-store" });
    const data = await res.json();
    setItems(data.items || []);
  }

  useEffect(() => {
    loadInventory();
  }, []);

  const filtered = useMemo(() => {
    const qq = q.trim().toUpperCase();
    const base = [...items].sort((a, b) => a.code.localeCompare(b.code));
    if (!qq) return base;
    return base.filter((i) => {
      const c = (i.code || "").toUpperCase();
      const d = (i.description || "").toUpperCase();
      return c.includes(qq) || d.includes(qq);
    });
  }, [items, q]);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch("/api/inventory/import", {
        method: "POST",
        body: form,
      });

      let j: any = null;
      try {
        j = await res.json();
      } catch {}

      if (!res.ok) {
        console.error("IMPORT ERROR", j);
        alert(
          (j && (j.error || j.details))
            ? (String(j.error || "Errore") + (j.details ? "\n" + String(j.details) : ""))
            : "Errore import inventario"
        );
        return;
      }

      await loadInventory();
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "space-between", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0 }}>Inventario</h1>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Cerca per codice o descrizione…"
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              minWidth: 280,
              outline: "none",
              fontWeight: 700,
            }}
          />

          <label
            style={{
              padding: "10px 14px",
              background: "#111",
              color: "#fff",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 900,
              border: "1px solid rgba(0,0,0,0.2)",
              userSelect: "none",
            }}
          >
            Importa inventario
            <input
              type="file"
              accept=".xls,.xlsx"
              onChange={handleImport}
              style={{ display: "none" }}
            />
          </label>

          {loading && <span style={{ fontWeight: 900 }}>Importazione…</span>}
        </div>
      </div>

      <div style={{ marginTop: 12, fontWeight: 800, opacity: 0.8 }}>
        Righe: {filtered.length}
      </div>

      <div
        style={{
          marginTop: 12,
          border: "1px solid #e5e5e5",
          borderRadius: 14,
          overflow: "hidden",
          background: "white",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "110px 1fr 90px",
            gap: 0,
            padding: "10px 12px",
            background: "#f7f7f7",
            borderBottom: "1px solid #e5e5e5",
            fontWeight: 900,
          }}
        >
          <div>Codice</div>
          <div>Descrizione</div>
          <div style={{ textAlign: "right" }}>Kg</div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 14, opacity: 0.7, fontWeight: 800 }}>Nessun dato.</div>
        ) : (
          filtered.map((i) => (
            <div
              key={i.id}
              style={{
                display: "grid",
                gridTemplateColumns: "110px 1fr 90px",
                padding: "10px 12px",
                borderBottom: "1px solid #f0f0f0",
                alignItems: "center",
              }}
            >
              <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>{i.code}</div>
              <div style={{ fontWeight: 800, opacity: 0.9 }}>{i.description || ""}</div>
              <div style={{ textAlign: "right", fontWeight: 900 }}>{fmtKg(i.qty_kg)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
