import { supabaseAdmin, VIDEO_BUCKET } from "../../lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Deine Supportervideos - Generali Köln Marathon",
  robots: { index: false, follow: false },
};

// Video area inside bg_landscape_1080.png (1436x807 of 1920x1080), as percentages so it scales.
const VIDEO_WIDTH_PCT = (1436 / 1920) * 100;
const VIDEO_HEIGHT_PCT = (807 / 1080) * 100;
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
  const rawBib = Array.isArray(params?.bib) ? params.bib[0] : params?.bib;
  const bib = String(rawBib || "").trim().slice(0, 20);

  const result = bib ? await loadVideos(bib) : null;

  return (
    <div className="container py-4" style={{ maxWidth: 1000 }}>
      <h3 className="mb-1">Deine Supportervideos</h3>

      {!bib && (
        <form method="get" action="/videos" className="mt-3 d-flex gap-2" style={{ maxWidth: 420 }}>
          <input
            className="form-control"
            name="bib"
            inputMode="numeric"
            placeholder="Startnummer"
            aria-label="Startnummer"
            required
          />
          <button className="btn btn-gkm" type="submit">Anzeigen</button>
        </form>
      )}

      {bib && result?.failed && (
        <p className="mt-3 text-danger">Die Videos konnten gerade nicht geladen werden. Bitte versuche es später erneut.</p>
      )}

      {bib && result && !result.failed && (
        <>
          <p className="text-muted">
            {result.participant?.name ? `${result.participant.name} | ` : ""}Startnummer {bib}
          </p>

          {result.videos.length === 0 && (
            <p className="mt-3">Für diese Startnummer sind keine freigegebenen Supportervideos vorhanden.</p>
          )}

          {result.videos.map((video) => (
            <div key={video.id} className="mb-4">
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "16 / 9",
                  backgroundImage: "url(/backgrounds/bg_landscape_1080.png)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
                }}
              >
                <video
                  controls
                  playsInline
                  preload="metadata"
                  src={video.url}
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    width: `${VIDEO_WIDTH_PCT}%`,
                    height: `${VIDEO_HEIGHT_PCT}%`,
                    background: "#000",
                    objectFit: "contain",
                  }}
                />
              </div>
              {result.videos.length > 1 && <div className="text-muted small mt-1">Video {video.videoCount}</div>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
