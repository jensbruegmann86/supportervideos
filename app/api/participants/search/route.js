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
  const exactBib = q.replace(/\s+/g, "");
  const { data: exactMatch, error: exactError } = await supabase
    .from("event_participants")
    .select("bib, name, surname, race")
    .eq("bib", exactBib)
    .maybeSingle();

  if (exactError) {
    return NextResponse.json({ error: exactError.message }, { status: 500 });
  }

  const terms = q.split(/\s+/).filter(Boolean);
  const matches = await Promise.all(
    terms.map(async (term) => {
      const like = `%${term}%`;
      return supabase
        .from("event_participants")
        .select("bib, name, surname, race")
        .or(`bib.ilike.${like},name.ilike.${like},surname.ilike.${like}`)
        .limit(100);
    })
  );

  const queryError = matches.find(({ error }) => error)?.error;
  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  const uniqueParticipants = new Map();
  for (const { data } of matches) {
    for (const participant of data || []) {
      uniqueParticipants.set(participant.bib, participant);
    }
  }

  const normalizedTerms = terms.map((term) => term.toLocaleLowerCase("de-DE"));
  const filtered = [...uniqueParticipants.values()].filter((participant) => {
    if (normalizedTerms.length < 2) return true;
    const name = `${participant.name} ${participant.surname}`.toLocaleLowerCase("de-DE");
    const reverseName = `${participant.surname} ${participant.name}`.toLocaleLowerCase("de-DE");
    return normalizedTerms.every((term) => name.includes(term)) || normalizedTerms.every((term) => reverseName.includes(term));
  }).sort((a, b) => `${a.surname} ${a.name}`.localeCompare(`${b.surname} ${b.name}`, "de-DE"));

  const results = exactMatch
    ? [exactMatch, ...filtered.filter((participant) => participant.bib !== exactMatch.bib)]
    : filtered;

  return NextResponse.json({ results });
}
