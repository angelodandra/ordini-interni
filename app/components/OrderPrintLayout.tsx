import React from "react";

export type PrintMode = "a5" | "a4" | "thermal";

type Item = {
  id: number;
  unit_type: string;
  qty_units: number;
  description_override?: string | null;
  products: { cod: string | null; description: string | null } | null;
};

export function OrderPrintLayout({
  customerName,
  workDateLabel,
  items,
  mode,
}: {
  customerName: string;
  workDateLabel: string;
  items: Item[];
  mode: PrintMode;
}) {
  const isThermal = mode === "thermal";
  const isA4 = mode === "a4";

  const pageWidth = isThermal ? 280 : isA4 ? 740 : 520;
  const fontBase = isThermal ? 11 : isA4 ? 12 : 12;
  const codeSize = isThermal ? 13 : 13;
  const descSize = isThermal ? 12 : (isA4 ? 13 : 12);

  return (
    <div
      style={{
        maxWidth: pageWidth,
        margin: "0 auto",
        padding: isThermal ? 6 : 14,
        fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
        color: "#111",
        fontSize: fontBase,
      }}
    >
      <div style={{ textAlign: "center", marginTop: 8 }}>
        <div style={{ fontWeight: 900, fontSize: isThermal ? 14 : 16 }}>
          {customerName}
        </div>
        <div style={{ marginTop: 4, fontWeight: 900 }}>{workDateLabel}</div>
      </div>

      <div
        style={{
          marginTop: 14,
          borderTop: "2px solid #111",
          borderBottom: "2px solid #111",
          padding: "8px 0",
          display: "grid",
          gridTemplateColumns: "120px 90px 1fr",
          gap: 10,
          fontWeight: 900,
        }}
      >
        <div>COD</div>
        <div style={{ textAlign: "center" }}>Q.TÀ</div>
        <div>PESO / NOTE</div>
      </div>

      <div>
        {items.map((i) => {
          const cod = i.products?.cod ?? "";
          const desc = (i.description_override ?? i.products?.description ?? "").trim();
          const qty = `${i.qty_units} ${i.unit_type}`;

          return (
            <div
              key={i.id}
              style={{
                borderBottom: "1px solid #111",
                padding: "10px 0",
                breakInside: "avoid",
                pageBreakInside: "avoid",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 90px 1fr",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <div style={{ fontWeight: 900, fontSize: codeSize }}>{cod}</div>

                <div style={{ display: "flex", justifyContent: "center" }}>
                  <div
                    style={{
                      border: "2px solid #111",
                      borderRadius: 10,
                      padding: "4px 10px",
                      fontWeight: 900,
                      minWidth: 68,
                      textAlign: "center",
                      background: "white",
                    }}
                  >
                    {qty}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      flex: 1,
                      borderBottom: "1px dashed #111",
                      height: 0,
                    }}
                  />
                </div>
              </div>

              {desc ? (
                <div
                  style={{
                    marginTop: 6,
                    fontSize: descSize,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={`${desc}${i.description_override ? " (OVR)" : ""}`}
                >
                  {desc}{i.description_override ? " (OVR)" : ""}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 10, fontWeight: 900 }}>NOTE:</div>
      <div style={{ marginTop: 6 }}>
        <div style={{ borderBottom: "1px dashed #111", height: 0, marginTop: 10 }} />
        <div style={{ borderBottom: "1px dashed #111", height: 0, marginTop: 14 }} />
        <div style={{ borderBottom: "1px dashed #111", height: 0, marginTop: 14 }} />
      </div>
    </div>
  );
}
