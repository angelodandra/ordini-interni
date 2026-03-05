import * as XLSX from "xlsx";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function normCode(v: unknown) {
  return String(v ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function cleanText(v: unknown) {
  return String(v ?? "").trim().replace(/\s+/g, " ");
}

function parseNumber(v: unknown) {
  if (v == null) return 0;
  const s = String(v).trim().replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file field 'file'." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: "Missing Supabase env vars.", details: "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set" },
        { status: 500 }
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buf, { type: "buffer" });
    const sheetName = wb.SheetNames[0];

    if (!sheetName) {
      return NextResponse.json({ error: "No sheets found." }, { status: 400 });
    }

    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: "" });

    const itemsRaw = rows
      .map((r) => ({
        code: normCode(r["Cod."]),
        file_desc: cleanText(r["Prodotto"]),
        qty_kg: parseNumber(r["Q.tà in giacenza"]),
      }))
      .filter((x) => x.code.length > 0);

    if (itemsRaw.length === 0) {
      const keys = rows[0] ? Object.keys(rows[0]) : [];
      return NextResponse.json(
        {
          error: "Nessuna riga valida trovata.",
          details: `Controlla intestazioni: attese 'Cod.' e 'Q.tà in giacenza' (e opzionale 'Prodotto'). Trovate: ${keys.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const codes = Array.from(new Set(itemsRaw.map((x) => x.code)));

    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: products, error: prodErr } = await sb
      .from("products")
      .select("id, cod, description")
      .in("cod", codes);

    if (prodErr) {
      return NextResponse.json(
        { error: "Failed to read products.", details: prodErr.message },
        { status: 500 }
      );
    }

    const byCode = new Map<string, any>();
    for (const p of products ?? []) byCode.set(normCode(p.cod), p);

    const { error: delErr } = await sb.from("inventory_items").delete().neq("id", 0);
    if (delErr) {
      return NextResponse.json(
        { error: "Failed to clear previous inventory.", details: delErr.message },
        { status: 500 }
      );
    }

    const toInsert = itemsRaw.map((x) => {
      const p = byCode.get(x.code);
      return {
        product_id: p?.id ?? null,
        code: x.code,
        description: (p?.description ?? x.file_desc ?? null) || null,
        qty_kg: x.qty_kg,
      };
    });

    const { error: insErr } = await sb.from("inventory_items").insert(toInsert);
    if (insErr) {
      return NextResponse.json(
        { error: "Failed to insert inventory.", details: insErr.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      imported: toInsert.length,
      matchedProducts: toInsert.filter((x) => x.product_id).length,
      fallbackDescriptions: toInsert.filter((x) => !x.product_id).length,
    });
  } catch (e: any) {
    console.error("INVENTORY IMPORT FATAL", e);
    return NextResponse.json(
      { error: "INVENTORY IMPORT FATAL", details: e?.message ? String(e.message) : String(e) },
      { status: 500 }
    );
  }
}
