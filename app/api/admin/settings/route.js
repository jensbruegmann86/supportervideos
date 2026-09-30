import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const IDLE_YOUTUBE_KEY = "idle_youtube_video_id";

// Accepts a bare video id or a full YouTube URL (watch/live/youtu.be/embed).
function extractYoutubeId(input) {
  const trimmed = String(input || "").trim();
  const patterns = [
    /youtu\.be\/([\w-]{6,})/,
    /youtube\.com\/.*[?&]v=([\w-]{6,})/,
    /youtube\.com\/embed\/([\w-]{6,})/,
    /youtube\.com\/live\/([\w-]{6,})/,
  ];
  for (const re of patterns) {
    const match = trimmed.match(re);
    if (match) return match[1];
  }
  return trimmed;
}

// GET /api/admin/settings
export async function GET() {
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("app_settings")
    .select("key, value")
    .eq("key", IDLE_YOUTUBE_KEY)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ idleYoutubeVideoId: data?.value || "" });
}

// PATCH /api/admin/settings { idleYoutubeVideoId }
export async function PATCH(request) {
  const body = await request.json().catch(() => null);
  const idleYoutubeVideoId = extractYoutubeId(body?.idleYoutubeVideoId);

  const supabase = supabaseAdmin();
  const { error } = await supabase
    .from("app_settings")
    .upsert({ key: IDLE_YOUTUBE_KEY, value: idleYoutubeVideoId }, { onConflict: "key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ idleYoutubeVideoId });
}
