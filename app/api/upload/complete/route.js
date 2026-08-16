import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const MAX_SECONDS = Number(process.env.MAX_UPLOAD_SECONDS || 8);

// POST /api/upload/complete
// { bib, path, videoCount, orientation, duration }
// Called after the browser finished the direct-to-storage upload. Persists
// the event_video row. Duration/orientation are reported by the browser
// (HTML5 video metadata) - see note in README about server-side re-validation.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const { bib, path, videoCount, orientation, duration } = body || {};

  if (!bib || !path || !videoCount) {
    return NextResponse.json({ error: "Fehlende Angaben" }, { status: 400 });
  }

  if (typeof duration === "number" && duration > MAX_SECONDS + 1) {
    return NextResponse.json(
      { error: `Video ist l\u00e4nger als ${MAX_SECONDS} Sekunden.` },
      { status: 400 }
    );
  }

  const supabase = supabaseAdmin();
  const { error } = await supabase.from("event_video").insert({
    bib,
    video_count: videoCount,
    storage_path: path,
    orientation: orientation === "portrait" ? 1 : 2,
    approved: false,
    trash: false,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
