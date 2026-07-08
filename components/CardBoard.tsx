"use client";

import { useMemo } from "react";
import { useApp } from "@/lib/store";
import type { Card, CardFilter, SortKey, ViewMode } from "@/lib/types";
import { matchesFilter, matchesQuery, sortCards } from "@/lib/utils";
import { CardItem } from "./CardItem";
import { Icon } from "./Icon";

export function CardBoard({
  activeTabId,
  query,
  filter,
  sortKey,
  view,
  onEditCard,
  screenFilter,
}: {
  activeTabId: string | null;
  query: string;
  filter: CardFilter;
  sortKey: SortKey;
  view: ViewMode;
  onEditCard: (card: Card) => void;
  /** "cases" = 知識タブを除外して症例のみ表示 */
  screenFilter?: "cases";
}) {
  const { tabs, cards, moveCard } = useApp();
  const searching = query.trim().length > 0;

  const tabNames = useMemo(() => new Map(tabs.map((t) => [t.id, t.name])), [tabs]);

  // 知識タブのIDセット（除外用）
  const knowledgeTabIds = useMemo(
    () => new Set(tabs.filter((t) => t.name === "知識").map((t) => t.id)),
    [tabs]
  );

  const visible = useMemo(() => {
    let scoped = activeTabId
      ? cards.filter((c) => c.tab_id === activeTabId)
      : cards;

    // 症例画面では知識タブのカードを除外
    if (screenFilter === "cases") {
      scoped = scoped.filter((c) => !knowledgeTabIds.has(c.tab_id));
    }

    if (!searching && !activeTabId && screenFilter !== "cases") {
      scoped = cards;
    }

    const filtered = scoped.filter(
      (c) => matchesQuery(c, query) && matchesFilter(c, filter)
    );
    return sortCards(filtered, sortKey);
  }, [cards, activeTabId, searching, query, filter, sortKey, screenFilter, knowledgeTabIds]);

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
