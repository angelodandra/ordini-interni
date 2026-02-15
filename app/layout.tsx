import type { Metadata } from "next";
import "./globals.css";
import TopNav from "./top-nav";

export const metadata: Metadata = {
  title: "ORDINI INTERNI",
  description: "Gestionale ordini interno",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
    <div style={{
      display:"flex",
      justifyContent:"flex-end",
      padding:"10px 16px",
      background:"white",
      borderBottom:"1px solid var(--border)"
    }}>
      <form action="/api/logout" method="post">
        <button
          style={{
            padding:"6px 12px",
            borderRadius:10,
            border:"1px solid var(--brand-300)",
            background:"var(--brand-50)",
            fontWeight:900,
            cursor:"pointer"
          }}
        >
          Logout Ordini
        </button>
      </form>
    </div>
        <style>{`
          @media print {
            header { display: none !important; }
            nav { display: none !important; }
            .no-print { display: none !important; }
            body { background: white !important; }
          }
        `}</style>

        <TopNav />
        <main>{children}</main>
      </body>
    </html>
  );
}
