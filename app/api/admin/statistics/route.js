import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

export async function GET() {
  const supabase = supabaseAdmin();
  const [{ data: playLogs, error: playError }, { data: detections, error: detectionError }, { data: videos, error: videoError }] =
    await Promise.all([
      supabase
        .from("video_play_log")
        .select("id, video_id, screen_id, detected_time, scheduled_time, played, played_time")
        .order("detected_time", { ascending: false }),
      supabase
        .from("video_detection_log")
        .select("id, bib, video_id, screen_id, detected_time, outcome")
        .order("detected_time", { ascending: false }),
      supabase.from("event_video").select("id, bib, video_count, remark"),
    ]);

  const error = playError || detectionError || videoError;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const videoById = new Map((videos || []).map((video) => [video.id, video]));
  const playedByVideoId = new Map((playLogs || []).map((log) => [log.video_id, log]));
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

  return NextResponse.json({ rows });
}
