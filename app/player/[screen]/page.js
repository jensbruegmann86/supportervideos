"use client";
import { use, useCallback, useEffect, useRef, useState } from "react";

// Replaces player.php ... player6.php. One instance serves one physical
// screen (params.screen = "1" or "2"), polling for the next queued video and
// rendering it inside the 16:9 branded frame (backgrounds/bg_*_1080.png).
export default function PlayerPage({ params }) {
  const { screen } = use(params);
  const screenId = Number(screen) || 1;
  const [playlist, setPlaylist] = useState([]);
  const [current, setCurrent] = useState(0);
  const [waiting, setWaiting] = useState(true);
  const [scale, setScale] = useState(1);
  const videoRef = useRef(null);
  const pollRef = useRef(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/player/next?screen_id=${screenId}`, { cache: "no-store" });
      const data = await res.json();
      if (data.playlist && data.playlist.length > 0) {
        setPlaylist(data.playlist);
        setCurrent(0);
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
    // Scale the fixed 1920x1080 (16:9) stage to fit whatever screen it runs on.
    // Kept as React state (not a CSS custom property) so the transform always
    // reflects the current viewport, even before the browser resolves vars.
    function fit() {
      setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    }
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

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
  const isPortrait = clip?.orientation === "portrait";
  const bgFile = isPortrait ? "bg_portrait_1080.png" : "bg_landscape_1080.png";

  return (
    <div style={styles.stage}>
      <div
        style={{
          ...styles.frame,
          transform: `scale(${scale})`,
          backgroundImage: `url(/backgrounds/${bgFile})`,
        }}
      >
        {clip ? (
          <video
            ref={videoRef}
            key={clip.playLogId}
            src={clip.url}
            autoPlay
            playsInline
            onEnded={handleEnded}
            style={isPortrait ? styles.videoPortrait : styles.videoLandscape}
          />
        ) : (
          <div style={styles.idle}>
            <div style={styles.idleCard}>
              <div style={styles.idlePulse} />
              <p style={styles.idleTitle}>Bereit für dein Video!</p>
              <p style={styles.idleSubtitle}>Screen {screenId} wartet auf den nächsten Zieleinlauf...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  stage: {
    width: "100vw",
    height: "100vh",
    background: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  frame: {
    position: "relative",
    width: "1920px",
    height: "1080px",
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
  videoPortrait: {
    position: "absolute",
    left: "50%",
    top: 0,
    width: "610px",
    height: "1080px",
    transform: "translateX(-50%)",
    objectFit: "cover",
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

