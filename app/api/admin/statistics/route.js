import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function GET() {
  const supabase = supabaseAdmin();
  const [
    { data: playLogs, error: playError },
    { data: detections, error: detectionError },
    { data: videos, error: videoError },
    { data: participants, error: participantError },
  ] =
    await Promise.all([
      supabase
        .from("video_play_log")
        .select("id, video_id, screen_id, detected_time, scheduled_time, played, played_time")
        .order("detected_time", { ascending: false }),
      supabase
        .from("video_detection_log")
        .select("id, bib, video_id, screen_id, detected_time, outcome")
        .order("detected_time", { ascending: false }),
      supabase.from("event_video").select("id, bib, video_count, remark, approved, trash"),
      supabase.from("event_participants").select("bib, race"),
    ]);

  const error = playError || detectionError || videoError || participantError;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const videoById = new Map((videos || []).map((video) => [video.id, video]));
  const raceByBib = new Map(
    (participants || []).map((participant) => [String(participant.bib).trim(), Number(participant.race)])
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

  const summary = {
    total: (videos || []).length,
    approved: (videos || []).filter((video) => video.approved && !video.trash).length,
    deleted: (videos || []).filter((video) => video.trash).length,
    pending: (videos || []).filter((video) => !video.approved && !video.trash).length,
    race: raceStats,
  };

  const rows = (detections || []).map((detection) => {
    const video = videoById.get(detection.video_id);
    const playLog = playedByVideoId.get(detection.video_id);
    let status = "Nicht abgespielt";
    if (detection.outcome === "blocked") status = "Verworfen: Player belegt";
    if (playLog?.played) status = "Abgespielt";
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
