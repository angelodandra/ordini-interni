import Link from "next/link";

export default function PrintsPage() {
  const Card = ({
    title,
    desc,
    href,
    disabled,
  }: {
    title: string;
    desc: string;
    href?: string;
    disabled?: boolean;
  }) => {
    const style: React.CSSProperties = {
      display: "block",
      padding: 16,
      borderRadius: 16,
      border: "1px solid #ddd",
      background: disabled ? "#f7f7f7" : "white",
      color: "#111",
      textDecoration: "none",
      opacity: disabled ? 0.6 : 1,
    };

    const inner = (
      <>
        <div style={{ fontSize: 16, fontWeight: 900 }}>{title}</div>
        <div style={{ marginTop: 6, opacity: 0.8 }}>{desc}</div>
      </>
    );

    if (disabled || !href) return <div style={style}>{inner}</div>;
    return (
      <Link href={href} style={style}>
        {inner}
      </Link>
    );
  };

  return (
    <main style={{ padding: 24, fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Stampe</h1>
      <p style={{ marginTop: 8, opacity: 0.75 }}>
        Seleziona cosa vuoi stampare
      </p>

      <div style={{ marginTop: 16, display: "grid", gap: 12, maxWidth: 760 }}>
        <Card
          title="Stampa ordini cumulativa (A5 / A4 / Termica)"
          desc="Stampa tutti gli ordini nell’intervallo selezionato. Scegli formato prima di stampare."
          href="/orders/print-all"
        />

        <Card
          title="Riepilogo prodotti (KG / CS / PZ)"
          desc="Totali per prodotto in un intervallo di date. COD cliccabile per vedere i clienti."
          href="/orders/print-day"
        />

        <Card
          title="Singolo prodotto (clienti + KG / CS / PZ)"
          desc="Inserisci un COD e vedi chi lo ha ordinato e in che quantità."
          href="/products/print-one"
        />
      </div>
    </main>
  );
}
