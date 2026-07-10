import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "知識ノート",
  description: "知識をNotion風に整理できるノートアプリ",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "知識ノート",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // フォーム入力時の意図しないズームを防ぐ
  themeColor: "#F2F2F7",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="bg-canvas font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
