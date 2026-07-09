"use client";

import { useApp } from "@/lib/store";
import { Icon } from "./Icon";

/**
 * 画面上部のタブバー。横スクロール対応。
 * activeTabId が null のときは検索 (全タブ) モード。
 */
export function TabBar({
  activeTabId,
  onSelect,
  onOpenManager,
  cardCounts,
}: {
  activeTabId: string | null;
  onSelect: (id: string) => void;
  onOpenManager: () => void;
  cardCounts: Map<string, number>;
}) {
  const { tabs } = useApp();

  return (
    <div className="flex items-center gap-2 px-3 pb-2">
      <nav
        className="scrollbar-none flex flex-1 gap-1.5 overflow-x-auto"
        aria-label="タブ"
      >
        {tabs.map((tab) => {
          const active = tab.id === activeTabId;
          const count = cardCounts.get(tab.id) ?? 0;
          return (
            <button
              key={tab.id}
              onClick={() => onSelect(tab.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[14px] font-medium transition-colors ${
                active
                  ? "bg-ink text-white"
                  : "bg-surface text-ink-secondary border border-line hover:text-ink"
              }`}
            >
              {tab.name}
              {count > 0 && (
                <span
                  className={`text-[12px] ${active ? "text-white/70" : "text-ink-tertiary"}`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <button
        onClick={onOpenManager}
        aria-label="タブを管理"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-secondary hover:text-ink"
      >
        <Icon name="settings" size={16} />
      </button>
    </div>
  );
}
