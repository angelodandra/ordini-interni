"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseBrowser";

type Customer = {
  id: number;
  code: string | null;
  name: string;
  phone: string | null;
  is_active: boolean;
};

export default function CustomerEditPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const router = useRouter();

  const [row, setRow] = useState<Customer | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    const { data, error } = await supabase
      .from("customers")
      .select("id,code,name,phone,is_active")
      .eq("id", id)
      .single();

    if (error) {
      setErr(error.message);
      return;
    }

    const c = data as Customer;
    setRow(c);
    setErr(null);
    setCode(c.code ?? "");
    setName(c.name ?? "");
    setPhone(c.phone ?? "");
  };

  const save = async () => {
    if (!name.trim()) {
      alert("Nome obbligatorio");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("customers")
      .update({
        code: code.trim() || null,
        name: name.trim(),
        phone: phone.trim() || null,
      })
      .eq("id", id);

    setSaving(false);

    if (error) alert(error.message);
    else {
      await load();
      alert("Salvato");
    }
  };

  const toggleActive = async () => {
    if (!row) return;

    const next = !row.is_active;
    const confirmMsg = next
      ? "Riattivare questo cliente?"
      : "Disattivare questo cliente? (non comparirà più nelle ricerche, ma resta nello storico)";
    if (!confirm(confirmMsg)) return;

    const { error } = await supabase
      .from("customers")
      .update({ is_active: next })
      .eq("id", id);

    if (error) alert(error.message);
    else {
      await load();
    }
  };

  if (err) {
    return (
      <main style={{ padding: 24 }}>
        <pre style={{ color: "crimson" }}>{err}</pre>
      </main>
    );
  }

  if (!row) {
    return (
      <main style={{ padding: 24 }}>
        <p>Caricamento...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif", maxWidth: 520 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>Cliente</h1>
        <button
          onClick={() => router.push("/customers")}
          style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", background: "white", cursor: "pointer" }}
        >
          ← Indietro
        </button>
      </div>

      <div style={{ marginTop: 10, opacity: 0.75 }}>
        Stato:{" "}
        <strong style={{ color: row.is_active ? "green" : "crimson" }}>
          {row.is_active ? "ATTIVO" : "DISATTIVATO"}
        </strong>
      </div>

      <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 12 }}>
        <label style={{ fontWeight: 800 }}>
          Codice
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ marginTop: 6, padding: 12, width: "100%", borderRadius: 10, border: "1px solid #ddd" }}
          />
        </label>

        <label style={{ fontWeight: 800 }}>
          Nome
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ marginTop: 6, padding: 12, width: "100%", borderRadius: 10, border: "1px solid #ddd" }}
          />
        </label>

        <label style={{ fontWeight: 800 }}>
          Telefono
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{ marginTop: 6, padding: 12, width: "100%", borderRadius: 10, border: "1px solid #ddd" }}
          />
        </label>

        <button
          onClick={save}
          disabled={saving}
          style={{
            padding: 12,
            borderRadius: 10,
            background: "black",
            color: "white",
            fontWeight: 900,
            cursor: saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "Salvataggio..." : "Salva"}
        </button>

        <button
          onClick={toggleActive}
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid #111",
            background: "white",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          {row.is_active ? "Disattiva" : "Riattiva"}
        </button>
      </div>
    </main>
  );
}
