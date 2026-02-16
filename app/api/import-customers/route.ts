import { NextResponse } from "next/server";
import Papa from "papaparse";
import { supabaseServer } from "@/lib/supabaseServer";

type CsvRow = {
  cod?: string;
  descrizione?: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const csvText = String(body?.csv ?? "");

    if (!csvText.trim()) {
      return NextResponse.json({ error: "CSV vuoto" }, { status: 400 });
    }

    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim().toLowerCase(),
    });

    if (parsed.errors?.length) {
      return NextResponse.json(
        { error: "Errore parsing CSV", details: parsed.errors },
        { status: 400 }
      );
    }

    const rows = (parsed.data ?? [])
      .map((r: CsvRow) => ({
        code: (r.cod ?? "").trim(),
        name: (r.descrizione ?? "").trim(),
      }))
      .filter((r: { code: string; name: string }) => r.code || r.name);

    if (rows.length === 0) {
      return NextResponse.json({ error: "Nessuna riga valida" }, { status: 400 });
    }

    const payload = rows.map((r: CsvRow) => ({
      code: r.cod || null,
      name: r.descrizione || "(senza nome)",
    }));

    const { error } = await supabaseServer
      .from("customers")
      .upsert(payload, { onConflict: "code" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      imported: payload.length,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Errore generico" },
      { status: 500 }
    );
  }
}
