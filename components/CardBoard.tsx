"use client";

import { useMemo } from "react";
import { useApp } from "@/lib/store";
import type { Card, CardFilter, SortKey, ViewMode } from "@/lib/types";
import { matchesFilter, matchesQuery, sortCards } from "@/lib/utils";
import { CardItem } from "./CardItem";
import { Icon } from "./Icon";

/**
 * カードの一覧表示。
 * 検索クエリがある場合は全タブを対象、なければ選択中タブのみを表示する。
 * 絞り込み・並び替えのロジックは lib/utils.ts の純関数に委譲している。
 */
export function CardBoard({
  activeTabId,
  query,
  filter,
  sortKey,
  view,
  onEditCard,
}: {
  activeTabId: string | null;
  query: string;
  filter: CardFilter;
  sortKey: SortKey;
  view: ViewMode;
  onEditCard: (card: Card) => void;
}) {
  const { tabs, cards, moveCard } = useApp();
  const searching = query.trim().length > 0;

  const tabNames = useMemo(() => new Map(tabs.map((t) => [t.id, t.name])), [tabs]);

  const visible = useMemo(() => {
    const scoped = searching ? cards : cards.filter((c) => c.tab_id === activeTabId);
    const filtered = scoped.filter(
      (c) => matchesQuery(c, query) && matchesFilter(c, filter)
    );
    return sortCards(filtered, sortKey);
  }, [cards, activeTabId, searching, query, filter, sortKey]);

  if (visible.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-surface border border-line text-ink-tertiary">
          <Icon name={searching ? "search" : "plus"} size={24} />
        </div>
        <p className="text-[15px] font-medium text-ink-secondary">
          {searching ? "一致するカードがありません" : "カードがありません"}
        </p>
        <p className="text-[13px] text-ink-tertiary">
          {searching
            ? "検索語やフィルターを変更してみてください"
            : "右下の + ボタンから追加できます"}
        </p>
      </div>
    );
  }

  const manualSort = sortKey === "manual" && !searching;
  const visibleIds = visible.map((c) => c.id);

  return (
    <div
      className={
        view === "grid"
          ? "grid grid-cols-1 gap-2.5 px-3 pb-28 sm:grid-cols-2 lg:grid-cols-3"
          : "flex flex-col gap-2 px-3 pb-28"
      }
    >
      {visible.map((card) => (
        <CardItem
          key={card.id}
          card={card}
          view={view}
          tabName={searching ? tabNames.get(card.tab_id) : undefined}
          manualSort={manualSort}
          onMove={(dir) => void moveCard(card.id, dir, visibleIds)}
          onEdit={() => onEditCard(card)}
        />
      ))}
    </div>
  );
}
