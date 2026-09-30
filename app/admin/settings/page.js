"use client";
import { useEffect, useState } from "react";
import AdminNav from "../AdminNav";

export default function SettingsPage() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => setValue(data.idleYoutubeVideoId || ""))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setSaved(false);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idleYoutubeVideoId: value }),
    });
    const data = await res.json();
    setValue(data.idleYoutubeVideoId || "");
    setSaving(false);
    setSaved(true);
  }

  return (
    <main className="container p-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2>Einstellungen</h2>
        <AdminNav active="settings" />
      </div>

      {loading && <p>Lädt...</p>}
      {!loading && (
        <div className="card" style={{ maxWidth: "640px" }}>
          <div className="card-body">
            <label className="form-label">YouTube-Livestream (Test-Player, Leerlauf-Anzeige)</label>
            <input
              className="form-control mb-2"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setSaved(false);
              }}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <p className="text-muted">Video-URL oder Video-ID einfügen.</p>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? "Speichern..." : "Speichern"}
            </button>
            {saved && <span className="text-success ms-2">Gespeichert.</span>}
          </div>
        </div>
      )}
    </main>
  );
}
