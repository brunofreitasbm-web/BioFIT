import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Treino PPL",
    short_name: "Treino PPL",
    description: "Programa de hipertrofia PPL — hoje, registro e relatório de volume",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f5f7",
    theme_color: "#3d63e0",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
