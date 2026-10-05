import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { getBibsWithoutDetection } from "../../../../../lib/missingDetections";

export const runtime = "nodejs";

// GET /api/admin/statistics/export-no-detection
// Exports bibs with an approved video that were never detected.
export async function GET() {
  const { data, error } = await getBibsWithoutDetection(supabaseAdmin());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const worksheet = XLSX.utils.json_to_sheet(
    data.map((row) => ({
      Startnummer: row.bib,
      Teilnehmer: row.name,
      Strecke: row.race,
      "Freigegebene Videos": row.videos,
    }))
  );
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Ohne Detektion");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="startnummern-ohne-detektion.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
