import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

// GET /api/admin/participants/export
// Exports all active bibs with at least one uploaded video.
export async function GET() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("event_video")
    .select("bib")
    .not("storage_path", "is", null)
    .eq("trash", false)
    .order("bib", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const bibs = [...new Set((data || []).map((row) => row.bib).filter(Boolean))];
  const worksheet = XLSX.utils.json_to_sheet(bibs.map((bib) => ({ Startnummer: bib })));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Startnummern");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="startnummern-mit-video.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
