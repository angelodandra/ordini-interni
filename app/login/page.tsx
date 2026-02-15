"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseBrowser";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const emailFromUsername = (u) => {
    const v = String(u || "").trim();
    if (!v) return "";
    if (v.includes("@")) return v.toLowerCase();
    return `${v.toLowerCase()}@ordini.local`;
  };

  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: emailFromUsername(username),
      password,
    });

    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    router.push("/orders");
    router.refresh();
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg)",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <form
        onSubmit={onLogin}
        style={{
          width: 320,
          background: "white",
          padding: 24,
          borderRadius: 16,
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>
          Login Ordini
        </h1>

        <input
          type="username"
          placeholder="Utente"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid #ddd",
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid #ddd",
          }}
        />

        {err && (
          <div style={{ color: "crimson", fontSize: 13 }}>
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 12,
            borderRadius: 12,
            border: "none",
            background: "var(--brand-600)",
            color: "white",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          {loading ? "Accesso..." : "Accedi"}
        </button>
      </form>
    </main>
  );
}
