"use client";

import { useEffect, useState } from "react";

/**
 * Widget diagnostik SEMENTARA — fetch /api/diag/session dari dalam app (konteks
 * login) dan tampilkan hasilnya di layar. Untuk menelusuri masalah cookie sesi.
 * Hapus setelah selesai.
 */
export function DiagSession() {
  const [text, setText] = useState("memuat…");
  useEffect(() => {
    fetch("/api/diag/session", { credentials: "include" })
      .then((r) => r.json())
      .then((j) => setText(JSON.stringify(j)))
      .catch((e) => setText("error: " + String(e)));
  }, []);
  return (
    <div>
      <div className="font-semibold">fetch /api/diag/session →</div>
      <div className="break-all">{text}</div>
      <div className="mt-1 font-semibold">document.cookie →</div>
      <ClientCookies />
    </div>
  );
}

function ClientCookies() {
  const [c, setC] = useState("…");
  useEffect(() => {
    setC(typeof document !== "undefined" ? document.cookie || "(kosong)" : "?");
  }, []);
  return <div className="break-all">{c}</div>;
}
