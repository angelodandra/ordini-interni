import { Suspense } from "react";
import PrintOneClient from "./PrintOneClient";

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 16, fontWeight: 900 }}>Carico…</div>}>
      <PrintOneClient />
    </Suspense>
  );
}
