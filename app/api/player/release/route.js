import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

// POST /api/player/release
// Body: { screen_id, play_log_id, isLast }
// Called by the player page after each clip finishes. Replaces
// update_played.php / release_player.php.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const screenId = Number(body?.screen_id);
  const playLogId = Number(body?.play_log_id);
  const isLast = Boolean(body?.isLast);

  if (!screenId || !playLogId) {
    return NextResponse.json({ error: "screen_id und play_log_id sind erforderlich" }, { status: 400 });
  }

  const supabase = supabaseAdmin();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("video_play_log")
    .update({ played: true, played_time: now })
    .eq("id", playLogId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (isLast) {
    const { error: stateErr } = await supabase
      .from("player_state")
      .update({ busy: false, updated_at: now })
      .eq("screen_id", screenId);
    if (stateErr) return NextResponse.json({ error: stateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
