"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";

export default function NewProductPage() {
  const router = useRouter();
  const [cod, setCod] = useState("");
  const [description, setDescription] = useState("");
  const [stockKg, setStockKg] = useState("");

  const handleSave = async () => {
    if (!description) {
      alert("Inserisci descrizione");
      return;
    }

    const { error } = await supabase.from("products").insert({
      cod: cod || null,
      description,
      stock_kg: Number(stockKg) || 0,
    });

    if (error) {
      alert(error.message);
    } else {
      router.push("/products");
    }
  };

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Nuovo Prodotto</h1>

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12, maxWidth: 400 }}>
        <input
          placeholder="COD"
          value={cod}
          onChange={(e) => setCod(e.target.value)}
          style={{ padding: 8 }}
        />
        <input
          placeholder="Descrizione"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ padding: 8 }}
        />
        <input
          placeholder="Stock Kg"
          value={stockKg}
          onChange={(e) => setStockKg(e.target.value)}
          type="number"
          step="0.001"
          style={{ padding: 8 }}
        />

        <button
          onClick={handleSave}
          style={{
            padding: 10,
            background: "black",
            color: "white",
            cursor: "pointer",
          }}
        >
          Salva
        </button>
      </div>
    </main>
  );
}
