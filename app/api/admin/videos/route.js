import { NextResponse } from "next/server";
import { supabaseAdmin, VIDEO_BUCKET } from "../../../../lib/supabaseAdmin";

// GET /api/admin/videos?status=pending|approved
// Replaces dashboard.php / dashboard2.php / video_list.php listing.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "pending";

  const supabase = supabaseAdmin();
  let query = supabase
    .from("event_video")
    .select("*")
    .eq("trash", false)
    .order("upload_time", { ascending: status === "pending" });

  query = status === "approved" ? query.eq("approved", true) : query.eq("approved", false);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const withUrls = await Promise.all(
    data.map(async (v) => {
      if (!v.storage_path) return { ...v, video_url: null };
      const { data: signed } = await supabase.storage
        .from(VIDEO_BUCKET)
        .createSignedUrl(v.storage_path, 60 * 15);
      return { ...v, video_url: signed?.signedUrl || null };
    })
  );

  return NextResponse.json({ videos: withUrls });
}
