import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "症例記録",
  description: "治療内容を記録・検索できる症例記録アプリ",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "症例記録",
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
