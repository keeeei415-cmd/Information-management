/**
 * アプリ全体で共有する型定義。
 * DB スキーマ (supabase/schema.sql) と 1:1 で対応させる。
 * 新しい項目を追加する場合は「schema.sql → この型 → API層」の順に更新する。
 */

/** カードの色。iOS のカラーパレット準拠。追加する場合は lib/colors.ts も更新する */
export type CardColor =
  | "default"
  | "red"
  | "orange"
  | "yellow"
  | "green"
  | "blue"
  | "purple"
  | "gray";

export interface Tab {
  id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  tab_id: string;
  title: string;
  content: string;
  category: string | null;
  tags: string[];
  pinned: boolean;
  completed: boolean;
  color: CardColor;
  due_date: string | null; // ISO8601
  position: number; // 手動並び替え用
  archived_at: string | null; // 将来のアーカイブ機能用
  deleted_at: string | null; // 将来のゴミ箱機能用
  metadata: Record<string, unknown>; // 将来の拡張用 (チェックリスト・添付など)
  created_at: string;
  updated_at: string;
}

/** カード新規作成時の入力 */
export type CardInput = Pick<Card, "tab_id" | "title"> &
  Partial<
    Pick<
      Card,
      | "content"
      | "category"
      | "tags"
      | "pinned"
      | "completed"
      | "color"
      | "due_date"
      | "position"
      | "metadata"
    >
  >;

/** カード更新時の入力 (id 以外の任意項目) */
export type CardPatch = Partial<Omit<Card, "id" | "created_at" | "updated_at">>;

// ---- 表示・操作系の型 ----

export type ViewMode = "list" | "grid";

export type SortKey = "created" | "updated" | "title" | "due" | "manual";

export type CompletionFilter = "all" | "done" | "todo";

export interface CardFilter {
  completion: CompletionFilter;
  pinnedOnly: boolean;
  tag: string | null;
}

export const DEFAULT_FILTER: CardFilter = {
  completion: "all",
  pinnedOnly: false,
  tag: null,
};

export const SORT_LABELS: Record<SortKey, string> = {
  updated: "更新日",
  created: "作成日",
  title: "タイトル",
  due: "期限",
  manual: "手動",
};

// ---- 症例記録 (metadata に保存する臨床データ) ----

export type Gender = "男性" | "女性" | "その他" | "";

/** カードの metadata.clinical に保存する症例データ */
export interface ClinicalData {
  age: string; // 年齢 (自由入力)
  gender: Gender; // 性別
  symptom: string; // 症状
  assessment: string; // 評価
  consideration: string; // 考察
  treatment: string; // 治療内容
  result: string; // 結果
}

export const EMPTY_CLINICAL: ClinicalData = {
  age: "",
  gender: "",
  symptom: "",
  assessment: "",
  consideration: "",
  treatment: "",
  result: "",
};

/** カードから症例データを安全に取り出す */
export function getClinical(card: Card): ClinicalData {
  const raw = (card.metadata as { clinical?: Partial<ClinicalData> })?.clinical ?? {};
  return { ...EMPTY_CLINICAL, ...raw };
}

/** 部位タグの選択肢 */
export const BODY_PARTS = [
  "頚部",
  "肩",
  "上腕",
  "肘",
  "前腕",
  "手首",
  "手指",
  "背部",
  "腰部",
  "股関節",
  "臀部",
  "大腿部",
  "膝",
  "下腿部",
  "足関節",
  "足指",
] as const;
