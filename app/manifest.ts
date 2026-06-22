import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Inverge",
    short_name: "Inverge",
    description: "감정평가사 학습 루프를 오늘 할 일과 복습으로 이어주는 Inverge.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#f7f1e8",
    theme_color: "#10233f",
    lang: "ko",
    icons: [
      {
        src: "/icons/inverge-icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/icons/inverge-icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
      {
        src: "/icons/inverge-maskable.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
