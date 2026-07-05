import type { CardColor } from "./types";

/**
 * カードの色定義。
 * dot: カラーピッカーの丸 / bar: カード左端のアクセント / bg: カード背景 (淡色)
 * 色を追加する場合は types.ts の CardColor にも追加する。
 */
export const CARD_COLORS: Record<
  CardColor,
  { label: string; dot: string; bar: string; bg: string }
> = {
  default: { label: "なし", dot: "#E5E5EA", bar: "transparent", bg: "#FFFFFF" },
  red: { label: "レッド", dot: "#FF3B30", bar: "#FF3B30", bg: "#FFF5F4" },
  orange: { label: "オレンジ", dot: "#FF9500", bar: "#FF9500", bg: "#FFF9F0" },
  yellow: { label: "イエロー", dot: "#FFCC00", bar: "#FFCC00", bg: "#FFFCEB" },
  green: { label: "グリーン", dot: "#34C759", bar: "#34C759", bg: "#F2FBF5" },
  blue: { label: "ブルー", dot: "#007AFF", bar: "#007AFF", bg: "#F0F7FF" },
  purple: { label: "パープル", dot: "#AF52DE", bar: "#AF52DE", bg: "#FAF4FE" },
  gray: { label: "グレー", dot: "#8E8E93", bar: "#8E8E93", bg: "#F7F7F8" },
};

export const CARD_COLOR_KEYS = Object.keys(CARD_COLORS) as CardColor[];
