"use client";
import { useEffect, useState } from "react";
import AdminNav from "./AdminNav";

// Replaces dashboard.php / dashboard2.php / video_list.php.
// Loads only one open video at a time to keep the page lightweight.
export default function AdminPage() {
  const [video, setVideo] = useState(null);
  const [pendingCount, setPendingCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [remark, setRemark] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/videos?status=pending&limit=1");
    const data = await res.json();
    const next = (data.videos || [])[0] || null;
    setVideo(next);
    setPendingCount(data.pendingCount ?? null);
    setRemark(next?.remark || "");
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function act(action) {
    await fetch(`/api/admin/videos/${video.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, remark }),
    });
    load();
  }

  return (
    <div className="container p-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Video Management Dashboard</h2>
        <AdminNav active="pending" />
      </div>

      {pendingCount !== null && (
        <p className="text-muted">Noch freizugeben: <strong>{pendingCount}</strong></p>
      )}

      {loading && <p>Lädt...</p>}
      {!loading && !video && <p>Keine Videos in dieser Ansicht.</p>}

      {!loading && video && (
        <div className="card mb-3" key={video.id}>
          <div className="card-body">
            <h5 className="card-title">
              BIB: {video.bib} | Video #: {video.video_count} | Freigabe: {video.approved ? "Ja" : "Nein"}
            </h5>
            {video.video_url ? (
              <video
                controls
                src={video.video_url}
                style={{
                  maxWidth: "100%",
                  maxHeight: "70vh",
                  aspectRatio: video.orientation === 1 ? "9 / 16" : "16 / 9",
                }}
              />
            ) : (
              <p className="text-danger">Video nicht gefunden!</p>
            )}
            <div className="mb-2 mt-2">
              <label className="form-label">Bemerkung</label>
              <textarea
                className="form-control"
                rows={2}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
              />
            </div>
            <button className="btn btn-success me-2" onClick={() => act("accept")}>
              Freigeben
            </button>
            <button
              className="btn btn-danger"
              onClick={() => {
                if (confirm("Video wirklich löschen?")) act("delete");
              }}
            >
              Löschen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
