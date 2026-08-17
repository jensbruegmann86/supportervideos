"use client";
import { useEffect, useState } from "react";

// Replaces dashboard.php / dashboard2.php / video_list.php.
export default function AdminPage() {
  const [videos, setVideos] = useState([]);
  const [status, setStatus] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [remarks, setRemarks] = useState({});

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/admin/videos?status=${status}`);
    const data = await res.json();
    setVideos(data.videos || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function act(id, action) {
    const remark = remarks[id];
    await fetch(`/api/admin/videos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, remark }),
    });
    load();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <div className="container p-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Video Management Dashboard</h2>
        <button className="btn btn-outline-secondary btn-sm" onClick={logout}>
          Logout
        </button>
      </div>

      <div className="btn-group mb-3">
        <button
          className={`btn btn-sm ${status === "pending" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setStatus("pending")}
        >
          Offen
        </button>
        <button
          className={`btn btn-sm ${status === "approved" ? "btn-primary" : "btn-outline-primary"}`}
          onClick={() => setStatus("approved")}
        >
          Freigegeben
        </button>
      </div>

      {loading && <p>Lädt...</p>}
      {!loading && videos.length === 0 && <p>Keine Videos in dieser Ansicht.</p>}

      {videos.map((v) => (
        <div className="card mb-3" key={v.id}>
          <div className="card-body">
            <h5 className="card-title">
              BIB: {v.bib} | Video #: {v.video_count} | Freigabe: {v.approved ? "Ja" : "Nein"}
            </h5>
            {v.video_url ? (
              <video width="320" height="568" controls src={v.video_url} />
            ) : (
              <p className="text-danger">Video nicht gefunden!</p>
            )}
            <div className="mb-2 mt-2">
              <label className="form-label">Bemerkung</label>
              <textarea
                className="form-control"
                rows={2}
                defaultValue={v.remark || ""}
                onChange={(e) => setRemarks((r) => ({ ...r, [v.id]: e.target.value }))}
              />
            </div>
            {!v.approved && (
              <>
                <button className="btn btn-success me-2" onClick={() => act(v.id, "accept")}>
                  Freigeben
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    if (confirm("Video wirklich löschen?")) act(v.id, "delete");
                  }}
                >
                  Löschen
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
