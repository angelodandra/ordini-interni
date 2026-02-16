"use client";

import { usePathname } from "next/navigation";
import TopNav from "./top-nav";

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <main>{children}</main>;
  }

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          padding: "10px 16px",
          background: "white",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <form action="/api/logout" method="post">
          <button
            style={{
              padding: "6px 12px",
              borderRadius: 10,
              border: "1px solid var(--brand-300)",
              background: "var(--brand-50)",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            Logout Ordini
          </button>
        </form>
      </div>

      <TopNav />
      <main>{children}</main>
    </>
  );
}
