export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif" }}>
        <style>{`
          /* su /login nascondiamo tutta la barra alta + top nav */
          #top-logout { display: none !important; }
          #top-nav { display: none !important; }
        `}</style>

        <main
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            padding: 24,
            background: "linear-gradient(180deg, #f6f7f9 0%, #ffffff 60%)",
          }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
