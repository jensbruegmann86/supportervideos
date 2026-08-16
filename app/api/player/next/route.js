import { NextResponse } from "next/server";
import { supabaseAdmin, VIDEO_BUCKET } from "../../../../lib/supabaseAdmin";

// GET /api/player/next?screen_id=1
// Polled by the player page. Replaces player.php / player3-6.php.
// Hands out one runner's approved videos as a playlist and marks the screen
// as busy until the release endpoint frees it again.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const screenId = Number(searchParams.get("screen_id") || 1);
  const supabase = supabaseAdmin();

  const { data: state } = await supabase
    .from("player_state")
    .select("busy")
    .eq("screen_id", screenId)
    .maybeSingle();

  if (state?.busy) {
    return NextResponse.json({ busy: true, playlist: [] });
  }

  const nowIso = new Date().toISOString();
  const { data: nextEntry, error: qErr } = await supabase
    .from("video_play_log")
    .select("id, video_id, scheduled_time")
    .eq("screen_id", screenId)
    .eq("played", false)
    .lte("scheduled_time", nowIso)
    .order("scheduled_time", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });
  if (!nextEntry) return NextResponse.json({ busy: false, playlist: [] });

  const { data: firstVideo } = await supabase
    .from("event_video")
    .select("id, bib, approved, trash")
    .eq("id", nextEntry.video_id)
    .maybeSingle();

  if (!firstVideo || !firstVideo.approved || firstVideo.trash) {
    // stale entry (e.g. rejected after being queued) - discard and let the
    // next poll pick up the following queue item
    await supabase.from("video_play_log").update({ played: true, played_time: nowIso }).eq("id", nextEntry.id);
    return NextResponse.json({ busy: false, playlist: [] });
  }

  const { data: bibVideos } = await supabase
    .from("event_video")
    .select("id, video_count, storage_path, orientation")
    .eq("bib", firstVideo.bib)
    .eq("approved", true)
    .eq("trash", false)
    .order("video_count", { ascending: true });

  const videoIds = (bibVideos || []).map((v) => v.id);
  const { data: queueEntries } = await supabase
    .from("video_play_log")
    .select("id, video_id")
    .eq("screen_id", screenId)
    .eq("played", false)
    .lte("scheduled_time", nowIso)
    .in("video_id", videoIds);

  const queueByVideoId = new Map((queueEntries || []).map((q) => [q.video_id, q.id]));

  const playlist = [];
  for (const v of bibVideos || []) {
    const playLogId = queueByVideoId.get(v.id);
    if (!playLogId || !v.storage_path) continue;
    const { data: signed } = await supabase.storage
      .from(VIDEO_BUCKET)
      .createSignedUrl(v.storage_path, 60 * 10);
    playlist.push({
      playLogId,
      videoId: v.id,
      orientation: v.orientation === 1 ? "portrait" : "landscape",
      url: signed?.signedUrl || null,
    });
  }

  if (playlist.length === 0) {
    return NextResponse.json({ busy: false, playlist: [] });
  }

  await supabase
    .from("player_state")
    .update({ busy: true, updated_at: nowIso })
    .eq("screen_id", screenId);

  return NextResponse.json({ busy: false, bib: firstVideo.bib, playlist });
}
