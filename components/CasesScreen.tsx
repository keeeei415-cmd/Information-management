"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import type { Card, CardFilter, SortKey, ViewMode } from "@/lib/types";
import { DEFAULT_FILTER } from "@/lib/types";
import { collectTags } from "@/lib/utils";
import { CardBoard } from "./CardBoard";
import { CardEditor } from "./CardEditor";
import { Icon } from "./Icon";
import { Toolbar } from "./Toolbar";

export function CasesScreen() {
  const { tabs, cards } = useApp();

  const [query, setQuery]     = useState("");
  const [filter, setFilter]   = useState<CardFilter>(DEFAULT_FILTER);
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [view, setView]       = useState<ViewMode>("list");

  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [creating, setCreating]       = useState(false);

  // 「症例」タブのID（最初の非知識タブ）
  const casesTabId = useMemo(
    () => tabs.find((t) => t.name !== "知識")?.id ?? null,
    [tabs]
  );

  const availableTags = useMemo(() => collectTags(cards), [cards]);

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-14 z-20 bg-canvas/95 backdrop-blur pt-2 pb-1">
        <Toolbar
          query={query}
          onQueryChange={setQuery}
          sortKey={sortKey}
          onSortChange={setSortKey}
          filter={filter}
          onFilterChange={setFilter}
          view={view}
          onViewChange={setView}
          availableTags={availableTags}
          compact={false}
        />
      </div>

      <CardBoard
        activeTabId={null}
        query={query}
        filter={filter}
        sortKey={sortKey}
        view={view}
        onEditCard={setEditingCard}
        screenFilter="cases"
      />

      {/* FAB */}
      <button
        onClick={() => setCreating(true)}
        aria-label="症例を追加"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+4rem)] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-modal transition-transform active:scale-95"
      >
        <Icon name="plus" size={26} strokeWidth={2.2} />
      </button>

      {creating && casesTabId && (
        <CardEditor tabId={casesTabId} onClose={() => setCreating(false)} />
      )}
      {editingCard && (
        <CardEditor
          card={editingCard}
          tabId={editingCard.tab_id}
          onClose={() => setEditingCard(null)}
        />
      )}
    </div>
  );
}
