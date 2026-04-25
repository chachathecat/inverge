import type { Metadata } from "next";
import Script from "next/script";

import { ThemeProvider } from "@/components/shared/theme-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Inverge | 감정평가사 Pass Management OS",
  description: "감정평가사 1차 오답과 2차 답안 보강을 오늘의 다음 행동으로 정리하는 Pass Management OS입니다.",
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
