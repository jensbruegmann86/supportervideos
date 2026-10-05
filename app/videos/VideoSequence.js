"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// Video area inside bg_landscape_1080.png (1436x807 of 1920x1080), as percentages so it scales.
const VIDEO_WIDTH_PCT = (1436 / 1920) * 100;
const VIDEO_HEIGHT_PCT = (807 / 1080) * 100;

function fullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

export default function VideoSequence({ videos }) {
  const [index, setIndex] = useState(0);
  const [nativeFull, setNativeFull] = useState(false);
  const [pseudoFull, setPseudoFull] = useState(false);
  const [portrait, setPortrait] = useState(false);
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const playNextRef = useRef(false);

  const full = nativeFull || pseudoFull;

  useEffect(() => {
    if (playNextRef.current) {
      playNextRef.current = false;
      videoRef.current?.play().catch(() => {});
    }
  }, [index]);

  useEffect(() => {
    const media = window.matchMedia("(orientation: portrait)");
    const update = () => setPortrait(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const onChange = () => {
      const active = fullscreenElement() === containerRef.current;
      setNativeFull(active);
      if (!active) screen.orientation?.unlock?.();
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  const exitFull = useCallback(() => {
    if (fullscreenElement()) (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    setPseudoFull(false);
    screen.orientation?.unlock?.();
  }, []);

  useEffect(() => {
    if (!pseudoFull) return;
    const onKey = (event) => event.key === "Escape" && exitFull();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [pseudoFull, exitFull]);

  async function enterFull() {
    const element = containerRef.current;
    const request = element.requestFullscreen || element.webkitRequestFullscreen;
    if (!request) {
      setPseudoFull(true);
      return;
    }
    try {
      await request.call(element);
      screen.orientation?.lock?.("landscape")?.catch?.(() => {});
    } catch {
      setPseudoFull(true);
    }
  }

  function handleEnded() {
    if (index < videos.length - 1) {
      playNextRef.current = true;
      setIndex(index + 1);
    } else {
      setIndex(0);
    }
  }

  function selectVideo(next) {
    playNextRef.current = true;
    setIndex(next);
  }

  const wrapperStyle = full
    ? {
        ...(pseudoFull ? { position: "fixed", inset: 0, zIndex: 1000 } : { width: "100%", height: "100%" }),
        background: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }
    : {};

  const frameStyle = {
    position: "relative",
    width: full ? "min(100vw, calc(100dvh * 16 / 9))" : "100%",
    aspectRatio: "16 / 9",
    backgroundImage: "url(/backgrounds/bg_landscape_1080.png)",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    boxShadow: full ? "none" : "0 2px 12px rgba(0,0,0,0.15)",
  };

  return (
    <div>
      <div ref={containerRef} style={wrapperStyle}>
        <div style={frameStyle}>
          <video
            ref={videoRef}
            controls
            playsInline
            preload="metadata"
            controlsList="nofullscreen"
            disablePictureInPicture
            src={videos[index].url}
            onEnded={handleEnded}
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

        {full && (
          <button
            type="button"
            onClick={exitFull}
            aria-label="Vollbild beenden"
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 1002,
              padding: "8px 14px",
              border: "none",
              borderRadius: 8,
              color: "#fff",
              background: "rgba(0,0,0,0.6)",
              fontSize: "1rem",
            }}
          >
            ✕ Schließen
          </button>
        )}

        {full && portrait && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 1001,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              padding: 24,
              textAlign: "center",
              color: "#fff",
              background: "rgba(0,0,0,0.88)",
            }}
          >
            <div style={{ fontSize: "4rem", transform: "rotate(90deg)" }}>📱</div>
            <p style={{ margin: 0, fontSize: "1.2rem" }}>
              Bitte drehe dein Smartphone nach rechts, um die Videos im Querformat zu sehen.
            </p>
          </div>
        )}
      </div>

      <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
        <button type="button" className="btn btn-gkm" onClick={enterFull}>
          Vollbild
        </button>
        {videos.length > 1 && (
          <>
            <span className="text-muted ms-2">
              Video {index + 1} von {videos.length}
            </span>
            {videos.map((video, i) => (
              <button
                key={video.id}
                type="button"
                className={`btn btn-sm ${i === index ? "btn-dark" : "btn-outline-dark"}`}
                onClick={() => selectVideo(i)}
              >
                {i + 1}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
