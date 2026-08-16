import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

// GET /api/participants/search?q=...
// Replaces results.php / index.php search form.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const supabase = supabaseAdmin();
  const like = `%${q}%`;

  const { data, error } = await supabase
    .from("event_participants")
    .select("bib, name, surname, race")
    .or(
      `bib.ilike.${like},name.ilike.${like},surname.ilike.${like}`
    )
    .order("surname", { ascending: true })
    .order("name", { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ results: data });
}
