"use client";

export default function AdminNav({ active }) {
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  const links = [
    { key: "pending", label: "Offen", href: "/admin" },
    { key: "approved", label: "Freigegeben", href: "/admin/approved" },
    { key: "statistics", label: "Statistik", href: "/admin/statistics" },
  ];

  return (
    <nav className="d-flex flex-wrap gap-2 align-items-center" aria-label="Admin-Navigation">
      {links.map((link) => (
        <a
          key={link.key}
          className={`btn btn-sm ${active === link.key ? "btn-primary" : "btn-outline-primary"}`}
          href={link.href}
          aria-current={active === link.key ? "page" : undefined}
        >
          {link.label}
        </a>
      ))}
      <a className="btn btn-outline-primary btn-sm" href="/api/admin/participants/export">
        XLSX-Export
      </a>
      <button className="btn btn-outline-secondary btn-sm" onClick={logout}>
        Logout
      </button>
    </nav>
  );
}
