"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { useParams, useRouter } from "next/navigation";

type Order = {
  id: number;
  customer_id: number | null;
  order_date: string;
  status: "open" | "printed" | "cancelled" | string;
};

type Product = {
  id: number;
  cod: string | null;
  description: string;
};

type OrderItem = {
  id: number;
  description_override?: string | null;
  unit_type: "KG" | "CS" | "PZ";
  qty_units: number;
  products: { cod: string | null; description: string } | null;
};

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const orderId = Number(params.id);

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  // ricerca prodotto
  const [productQuery, setProductQuery] = useState("");
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [descOverride, setDescOverride] = useState<string>("");

  function editDesc() {
    const base = (descOverride || selectedProduct?.description || "").toString();
    const v = window.prompt("Descrizione riga (solo per questo ordine)", base);
    if (v === null) return; // annulla
    setDescOverride(v.toString().trim());
  }

const [activeIndex, setActiveIndex] = useState(-1);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  // aggiunta riga
  const [unitType, setUnitType] = useState<"KG" | "CS" | "PZ">("CS");
  const [qtyUnits, setQtyUnits] = useState("");

  // modifica riga
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editUnitType, setEditUnitType] = useState<"KG" | "CS" | "PZ">("CS");
  const [editQtyUnits, setEditQtyUnits] = useState<string>("");

  useEffect(() => {
    loadOrder();
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const loadOrder = async () => {
    const { data, error } = await supabase
      .from("orders").select("id,customer_id,order_date,status,customers(name)")
      .eq("id", orderId)
      .single();

    if (error) {
      setErr(error.message);
      return;
    }
    setErr(null);
    setOrder(data as Order);
  };

  const loadItems = async () => {
    const { data, error } = await supabase
      .from("order_items")
      .select("id,unit_type,qty_units,description_override,products(cod,description)")
      .eq("order_id", orderId)
      .order("id", { ascending: true });

    if (error) setErr(error.message);
    else setItems((data ?? []) as OrderItem[]);
  };

  // --- RICERCA PRODOTTI (priorità COD) ---
  const debouncedQuery = useDebouncedValue(productQuery, 220);

  useEffect(() => {
    const raw = debouncedQuery.trim();
    if (raw.length < 2) {
      setProductResults([]);
      setActiveIndex(-1);
      return;
    }

    const q = raw.toUpperCase();
    const looksLikeCode = !/\s/.test(raw) && raw.length <= 6;

    (async () => {
      setErr(null);

      const { data: exactHits, error: e0 } = await supabase
        .from("products")
        .select("id,cod,description")
        .eq("is_active", true)
        .eq("cod", q)
        .limit(5);

      if (e0) return setErr(e0.message);

      const { data: prefixHits, error: e1 } = await supabase
        .from("products")
        .select("id,cod,description")
        .eq("is_active", true)
        .ilike("cod", `${q}%`)
        .order("cod", { ascending: true })
        .limit(15);

      if (e1) return setErr(e1.message);

      let merged: Product[] = [];
      const seen = new Set<number>();

      for (const p of (exactHits ?? []) as Product[]) {
        if (!seen.has(p.id)) {
          merged.push(p);
          seen.add(p.id);
        }
      }

      for (const p of (prefixHits ?? []) as Product[]) {
        if (!seen.has(p.id)) {
          merged.push(p);
          seen.add(p.id);
        }
      }

      if (!looksLikeCode || merged.length === 0) {
        const { data: descHits, error: e2 } = await supabase
          .from("products")
          .select("id,cod,description")
          .eq("is_active", true)
          .ilike("description", `%${raw}%`)
          .order("description", { ascending: true })
          .limit(20);

        if (e2) return setErr(e2.message);

        for (const p of (descHits ?? []) as Product[]) {
          if (!seen.has(p.id)) {
            merged.push(p);
            seen.add(p.id);
          }
          if (merged.length >= 20) break;
        }
      }

      setProductResults(merged.slice(0, 20));
      setActiveIndex(merged.length > 0 ? 0 : -1);
    })();
  }, [debouncedQuery]);

  useEffect(() => {
    if (activeIndex >= 0 && activeIndex < productResults.length) {
      itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, productResults.length]);

  const chooseProduct = (p: Product) => {
    setSelectedProduct(p);
                  setDescOverride("");
setProductQuery(`${p.cod ?? ""} - ${p.description}`);
    setProductResults([]);
    setActiveIndex(-1);
  };

  const onProductKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (productResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, productResults.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const idx = activeIndex >= 0 ? activeIndex : 0;
      const p = productResults[idx];
      if (p) chooseProduct(p);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setProductResults([]);
      setActiveIndex(-1);
      return;
    }
  };

  const isLocked = order?.status === "printed";

  const addItem = async () => {
    if (isLocked) return alert("Ordine stampato: non puoi modificare.");
    if (!selectedProduct) return alert("Seleziona un prodotto");
    if (!qtyUnits) return alert("Inserisci quantità");

    const payload = {
      order_id: orderId,
      product_id: selectedProduct.id,
      unit_type: unitType,
      qty_units: Number(qtyUnits),
      qty_kg: 0,
      description_override: (descOverride || "").trim() || null,
    };

    const { error } = await supabase.from("order_items").insert(payload);
    if (error) return alert(error.message);

    setSelectedProduct(null);
    setDescOverride("");
    setProductQuery("");
    setQtyUnits("");
    setProductResults([]);
    setActiveIndex(-1);
    await loadItems();
  };

  const startEdit = (it: OrderItem) => {
    if (isLocked) return alert("Ordine stampato: non puoi modificare.");
    setEditingId(it.id);
    setEditUnitType(it.unit_type);
    setEditQtyUnits(String(it.qty_units));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditQtyUnits("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const n = Number(editQtyUnits);
    if (!Number.isFinite(n) || n <= 0) return alert("Quantità non valida");

    const { error } = await supabase
      .from("order_items")
      .update({ unit_type: editUnitType, qty_units: n })
      .eq("id", editingId);

    if (error) return alert(error.message);

    cancelEdit();
    await loadItems();
  };

  const deleteItem = async (id: number) => {
    if (isLocked) return alert("Ordine stampato: non puoi modificare.");
    if (!confirm("Cancellare questa riga?")) return;

    const { error } = await supabase.from("order_items").delete().eq("id", id);
    if (error) return alert(error.message);

    await loadItems();
  };

  const doneMenu = () => {
    const goNew = confirm("Vuoi inserire un altro ordine?");
    if (goNew) router.push("/orders/new");
    else router.push("/orders");
  };

  const UnitButton = ({
    t,
    value,
    onChange,
  }: {
    t: "KG" | "CS" | "PZ";
    value: string;
    onChange: (v: any) => void;
  }) => (
    <button
      type="button"
      onClick={() => onChange(t)}
      style={{
        flex: 1,
        padding: 12,
        borderRadius: 10,
        border: value === t ? "2px solid black" : "1px solid #ddd",
        background: value === t ? "black" : "white",
        color: value === t ? "white" : "black",
        fontWeight: 800,
      }}
    >
      {t}
    </button>
  );

  const statusLabel = isLocked ? "STAMPATO" : "APERTO";
  const statusColor = isLocked ? "crimson" : "#111";

  if (err) {
    return (
      <main style={{ padding: 24 }}>
        <pre style={{ color: "crimson" }}>{err}</pre>
      </main>
    );
  }

  if (!order) {
    return (
      <main style={{ padding: 24 }}>
        <p>Caricamento...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "baseline" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900 }}>Ordine #{order.id}</h1>
      <div style={{ marginTop: 6, fontWeight: 900 }}>Cliente: {order?.customers?.name ?? ""}</div>
          <div style={{ marginTop: 6, opacity: 0.9 }}>
            Data: <strong>{order.order_date}</strong> · Stato:{" "}
            <strong style={{ color: statusColor }}>{statusLabel}</strong>
          </div>
          {isLocked ? (
            <div style={{ marginTop: 6, color: "crimson", fontWeight: 900 }}>
              Ordine stampato: modifiche bloccate
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            onClick={() => router.push(`/orders/${orderId}/print`)}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #111", background: "white", fontWeight: 900, cursor: "pointer" }}
          >
            🖨️ Stampa
          </button>

          <button
            onClick={doneMenu}
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid #111",
              background: "black",
              color: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Finito (menu)
          </button>
        </div>
      </div>

      <section style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 900 }}>Aggiungi prodotto</h2>

        <div style={{ marginTop: 10, maxWidth: 520, position: "relative", opacity: isLocked ? 0.6 : 1 }}>
          <input
            value={productQuery}
            onChange={(e) => {
              setProductQuery(e.target.value);
              setSelectedProduct(null);
            }}
            onKeyDown={onProductKeyDown}
            placeholder="Scrivi COD (priorità) o descrizione..."
            style={{ padding: 12, width: "100%", borderRadius: 10, border: "1px solid #ddd" }}
            inputMode="search"
            autoComplete="off"
            disabled={isLocked}
          />

          {productResults.length > 0 && !isLocked && (
            <div
              style={{
                position: "absolute",
                zIndex: 10,
                left: 0,
                right: 0,
                top: "50px",
                border: "1px solid #ddd",
                borderRadius: 10,
                background: "white",
                overflow: "hidden",
                maxHeight: 260,
                overflowY: "auto",
              }}
            >
              {productResults.map((p, idx) => (
                <button
                  key={p.id}
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onClick={() => chooseProduct(p)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    padding: "12px 12px",
                    border: "none",
                    cursor: "pointer",
                    background: idx === activeIndex ? "#111" : "white",
                    color: idx === activeIndex ? "white" : "#111",
                  }}
                >
                  <div style={{ fontWeight: 900 }}>{p.cod ?? ""}</div>
                  <div style={{ fontSize: 12, opacity: idx === activeIndex ? 0.9 : 0.7 }}>
                    {p.description}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
            <UnitButton t="KG" value={unitType} onChange={setUnitType} />
            <UnitButton t="CS" value={unitType} onChange={setUnitType} />
            <UnitButton t="PZ" value={unitType} onChange={setUnitType} />
          </div>

          <input
            type="number"
            placeholder="Quantità"
            value={qtyUnits}
            onChange={(e) => setQtyUnits(e.target.value)}
            style={{ marginTop: 10, padding: 12, width: "100%", borderRadius: 10, border: "1px solid #ddd" }}
            disabled={isLocked}
          />

          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={editDesc}
          style={{
            padding: "12px 14px",
            borderRadius: 12,
            border: "1px solid #111",
            background: "white",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          ✎ Modifica descrizione (opzionale)
        </button>
<div style={{ marginTop: 6, fontWeight: 900, opacity: 0.85 }}>Override corrente: {descOverride || "(vuoto)"}</div>
      </div>
      <button
            onClick={addItem}
            disabled={isLocked}
            style={{
              marginTop: 10,
              padding: 12,
              background: isLocked ? "#f2f2f2" : "black",
              color: isLocked ? "#666" : "white",
              width: "100%",
              borderRadius: 10,
              fontWeight: 900,
              cursor: isLocked ? "not-allowed" : "pointer",
            }}
          >
            Aggiungi
          </button>
        </div>
      </section>

      <section style={{ marginTop: 30 }}>
        <h2 style={{ fontSize: 16, fontWeight: 900 }}>Righe ordine</h2>

        {items.length === 0 ? (
          <p style={{ marginTop: 10, opacity: 0.7 }}>Nessuna riga inserita.</p>
        ) : (
          <div style={{ marginTop: 12, overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", minWidth: 820 }}>
              <thead>
                <tr>
                  {["Prodotto", "Q.tà", "Azioni"].map((h) => (
                    <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ddd", padding: "10px 8px", fontWeight: 900, whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const isEditing = editingId === it.id;

                  return (
                    <tr key={it.id}>
                      <td style={{ borderBottom: "1px solid #f0f0f0", padding: "10px 8px" }}>
                        <div style={{ fontWeight: 900 }}>{it.description_override ?? it.products?.description ?? ""}{it.description_override ? " ✎" : ""}</div>
                        <div style={{ fontSize: 12, opacity: 0.7 }}>{it.products?.cod ?? ""}</div>
                      </td>

                      <td style={{ borderBottom: "1px solid #f0f0f0", padding: "10px 8px", whiteSpace: "nowrap" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                            <div style={{ display: "flex", gap: 8, minWidth: 220 }}>
                              <UnitButton t="KG" value={editUnitType} onChange={setEditUnitType} />
                              <UnitButton t="CS" value={editUnitType} onChange={setEditUnitType} />
                              <UnitButton t="PZ" value={editUnitType} onChange={setEditUnitType} />
                            </div>
                            <input
                              type="number"
                              value={editQtyUnits}
                              onChange={(e) => setEditQtyUnits(e.target.value)}
                              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", width: 120 }}
                              disabled={isLocked}
                            />
                          </div>
                        ) : (
                          <strong>{it.qty_units} {it.unit_type}</strong>
                        )}
                      </td>

                      <td style={{ borderBottom: "1px solid #f0f0f0", padding: "10px 8px", whiteSpace: "nowrap" }}>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              onClick={saveEdit}
                              disabled={isLocked}
                              style={{ padding: "10px 12px", borderRadius: 10, background: isLocked ? "#f2f2f2" : "black", color: isLocked ? "#666" : "white", fontWeight: 900, border: "1px solid #111", cursor: isLocked ? "not-allowed" : "pointer" }}
                            >
                              Salva
                            </button>
                            <button
                              onClick={cancelEdit}
                              style={{ padding: "10px 12px", borderRadius: 10, background: "white", color: "#111", fontWeight: 900, border: "1px solid #111", cursor: "pointer" }}
                            >
                              Annulla
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            <button
                              onClick={() => startEdit(it)}
                              disabled={isLocked}
                              style={{ padding: "10px 12px", borderRadius: 10, background: "white", color: "#111", fontWeight: 900, border: "1px solid #111", cursor: isLocked ? "not-allowed" : "pointer", opacity: isLocked ? 0.6 : 1 }}
                            >
                              Modifica
                            </button>
                            <button
                              onClick={() => deleteItem(it.id)}
                              disabled={isLocked}
                              style={{ padding: "10px 12px", borderRadius: 10, background: "white", color: "crimson", fontWeight: 900, border: "1px solid crimson", cursor: isLocked ? "not-allowed" : "pointer", opacity: isLocked ? 0.6 : 1 }}
                            >
                              Cancella
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
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
