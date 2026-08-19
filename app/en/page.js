"use client";
import { useState } from "react";

export default function HomePage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(e) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/participants/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      setResults(data.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container text-center py-4">
      <div className="row justify-content-center">
        <div className="col-md-10 col-lg-8">
          <div className="card text-bg-light mb-3">
            <div className="card-body">
              <form onSubmit={handleSearch}>
                <div className="row g-3">
                  <div className="col-sm-7">
                    <input
                      type="text"
                      className="form-control"
                      style={{ fontSize: "1.25rem" }}
                      placeholder="Bib number or name"
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-sm">
                    <div className="d-grid">
                      <button className="btn btn-gkm" type="submit" disabled={loading}>
                        <strong>{loading ? "Searching..." : "Search"}</strong>
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {error && <p className="text-danger">{error}</p>}

          {results && results.length === 0 && <p>No participants found.</p>}

          {results && results.length > 0 && (
            <div className="d-grid gap-2">
              {results.map((r) => (
                <a
                  key={r.bib}
                  href={`/en/upload?bib=${encodeURIComponent(r.bib)}`}
                  className="btn btn-lg btn-light border border-gkm text-start position-relative mb-2"
                >
                  <span
                    className="bi bi-check-circle-fill text-gkm position-absolute"
                    style={{ right: 16, top: "50%", transform: "translateY(-50%)" }}
                  >
                    &nbsp;
                  </span>
                  <span className="text-gkm">
                    <strong>
                      {r.name} {r.surname}
                    </strong>
                  </span>
                  <br />
                  <span className="text-gkm-sm">
                    {r.bib} | {r.race === 1 ? "Marathon" : r.race === 2 ? "Half Marathon" : ""}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
