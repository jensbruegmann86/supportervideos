import { NextResponse } from "next/server";
import { supabaseAdmin, VIDEO_BUCKET } from "../../../../../lib/supabaseAdmin";

// PATCH /api/admin/videos/:id { action: "accept" | "delete", remark }
// Replaces the accept/delete actions in dashboard.php / dashboard2.php.
export async function PATCH(request, context) {
  const { id: idParam } = await context.params;
  const id = Number(idParam);
  const body = await request.json().catch(() => null);
  const action = body?.action;
  const remark = body?.remark ?? null;

  if (!id || !["accept", "delete"].includes(action)) {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  if (action === "accept") {
    const { error } = await supabase
      .from("event_video")
      .update({ approved: true, remark })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { data: video } = await supabase
      .from("event_video")
      .select("storage_path")
      .eq("id", id)
      .maybeSingle();

    if (video?.storage_path) {
      await supabase.storage.from(VIDEO_BUCKET).remove([video.storage_path]);
    }

    const { error } = await supabase
      .from("event_video")
      .update({ approved: true, trash: true, remark })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
