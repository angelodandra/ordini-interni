"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";

export default function NewCustomerPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSave = async () => {
    if (!name.trim()) {
      alert("Inserisci nome cliente");
      return;
    }

    const { error } = await supabase.from("customers").insert({
      code: code.trim() || null,
      name: name.trim(),
      phone: phone.trim() || null,
    });

    if (error) alert(error.message);
    else router.push("/customers");
  };

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Nuovo Cliente</h1>

      <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 12, maxWidth: 420 }}>
        <input
          placeholder="Codice cliente (opzionale)"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{ padding: 8 }}
        />
        <input
          placeholder="Nome cliente"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ padding: 8 }}
        />
        <input
          placeholder="Telefono (opzionale)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ padding: 8 }}
        />

        <button
          onClick={handleSave}
          style={{ padding: 10, background: "black", color: "white", cursor: "pointer" }}
        >
          Salva
        </button>
      </div>
    </main>
  );
}
