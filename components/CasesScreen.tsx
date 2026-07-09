"use client";

import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import type { Card, CardFilter, SortKey, ViewMode } from "@/lib/types";
import { DEFAULT_FILTER } from "@/lib/types";
import { collectTags } from "@/lib/utils";
import { CardEditor } from "./CardEditor";
import { Icon } from "./Icon";
import { Modal } from "./Modal";
import { Toolbar } from "./Toolbar";

const UNGROUPED = "未分類";
const GROUPS_CARD_TITLE = "__cases_groups__";

export interface CasesScreenHandle {
  openAddGroup: () => void;
  openAddCard:  () => void;
}

export const CasesScreen = forwardRef<CasesScreenHandle>((_, ref) => {
  const { tabs, cards, addCard, patchCard } = useApp();

  const [query, setQuery]     = useState("");
  const [filter, setFilter]   = useState<CardFilter>(DEFAULT_FILTER);
  const [sortKey, setSortKey] = useState<SortKey>("updated");
  const [view, setView]       = useState<ViewMode>("list");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [creating, setCreating]       = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);

  // 症例タブID（「知識」以外の最初のタブ）
  const casesTabId = useMemo(
    () => tabs.find((t) => t.name !== "知識")?.id ?? null,
    [tabs]
  );

  const allCasesCards = useMemo(
    () => casesTabId ? cards.filter((c) => c.tab_id === casesTabId) : [],
    [cards, casesTabId]
  );

  // グループ管理用特殊カード
  const groupsCard = useMemo(
    () => allCasesCards.find((c) => c.title === GROUPS_CARD_TITLE) ?? null,
    [allCasesCards]
  );

  const casesCards = useMemo(
    () => allCasesCards.filter((c) => c.title !== GROUPS_CARD_TITLE),
    [allCasesCards]
  );

  const storedGroups = useMemo<string[]>(() => {
    const raw = (groupsCard?.metadata as { groups?: string[] })?.groups;
    return Array.isArray(raw) ? raw : [];
  }, [groupsCard]);

  const groups = useMemo(() => {
    const set = new Set<string>(storedGroups);
    casesCards.forEach((c) => { if (c.category) set.add(c.category); });
    return Array.from(set);
  }, [storedGroups, casesCards]);

  const searching = query.trim().length > 0;

  const cardsByGroup = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (c: Card) =>
      !q ||
      c.title.toLowerCase().includes(q) ||
      c.content.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q));

    const map = new Map<string, Card[]>();
    groups.forEach((g) => map.set(g, []));
    map.set(UNGROUPED, []);
    casesCards.filter(match).forEach((c) => {
      const key = c.category && map.has(c.category) ? c.category : UNGROUPED;
      map.get(key)!.push(c);
    });
    return map;
  }, [groups, casesCards, query]);

  const sections = useMemo(() => {
    const names = [...groups, UNGROUPED];
    return names.filter((name) => {
      const list = cardsByGroup.get(name) ?? [];
      if (searching) return list.length > 0;
      if (name === UNGROUPED) return list.length > 0;
      return true;
    });
  }, [groups, cardsByGroup, searching]);

  const toggleGroup = (name: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const addGroup = async (name: string) => {
    setAddingGroup(false);
    if (!name || groups.includes(name) || name === UNGROUPED || !casesTabId) return;
    const nextGroups = [...storedGroups, name];
    if (groupsCard) {
      await patchCard(groupsCard.id, { metadata: { groups: nextGroups } });
    } else {
      await addCard({ tab_id: casesTabId, title: GROUPS_CARD_TITLE, metadata: { groups: nextGroups } });
    }
    setOpenGroups((prev) => new Set(prev).add(name));
  };

  // ヘッダーボタンから呼ばれるハンドル
  useImperativeHandle(ref, () => ({
    openAddGroup: () => setAddingGroup(true),
    openAddCard:  () => setCreating(true),
  }));

  const availableTags = useMemo(() => collectTags(casesCards), [casesCards]);

  return (
    <div>
      <div className="px-3 pt-3 pb-2">
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

      {/* グループ追加モーダル */}
      {addingGroup && (
        <GroupNameModal
          title="グループを追加"
          placeholder="例: 頚部"
          onClose={() => setAddingGroup(false)}
          onSave={(name) => void addGroup(name)}
        />
      )}

      {/* グループセクション */}
      <div className="space-y-2 px-3 pt-1">
        {sections.length === 0 && !addingGroup && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <p className="text-[15px] font-medium text-ink-secondary">
              {searching ? "一致する症例がありません" : "グループを作成して症例を整理しましょう"}
            </p>
          </div>
        )}

        {sections.map((name) => {
          const list = cardsByGroup.get(name) ?? [];
          const isOpen = searching || openGroups.has(name);
          return (
            <section key={name} className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
              <div className="flex items-center gap-2 px-2.5 py-2.5">
                <button onClick={() => toggleGroup(name)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-secondary hover:bg-canvas">
                  <Icon name={isOpen ? "chevronDown" : "chevronRight"} size={18} strokeWidth={2.4} />
                </button>
                <button onClick={() => toggleGroup(name)} className="flex-1 text-left">
                  <span className="text-[16px] font-semibold text-ink">{name}</span>
                  <span className="ml-2 text-[13px] text-ink-tertiary">{list.length}</span>
                </button>
              </div>

              {isOpen && (
                <div className="space-y-2 border-t border-line bg-canvas/50 p-2.5">
                  {list.length === 0 && (
                    <p className="py-3 text-center text-[13px] text-ink-tertiary">
                      カードがありません
                    </p>
                  )}
                  {list.map((card) => (
                    <article key={card.id}
                      className="rounded-xl border border-line bg-surface"
                      style={{ borderLeft: "3px solid #007AFF" }}>
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-[15px] font-semibold text-ink">{card.title}</h3>
                          <button onClick={() => setEditingCard(card)} aria-label="編集"
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-canvas text-ink-secondary hover:text-accent">
                            <Icon name="edit" size={15} />
                          </button>
                        </div>
                        {card.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {card.tags.map((t) => (
                              <span key={t} className="rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-medium text-accent">{t}</span>
                            ))}
                          </div>
                        )}
                        {card.content && (
                          <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-ink-secondary">{card.content}</p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {creating && casesTabId && (
        <CardEditor
          tabId={casesTabId}
          groups={groups}
          onClose={() => setCreating(false)}
        />
      )}
      {editingCard && (
        <CardEditor
          card={editingCard}
          tabId={editingCard.tab_id}
          groups={groups}
          onClose={() => setEditingCard(null)}
        />
      )}
    </div>
  );
});
CasesScreen.displayName = "CasesScreen";

// ---- グループ名入力モーダル ----
function GroupNameModal({
  title,
  placeholder,
  onClose,
  onSave,
}: {
  title: string;
  placeholder: string;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState("");
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button onClick={onClose}
            className="h-11 flex-1 rounded-xl border border-line text-[15px] font-medium text-ink-secondary">
            キャンセル
          </button>
          <button
            disabled={!name.trim()}
            onClick={() => { if (name.trim()) onSave(name.trim()); }}
            className="h-11 flex-1 rounded-xl bg-accent text-[15px] font-semibold text-white disabled:opacity-40">
            追加
          </button>
        </div>
      }
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && name.trim() && onSave(name.trim())}
        placeholder={placeholder}
        autoFocus
        className="w-full rounded-xl border border-line bg-canvas px-3 py-3 text-[16px] text-ink outline-none placeholder:text-ink-tertiary focus:border-accent"
      />
    </Modal>
  );
}
