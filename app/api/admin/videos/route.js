import { NextResponse } from "next/server";
import { supabaseAdmin, VIDEO_BUCKET } from "../../../../lib/supabaseAdmin";

// GET /api/admin/videos?status=pending|approved&limit=n
// Replaces dashboard.php / dashboard2.php / video_list.php listing.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || "pending";
  const limit = Number(searchParams.get("limit")) || null;

  const supabase = supabaseAdmin();
  let query = supabase
    .from("event_video")
    .select("*")
    .eq("trash", false)
    .order("upload_time", { ascending: status === "pending" });

  query = status === "approved" ? query.eq("approved", true) : query.eq("approved", false);
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let pendingCount = null;
  if (status === "pending") {
    const { count, error: countError } = await supabase
      .from("event_video")
      .select("id", { count: "exact", head: true })
      .eq("trash", false)
      .eq("approved", false);
    if (countError) return NextResponse.json({ error: countError.message }, { status: 500 });
    pendingCount = count ?? 0;
  }

  const withUrls = await Promise.all(
    data.map(async (v) => {
      if (!v.storage_path) return { ...v, video_url: null };
      const { data: signed } = await supabase.storage
        .from(VIDEO_BUCKET)
        .createSignedUrl(v.storage_path, 60 * 15);
      return { ...v, video_url: signed?.signedUrl || null };
    })
  );

  return NextResponse.json({ videos: withUrls, pendingCount });
}
