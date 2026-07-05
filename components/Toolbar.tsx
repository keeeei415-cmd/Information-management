"use client";

import { useState } from "react";
import type { CardFilter, SortKey, ViewMode } from "@/lib/types";
import { SORT_LABELS } from "@/lib/types";
import { Icon } from "./Icon";

/**
 * 検索バー + 並び替え / フィルター / 表示切替のツールバー。
 * フィルターと並び替えの状態は親 (page.tsx) が持ち、ここは表示と入力のみ担当。
 */
export function Toolbar({
  query,
  onQueryChange,
  sortKey,
  onSortChange,
  filter,
  onFilterChange,
  view,
  onViewChange,
  availableTags,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  sortKey: SortKey;
  onSortChange: (k: SortKey) => void;
  filter: CardFilter;
  onFilterChange: (f: CardFilter) => void;
  view: ViewMode;
  onViewChange: (v: ViewMode) => void;
  availableTags: string[];
}) {
  const [panelOpen, setPanelOpen] = useState(false);

  const filterActive =
    filter.completion !== "all" || filter.pinnedOnly || filter.tag !== null;

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
      active
        ? "bg-accent text-white"
        : "border border-line bg-surface text-ink-secondary hover:text-ink"
    }`;

  return (
    <div className="space-y-2 px-3">
      {/* 検索 + 操作ボタン */}
      <div className="flex items-center gap-2">
        <div className="flex h-10 flex-1 items-center gap-2 rounded-xl bg-surface border border-line px-3">
          <Icon name="search" size={16} className="shrink-0 text-ink-tertiary" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="全タブから検索 (タイトル・内容・タグ)"
            className="h-full flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-tertiary"
            type="search"
          />
          {query && (
            <button onClick={() => onQueryChange("")} aria-label="検索をクリア">
              <Icon name="close" size={14} className="text-ink-tertiary" />
            </button>
          )}
        </div>

        <button
          onClick={() => setPanelOpen((v) => !v)}
          aria-label="並び替えとフィルター"
          aria-expanded={panelOpen}
          className={`relative flex h-10 w-10 items-center justify-center rounded-xl border ${
            panelOpen || filterActive
              ? "border-accent bg-accent-soft text-accent"
              : "border-line bg-surface text-ink-secondary"
          }`}
        >
          <Icon name="filter" size={17} />
          {filterActive && (
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent" />
          )}
        </button>

        <button
          onClick={() => onViewChange(view === "list" ? "grid" : "list")}
          aria-label={view === "list" ? "カード表示に切り替え" : "リスト表示に切り替え"}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface text-ink-secondary"
        >
          <Icon name={view === "list" ? "grid" : "list"} size={17} />
        </button>
      </div>

      {/* 並び替え・フィルターパネル */}
      {panelOpen && (
        <div className="space-y-3 rounded-xl border border-line bg-surface p-3">
          <div>
            <p className="mb-1.5 text-[12px] font-medium text-ink-tertiary">並び替え</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => onSortChange(key)}
                  className={chip(sortKey === key)}
                >
                  {SORT_LABELS[key]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-[12px] font-medium text-ink-tertiary">状態</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => onFilterChange({ ...filter, completion: "all" })}
                className={chip(filter.completion === "all")}
              >
                すべて
              </button>
              <button
                onClick={() => onFilterChange({ ...filter, completion: "todo" })}
                className={chip(filter.completion === "todo")}
              >
                未完了
              </button>
              <button
                onClick={() => onFilterChange({ ...filter, completion: "done" })}
                className={chip(filter.completion === "done")}
              >
                完了
              </button>
              <button
                onClick={() => onFilterChange({ ...filter, pinnedOnly: !filter.pinnedOnly })}
                className={chip(filter.pinnedOnly)}
              >
                ピン留めのみ
              </button>
            </div>
          </div>

          {availableTags.length > 0 && (
            <div>
              <p className="mb-1.5 text-[12px] font-medium text-ink-tertiary">タグ</p>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() =>
                      onFilterChange({ ...filter, tag: filter.tag === tag ? null : tag })
                    }
                    className={chip(filter.tag === tag)}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
