import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Missing Supabase env vars." }, { status: 500 });
  }

  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await sb
    .from("inventory_items")
    .select("id, code, description, qty_kg, imported_at")
    .order("code", { ascending: true });

  if (error) {
    return NextResponse.json({ error: "Failed to read inventory.", details: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] });
}
