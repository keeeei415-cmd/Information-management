import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // iOS システムカラー準拠
        ink: {
          DEFAULT: "#1C1C1E", // label
          secondary: "#6E6E73", // secondaryLabel
          tertiary: "#AEAEB2",
        },
        canvas: "#F2F2F7", // systemGroupedBackground
        surface: "#FFFFFF",
        line: "#E5E5EA", // separator
        accent: {
          DEFAULT: "#007AFF", // systemBlue
          soft: "#EAF3FF",
        },
        danger: "#FF3B30",
        success: "#34C759",
        warn: "#FF9500",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "Hiragino Sans",
          "Hiragino Kaku Gothic ProN",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.03)",
        sheet: "0 -8px 32px rgba(0,0,0,0.12)",
        modal: "0 20px 60px rgba(0,0,0,0.18)",
      },
    },
  },
  plugins: [],
};
export default config;
