import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const SCREEN2_DELAY_SECONDS = Number(process.env.SCREEN2_DELAY_SECONDS || 8);

// POST /api/timing/webhook
// Body: { bib, screen_id }  (screen_id defaults to 1)
// Called by the race timing system when a runner crosses a detection mat.
// Replaces poller.php / check_bib.php / check_bib2.php.
//
// - screen_id = 1 (finish line mat): queues the runner's approved videos for
//   player 1 immediately, AND pre-schedules the same videos for player 2 with
//   a configurable delay (SCREEN2_DELAY_SECONDS) to emulate the ~30m course
//   offset when there is only a single timing mat feeding both screens.
// - screen_id = 2 (a second, real timing mat further down the course): queues
//   the videos for player 2 immediately (no artificial delay applied).
export async function POST(request) {
  const { searchParams } = new URL(request.url);
  if (!process.env.TIMING_WEBHOOK_SECRET || searchParams.get("key") !== process.env.TIMING_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const bib = String(body?.bib || "").trim();
  const screenId = Number(body?.screen_id || 1);

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
    return NextResponse.json({ queued: 0, message: "Keine freigegebenen Videos f\u00fcr diese Startnummer." });
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

    // Auto-fan-out to screen 2 with delay when detection came from screen 1
    if (screenId === 1) {
      const scheduled = new Date(now.getTime() + SCREEN2_DELAY_SECONDS * 1000);
      rows.push({
        video_id: v.id,
        screen_id: 2,
        detected_time: now.toISOString(),
        scheduled_time: scheduled.toISOString(),
      });
    }
  }

  const { error: insertError } = await supabase
    .from("video_play_log")
    .upsert(rows, { onConflict: "video_id,screen_id", ignoreDuplicates: true });

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ queued: videos.length });
}
