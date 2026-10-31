"use client";

import { useEffect } from "react";

// Registra o service worker (public/sw.js) só em produção: no `next dev` ele serviria
// bundles velhos do cache e atrapalharia o hot reload.
export function RegistrarSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sem SW o app funciona igual, só não abre offline.
    });
  }, []);
  return null;
}
