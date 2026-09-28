"use client";
import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";

function formatDate(value) {
  return value ? new Date(value).toLocaleString("de-DE") : "-";
}

export default function StatisticsPage() {
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/statistics")
      .then((response) => response.json())
      .then((data) => {
        setRows(data.rows || []);
        setSummary(data.summary || null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="container p-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Auswertung / Statistik</h2>
        <AdminNav active="statistics" />
      </div>
      {!loading && summary && (
        <>
          <div className="row g-3 mb-4">
            {[
              ["Videos gesamt", summary.total, ""],
              ["Freigegeben", summary.approved, "text-success"],
              ["Gelöscht", summary.deleted, "text-danger"],
              ["Offen", summary.pending, ""],
            ].map(([label, value, valueClass]) => (
              <div className="col-sm-6 col-lg-3" key={label}>
                <div className="card h-100">
                  <div className="card-body">
                    <div className="text-muted">{label}</div>
                    <strong className={`fs-4 ${valueClass}`}>{value}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <h4>Verteilung nach Strecke</h4>
          <div className="table-responsive mb-4">
            <table className="table table-bordered align-middle">
              <thead>
                <tr><th>Strecke</th><th>Gesamt</th><th>Freigegeben</th><th>Gelöscht</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td>Marathon</td>
                  <td>{summary.race.marathon.total}</td>
                  <td>{summary.race.marathon.approved}</td>
                  <td>{summary.race.marathon.deleted}</td>
                </tr>
                <tr>
                  <td>Halbmarathon</td>
                  <td>{summary.race.halfMarathon.total}</td>
                  <td>{summary.race.halfMarathon.approved}</td>
                  <td>{summary.race.halfMarathon.deleted}</td>
                </tr>
                {summary.race.unknown.total > 0 && (
                  <tr>
                    <td>Unbekannt</td>
                    <td>{summary.race.unknown.total}</td>
                    <td>{summary.race.unknown.approved}</td>
                    <td>{summary.race.unknown.deleted}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
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
