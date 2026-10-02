import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

async function getAllVideos(supabase) {
  const pageSize = 1000;
  const videos = [];

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("event_video")
      .select("id, bib, video_count, remark, approved, trash")
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) return { data: null, error };
    videos.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }

  return { data: videos, error: null };
}

export async function GET() {
  const supabase = supabaseAdmin();
  const [{ data: playLogs, error: playError }, { data: detections, error: detectionError }, { data: videos, error: videoError }] = await Promise.all([
      supabase
        .from("video_play_log")
        .select("id, video_id, screen_id, detected_time, scheduled_time, played, played_time, discard_reason")
        .order("detected_time", { ascending: false }),
      supabase
        .from("video_detection_log")
        .select("id, bib, video_id, screen_id, detected_time, outcome")
        .order("detected_time", { ascending: false }),
      getAllVideos(supabase),
    ]);

  const error = playError || detectionError || videoError;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const videoBibs = [...new Set((videos || []).map((video) => String(video.bib).trim()))];
  const { data: participants, error: participantError } = videoBibs.length
    ? await supabase.from("event_participants").select("bib, name, surname, race").in("bib", videoBibs)
    : { data: [], error: null };

  if (participantError) return NextResponse.json({ error: participantError.message }, { status: 500 });

  const videoById = new Map((videos || []).map((video) => [video.id, video]));
  const raceByBib = new Map(
    (participants || []).map((participant) => [String(participant.bib).trim(), Number(participant.race)])
  );
  const participantByBib = new Map(
    (participants || []).map((participant) => [String(participant.bib).trim(), participant])
  );
  const playedByVideoId = new Map((playLogs || []).map((log) => [log.video_id, log]));
  const raceStats = {
    marathon: { total: 0, approved: 0, deleted: 0 },
    halfMarathon: { total: 0, approved: 0, deleted: 0 },
    unknown: { total: 0, approved: 0, deleted: 0 },
  };

  for (const video of videos || []) {
    const raceValue = raceByBib.get(String(video.bib).trim());
    const race = raceStats[raceValue === 1 ? "marathon" : raceValue === 2 ? "halfMarathon" : "unknown"];
    race.total += 1;
    if (video.trash) race.deleted += 1;
    else if (video.approved) race.approved += 1;
  }

  const uploadsByBib = new Map();
  for (const video of videos || []) {
    const bib = String(video.bib).trim();
    uploadsByBib.set(bib, (uploadsByBib.get(bib) || 0) + 1);
  }
  const participantsMoreThanTwoVideos = [...uploadsByBib.entries()]
    .filter(([, count]) => count > 2)
    .map(([bib, count]) => {
      const participant = participantByBib.get(bib);
      return {
        bib,
        count,
        name: participant ? `${participant.name} ${participant.surname}`.trim() : "",
      };
    })
    .sort((a, b) => b.count - a.count || a.bib.localeCompare(b.bib, "de-DE"));

  const summary = {
    total: (videos || []).length,
    approved: (videos || []).filter((video) => video.approved && !video.trash).length,
    deleted: (videos || []).filter((video) => video.trash).length,
    pending: (videos || []).filter((video) => !video.approved && !video.trash).length,
    participantsWithVideos: uploadsByBib.size,
    participantsMoreThanTwoVideos,
    race: raceStats,
  };

  const rows = (detections || []).map((detection) => {
    const video = videoById.get(detection.video_id);
    const playLog = playedByVideoId.get(detection.video_id);
    let status = "Nicht abgespielt";
    if (detection.outcome === "blocked") status = "Verworfen: Player belegt";
    if (playLog?.discard_reason === "stale") status = "Verworfen: Screen belegt";
    else if (playLog?.played) status = "Abgespielt";
    return {
      id: detection.id,
      bib: detection.bib,
      videoCount: video?.video_count ?? null,
      remark: video?.remark || "",
      screenId: detection.screen_id,
      detectedTime: detection.detected_time,
      scheduledTime: playLog?.scheduled_time || null,
      playedTime: playLog?.played_time || null,
      status,
    };
  });

  return NextResponse.json({ rows, summary });
}
