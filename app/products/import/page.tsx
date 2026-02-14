"use client";

import { useState } from "react";

export default function ImportProductsPage() {
  const [fileName, setFileName] = useState("");
  const [csvText, setCsvText] = useState<string>("");
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const doImport = async () => {
    setMsg("");
    if (!csvText.trim()) {
      setMsg("Seleziona un file CSV.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/import-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMsg(data?.error ?? "Errore import");
      } else {
        setMsg(`OK: importate ${data.imported} righe`);
      }
    } catch (e: any) {
      setMsg(e?.message ?? "Errore rete");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Import Prodotti</h1>

      <p style={{ marginTop: 8, opacity: 0.7 }}>
        CSV con colonne: <strong>cod</strong>, <strong>descrizione</strong>
      </p>

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12, maxWidth: 520 }}>
        <input
          type="file"
          accept=".csv"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setFileName(file.name);
            const text = await file.text();
            setCsvText(text);
            setMsg("");
          }}
        />

        {fileName ? (
          <p>
            File selezionato: <strong>{fileName}</strong>
          </p>
        ) : null}

        <button
          onClick={doImport}
          disabled={loading}
          style={{
            padding: 10,
            background: "black",
            color: "white",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Import in corso..." : "Importa"}
        </button>

        {msg ? <p style={{ marginTop: 6 }}>{msg}</p> : null}
      </div>
    </main>
  );
}
