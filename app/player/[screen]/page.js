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
    function fit() {
      const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
      document.documentElement.style.setProperty("--scale", String(scale));
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
      <div style={{ ...styles.frame, backgroundImage: `url(/backgrounds/${bgFile})` }}>
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
          <div style={styles.idle}>Warte auf n\u00e4chstes Video (Screen {screenId})...</div>
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
    transform: "scale(var(--scale, 1))",
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
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#fff",
    fontSize: "2rem",
    fontFamily: "sans-serif",
  },
};
