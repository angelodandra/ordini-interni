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
