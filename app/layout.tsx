import type { Metadata, Viewport } from "next";
import Script from "next/script";

import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { ThemeProvider } from "@/components/shared/theme-provider";

import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Inverge",
  title: "Inverge | 감정평가사 Pass Management OS",
  description: "감정평가사 1차 오답과 2차 답안 보강을 오늘의 다음 행동으로 정리하는 Pass Management OS입니다.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Inverge",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/inverge-icon-192.svg", sizes: "192x192", type: "image/svg+xml" },
      { url: "/icons/inverge-icon-512.svg", sizes: "512x512", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/inverge-icon-192.svg", sizes: "192x192", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#10233f",
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeScript = `
  try {
    var stored = window.localStorage.getItem("inverge:theme-mode");
    document.documentElement.dataset.theme = stored === "dark" ? "dark" : "light";
  } catch (error) {
    document.documentElement.dataset.theme = "light";
  }
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning data-theme="light">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <Script id="theme-script" strategy="beforeInteractive">
          {themeScript}
        </Script>
        <ThemeProvider>
          <ServiceWorkerRegistration />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
