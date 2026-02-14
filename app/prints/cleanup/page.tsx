"use client";

import { useEffect, useMemo, useState } from "react";

function isoToday() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

type Preview = {
  mode: "range" | "all";
  from?: string;
  to?: string;
  orders: number;
  items: number;
};

export default function CleanupPage() {
  const [from, setFrom] = useState(isoToday());
  const [to, setTo] = useState(isoToday());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [confirmText, setConfirmText] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => {
    setMsg(null);
    setPreview(null);
  }, [from, to]);

  const previewRange = async () => {
    setMsg(null);
    setPreview(null);

    if (!from || !to) return setMsg("Imposta Dal/Al.");

    setBusy(true);
    try {
      const r = await fetch("/api/admin/delete-orders-preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "range", from, to }),
      });
      let j: any = null;
      const ct = r.headers.get("content-type") || "";
      if (!ct.includes("application/json")) {
        throw new Error("API non disponibile (risposta non JSON). Riprova o riavvia dev server.");
      }
      j = await r.json();
      if (!j.ok) return setMsg(j.error || "Errore");

      setPreview({ mode: "range", from, to, orders: j.orders ?? 0, items: j.items ?? 0 });
    } catch (e: any) {
      setMsg(e?.message || "Errore");
    } finally {
      setBusy(false);
    }
  };

  const confirmRange = async () => {
    if (!preview || preview.mode !== "range") return;

    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/delete-orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "range", from: preview.from, to: preview.to }),
      });
      const j = await r.json();
      if (!j.ok) return setMsg(j.error || "Errore");

      setMsg(`OK: cancellati ordini=${j.deleted_orders} righe=${j.deleted_items}`);
      setPreview(null);
    } catch (e: any) {
      setMsg(e?.message || "Errore");
    } finally {
      setBusy(false);
    }
  };

  const previewAll = async () => {
    setMsg(null);
    setPreview(null);

    if (confirmText.trim().toUpperCase() !== "CANCELLA TUTTO") {
      setMsg('Per confermare scrivi esattamente: CANCELLA TUTTO');
      return;
    }

    setBusy(true);
    try {
      const r = await fetch("/api/admin/delete-orders-preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "all" }),
      });
      const j = await r.json();
      if (!j.ok) return setMsg(j.error || "Errore");

      setPreview({ mode: "all", orders: j.orders ?? 0, items: j.items ?? 0 });
    } catch (e: any) {
      setMsg(e?.message || "Errore");
    } finally {
      setBusy(false);
    }
  };

  const confirmAll = async () => {
    if (!preview || preview.mode !== "all") return;

    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/delete-orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "all" }),
      });
      const j = await r.json();
      if (!j.ok) return setMsg(j.error || "Errore");

      setMsg(`OK: cancellati ordini=${j.deleted_orders} righe=${j.deleted_items}`);
      setPreview(null);
      setConfirmText("");
    } catch (e: any) {
      setMsg(e?.message || "Errore");
    } finally {
      setBusy(false);
    }
  };

  const previewBox = useMemo(() => {
    if (!preview) return null;

    const title = preview.mode === "all" ? "Conferma cancellazione TUTTO" : "Conferma cancellazione periodo";
    const subtitle =
      preview.mode === "all"
        ? "Questa azione è definitiva."
        : `Periodo: ${fmt(preview.from!)} → ${fmt(preview.to!)} (azione definitiva)`;

    const onConfirm = preview.mode === "all" ? confirmAll : confirmRange;

    return (
      <div style={confirmCard}>
        <div style={{ fontSize: 16, fontWeight: 900 }}>{title}</div>
        <div style={{ marginTop: 6, opacity: 0.75 }}>{subtitle}</div>

        <div style={{ marginTop: 12, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 900 }}>
            Verranno cancellati: <span style={{ color: "crimson" }}>{preview.orders}</span> ordini e{" "}
            <span style={{ color: "crimson" }}>{preview.items}</span> righe.
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
            <button type="button" disabled={busy} onClick={() => setPreview(null)} style={btn(false)}>
              Annulla
            </button>
            <button type="button" disabled={busy} onClick={onConfirm} style={dangerBtnFill}>
              {busy ? "..." : "CONFERMA CANCELLAZIONE"}
            </button>
          </div>
        </div>
      </div>
    );
  }, [preview, busy]);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "18px 14px" }}>
      <h1 style={{ fontSize: 20, fontWeight: 900 }}>Pulizia DB</h1>
      <p style={{ marginTop: 8, opacity: 0.75 }}>
        Attenzione: questa sezione cancella definitivamente gli ordini (e le righe ordine).
      </p>

      {previewBox}

      <div style={card}>
        <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 10 }}>Cancella per periodo</h2>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Dal</div>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} style={inp} />
          </div>
          <div>
            <div style={{ fontWeight: 900, marginBottom: 6 }}>Al</div>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} style={inp} />
          </div>

          <button type="button" disabled={busy} onClick={previewRange} style={dangerBtnOutline}>
            {busy ? "..." : "Anteprima cancellazione"}
          </button>
        </div>
      </div>

      <div style={card}>
        <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 10 }}>Cancella TUTTO</h2>
        <p style={{ marginTop: 0, opacity: 0.75 }}>
          Per evitare errori, devi scrivere <b>CANCELLA TUTTO</b> prima di proseguire.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Scrivi: CANCELLA TUTTO"
            style={{ ...inp, minWidth: 240 }}
          />
          <button type="button" disabled={busy} onClick={previewAll} style={dangerBtnOutline}>
            {busy ? "..." : "Anteprima cancellazione"}
          </button>
        </div>
      </div>

      {msg ? (
        <div style={{ marginTop: 14, fontWeight: 900, color: msg.startsWith("OK") ? "green" : "crimson" }}>
          {msg}
        </div>
      ) : null}
    </div>
  );
}

function fmt(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

const card: React.CSSProperties = {
  marginTop: 16,
  border: "1px solid #e5e5e5",
  borderRadius: 14,
  padding: 14,
  background: "white",
};

const confirmCard: React.CSSProperties = {
  marginTop: 16,
  border: "2px solid crimson",
  borderRadius: 14,
  padding: 14,
  background: "#fff",
};

const inp: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #111",
  fontWeight: 900,
};

function btn(active: boolean): React.CSSProperties {
  return {
    padding: "10px 14px",
    borderRadius: 12,
    border: "1px solid #111",
    background: active ? "black" : "white",
    color: active ? "white" : "#111",
    fontWeight: 900,
    cursor: "pointer",
  };
}

const dangerBtnOutline: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "2px solid crimson",
  background: "white",
  color: "crimson",
  fontWeight: 900,
  cursor: "pointer",
};

const dangerBtnFill: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: 12,
  border: "2px solid crimson",
  background: "crimson",
  color: "white",
  fontWeight: 900,
  cursor: "pointer",
};
