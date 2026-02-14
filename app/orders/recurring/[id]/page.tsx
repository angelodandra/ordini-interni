"use client";

function formatDays(days: number[] = []) {
  const map: any = { 1: "Lun", 2: "Mar", 3: "Mer", 4: "Gio", 5: "Ven", 6: "Sab", 7: "Dom" };
  return days.map((d) => map[d] ?? d).join(", ");
}

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

type RecurringItem = {
  id: number;
  unit_type: string;
  qty_units: number;
  description_override: string | null;
  products: { cod: string | null; description: string | null } | null;
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

export default function RecurringDetailPage() {
  const { id } = useParams();
  const recurringId = Number(id);

  const [items, setItems] = useState<RecurringItem[]>([]);
  const [header, setHeader] = useState<any>(null);
  const [days, setDays] = useState<number[]>([]);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const loadHeader = async () => {
    const { data, error } = await supabase
      .from("recurring_orders")
      .select("id,is_active,days_of_week,customers(name)")
      .eq("id", recurringId)
      .single();

    if (!error) {
      setHeader(data);
      setDays((data?.days_of_week ?? []) as number[]);
      setIsActive(Boolean(data?.is_active));
    }
};

  const loadItems = async () => {
    const { data, error } = await supabase
      .from("recurring_order_items")
      .select("id,unit_type,qty_units,description_override,products(cod,description)")
      .eq("recurring_order_id", recurringId)
      .order("position", { ascending: true });

    if (error) setErr(error.message);
    else setItems((data ?? []) as RecurringItem[]);
  };

  useEffect(() => {
    if (recurringId) {
      loadHeader();
      loadItems();
    }
  }, [recurringId]);

  
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [unitType, setUnitType] = useState("CS");
  const [qtyUnits, setQtyUnits] = useState("");

  useEffect(() => {
    const raw = productQuery.trim();
    if (raw.length < 2) {
      setProductResults([]);
      return;
    }

    const q = raw.toUpperCase();
    const looksLikeCode = !/\s/.test(raw) && raw.length <= 8;

    const load = async () => {
      // 1) exact COD (massima priorità)
      const { data: exact } = await supabase
        .from("products")
        .select("id,cod,description")
        .ilike("cod", q)
        .limit(10);

      // 2) COD che inizia con q
      const { data: starts } = await supabase
        .from("products")
        .select("id,cod,description")
        .ilike("cod", `${q}%`)
        .limit(20);

      // 3) descrizione contiene q (solo dopo)
      const { data: desc } = await supabase
        .from("products")
        .select("id,cod,description")
        .ilike("description", `%${raw}%`)
        .limit(20);

      const seen = new Set();
      const out = [];

      const push = (arr) => {
        for (const p of (arr ?? [])) {
          if (seen.has(p.id)) continue;
          seen.add(p.id);
          out.push(p);
          if (out.length >= 10) break;
        }
      };

      // se sembra COD, diamo ancora più peso al cod
      if (looksLikeCode) {
        push(exact);
        push(starts);
        push(desc);
      } else {
        // se è testo, comunque cod prima, ma meno “aggressivo”
        push(starts);
        push(desc);
        push(exact);
      }

      setProductResults(out);
    };

    load();
  }, [productQuery]);

  const addItem = async () => {
    if (!selectedProduct) return alert("Seleziona un prodotto");
    if (!qtyUnits) return alert("Inserisci quantità");

    await supabase.from("recurring_order_items").insert({
      recurring_order_id: recurringId,
      product_id: selectedProduct.id,
      unit_type: unitType,
      qty_units: Number(qtyUnits),
      position: items.length + 1
    });

    setSelectedProduct(null);
    setProductQuery("");
    setQtyUnits("");
    loadItems();
  };

  const toggleDay = (id: number) => {
    setDays((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  };

  const saveHeader = async () => {
    if (!recurringId) return;
    if (days.length === 0) return alert("Seleziona almeno un giorno");
    setSaving(true);
    const { error } = await supabase
      .from("recurring_orders")
      .update({ is_active: isActive, days_of_week: days })
      .eq("id", recurringId);
    setSaving(false);
    if (error) return alert(error.message);
    alert("Salvato");
    loadHeader();
  };

  const deleteRecurring = async () => {
    if (!confirm("Eliminare l'ordine ricorrente? (cancella anche le righe)")) return;
    const { error } = await supabase.from("recurring_orders").delete().eq("id", recurringId);
    if (error) return alert(error.message);
    window.location.href = "/orders/recurring";
  };

  const deleteItem = async (id: number) => {
    if (!confirm("Eliminare questa riga?")) return;
    await supabase.from("recurring_order_items").delete().eq("id", id);
    loadItems();
  };

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 20, fontWeight: 900 }}>Righe ordine ricorrente</h1>

      <div style={{ marginTop: 10, padding: 10, border: "1px solid #eee", borderRadius: 10, background: "#fff" }}>
        <div style={{ fontWeight: 900 }}>Cliente: {header?.customers?.name ?? "-"}</div>
        <div style={{ marginTop: 4, opacity: 0.8 }}>
          Giorni: {header?.days_of_week ? formatDays(header.days_of_week) : "-"} · Stato: {header?.is_active ? "Attivo" : "Disattivo"}
        </div>
      <div style={{ marginTop: 12, padding: 12, border: "1px solid #ddd", borderRadius: 12, background: "#fff" }}>
        <div style={{ fontWeight: 900, marginBottom: 8 }}>Gestione ricorrenza</div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 800 }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Attivo
          </label>

          <button
            type="button"
            onClick={saveHeader}
            disabled={saving}
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #111", background: "#111", color: "#fff", fontWeight: 900 }}
          >
            {saving ? "Salvo..." : "Salva"}
          </button>

          <button
            type="button"
            onClick={deleteRecurring}
            style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #d11", background: "#fff", color: "#d11", fontWeight: 900 }}
          >
            Elimina
          </button>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
          {DAYS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => toggleDay(d.id)}
              style={{
                padding: "6px 10px",
                borderRadius: 10,
                border: "1px solid #ccc",
                background: days.includes(d.id) ? "#111" : "#fff",
                color: days.includes(d.id) ? "#fff" : "#111",
                fontWeight: 900
              }}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
      </div>

      {err && <p style={{ color: "red" }}>{err}</p>}

      {items.length === 0 ? (
        <p style={{ marginTop: 15, opacity: 0.7 }}>Nessuna riga inserita.</p>
      ) : (
        <div style={{ marginTop: 15 }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8 }}>Prodotto</th>
                <th style={{ textAlign: "left", padding: 8 }}>Q.tà</th>
                <th style={{ padding: 8 }}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const desc =
                  i.description_override ??
                  i.products?.description ??
                  "";

                return (
                  <tr key={i.id}>
                    <td style={{ padding: 8, borderTop: "1px solid #eee" }}>
                      <div style={{ fontWeight: 900 }}>
                        {desc}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>
                        {i.products?.cod ?? ""}
                      </div>
                    </td>

                    <td style={{ padding: 8, borderTop: "1px solid #eee" }}>
                      {i.qty_units} {i.unit_type}
                    </td>

                    <td style={{ padding: 8, borderTop: "1px solid #eee" }}>
                      <button
                        onClick={() => deleteItem(i.id)}
                        style={{
                          background: "#d11",
                          color: "#fff",
                          border: "none",
                          borderRadius: 6,
                          padding: "6px 10px",
                          fontWeight: 700,
                        }}
                      >
                        X
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    
      <div style={{ marginTop: 30 }}>
        <h2 style={{ fontWeight: 900 }}>Aggiungi prodotto</h2>

        <input
          type="text"
          placeholder="Cerca codice o descrizione..."
          value={selectedProduct ? selectedProduct.description : productQuery}
          onChange={(e) => {
            setSelectedProduct(null);
            setProductQuery(e.target.value);
          }}
          style={{ width: "100%", padding: 10, marginTop: 10 }}
        />

        {productResults.length > 0 && !selectedProduct && (
          <div style={{ border: "1px solid #ddd", marginTop: 5 }}>
            {productResults.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  setSelectedProduct(p);
                  setProductResults([]);
                }}
                style={{ padding: 8, cursor: "pointer", borderBottom: "1px solid #eee" }}
              >
                <strong>{p.cod}</strong> - {p.description}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
          {["KG","CS","PZ"].map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnitType(u)}
              style={{
                padding: "6px 12px",
                background: unitType === u ? "#111" : "#fff",
                color: unitType === u ? "#fff" : "#000",
                border: "1px solid #ccc"
              }}
            >
              {u}
            </button>
          ))}
        </div>

        <input
          type="number"
          placeholder="Quantità"
          value={qtyUnits}
          onChange={(e) => setQtyUnits(e.target.value)}
          style={{ width: "100%", padding: 10, marginTop: 10 }}
        />

        <button
          onClick={addItem}
          style={{
            marginTop: 10,
            padding: "8px 14px",
            background: "#111",
            color: "#fff",
            border: "none"
          }}
        >
          Aggiungi
        </button>
      </div>

    </div>
  );
}
