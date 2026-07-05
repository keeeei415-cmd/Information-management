import type { MetadataRoute } from "next";

/** PWA マニフェスト。ホーム画面追加でスタンドアロン起動できる */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ボード - 情報管理",
    short_name: "ボード",
    description: "タブとカードで何でも管理できる情報管理アプリ",
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
