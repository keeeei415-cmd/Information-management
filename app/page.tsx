"use client";

import { useEffect, useMemo, useState } from "react";
import { CardBoard } from "@/components/CardBoard";
import { CardEditor } from "@/components/CardEditor";
import { Icon } from "@/components/Icon";
import { KnowledgeBoard } from "@/components/KnowledgeBoard";
import { TabBar } from "@/components/TabBar";
import { TabManager } from "@/components/TabManager";
import { Toolbar } from "@/components/Toolbar";
import { AppProvider, useApp } from "@/lib/store";
import type { Card, CardFilter, SortKey, ViewMode } from "@/lib/types";
import { DEFAULT_FILTER } from "@/lib/types";
import { collectTags } from "@/lib/utils";

function Home() {
  const { tabs, cards, loading, error, reload } = useApp();

  // 表示状態 (URL やユーザー設定に永続化したくなったらここを差し替える)
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CardFilter>(DEFAULT_FILTER);
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [view, setView] = useState<ViewMode>("list");

  // モーダル状態
  const [tabManagerOpen, setTabManagerOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [creating, setCreating] = useState(false);

  // 初回ロード後、先頭のタブを選択。選択中タブが削除されたら隣に移る
  useEffect(() => {
    if (tabs.length === 0) {
      setActiveTabId(null);
      return;
    }
    if (!activeTabId || !tabs.some((t) => t.id === activeTabId)) {
      setActiveTabId(tabs[0].id);
    }
  }, [tabs, activeTabId]);

  const cardCounts = useMemo(() => {
    const map = new Map<string, number>();
    cards.forEach((c) => map.set(c.tab_id, (map.get(c.tab_id) ?? 0) + 1));
    return map;
  }, [cards]);

  const availableTags = useMemo(() => collectTags(cards), [cards]);

  // アクティブなタブが「知識」(アウトライン形式) かどうかを名前で判定する
  const activeTab = tabs.find((t) => t.id === activeTabId);
  const isKnowledgeTab = activeTab?.name === "知識";

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-[14px] text-ink-tertiary">
        読み込み中…
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-dvh max-w-5xl">
      {/* ヘッダー */}
      <header className="sticky top-0 z-30 bg-canvas/90 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <div className="flex items-center justify-between px-4 pb-2">
          <h1 className="text-[22px] font-bold tracking-tight text-ink">症例記録</h1>
        </div>
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
          compact={isKnowledgeTab}
        />
        <div className="mt-2">
          <TabBar
            activeTabId={activeTabId}
            onSelect={(id) => {
              setActiveTabId(id);
              setQuery("");
            }}
            onOpenManager={() => setTabManagerOpen(true)}
            cardCounts={cardCounts}
          />
        </div>
        <div className="h-px bg-line" />
      </header>

      {/* エラーバナー */}
      {error && (
        <div className="mx-3 mt-3 flex items-center justify-between rounded-xl border border-danger/30 bg-red-50 px-3 py-2 text-[13px] text-danger">
          <span>{error}</span>
          <button onClick={() => void reload()} className="font-semibold underline">
            再読み込み
          </button>
        </div>
      )}

      {/* 本体 */}
      <main className="pt-3">
        {tabs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
            <p className="text-[16px] font-semibold text-ink">はじめにタブを作成しましょう</p>
            <p className="text-[13px] leading-relaxed text-ink-tertiary">
              「腰痛」「肩」「勉強会」など、分類ごとにタブを作って
              <br />
              治療記録を保存・検索できます。
            </p>
            <button
              onClick={() => setTabManagerOpen(true)}
              className="mt-2 rounded-full bg-accent px-5 py-2.5 text-[15px] font-semibold text-white"
            >
              タブを作成
            </button>
          </div>
        ) : isKnowledgeTab && activeTabId ? (
          <KnowledgeBoard tabId={activeTabId} query={query} />
        ) : (
          <CardBoard
            activeTabId={activeTabId}
            query={query}
            filter={filter}
            sortKey={sortKey}
            view={view}
            onEditCard={setEditingCard}
          />
        )}
      </main>

      {/* カード追加 FAB (症例タブのみ。知識タブは独自の追加UIを持つ) */}
      {activeTabId && !isKnowledgeTab && (
        <button
          onClick={() => setCreating(true)}
          aria-label="カードを追加"
          className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-modal transition-transform active:scale-95"
        >
          <Icon name="plus" size={26} strokeWidth={2.2} />
        </button>
      )}

      {/* モーダル群 */}
      {tabManagerOpen && <TabManager onClose={() => setTabManagerOpen(false)} />}
      {creating && activeTabId && (
        <CardEditor tabId={activeTabId} onClose={() => setCreating(false)} />
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

export default function Page() {
  return (
    <AppProvider>
      <Home />
    </AppProvider>
  );
}
