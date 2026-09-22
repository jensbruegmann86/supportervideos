"use client";
import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";

function formatDate(value) {
  return value ? new Date(value).toLocaleString("de-DE") : "-";
}

export default function ApprovedVideosPage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/videos?status=approved")
      .then((response) => response.json())
      .then((data) => setVideos(data.videos || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="container p-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Freigegebene Videos</h2>
        <AdminNav active="approved" />
      </div>
      {loading && <p>Lädt...</p>}
      {!loading && videos.length === 0 && <p>Keine freigegebenen Videos vorhanden.</p>}
      {!loading && videos.length > 0 && (
        <div className="table-responsive">
          <table className="table table-striped align-middle">
            <thead>
              <tr>
                <th>Startnummer</th>
                <th>Video</th>
                <th>Kommentar</th>
                <th>Hochgeladen</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {videos.map((video) => (
                <tr key={video.id}>
                  <td>{video.bib}</td>
                  <td>#{video.video_count}</td>
                  <td>{video.remark || "-"}</td>
                  <td>{formatDate(video.upload_time)}</td>
                  <td>
                    {video.video_url ? (
                      <a href={video.video_url} target="_blank" rel="noreferrer">
                        Video abspielen
                      </a>
                    ) : (
                      <span className="text-danger">Nicht verfügbar</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
