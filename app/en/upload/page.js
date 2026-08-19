"use client";
import { useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "../../../lib/supabaseClient";

const MAX_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || 30);
const MAX_SECONDS = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_SECONDS || 8);

export default function UploadPage() {
  const [bib, setBib] = useState("");
  const [participant, setParticipant] = useState(null);
  const [agree, setAgree] = useState(false);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const b = params.get("bib") || "";
    setBib(b);
    if (b) {
      fetch(`/api/participants/search?q=${encodeURIComponent(b)}`)
        .then((r) => r.json())
        .then((data) => {
          const found = (data.results || []).find((r) => r.bib === b);
          setParticipant(found || null);
        });
    }
  }, []);

  function readVideoMeta(file) {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve({
          duration: video.duration,
          orientation: video.videoHeight > video.videoWidth ? "portrait" : "landscape",
        });
      };
      video.onerror = () => reject(new Error("The video could not be read."));
      video.src = URL.createObjectURL(file);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setMessage("Please select a video.");
      return;
    }
    if (!agree) {
      setMessage("Please agree to the terms and conditions.");
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setMessage(`File is larger than ${MAX_MB} MB.`);
      return;
    }

    try {
      setStatus("validating");
      const meta = await readVideoMeta(file);
      if (meta.duration > MAX_SECONDS + 1) {
        setStatus("error");
        setMessage(`Video is longer than ${MAX_SECONDS} seconds (${meta.duration.toFixed(1)}s).`);
        return;
      }

      setStatus("uploading");
      const signRes = await fetch("/api/upload/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bib, filename: file.name }),
      });
      const signData = await signRes.json();
      if (!signRes.ok) throw new Error(signData.error || "The upload could not be prepared.");

      const supabase = supabaseBrowser();
      const { error: uploadError } = await supabase.storage
        .from(signData.bucket)
        .uploadToSignedUrl(signData.path, signData.token, file);
      if (uploadError) throw uploadError;

      const completeRes = await fetch("/api/upload/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bib,
          path: signData.path,
          videoCount: signData.videoCount,
          orientation: meta.orientation,
          duration: meta.duration,
        }),
      });
      const completeData = await completeRes.json();
      if (!completeRes.ok) throw new Error(completeData.error || "Saving failed.");

      setStatus("done");
      setMessage("Your video was uploaded successfully!");
    } catch (err) {
      setStatus("error");
      setMessage(err.message || "An error occurred.");
    }
  }

  return (
    <div className="container text-center py-4">
      <div className="row justify-content-center">
        <div className="col-md-10 col-lg-8">
          <p>
            <a href="/en">New search</a>
          </p>

          {participant && (
            <div className="btn btn-lg btn-light border border-gkm text-start position-relative mb-3 w-100">
              <span className="text-gkm">
                <strong>
                  {participant.name} {participant.surname}
                </strong>
              </span>
              <br />
              <span className="text-gkm-sm">
                {participant.bib} | {participant.race === 1 ? "Marathon" : participant.race === 2 ? "Half Marathon" : ""}
              </span>
            </div>
          )}

          {status === "done" ? (
            <p className="text-success">{message}</p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-3">
              <p>
                <strong>
                  Video upload (max. {MAX_SECONDS}s / {MAX_MB} MB)
                </strong>
              </p>
              <div className="row g-3 mb-2">
                <div className="col">
                  <input
                    ref={fileInputRef}
                    className="form-control"
                    type="file"
                    name="video"
                    accept="video/*"
                    style={{ fontSize: "1.25rem" }}
                    required
                  />
                </div>
              </div>
              <div className="row g-3 mb-4 mt-1 text-start">
                <div className="col d-flex align-items-start gap-2">
                  <input
                    type="checkbox"
                    id="agreement"
                    checked={agree}
                    onChange={(e) => setAgree(e.target.checked)}
                    required
                    style={{ marginTop: "0.3rem" }}
                  />
                  <label htmlFor="agreement" className="mb-0">
                    I have read and agree to the <a href="/en/terms" target="_blank">terms</a>.
                  </label>
                </div>
              </div>
              {message && <p className={status === "error" ? "text-danger" : ""}>{message}</p>}
              <div className="d-grid">
                <button className="btn btn-gkm btn-lg" type="submit" disabled={status === "uploading" || status === "validating"}>
                  {status === "uploading"
                    ? "Uploading..."
                    : status === "validating"
                    ? "Checking video..."
                    : "Upload"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
