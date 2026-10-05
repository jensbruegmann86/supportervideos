import { supabaseAdmin, VIDEO_BUCKET } from "../../lib/supabaseAdmin";
import { isValidVideoLinkCode } from "../../lib/videoLink.mjs";
import VideoSequence from "./VideoSequence";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Deine Supportervideos - Generali Köln Marathon",
  robots: { index: false, follow: false },
};

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 3;

async function loadVideos(bib) {
  const supabase = supabaseAdmin();

  const [{ data: participant }, { data: videos, error }] = await Promise.all([
    supabase.from("event_participants").select("name").eq("bib", bib).maybeSingle(),
    supabase
      .from("event_video")
      .select("id, video_count, storage_path")
      .eq("bib", bib)
      .eq("approved", true)
      .eq("trash", false)
      .not("storage_path", "is", null)
      .order("video_count", { ascending: true }),
  ]);

  if (error) return { participant, videos: [], failed: true };

  const withUrls = await Promise.all(
    videos.map(async (video) => {
      const { data: signed } = await supabase.storage
        .from(VIDEO_BUCKET)
        .createSignedUrl(video.storage_path, SIGNED_URL_TTL_SECONDS);
      return { id: video.id, videoCount: video.video_count, url: signed?.signedUrl || null };
    })
  );

  return { participant, videos: withUrls.filter((video) => video.url), failed: false };
}

export default async function VideosPage({ searchParams }) {
  const params = await searchParams;
  const first = (value) => String((Array.isArray(value) ? value[0] : value) || "").trim();
  const bib = first(params?.bib).slice(0, 20);
  const authorized = bib !== "" && isValidVideoLinkCode(bib, first(params?.code));

  const result = authorized ? await loadVideos(bib) : null;

  return (
    <div className="container py-4" style={{ maxWidth: 1000 }}>
      <h3 className="mb-1">Deine Supportervideos</h3>

      {!authorized && (
        <p className="mt-3">
          Dieser Link ist ungültig oder unvollständig. Bitte verwende den Link aus deiner E-Mail.
        </p>
      )}

      {authorized && result?.failed && (
        <p className="mt-3 text-danger">Die Videos konnten gerade nicht geladen werden. Bitte versuche es später erneut.</p>
      )}

      {authorized && result && !result.failed && (
        <>
          <p className="text-muted">
            {result.participant?.name ? `${result.participant.name} | ` : ""}Startnummer {bib}
          </p>

          {result.videos.length === 0 && (
            <p className="mt-3">Für diese Startnummer sind keine freigegebenen Supportervideos vorhanden.</p>
          )}

          {result.videos.length > 0 && <VideoSequence videos={result.videos} />}
        </>
      )}
    </div>
  );
}
