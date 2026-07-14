import type { Metadata, Viewport } from "next";

import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";

import "./globals.css";

export const metadata: Metadata = {
  applicationName: "답안길",
  title: "답안길 | 감정평가사 2차 답안 훈련 OS",
  description: "감정평가사 2차 답안을 가장 큰 감점 위험 1개와 다시 쓸 문단 1개로 정리하는 답안 훈련 OS입니다.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "답안길",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/inverge-icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/inverge-icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/inverge-icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/inverge-icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/inverge-apple-touch-180.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#10233f",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased" data-theme="light">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
