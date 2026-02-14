"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { useParams, useRouter, useSearchParams } from "next/navigation";

type Order = {
  id: number;
  order_date: string; // YYYY-MM-DD
  customers: { name: string } | null;
};

type Item = {
  id: number;
  unit_type: string;
  qty_units: number;
  products: { cod: string | null; description: string | null } | null;
};

function formatDateNice(dateStr: string) {
  const d = new Date(dateStr);
  const giorni = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];
  const dayName = giorni[d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dayName} ${dd}-${mm}`;
}

export default function PrintOrderPage() {
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id);
  const router = useRouter();
  const sp = useSearchParams();

  const mode = (sp.get("mode") ?? "a5").toLowerCase(); // a5 | a4 | thermal
  const isThermal = mode === "thermal";
  const isA4 = mode === "a4";
  const isA5 = !isThermal && !isA4;

  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    (async () => {
      const { data: o } = await supabase
        .from("orders")
        .select("id,order_date,customers(name)")
        .eq("id", orderId)
        .single();

      const { data: it } = await supabase
        .from("order_items")
        .select("id,unit_type,qty_units,description_override,products(cod,description)")
        .eq("order_id", orderId)
        .order("id", { ascending: true });

      setOrder(o as Order);
      setItems((it ?? []) as Item[]);
    })();
  }, [orderId]);

  const title = useMemo(() => {
    if (!order) return "";
    return `${order.customers?.name ?? ""} - ${formatDateNice(order.order_date)}`;
  }, [order]);

  const onPrint = () => window.print();
  const goMode = (m: "a5" | "a4" | "thermal") => router.replace(`/orders/${orderId}/print?mode=${m}`);
  const onClose = () => router.back();

  if (!order) return <div style={{ padding: 20 }}>Caricamento...</div>;

  // larghezze riga 1
  const codeMinW = isThermal ? 110 : isA4 ? 230 : 170;
  const qtyW = isThermal ? 70 : 90;
  const lineW = isThermal ? 210 : isA4 ? 320 : 230;

  // font: A4 leggermente più piccolo
  const baseFont = isThermal ? 13 : isA4 ? 12 : 13;

  return (
    <main style={{ fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        /* Default A5 */
        @page { size: A5 portrait; margin: 10mm; }

        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .sheet { max-width: none !important; margin: 0 !important; }

          /* A4 */
          .a4 @page { size: A4 portrait; margin: 12mm; }

          /* Termica */
          .thermal .sheet { width: 80mm; padding: 6mm; }
          .thermal @page { size: 80mm auto; margin: 4mm; }
        }

        .qty-box {
          display: inline-block;
          padding: 5px 10px;
          border: 2px solid #000;
          border-radius: 10px;
          font-weight: 900;
          white-space: nowrap;
          min-width: 58px;
          text-align: center;
          font-size: ${isA4 ? "12px" : "13px"};
        }

        .pen-line {
          height: 20px;
          position: relative;
          width: 100%;
        }
        .pen-line::before {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          top: 14px;
          border-bottom: 1px dashed #000;
        }

        /* ✅ Evita spezzature della scheda tra pagine */
        .card {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        .row {
          border-bottom: 1px solid #000;
          padding: 8px 0;
        }

        /* ✅ In A4 usa tutta la pagina */
        .a4 .sheet {
          width: 100%;
          max-width: 100% !important;
          margin: 0 !important;
        }
      `}</style>

      {/* Barra comandi (non stampata) */}
      <div
        className="no-print"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "white",
          borderBottom: "1px solid #ddd",
          padding: "10px 12px",
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <strong style={{ marginRight: 6 }}>{title}</strong>

        <button
          onClick={() => goMode("a5")}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #111",
            background: isA5 ? "black" : "white",
            color: isA5 ? "white" : "#111",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          A5
        </button>

        <button
          onClick={() => goMode("a4")}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #111",
            background: isA4 ? "black" : "white",
            color: isA4 ? "white" : "#111",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          A4
        </button>

        <button
          onClick={() => goMode("thermal")}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #111",
            background: isThermal ? "black" : "white",
            color: isThermal ? "white" : "#111",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Termica
        </button>

        <button
          onClick={onPrint}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #111",
            background: "white",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          🖨️ Stampa
        </button>

        <button
          onClick={onClose}
          style={{
            padding: "10px 12px",
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "white",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          Chiudi
        </button>
      </div>

      {/* Foglio */}
      <div className={isThermal ? "thermal" : isA4 ? "a4" : ""}>
        <div
          className="sheet"
          style={{
            padding: isThermal ? 14 : 20,
            maxWidth: isThermal ? 420 : isA4 ? "100%" : 900,
            margin: isA4 ? "0" : "0 auto",
            fontSize: baseFont,
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <div style={{ fontSize: isThermal ? 18 : isA4 ? 20 : 20, fontWeight: 900 }}>
              {order.customers?.name}
            </div>
            <div style={{ marginTop: 6, fontSize: isThermal ? 14 : isA4 ? 14 : 16, fontWeight: 800 }}>
              {formatDateNice(order.order_date)}
            </div>
          </div>

          {/* Header colonnare */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `${codeMinW}px ${qtyW}px 1fr`,
              gap: 10,
              fontWeight: 900,
              borderBottom: "2px solid #000",
              paddingBottom: 6,
              alignItems: "end",
            }}
          >
            <div>COD</div>
            <div style={{ textAlign: "center" }}>Q.TÀ</div>
            <div>PESO / NOTE</div>
          </div>

          {items.map((i) => (
            <div key={i.id} className="card row">
              {/* Riga 1: COD | QTY | LINEA */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `${codeMinW}px ${qtyW}px 1fr`,
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div style={{ fontWeight: 900, fontSize: isThermal ? 15 : isA4 ? 14 : 16 }}>
                  {i.products?.cod ?? ""}
                </div>

                <div style={{ textAlign: "center" }}>
                  <span className="qty-box">
                    {i.qty_units} {i.unit_type}
                  </span>
                </div>

                <div style={{ maxWidth: lineW }}>
                  <div className="pen-line" />
                </div>
              </div>

              {/* Riga 2: descrizione */}
              <div style={{ marginTop: 4, fontSize: isThermal ? 12 : isA4 ? 11 : 13, fontWeight: 400 }}>
                {(i.description_override ?? i.products?.description) ?? ""}
              </div>
            </div>
          ))}

          <div style={{ marginTop: 12, fontWeight: 900 }}>NOTE:</div>
          <div style={{ marginTop: 6, width: "100%" }}>
            <div className="pen-line" />
            <div className="pen-line" />
          </div>
        </div>
      </div>
    </main>
  );
}
