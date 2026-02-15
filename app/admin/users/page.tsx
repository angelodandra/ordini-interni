"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseBrowser";

type Role = "admin" | "master" | "operator" | "viewer";

export default function AdminUsersPage() {
  const [meRole, setMeRole] = useState<Role | null>(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("operator");

  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingMe(true);
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) {
        setMeRole(null);
        setLoadingMe(false);
        return;
      }

      const { data: p } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
      setMeRole((p?.role ?? null) as any);
      setLoadingMe(false);
    })();
  }, []);

  const canManage = meRole === "admin" || meRole === "master";

  const onCreate = async () => {
    setMsg(null);
    if (!canManage) return setMsg("Permesso negato.");
    if (!username.trim() || !password.trim() || !fullName.trim()) return setMsg("Compila tutti i campi.");

    setBusy(true);
    try {
      const r = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password: password.trim(),
          full_name: fullName.trim(),
          role,
        }),
      });

      const j = await r.json().catch(() => null);
      if (!j?.ok) throw new Error(j?.error || "Errore");

      setMsg(`✅ Creato: ${j.email} (${j.role})`);
      setUsername("");
      setPassword("");
      setFullName("");
      setRole("operator");
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? "Errore"}`);
    } finally {
      setBusy(false);
    }
  };
  return (
    <main style={{ padding: 16, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>Gestione utenti</h1>
        <Link href="/" style={{ marginLeft: "auto", fontWeight: 900, textDecoration: "none" }}>
          ← Ordini
        </Link>
      </div>

      <div style={{ marginTop: 6, opacity: 0.75, fontWeight: 800 }}>
        {loadingMe ? "Controllo permessi…" : canManage ? `Ruolo: ${meRole}` : "Non autorizzato"}
      </div>

      {!canManage ? null : (
        <div
          style={{
            marginTop: 14,
            border: "1px solid #ddd",
            borderRadius: 14,
            background: "white",
            padding: 12,
            maxWidth: 520,
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: 10 }}>Crea nuovo utente</div>

          <label style={{ display: "block", fontWeight: 900, marginTop: 10 }}>
            Utente
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="es. mario (diventa mario@ordini.local)"
              style={inp}
              autoComplete="off"
              inputMode="text"
            />
          </label>

          <label style={{ display: "block", fontWeight: 900, marginTop: 10 }}>
            Password
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              style={inp}
              autoComplete="new-password"
              type="password"
            />
          </label>

          <label style={{ display: "block", fontWeight: 900, marginTop: 10 }}>
            Nome completo
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="es. Mario Rossi"
              style={inp}
              autoComplete="off"
            />
          </label>

          <label style={{ display: "block", fontWeight: 900, marginTop: 10 }}>
            Ruolo
            <select value={role} onChange={(e) => setRole(e.target.value as Role)} style={{ ...inp, height: 44 }}>
              <option value="admin">admin</option>
              <option value="master">master</option>
              <option value="operator">operator</option>
              <option value="viewer">viewer</option>
            </select>
          </label>

          <button
            type="button"
            onClick={onCreate}
            disabled={busy}
            style={{
              marginTop: 14,
              padding: "10px 14px",
              borderRadius: 12,
              border: "1px solid #111",
              background: busy ? "#eee" : "#111",
              color: busy ? "#111" : "#fff",
              fontWeight: 900,
              cursor: busy ? "default" : "pointer",
              width: "100%",
            }}
          >
            {busy ? "Creo…" : "Crea utente"}
          </button>

          {msg ? <div style={{ marginTop: 10, fontWeight: 900 }}>{msg}</div> : null}

          <div style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
            Login: usa <b>Utente</b> + <b>Password</b>. Se l’utente non contiene “@”, diventa <b>utente@ordini.local</b>.
          </div>
        </div>
      )}
    </main>
  );
}

const inp: React.CSSProperties = {
  width: "100%",
  marginTop: 6,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #ddd",
  fontWeight: 900,
};
