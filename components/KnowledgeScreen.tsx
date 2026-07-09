"use client";

import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { BODY_PARTS, type Card } from "@/lib/types";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

const UNGROUPED = "未分類";
const GROUPS_CARD_TITLE = "__groups__";

export interface KnowledgeScreenHandle {
  openAddGroup: () => void;
  openAddCard:  () => void;
}

export const KnowledgeScreen = forwardRef<KnowledgeScreenHandle>((_, ref) => {
  const { cards, addCard, patchCard, removeCard, tabs } = useApp();

  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [creating, setCreating] = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  useImperativeHandle(ref, () => ({
    openAddGroup: () => setAddingGroup(true),
    openAddCard:  () => setCreating(true),
  }));

  const knowledgeTabId = useMemo(
    () => tabs.find((t) => t.name === "知識")?.id ?? null,
    [tabs]
  );

  const allKnowledgeCards = useMemo(
    () => (knowledgeTabId ? cards.filter((c) => c.tab_id === knowledgeTabId) : []),
    [cards, knowledgeTabId]
  );

  // グループ保存用の特殊カード
  const groupsCard = useMemo(
    () => allKnowledgeCards.find((c) => c.title === GROUPS_CARD_TITLE) ?? null,
    [allKnowledgeCards]
  );

  // 表示対象の知識カード (特殊カードを除く)
  const knowledgeCards = useMemo(
    () => allKnowledgeCards.filter((c) => c.title !== GROUPS_CARD_TITLE),
    [allKnowledgeCards]
  );

  // 保存済みグループ + カードから導出したグループ
  const storedGroups = useMemo<string[]>(() => {
    const raw = (groupsCard?.metadata as { groups?: string[] })?.groups;
    return Array.isArray(raw) ? raw : [];
  }, [groupsCard]);

  const groups = useMemo(() => {
    const set = new Set<string>(storedGroups);
    knowledgeCards.forEach((c) => { if (c.category) set.add(c.category); });
    return Array.from(set);
  }, [storedGroups, knowledgeCards]);

  const searching = query.trim().length > 0;

  /** グループごとのカード (検索適用済み) */
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
    knowledgeCards.filter(match).forEach((c) => {
      const key = c.category && map.has(c.category) ? c.category : (c.category || UNGROUPED);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });
    return map;
  }, [groups, knowledgeCards, query]);

  /** 表示するセクション: グループ順 + 未分類は最後。検索中はヒット0件のグループを隠す */
  const sections = useMemo(() => {
    const names = [...groups, UNGROUPED];
    return names.filter((name) => {
      const list = cardsByGroup.get(name) ?? [];
      if (searching) return list.length > 0;
      if (name === UNGROUPED) return list.length > 0; // 未分類は空なら隠す
      return true;
    });
  }, [groups, cardsByGroup, searching]);

  const toggleGroup = (name: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  /** グループを追加して保存 */
  const addGroup = async () => {
    const name = newGroupName.trim();
    setNewGroupName("");
    setAddingGroup(false);
    if (!name || groups.includes(name) || name === UNGROUPED || !knowledgeTabId) return;
    const nextGroups = [...storedGroups, name];
    if (groupsCard) {
      await patchCard(groupsCard.id, { metadata: { groups: nextGroups } });
    } else {
      await addCard({
        tab_id: knowledgeTabId,
        title: GROUPS_CARD_TITLE,
        metadata: { groups: nextGroups },
      });
    }
    setOpenGroups((prev) => new Set(prev).add(name));
  };

  /** グループ削除: 中のカードは未分類へ */
  const removeGroup = async (name: string) => {
    if (!window.confirm(`グループ「${name}」を削除しますか?\n中のカードは「${UNGROUPED}」に移動します。`)) return;
    const members = knowledgeCards.filter((c) => c.category === name);
    for (const m of members) {
      await patchCard(m.id, { category: null });
    }
    if (groupsCard) {
      await patchCard(groupsCard.id, {
        metadata: { groups: storedGroups.filter((g) => g !== name) },
      });
    }
  };

  const copyCard = (card: Card) => {
    if (!knowledgeTabId) return;
    void addCard({
      tab_id: knowledgeTabId,
      title: `${card.title} (コピー)`,
      content: card.content,
      category: card.category ?? undefined,
      tags: card.tags,
      color: card.color,
      metadata: card.metadata,
    });
  };

  return (
    <div>
      {/* 検索 */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3">
          <Icon name="search" size={16} className="shrink-0 text-ink-tertiary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="知識を検索…"
            className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-tertiary"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="クリア">
              <Icon name="close" size={14} className="text-ink-tertiary" />
            </button>
          )}
        </div>
      </div>

      {/* グループセクション一覧 */}
      <div className="space-y-2 px-3 pt-1">
        {sections.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface text-ink-tertiary">
              <Icon name={searching ? "search" : "plus"} size={24} />
            </div>
            <p className="text-[15px] font-medium text-ink-secondary">
              {searching ? "一致する知識がありません" : "グループを作成して知識を整理しましょう"}
            </p>
          </div>
        )}

        {sections.map((name) => {
          const list = cardsByGroup.get(name) ?? [];
          const isOpen = searching || openGroups.has(name);
          return (
            <section key={name} className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
              {/* グループヘッダー */}
              <div className="flex items-center gap-2 px-2.5 py-2.5">
                <button
                  onClick={() => toggleGroup(name)}
                  aria-label={isOpen ? "折りたたむ" : "展開"}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-secondary hover:bg-canvas"
                >
                  <Icon name={isOpen ? "chevronDown" : "chevronRight"} size={18} strokeWidth={2.4} />
                </button>
                <button onClick={() => toggleGroup(name)} className="flex-1 text-left">
                  <span className="text-[16px] font-semibold text-ink">{name}</span>
                  <span className="ml-2 text-[13px] text-ink-tertiary">{list.length}</span>
                </button>
                {name !== UNGROUPED && (
                  <button
                    onClick={() => void removeGroup(name)}
                    aria-label="グループを削除"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-tertiary hover:bg-red-50 hover:text-danger"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                )}
              </div>

              {/* カード一覧 */}
              {isOpen && (
                <div className="space-y-2 border-t border-line bg-canvas/50 p-2.5">
                  {list.length === 0 && (
                    <p className="py-3 text-center text-[13px] text-ink-tertiary">
                      カードがありません。＋ボタンから追加できます
                    </p>
                  )}
                  {list.map((card) => (
                    <article
                      key={card.id}
                      className="rounded-xl border border-line bg-surface"
                      style={{ borderLeft: "3px solid #007AFF" }}
                    >
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-[15px] font-semibold text-ink">{card.title}</h3>
                          <div className="flex shrink-0 gap-1">
                            <button
                              onClick={() => copyCard(card)}
                              aria-label="コピー"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-canvas text-ink-secondary hover:text-accent"
                            >
                              <Icon name="copy" size={15} />
                            </button>
                            <button
                              onClick={() => setEditingCard(card)}
                              aria-label="編集"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-canvas text-ink-secondary hover:text-accent"
                            >
                              <Icon name="edit" size={15} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`「${card.title}」を削除しますか?`)) void removeCard(card.id);
                              }}
                              aria-label="削除"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-canvas text-ink-secondary hover:text-danger"
                            >
                              <Icon name="trash" size={15} />
                            </button>
                          </div>
                        </div>
                        {card.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {card.tags.map((t) => (
                              <span key={t} className="rounded-full bg-accent-soft px-2 py-0.5 text-[12px] font-medium text-accent">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                        {card.content && (
                          <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-[13px] leading-relaxed text-ink-secondary">
                            {card.content}
                          </p>
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

      {/* グループ追加 */}
      {!searching && (
        <div className="px-3 pt-2">
          {addingGroup ? (
            <div className="flex items-center gap-2 rounded-card border border-line bg-surface p-2.5">
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void addGroup()}
                autoFocus
                placeholder="グループ名 (例: 頚部)"
                className="h-10 flex-1 rounded-xl border border-accent bg-canvas px-3 text-[15px] text-ink outline-none"
              />
              <button
                onClick={() => void addGroup()}
                disabled={!newGroupName.trim()}
                className="h-10 rounded-xl bg-accent px-4 text-[14px] font-semibold text-white disabled:opacity-40"
              >
                追加
              </button>
              <button
                onClick={() => { setAddingGroup(false); setNewGroupName(""); }}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-ink-tertiary"
                aria-label="キャンセル"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingGroup(true)}
              className="flex w-full items-center justify-center gap-1.5 rounded-card border border-dashed border-line bg-surface py-3 text-[14px] font-medium text-ink-secondary hover:border-accent hover:text-accent"
            >
              <Icon name="plus" size={18} /> グループを追加
            </button>
          )}
        </div>
      )}

      {/* モーダル */}
      {creating && knowledgeTabId && (
        <KnowledgeCardEditor
          onClose={() => setCreating(false)}
          onSave={(input) => {
            void addCard({ tab_id: knowledgeTabId, ...input });
            if (input.category) setOpenGroups((prev) => new Set(prev).add(input.category!));
            setCreating(false);
          }}
          existingGroups={groups}
        />
      )}
      {editingCard && (
        <KnowledgeCardEditor
          card={editingCard}
          onClose={() => setEditingCard(null)}
          onSave={(input) => {
            void patchCard(editingCard.id, input);
            setEditingCard(null);
          }}
          existingGroups={groups}
        />
      )}
    </div>
  );
});
KnowledgeScreen.displayName = "KnowledgeScreen";

// ---- 知識カード専用エディタ ----
function KnowledgeCardEditor({
  card,
  onClose,
  onSave,
  existingGroups,
}: {
  card?: Card;
  onClose: () => void;
  onSave: (input: { title: string; content: string; category: string | null; tags: string[] }) => void;
  existingGroups: string[];
}) {
  const [title, setTitle]       = useState(card?.title ?? "");
  const [content, setContent]   = useState(card?.content ?? "");
  const [category, setCategory] = useState(card?.category ?? "");
  const [customGroup, setCustomGroup] = useState("");
  const [tags, setTags]         = useState<string[]>(card?.tags ?? []);

  const finalCategory = customGroup.trim() || category || null;

  const toggleTag = (part: string) =>
    setTags((prev) => (prev.includes(part) ? prev.filter((t) => t !== part) : [...prev, part]));

  return (
    <Modal
      title={card ? "知識を編集" : "新しい知識"}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button onClick={onClose} className="h-11 flex-1 rounded-xl border border-line text-[15px] font-medium text-ink-secondary">
            キャンセル
          </button>
          <button
            disabled={!title.trim()}
            onClick={() => onSave({ title: title.trim(), content, category: finalCategory, tags })}
            className="h-11 flex-1 rounded-xl bg-accent text-[15px] font-semibold text-white disabled:opacity-40"
          >
            保存
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink-secondary">タイトル <span className="text-danger">*</span></label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 寝違え"
            autoFocus
            className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-[15px] text-ink outline-none placeholder:text-ink-tertiary focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink-secondary">グループ</label>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setCustomGroup(""); }}
            className="mb-2 w-full appearance-none rounded-xl border border-line bg-canvas px-3 py-2.5 text-[15px] text-ink outline-none focus:border-accent"
          >
            <option value="">未分類</option>
            {existingGroups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <input
            value={customGroup}
            onChange={(e) => { setCustomGroup(e.target.value); setCategory(""); }}
            placeholder="または新しいグループ名を入力…"
            className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-[15px] text-ink outline-none placeholder:text-ink-tertiary focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink-secondary">部位</label>
          {tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[13px] font-medium text-white">
                  {t}
                  <button onClick={() => toggleTag(t)} className="opacity-70 hover:opacity-100">
                    <Icon name="close" size={11} strokeWidth={2.5} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <select
            value=""
            onChange={(e) => { if (e.target.value) toggleTag(e.target.value); e.target.value = ""; }}
            className="w-full appearance-none rounded-xl border border-line bg-canvas px-3 py-2.5 text-[15px] text-ink outline-none focus:border-accent"
          >
            <option value="">＋ 部位を選択…</option>
            {BODY_PARTS.filter((p) => !tags.includes(p)).map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink-secondary">内容</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="治療のポイント・アプローチなど"
            rows={6}
            className="w-full resize-y rounded-xl border border-line bg-canvas px-3 py-2.5 text-[15px] text-ink outline-none placeholder:text-ink-tertiary focus:border-accent"
          />
        </div>
      </div>
    </Modal>
  );
}
