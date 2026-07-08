import { getClinical, type Card, type CardFilter, type SortKey } from "./types";

/** "2026/7/4" のような短い日付表示 */
export function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

/** 期限の状態: 期限切れ / 今日 / それ以外 */
export function dueStatus(iso: string | null): "overdue" | "today" | "future" | null {
  if (!iso) return null;
  const due = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);
  if (due < startOfToday) return "overdue";
  if (due < startOfTomorrow) return "today";
  return "future";
}

/** <input type="date"> 用の yyyy-mm-dd 変換 */
export function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** 検索: タイトル・メモ・部位タグ・症例内容 (症状/評価/考察/治療/結果) を対象に部分一致 */
export function matchesQuery(card: Card, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const c = getClinical(card);
  const haystack = [
    card.title,
    card.content,
    card.category ?? "",
    c.symptom,
    c.assessment,
    c.consideration,
    c.treatment,
    c.result,
    c.age,
    c.gender,
  ]
    .join("\n")
    .toLowerCase();
  return haystack.includes(q) || card.tags.some((t) => t.toLowerCase().includes(q));
}

export function matchesFilter(card: Card, filter: CardFilter): boolean {
  if (filter.completion === "done" && !card.completed) return false;
  if (filter.completion === "todo" && card.completed) return false;
  if (filter.pinnedOnly && !card.pinned) return false;
  if (filter.tag && !card.tags.includes(filter.tag)) return false;
  return true;
}

/**
 * カードの並び替え。
 * どのソートでもピン留めは常に先頭グループに来る。
 */
export function sortCards(cards: Card[], key: SortKey): Card[] {
  const compare = (a: Card, b: Card): number => {
    switch (key) {
      case "created":
        return b.created_at.localeCompare(a.created_at);
      case "updated":
        return b.updated_at.localeCompare(a.updated_at);
      case "title":
        return a.title.localeCompare(b.title, "ja");
      case "due": {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1; // 期限なしは後ろ
        if (!b.due_date) return -1;
        return a.due_date.localeCompare(b.due_date);
      }
      case "manual":
        return a.position - b.position;
    }
  };
  return [...cards].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return compare(a, b);
  });
}

/** 全カードから使用中のタグ一覧を作る (重複なし・五十音順) */
export function collectTags(cards: Card[]): string[] {
  const set = new Set<string>();
  cards.forEach((c) => c.tags.forEach((t) => set.add(t)));
  return [...set].sort((a, b) => a.localeCompare(b, "ja"));
}
