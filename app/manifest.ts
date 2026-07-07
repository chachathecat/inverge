import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "답안길",
    short_name: "답안길",
    description: "감정평가사 2차 답안을 감점 위험과 다시 쓸 문단으로 정리하는 답안 훈련 OS.",
    start_url: "/app/capture?mode=second",
    scope: "/",
    display: "standalone",
    background_color: "#f7f1e8",
    theme_color: "#10233f",
    lang: "ko",
    icons: [
      {
        src: "/icons/inverge-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/inverge-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/inverge-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
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
