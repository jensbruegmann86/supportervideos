import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

// GET /api/participants/import?key=IMPORT_JOB_SECRET
// Loads the participant list (bib, first name, last name, race) from the
// timing provider's CSV export and upserts it into Supabase.
// Replaces the inline CSV import that used to run on every index.php request.
// Trigger this via a Vercel Cron Job (see vercel.json) or manually.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  const authHeader = request.headers.get("authorization");
  const viaCron = process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`;
  const viaKey = process.env.IMPORT_JOB_SECRET && key === process.env.IMPORT_JOB_SECRET;

  if (!viaCron && !viaKey) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const csvUrl = process.env.PARTICIPANTS_CSV_URL;
  if (!csvUrl) {
    return NextResponse.json({ error: "PARTICIPANTS_CSV_URL not configured" }, { status: 500 });
  }

  const res = await fetch(csvUrl, { cache: "no-store" });
  if (!res.ok) {
    return NextResponse.json({ error: "could not fetch participant CSV" }, { status: 502 });
  }
  const text = await res.text();

  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) {
    return NextResponse.json({ imported: 0 });
  }

  const header = lines[0].split(";").map((h) => h.replace(/^"|"$/g, "").trim());
  const idxBib = header.indexOf("Startnr");
  const idxName = header.indexOf("Vorname");
  const idxSurname = header.indexOf("Nachname");
  const idxRace = header.indexOf("Wettbewerb");

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";").map((c) => c.replace(/^"|"$/g, "").trim());
    const bib = cols[idxBib];
    if (!bib) continue;
    rows.push({
      bib,
      name: cols[idxName] || "",
      surname: cols[idxSurname] || "",
      race: idxRace >= 0 ? Number(cols[idxRace]) || null : null,
      updated_at: new Date().toISOString(),
    });
  }

  const supabase = supabaseAdmin();
  const batchSize = 500;
  let imported = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase
      .from("event_participants")
      .upsert(batch, { onConflict: "bib" });
    if (error) {
      return NextResponse.json({ error: error.message, imported }, { status: 500 });
    }
    imported += batch.length;
  }

  return NextResponse.json({ imported });
}
