import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./platform.css";
import "./site.css";

export const metadata: Metadata = {
  title: "information-hub · 资讯汇集",
  description: "由人精选、AI 协助整理的团队私有知识库。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

// Apply the reader's saved layout before first paint to avoid flashing the default style.
const styleBoot = "try{var s=localStorage.getItem('reading-style');if(s==='red'||s==='news'||s==='x')document.documentElement.dataset.style=s}catch(e){}";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" data-style="x" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: styleBoot }} /></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
