import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "曾总分享 · 每日值得一读",
  description: "按天回看、中文翻译、重点收藏。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
