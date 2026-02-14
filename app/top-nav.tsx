"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function TopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const NavLink = ({ href, label }: { href: string; label: string }) => {
    const active = isActive(pathname, href);
    return (
      <Link
        href={href}
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          textDecoration: "none",
          fontWeight: 900,
          color: active ? "black" : "white",
          background: active ? "white" : "transparent",
          border: "1px solid rgba(255,255,255,0.25)",
          display: "inline-block",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </Link>
    );
  };

  const AdminLink = ({ href, label }: { href: string; label: string }) => {
    const active = isActive(pathname, href);
    return (
      <Link
        href={href}
        style={{
          padding: "12px 14px",
          textDecoration: "none",
          fontWeight: 900,
          color: active ? "black" : "#111",
          background: active ? "#fff" : "#f5f5f5",
          borderRadius: 12,
          border: "1px solid #ddd",
          display: "block",
        }}
      >
        {label}
      </Link>
    );
  };

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "black",
        borderBottom: "1px solid rgba(255,255,255,0.15)",
      }}
    >
      <style>{`
        .brand-text { display: none; }
        @media (min-width: 700px) { .brand-text { display: inline; } }
      `}</style>

      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <Link
          href="/orders"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            color: "white",
            textDecoration: "none",
            fontWeight: 900,
            letterSpacing: 0.2,
            marginRight: 6,
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              background: "white",
              display: "grid",
              placeItems: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.35)",
              border: "1px solid rgba(0,0,0,0.08)",
              overflow: "hidden",
              flex: "0 0 auto",
            }}
          >
            <Image
              src="/logo.jpg"
              alt="Logo"
              width={40}
              height={40}
              style={{ objectFit: "contain" }}
              priority
            />
          </span>

          <span className="brand-text" style={{ fontWeight: 900 }}>
            ORDINI INTERNI
          </span>
        </Link>

        <nav style={{ display: "flex", gap: 8, alignItems: "center", flex: 1 }}>
          <NavLink href="/orders" label="Ordini" />
          <NavLink href="/prints" label="Stampe" />
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Apri menu"
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.25)",
            background: "transparent",
            color: "white",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          ☰
        </button>
      </div>

      {open ? (
        <div style={{ background: "white", borderTop: "1px solid #eee" }}>
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              padding: 14,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ fontWeight: 900, opacity: 0.7 }}>ADMIN</div>
            <AdminLink href="/customers" label="Clienti" />
            <AdminLink href="/products" label="Prodotti" />
          </div>
        </div>
      ) : null}
    </header>
  );
}
