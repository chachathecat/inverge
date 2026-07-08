import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "답안길",
    short_name: "답안길",
    description: "감정평가사 2차 답안을 감점 위험과 다시 쓸 문단으로 정리하는 답안 훈련 OS.",
    start_url: "/app?mode=second",
    scope: "/",
    display: "standalone",
    background_color: "#f7f1e8",
    theme_color: "#10233f",
    lang: "ko",
    shortcuts: [
      {
        name: "오늘 한 것 올리기",
        short_name: "입력",
        description: "오늘 공부한 답안이나 기록을 올립니다.",
        url: "/app/capture?mode=second",
      },
      {
        name: "복습하기",
        short_name: "복습",
        description: "오늘 복습할 항목을 확인합니다.",
        url: "/app/review?mode=second",
      },
    ],
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
