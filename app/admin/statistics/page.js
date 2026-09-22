"use client";
import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";

function formatDate(value) {
  return value ? new Date(value).toLocaleString("de-DE") : "-";
}

export default function StatisticsPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/statistics")
      .then((response) => response.json())
      .then((data) => setRows(data.rows || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="container p-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Auswertung / Statistik</h2>
        <AdminNav active="statistics" />
      </div>
      {loading && <p>Lädt...</p>}
      {!loading && rows.length === 0 && <p>Noch keine Detektionen vorhanden.</p>}
      {!loading && rows.length > 0 && (
        <div className="table-responsive">
          <table className="table table-striped align-middle">
            <thead>
              <tr>
                <th>Startnummer</th>
                <th>Video</th>
                <th>Detektion</th>
                <th>Abgespielt</th>
                <th>Status</th>
                <th>Kommentar</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.bib}</td>
                  <td>{row.videoCount ? `#${row.videoCount}` : "-"}</td>
                  <td>{formatDate(row.detectedTime)}</td>
                  <td>{formatDate(row.playedTime)}</td>
                  <td>{row.status}</td>
                  <td>{row.remark || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
