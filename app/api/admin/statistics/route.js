import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { fetchAll, getBibsWithoutDetection } from "../../../../lib/missingDetections";
import {
  buildDetectionRows,
  buildTimeline,
  fetchDetectionData,
  STATUS_DISCARDED,
  STATUS_PLAYED,
} from "../../../../lib/detectionRows";

export async function GET() {
  const supabase = supabaseAdmin();
  const [{ playLogs: playLogResult, detections: detectionResult }, { data: videos, error: videoError }] = await Promise.all([
    fetchDetectionData(supabase),
    fetchAll(() =>
      supabase
        .from("event_video")
        .select("id, bib, video_count, remark, approved, trash")
        .order("id", { ascending: true })
    ),
  ]);
  const { data: playLogs, error: playError } = playLogResult;
  const { data: detections, error: detectionError } = detectionResult;

  const error = playError || detectionError || videoError;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const videoBibs = [...new Set((videos || []).map((video) => String(video.bib).trim()))];
  const participantResults = await Promise.all(
    Array.from({ length: Math.ceil(videoBibs.length / 500) }, (_, index) =>
      supabase
        .from("event_participants")
        .select("bib, name, surname, race")
        .in("bib", videoBibs.slice(index * 500, (index + 1) * 500))
    )
  );
  const participantError = participantResults.find(({ error: queryError }) => queryError)?.error;
  if (participantError) return NextResponse.json({ error: participantError.message }, { status: 500 });
  const participants = participantResults.flatMap(({ data }) => data || []);

  const raceByBib = new Map(
    (participants || []).map((participant) => [String(participant.bib).trim(), Number(participant.race)])
  );
  const participantByBib = new Map(
    (participants || []).map((participant) => [String(participant.bib).trim(), participant])
  );
  const raceStats = {
    marathon: { total: 0, approved: 0, deleted: 0 },
    halfMarathon: { total: 0, approved: 0, deleted: 0 },
    unknown: { total: 0, approved: 0, deleted: 0 },
  };

  for (const video of videos || []) {
    const raceValue = raceByBib.get(String(video.bib).trim());
    const race = raceStats[raceValue === 1 ? "marathon" : raceValue === 2 ? "halfMarathon" : "unknown"];
    race.total += 1;
    if (video.trash) race.deleted += 1;
    else if (video.approved) race.approved += 1;
  }

  const uploadsByBib = new Map();
  const approvedUploadBibs = new Set();
  for (const video of videos || []) {
    const bib = String(video.bib).trim();
    uploadsByBib.set(bib, (uploadsByBib.get(bib) || 0) + 1);
    if (video.approved && !video.trash) approvedUploadBibs.add(bib);
  }
  const participantsMoreThanTwoVideos = [...uploadsByBib.entries()]
    .filter(([, count]) => count > 2)
    .map(([bib, count]) => {
      const participant = participantByBib.get(bib);
      return {
        bib,
        count,
        name: participant ? `${participant.name} ${participant.surname}`.trim() : "",
      };
    })
    .sort((a, b) => b.count - a.count || a.bib.localeCompare(b.bib, "de-DE"));

  const rows = buildDetectionRows(detections, playLogs, videos);

  const summary = {
    total: (videos || []).length,
    approved: (videos || []).filter((video) => video.approved && !video.trash).length,
    deleted: (videos || []).filter((video) => video.trash).length,
    pending: (videos || []).filter((video) => !video.approved && !video.trash).length,
    participantsWithVideos: uploadsByBib.size,
    participantsWithApprovedVideos: approvedUploadBibs.size,
    participantsMoreThanTwoVideos,
    playedVideos: rows.filter((row) => row.status === STATUS_PLAYED).length,
    discardedVideos: rows.filter((row) => row.status === STATUS_DISCARDED).length,
    participantsPlayed: new Set(
      rows.filter((row) => row.status === STATUS_PLAYED).map((row) => String(row.bib).trim())
    ).size,
    participantsDiscarded: new Set(
      rows.filter((row) => row.status === STATUS_DISCARDED).map((row) => String(row.bib).trim())
    ).size,
    race: raceStats,
  };

  const { data: bibsWithoutDetection, error: missingError } = await getBibsWithoutDetection(supabase);
  if (missingError) return NextResponse.json({ error: missingError.message }, { status: 500 });

  return NextResponse.json({ summary, bibsWithoutDetection, timeline: buildTimeline(rows) });
}
