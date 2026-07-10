/**
 * グループの背景色 (薄い塗りつぶし)。
 * 追加する場合はここに足すだけでよい。
 */

export type GroupColor =
  | "none"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "gray";

export const GROUP_COLORS: Record<
  GroupColor,
  { label: string; bg: string; border: string; dot: string }
> = {
  none:   { label: "なし",       bg: "#FFFFFF", border: "#E5E5EA", dot: "#FFFFFF" },
  red:    { label: "レッド",     bg: "#FEF2F2", border: "#FECACA", dot: "#FF3B30" },
  orange: { label: "オレンジ",   bg: "#FFF7ED", border: "#FED7AA", dot: "#FF9500" },
  yellow: { label: "イエロー",   bg: "#FEFCE8", border: "#FDE68A", dot: "#FFCC00" },
  green:  { label: "グリーン",   bg: "#F0FDF4", border: "#BBF7D0", dot: "#34C759" },
  blue:   { label: "ブルー",     bg: "#EFF6FF", border: "#BFDBFE", dot: "#007AFF" },
  purple: { label: "パープル",   bg: "#FAF5FF", border: "#E9D5FF", dot: "#AF52DE" },
  pink:   { label: "ピンク",     bg: "#FDF2F8", border: "#FBCFE8", dot: "#FF2D55" },
  gray:   { label: "グレー",     bg: "#F7F7F8", border: "#E5E5EA", dot: "#8E8E93" },
};

export const GROUP_COLOR_KEYS = Object.keys(GROUP_COLORS) as GroupColor[];

/** 不正な値でも安全に取り出す */
export function getGroupColor(color: string | undefined): GroupColor {
  return (color && color in GROUP_COLORS ? color : "none") as GroupColor;
}
