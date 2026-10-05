const PAGE_SIZE = 1000;

async function fetchAll(buildQuery) {
  const rows = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await buildQuery().range(from, from + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    rows.push(...(data || []));
    if (!data || data.length < PAGE_SIZE) break;
  }
  return { data: rows, error: null };
}

// Bibs with at least one approved, non-deleted video but no detection at all.
export async function getBibsWithoutDetection(supabase) {
  const [videosResult, detectionsResult] = await Promise.all([
    fetchAll(() =>
      supabase
        .from("event_video")
        .select("id, bib")
        .eq("approved", true)
        .eq("trash", false)
        .order("id", { ascending: true })
    ),
    fetchAll(() => supabase.from("video_detection_log").select("id, bib").order("id", { ascending: true })),
  ]);

  const error = videosResult.error || detectionsResult.error;
  if (error) return { data: null, error };

  const detectedBibs = new Set(detectionsResult.data.map((row) => String(row.bib).trim()));
  const videoCountByBib = new Map();
  for (const video of videosResult.data) {
    const bib = String(video.bib).trim();
    if (detectedBibs.has(bib)) continue;
    videoCountByBib.set(bib, (videoCountByBib.get(bib) || 0) + 1);
  }

  const bibs = [...videoCountByBib.keys()];
  const participants = [];
  for (let i = 0; i < bibs.length; i += 500) {
    const { data, error: participantError } = await supabase
      .from("event_participants")
      .select("bib, name, surname, race")
      .in("bib", bibs.slice(i, i + 500));
    if (participantError) return { data: null, error: participantError };
    participants.push(...(data || []));
  }
  const participantByBib = new Map(participants.map((p) => [String(p.bib).trim(), p]));

  const result = bibs
    .map((bib) => {
      const participant = participantByBib.get(bib);
      return {
        bib,
        name: participant ? `${participant.name} ${participant.surname}`.trim() : "",
        race: participant?.race === 1 ? "Marathon" : participant?.race === 2 ? "Halbmarathon" : "",
        videos: videoCountByBib.get(bib),
      };
    })
    .sort((a, b) => a.bib.localeCompare(b.bib, "de-DE", { numeric: true }));

  return { data: result, error: null };
}
