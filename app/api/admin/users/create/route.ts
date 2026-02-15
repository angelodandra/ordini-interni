import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseServer } from "@/lib/supabaseServer";

function emailFromUsername(u: string) {
  const v = String(u || "").trim().toLowerCase();
  if (!v) return "";
  if (v.includes("@")) return v;
  return `${v}@ordini.local`;
}

export async function POST(req: Request) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData.user) {
    return NextResponse.json({ ok: false, error: "Non autenticato" }, { status: 401 });
  }

  const me = authData.user;

  const { data: myProfile, error: profErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", me.id)
    .maybeSingle();

  if (profErr) {
    return NextResponse.json({ ok: false, error: profErr.message }, { status: 500 });
  }

  const myRole = (myProfile?.role || "viewer").toString();
  if (myRole !== "admin") {
    return NextResponse.json({ ok: false, error: "Permesso negato" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const username = String(body?.username || "").trim();
  const password = String(body?.password || "").trim();
  const full_name = String(body?.full_name || "").trim();
  const role = String(body?.role || "").trim().toLowerCase();

  if (!username || !password || !full_name || !role) {
    return NextResponse.json({ ok: false, error: "Dati mancanti" }, { status: 400 });
  }

  if (!["admin", "master", "operator", "viewer"].includes(role)) {
    return NextResponse.json({ ok: false, error: "Ruolo non valido" }, { status: 400 });
  }

  const email = emailFromUsername(username);

  const { data: created, error: createErr } = await supabaseServer.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username },
  });

  if (createErr || !created.user) {
    return NextResponse.json({ ok: false, error: createErr?.message || "Errore creazione utente" }, { status: 400 });
  }

  const userId = created.user.id;

  const { error: upsertErr } = await supabaseServer
    .from("profiles")
    .upsert({ id: userId, role, full_name }, { onConflict: "id" });

  if (upsertErr) {
    return NextResponse.json({ ok: false, error: upsertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user_id: userId, email, role, full_name });
}
