import { NextResponse } from "next/server";
import { supabaseAdmin, VIDEO_BUCKET } from "../../../../lib/supabaseAdmin";

// POST /api/upload/sign  { bib, filename }
// Reserves the next video_count for a bib and returns a short-lived signed
// upload URL so the browser can upload the video file directly to Supabase
// Storage (avoids the ~4.5MB request body limit of Vercel serverless functions).
export async function POST(request) {
  const body = await request.json().catch(() => null);
  const bib = String(body?.bib || "").trim();
  const filename = String(body?.filename || "").trim();

  if (!bib || !filename) {
    return NextResponse.json({ error: "bib und filename sind erforderlich" }, { status: 400 });
  }

  const ext = (filename.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "");
  const allowedExt = ["mp4", "mov", "avi", "mkv"];
  if (!allowedExt.includes(ext)) {
    return NextResponse.json({ error: "Dateityp nicht erlaubt" }, { status: 400 });
  }

  const supabase = supabaseAdmin();

  const { data: participant, error: pErr } = await supabase
    .from("event_participants")
    .select("bib")
    .eq("bib", bib)
    .maybeSingle();

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });
  if (!participant) return NextResponse.json({ error: "Startnummer unbekannt" }, { status: 404 });

  const { data: existing, error: cErr } = await supabase
    .from("event_video")
    .select("video_count")
    .eq("bib", bib)
    .order("video_count", { ascending: false })
    .limit(1);

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
  const videoCount = (existing?.[0]?.video_count || 0) + 1;

  const path = `${bib}/${bib}-${videoCount}.${ext}`;

  const { data: signed, error: sErr } = await supabase.storage
    .from(VIDEO_BUCKET)
    .createSignedUploadUrl(path);

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  return NextResponse.json({
    bucket: VIDEO_BUCKET,
    path,
    token: signed.token,
    videoCount,
  });
}
