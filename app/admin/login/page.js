"use client";
import { useState } from "react";

export default function AdminLoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login fehlgeschlagen");
      window.location.href = "/admin";
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="d-flex align-items-center py-5 bg-body-tertiary" style={{ minHeight: "100vh" }}>
      <main className="form-signin w-100 m-auto" style={{ maxWidth: "360px" }}>
        <form onSubmit={handleSubmit}>
          <h1 className="h3 mb-3 fw-normal">Videoupload Backend</h1>
          {error && <p style={{ color: "red" }}>{error}</p>}
          <div className="form-floating mb-3">
            <input
              type="password"
              className="form-control"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label>Password</label>
          </div>
          <button className="btn btn-danger w-100 py-2" type="submit" disabled={loading}>
            Login
          </button>
        </form>
      </main>
    </div>
  );
}
