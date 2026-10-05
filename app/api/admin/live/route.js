import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { fetchAll } from "../../../../lib/missingDetections";
import { buildDetectionRows, fetchDetectionData } from "../../../../lib/detectionRows";

// GET /api/admin/live - all detections with their playback status.
export async function GET() {
  const supabase = supabaseAdmin();
  const [{ playLogs, detections }, videos] = await Promise.all([
    fetchDetectionData(supabase),
    fetchAll(() =>
      supabase.from("event_video").select("id, video_count, remark").order("id", { ascending: true })
    ),
  ]);

  const error = playLogs.error || detections.error || videos.error;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rows: buildDetectionRows(detections.data, playLogs.data, videos.data) });
}
