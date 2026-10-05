"use client";
import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";

function formatDate(value) {
  return value ? new Date(value).toLocaleString("de-DE") : "-";
}

const CHART_HEIGHT = 200;
const SERIES = [
  { key: "played", label: "Abgespielt", color: "#198754" },
  { key: "discarded", label: "Verworfen: Screen belegt", color: "#dc3545" },
  { key: "other", label: "Sonstige", color: "#adb5bd" },
];

function DetectionChart({ timeline }) {
  const { buckets, bucketMinutes } = timeline;
  if (!buckets || buckets.length === 0) return <p>Noch keine Detektionen vorhanden.</p>;

  const maxTotal = Math.max(...buckets.map((b) => b.played + b.discarded + b.other), 1);
  const showDate = bucketMinutes >= 60;

  return (
    <>
      <div className="d-flex flex-wrap gap-3 mb-2">
        {SERIES.map((series) => (
          <span key={series.key} className="small">
            <span
              style={{ display: "inline-block", width: 12, height: 12, background: series.color, marginRight: 6 }}
            />
            {series.label}
          </span>
        ))}
        <span className="small text-muted">Intervall: {bucketMinutes} Min.</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <div
          className="d-flex align-items-end"
          style={{ height: CHART_HEIGHT, minWidth: buckets.length * 14, borderBottom: "1px solid #dee2e6" }}
        >
          {buckets.map((bucket) => {
            const total = bucket.played + bucket.discarded + bucket.other;
            const start = new Date(bucket.time).toLocaleString("de-DE", {
              ...(showDate ? { day: "2-digit", month: "2-digit" } : {}),
              hour: "2-digit",
              minute: "2-digit",
            });
            return (
              <div
                key={bucket.time}
                title={`${start}: ${total} Detektionen (${bucket.played} abgespielt, ${bucket.discarded} verworfen, ${bucket.other} sonstige)`}
                style={{ flex: "1 0 12px", margin: "0 1px", display: "flex", flexDirection: "column-reverse" }}
              >
                {SERIES.map((series) =>
                  bucket[series.key] > 0 ? (
                    <div
                      key={series.key}
                      style={{
                        height: (bucket[series.key] / maxTotal) * (CHART_HEIGHT - 4),
                        background: series.color,
                      }}
                    />
                  ) : null
                )}
              </div>
            );
          })}
        </div>
        <div className="d-flex justify-content-between small text-muted mt-1" style={{ minWidth: buckets.length * 14 }}>
          <span>{formatDate(buckets[0].time)}</span>
          <span>max. {maxTotal} pro Intervall</span>
          <span>{formatDate(buckets[buckets.length - 1].time)}</span>
        </div>
      </div>
    </>
  );
}

export default function StatisticsPage() {
  const [summary, setSummary] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [bibsWithoutDetection, setBibsWithoutDetection] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/statistics")
      .then((response) => response.json())
      .then((data) => {
        setSummary(data.summary || null);
        setTimeline(data.timeline || null);
        setBibsWithoutDetection(data.bibsWithoutDetection || []);
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
              ["Teilnehmer mit Uploads", summary.participantsWithVideos, ""],
              ["Teilnehmer mit freigegebenen Videos", summary.participantsWithApprovedVideos, "text-success"],
              ["Teilnehmer mit mehr als 2 Videos", summary.participantsMoreThanTwoVideos.length, ""],
              ["Abgespielte Videos", summary.playedVideos, "text-success"],
              ["Verworfen (Screen belegt)", summary.discardedVideos, "text-danger"],
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
          <h4>Detektionen im Zeitverlauf</h4>
          <div className="mb-4">
            {timeline && <DetectionChart timeline={timeline} />}
          </div>
          {summary.participantsMoreThanTwoVideos.length > 0 && (
            <>
              <h4>Teilnehmer mit mehr als 2 Videos</h4>
              <div className="table-responsive mb-4">
                <table className="table table-bordered table-striped align-middle">
                  <thead>
                    <tr><th>Startnummer</th><th>Teilnehmer</th><th>Videos hochgeladen</th></tr>
                  </thead>
                  <tbody>
                    {summary.participantsMoreThanTwoVideos.map((participant) => (
                      <tr key={participant.bib}>
                        <td>{participant.bib}</td>
                        <td>{participant.name || "-"}</td>
                        <td>{participant.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
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
      {!loading && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h4 className="mb-0">Startnummern ohne Detektion ({bibsWithoutDetection.length})</h4>
            {bibsWithoutDetection.length > 0 && (
              <a className="btn btn-outline-primary btn-sm" href="/api/admin/statistics/export-no-detection">
                XLSX-Export
              </a>
            )}
          </div>
          {bibsWithoutDetection.length === 0 ? (
            <p>Alle Startnummern mit freigegebenem Video wurden detektiert.</p>
          ) : (
            <div className="table-responsive mb-4" style={{ maxHeight: "400px", overflowY: "auto" }}>
              <table className="table table-bordered table-striped align-middle">
                <thead>
                  <tr><th>Startnummer</th><th>Teilnehmer</th><th>Strecke</th><th>Freigegebene Videos</th></tr>
                </thead>
                <tbody>
                  {bibsWithoutDetection.map((row) => (
                    <tr key={row.bib}>
                      <td>{row.bib}</td>
                      <td>{row.name || "-"}</td>
                      <td>{row.race || "-"}</td>
                      <td>{row.videos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
      {loading && <p>Lädt...</p>}
    </main>
  );
}
