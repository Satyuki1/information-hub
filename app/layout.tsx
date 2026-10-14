import type { Metadata, Viewport } from "next";
import {BRAND_NAME,BRAND_DESCRIPTION} from "../lib/brand";
import "./styles/base.css";
import "./styles/x.css";
import "./styles/pages.css";
import "./styles/admin.css";
import "./styles/site.css";
import "./styles/product.css";
import "./styles/landing.css";

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: BRAND_DESCRIPTION,
  icons: {
    icon: "/favicon.svg?v=x-to-group",
    shortcut: "/favicon.svg?v=x-to-group",
  },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

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
