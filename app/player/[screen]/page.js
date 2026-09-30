"use client";
import { use, useCallback, useEffect, useRef, useState } from "react";

// Replaces player.php ... player6.php. One instance serves one physical
// screen (params.screen = "1" or "2"), polling for the next queued video and
// rendering it inside the 16:9 branded frame (backgrounds/bg_*_1080.png).
// Fixed at the LED wall's native 1920x1080 resolution - no responsive
// scaling, the browser showing this page is expected to run at that size.

// Test aliases: poll the same real screen's queue (identical webhook/data
// flow) but show a YouTube livestream instead of the idle placeholder while
// no video is queued, so the idle behaviour can be tried out without
// affecting the production screen. The video itself is configured in
// /admin/settings, not hardcoded here.
const TEST_SCREEN_ALIASES = {
  90: { realScreenId: 1 },
};

export default function PlayerPage({ params }) {
  const { screen } = use(params);
  const screenParam = Number(screen) || 1;
  const testAlias = TEST_SCREEN_ALIASES[screenParam];
  const screenId = testAlias?.realScreenId ?? screenParam;
  const [playlist, setPlaylist] = useState([]);
  const [current, setCurrent] = useState(0);
  const [waiting, setWaiting] = useState(true);
  const [participant, setParticipant] = useState(null);
  const [showingIntro, setShowingIntro] = useState(false);
  const [idleYoutubeVideoId, setIdleYoutubeVideoId] = useState("");
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const videoRef = useRef(null);
  const iframeRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    if (!testAlias) return;
    fetch("/api/player/settings", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setIdleYoutubeVideoId(data.idleYoutubeVideoId || ""))
      .catch(() => {});
  }, [testAlias]);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/player/next?screen_id=${screenId}`, { cache: "no-store" });
      const data = await res.json();
      if (data.playlist && data.playlist.length > 0) {
        setPlaylist(data.playlist);
        setCurrent(0);
        setParticipant(data.participant || null);
        setShowingIntro(true);
        setWaiting(false);
      }
    } catch {
      // ignore transient network errors, next poll will retry
    }
  }, [screenId]);

  useEffect(() => {
    pollRef.current = setInterval(() => {
      if (waiting) poll();
    }, 1000);
    return () => clearInterval(pollRef.current);
  }, [waiting, poll]);

  useEffect(() => {
    if (!showingIntro) return;
    const timer = setTimeout(() => setShowingIntro(false), 3000);
    return () => clearTimeout(timer);
  }, [showingIntro]);

  async function release(playLogId, isLast) {
    await fetch("/api/player/release", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ screen_id: screenId, play_log_id: playLogId, isLast }),
    });
  }

  function handleEnded() {
    const clip = playlist[current];
    const isLast = current >= playlist.length - 1;
    release(clip.playLogId, isLast);
    if (!isLast) {
      setCurrent((c) => c + 1);
    } else {
      setPlaylist([]);
      setCurrent(0);
      setWaiting(true);
    }
  }

  const clip = playlist[current];
  const bgFile = "bg_landscape_1080.png";
  const isIdleLive = idleYoutubeVideoId && !showingIntro && !clip;

  // Tell the already-loaded YouTube player to mute/unmute instead of
  // recreating the iframe, so a single click keeps working across idle cycles.
  useEffect(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    const command = isIdleLive && audioUnlocked ? "unMute" : "mute";
    win.postMessage(JSON.stringify({ event: "command", func: command, args: [] }), "*");
  }, [isIdleLive, audioUnlocked]);

  return (
    <div style={styles.stage}>
      <div
        style={{
          ...styles.frame,
          backgroundImage: `url(/backgrounds/${bgFile})`,
        }}
      >
        {idleYoutubeVideoId && (
          <div
            style={{
              ...styles.videoLandscape,
              opacity: isIdleLive ? 1 : 0,
              pointerEvents: isIdleLive ? "auto" : "none",
            }}
          >
            <iframe
              ref={iframeRef}
              title="idle-livestream"
              src={`https://www.youtube.com/embed/${idleYoutubeVideoId}?autoplay=1&mute=1&controls=0&enablejsapi=1&playsinline=1`}
              style={{ width: "100%", height: "100%", border: 0 }}
              allow="autoplay; encrypted-media"
            />
            {isIdleLive && !audioUnlocked && (
              <button style={styles.unmuteButton} onClick={() => setAudioUnlocked(true)}>
                🔊 Ton aktivieren
              </button>
            )}
          </div>
        )}

        {showingIntro && participant ? (
          <div style={styles.intro}>
            <p style={styles.introName}>
              {participant.name} {participant.surname}
            </p>
            <p style={styles.introBib}>{participant.bib}</p>
          </div>
        ) : clip ? (
          <video
            ref={videoRef}
            key={clip.playLogId}
            src={clip.url}
            autoPlay
            playsInline
            onEnded={handleEnded}
            style={styles.videoLandscape}
          />
        ) : !idleYoutubeVideoId ? (
          <div style={styles.idle}>
            <div style={styles.idleCard}>
              <div style={styles.idlePulse} />
              <p style={styles.idleTitle}>Bereit für dein Video!</p>
              <p style={styles.idleSubtitle}>Screen {screenId} wartet auf den nächsten Zieleinlauf...</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

const styles = {
  stage: {
    width: "1920px",
    height: "1080px",
    background: "#fff",
    overflow: "hidden",
  },
  frame: {
    position: "relative",
    width: "1920px",
    height: "1080px",
    background: "#fff",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  },
  videoLandscape: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "1436px",
    height: "807px",
    objectFit: "cover",
  },
  unmuteButton: {
    position: "absolute",
    right: "24px",
    bottom: "24px",
    padding: "16px 28px",
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "#fff",
    background: "#c8102e",
    border: "none",
    borderRadius: "12px",
    cursor: "pointer",
  },
  intro: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "1436px",
    height: "807px",
    background: "#fff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "sans-serif",
    color: "#000",
    textAlign: "center",
  },
  introName: {
    margin: 0,
    fontSize: "6rem",
    fontWeight: 700,
  },
  introBib: {
    margin: "16px 0 0",
    fontSize: "4rem",
  },
  idle: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "1436px",
    height: "807px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "sans-serif",
  },
  idleCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "24px",
    padding: "48px 64px",
    borderRadius: "24px",
    background: "rgba(0, 0, 0, 0.45)",
    color: "#fff",
    textAlign: "center",
  },
  idlePulse: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    background: "#c8102e",
    animation: "vu-pulse 1.6s ease-in-out infinite",
  },
  idleTitle: {
    margin: 0,
    fontSize: "2.4rem",
    fontWeight: 700,
  },
  idleSubtitle: {
    margin: 0,
    fontSize: "1.3rem",
    opacity: 0.85,
  },
};

