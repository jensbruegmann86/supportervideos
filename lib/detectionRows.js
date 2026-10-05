import { fetchAll } from "./missingDetections";

export const STATUS_PLAYED = "Abgespielt";
export const STATUS_DISCARDED = "Verworfen: Screen belegt";

export async function fetchDetectionData(supabase) {
  const [playLogs, detections] = await Promise.all([
    fetchAll(() =>
      supabase
        .from("video_play_log")
        .select("id, video_id, screen_id, detected_time, scheduled_time, played, played_time, discard_reason")
        .order("detected_time", { ascending: false })
        .order("id", { ascending: false })
    ),
    fetchAll(() =>
      supabase
        .from("video_detection_log")
        .select("id, bib, video_id, screen_id, detected_time, outcome")
        .order("detected_time", { ascending: false })
        .order("id", { ascending: false })
    ),
  ]);
  return { playLogs, detections };
}

export function buildDetectionRows(detections, playLogs, videos) {
  const videoById = new Map((videos || []).map((video) => [video.id, video]));
  const playLogByVideoId = new Map((playLogs || []).map((log) => [log.video_id, log]));

  return (detections || []).map((detection) => {
    const video = videoById.get(detection.video_id);
    const playLog = playLogByVideoId.get(detection.video_id);
    let status = "Nicht abgespielt";
    if (detection.outcome === "blocked") status = STATUS_DISCARDED;
    else if (playLog?.discard_reason === "stale") status = STATUS_DISCARDED;
    else if (playLog?.discard_reason === "video_limit") status = "Übersprungen: Limit 3 Videos";
    else if (playLog?.played) status = STATUS_PLAYED;
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
}

// Time buckets covering the whole detection range, gaps filled with zeros.
export function buildTimeline(rows) {
  if (rows.length === 0) return { bucketMinutes: 5, buckets: [] };

  const times = rows.map((row) => new Date(row.detectedTime).getTime());
  const min = Math.min(...times);
  const max = Math.max(...times);
  const bucketMinutes = max - min <= 12 * 60 * 60 * 1000 ? 5 : 60;
  const bucketMs = bucketMinutes * 60 * 1000;

  const start = Math.floor(min / bucketMs) * bucketMs;
  const buckets = [];
  for (let t = start; t <= max; t += bucketMs) {
    buckets.push({ time: new Date(t).toISOString(), played: 0, discarded: 0, other: 0 });
  }

  for (const row of rows) {
    const index = Math.floor((new Date(row.detectedTime).getTime() - start) / bucketMs);
    const bucket = buckets[index];
    if (row.status === STATUS_PLAYED) bucket.played += 1;
    else if (row.status === STATUS_DISCARDED) bucket.discarded += 1;
    else bucket.other += 1;
  }

  return { bucketMinutes, buckets };
}
