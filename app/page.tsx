"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";

type Customer = {
  id: number;
  name: string;
  code: string | null;
};

export default function Home() {
  const [rows, setRows] = useState<Customer[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id,name,code")
        .order("id", { ascending: true })
        .limit(20);

      if (error) setErr(error.message);
      else setRows((data ?? []) as Customer[]);
    })();
  }, []);

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>ORDINI-INTERNI</h1>
      <p style={{ marginTop: 8, opacity: 0.75 }}>
        Test connessione Supabase → tabella customers
      </p>

      {err ? (
        <pre style={{ marginTop: 16, color: "crimson" }}>{err}</pre>
      ) : (
        <div style={{ marginTop: 16 }}>
          {rows.length === 0 ? (
            <p>Nessun cliente ancora (OK).</p>
          ) : (
            <ul>
              {rows.map((c) => (
                <li key={c.id}>
                  #{c.id} {c.name} {c.code ? `(${c.code})` : ""}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}
