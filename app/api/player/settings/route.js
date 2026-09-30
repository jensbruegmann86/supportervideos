import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

// GET /api/player/settings
// Public (unauthenticated) read-only settings needed by the player pages,
// e.g. the idle-state YouTube livestream shown on test screens.
export async function GET() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "idle_youtube_video_id")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ idleYoutubeVideoId: data?.value || "" });
}
