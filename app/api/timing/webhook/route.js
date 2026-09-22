import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";


// GET /api/timing/webhook?bib=1234&key=...&screen_id=1
// screen_id defaults to 1.
// Called by the race timing system when a runner crosses a detection mat.
// Replaces poller.php / check_bib.php / check_bib2.php.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (!process.env.TIMING_WEBHOOK_SECRET || searchParams.get("key") !== process.env.TIMING_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const bib = String(searchParams.get("bib") || "").trim();
  const screenId = Number(searchParams.get("screen_id") || 1);

  if (!bib) {
    return NextResponse.json({ error: "bib ist erforderlich" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const { data: videos, error } = await supabase
    .from("event_video")
    .select("id")
    .eq("bib", bib)
    .eq("approved", true)
    .eq("trash", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!videos || videos.length === 0) {
    await supabase.from("video_detection_log").insert({ bib, screen_id: screenId, outcome: "no_video" });
    return NextResponse.json({ queued: 0, message: "Keine freigegebenen Videos f\u00fcr diese Startnummer." });
  }

  const { data: state, error: stateError } = await supabase
    .from("player_state")
    .select("busy")
    .eq("screen_id", screenId)
    .maybeSingle();

  if (stateError) return NextResponse.json({ error: stateError.message }, { status: 500 });
  if (state?.busy) {
    const { error: logError } = await supabase.from("video_detection_log").insert(
      videos.map((v) => ({
        bib,
        video_id: v.id,
        screen_id: screenId,
        outcome: "blocked",
      }))
    );
    if (logError) return NextResponse.json({ error: logError.message }, { status: 500 });
    return NextResponse.json({ queued: 0, blocked: true, message: "Player ist belegt." });
  }

  const now = new Date();
  const rows = [];

  for (const v of videos) {
    rows.push({
      video_id: v.id,
      screen_id: screenId,
      detected_time: now.toISOString(),
      scheduled_time: now.toISOString(),
    });

    // Screen 1 is currently the only active player. Additional screens can be
    // enabled later by restoring the fan-out logic here.
  }

  const { error: insertError } = await supabase
    .from("video_play_log")
    .upsert(rows, { onConflict: "video_id,screen_id", ignoreDuplicates: true });

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  const { error: logError } = await supabase.from("video_detection_log").insert(
    videos.map((v) => ({
      bib,
      video_id: v.id,
      screen_id: screenId,
      outcome: "queued",
    }))
  );
  if (logError) return NextResponse.json({ error: logError.message }, { status: 500 });

  return NextResponse.json({ queued: videos.length, blocked: false });
}
