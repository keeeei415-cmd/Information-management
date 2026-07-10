/**
 * グループの色。ヘッダー行の背景・枠線・文字色だけに使う (中身は白)。
 * 追加する場合はここに1行足すだけでよい。
 */

export type GroupColor =
  | "none" | "red" | "orange" | "yellow" | "green"
  | "blue" | "purple" | "pink" | "gray";

export const GROUP_COLORS: Record<
  GroupColor,
  { label: string; bg: string; border: string; text: string; dot: string }
> = {
  none:   { label: "なし",     bg: "#F7F7F8", border: "#D8D8DC", text: "#1C1C1E", dot: "#FFFFFF" },
  red:    { label: "レッド",   bg: "#FCEBEB", border: "#F09595", text: "#501313", dot: "#E24B4A" },
  orange: { label: "オレンジ", bg: "#FAEEDA", border: "#EF9F27", text: "#412402", dot: "#EF9F27" },
  yellow: { label: "イエロー", bg: "#FEFCE8", border: "#E5C84B", text: "#4A3B02", dot: "#FFCC00" },
  green:  { label: "グリーン", bg: "#EAF3DE", border: "#97C459", text: "#173404", dot: "#639922" },
  blue:   { label: "ブルー",   bg: "#E6F1FB", border: "#85B7EB", text: "#042C53", dot: "#378ADD" },
  purple: { label: "パープル", bg: "#EEEDFE", border: "#AFA9EC", text: "#26215C", dot: "#7F77DD" },
  pink:   { label: "ピンク",   bg: "#FBEAF0", border: "#ED93B1", text: "#4B1528", dot: "#D4537E" },
  gray:   { label: "グレー",   bg: "#F1EFE8", border: "#B4B2A9", text: "#2C2C2A", dot: "#888780" },
};

export const GROUP_COLOR_KEYS = Object.keys(GROUP_COLORS) as GroupColor[];

/** 不正な値でも安全に取り出す */
export function getGroupColor(color: string | undefined): GroupColor {
  return (color && color in GROUP_COLORS ? color : "none") as GroupColor;
}
