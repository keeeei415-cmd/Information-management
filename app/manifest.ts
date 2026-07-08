import type { MetadataRoute } from "next";

/** PWA マニフェスト。ホーム画面追加でスタンドアロン起動できる */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "症例記録",
    short_name: "症例記録",
    description: "治療内容を記録・検索できる症例記録アプリ",
    start_url: "/",
    display: "standalone",
    background_color: "#F2F2F7",
    theme_color: "#F2F2F7",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
