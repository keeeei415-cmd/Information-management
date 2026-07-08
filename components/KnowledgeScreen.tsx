"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { BODY_PARTS, type Card } from "@/lib/types";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

export function KnowledgeScreen() {
  const { cards, addCard, patchCard, removeCard, tabs } = useApp();

  const [activeGroup, setActiveGroup] = useState<string>("すべて");
  const [query, setQuery]             = useState("");
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [creating, setCreating]       = useState(false);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const knowledgeTabId = useMemo(
    () => tabs.find((t) => t.name === "知識")?.id ?? null,
    [tabs]
  );

  const knowledgeCards = useMemo(
    () => knowledgeTabId ? cards.filter((c) => c.tab_id === knowledgeTabId) : [],
    [cards, knowledgeTabId]
  );

  const groups = useMemo(() => {
    const set = new Set<string>();
    knowledgeCards.forEach((c) => { if (c.category) set.add(c.category); });
    return ["すべて", ...Array.from(set)];
  }, [knowledgeCards]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return knowledgeCards.filter((c) => {
      const matchGroup = activeGroup === "すべて" || c.category === activeGroup;
      const matchQuery = !q ||
        c.title.toLowerCase().includes(q) ||
        c.content.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q));
      return matchGroup && matchQuery;
    });
  }, [knowledgeCards, activeGroup, query]);

  const addGroup = () => {
    const name = newGroupName.trim();
    if (!name) return;
    setNewGroupName("");
    setAddingGroup(false);
    setActiveGroup(name);
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

      {/* グループタブ */}
      <div className="border-b border-line">
        <div className="flex gap-1.5 overflow-x-auto px-3 pb-2 scrollbar-none">
          {groups.map((g) => (
            <button
              key={g}
              onClick={() => setActiveGroup(g)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                activeGroup === g
                  ? "bg-ink text-white"
                  : "border border-line bg-surface text-ink-secondary"
              }`}
            >
              {g}
            </button>
          ))}

          {addingGroup ? (
            <div className="flex shrink-0 items-center gap-1.5">
              <input
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addGroup()}
                autoFocus
                placeholder="グループ名"
                className="h-8 w-24 rounded-full border border-accent bg-surface px-3 text-[13px] text-ink outline-none"
              />
              <button
                onClick={addGroup}
                className="h-8 rounded-full bg-accent px-3 text-[13px] font-medium text-white"
              >
                追加
              </button>
              <button
                onClick={() => { setAddingGroup(false); setNewGroupName(""); }}
                className="h-8 w-8 flex items-center justify-center rounded-full border border-line text-ink-tertiary"
              >
                <Icon name="close" size={14} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingGroup(true)}
              className="shrink-0 rounded-full border border-dashed border-line px-3.5 py-1.5 text-[13px] text-ink-tertiary hover:border-accent hover:text-accent"
            >
              ＋ グループ
            </button>
          )}
        </div>
      </div>

      {/* カード一覧 */}
      <div className="flex flex-col gap-2 px-3 pt-3">
        {visible.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface text-ink-tertiary">
              <Icon name="plus" size={24} />
            </div>
            <p className="text-[15px] font-medium text-ink-secondary">
              {query ? "一致する知識がありません" : "＋ボタンから知識を追加しましょう"}
            </p>
          </div>
        )}

        {visible.map((card) => (
          <article
            key={card.id}
            className="rounded-card border border-line bg-surface shadow-card"
            style={{ borderLeft: "3px solid #007AFF" }}
          >
            <div className="p-3.5">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-[15px] font-semibold text-ink">{card.title}</h3>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => copyCard(card)}
                    aria-label="コピー"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-canvas text-ink-secondary hover:text-accent"
                  >
                    <Icon name="edit" size={15} />
                  </button>
                  <button
                    onClick={() => setEditingCard(card)}
                    aria-label="編集"
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-canvas text-ink-secondary hover:text-accent"
                  >
                    <Icon name="settings" size={15} />
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
              {card.category && (
                <p className="mt-1.5 text-[12px] text-ink-tertiary">{card.category}</p>
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

      {/* FAB */}
      <button
        onClick={() => setCreating(true)}
        aria-label="知識を追加"
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-modal transition-transform active:scale-95"
      >
        <Icon name="plus" size={26} strokeWidth={2.2} />
      </button>

      {creating && knowledgeTabId && (
        <KnowledgeCardEditor
          onClose={() => setCreating(false)}
          onSave={(input) => {
            void addCard({ tab_id: knowledgeTabId, ...input });
            setCreating(false);
          }}
          existingGroups={groups.filter((g) => g !== "すべて")}
        />
      )}
      {editingCard && knowledgeTabId && (
        <KnowledgeCardEditor
          card={editingCard}
          onClose={() => setEditingCard(null)}
          onSave={(input) => {
            void patchCard(editingCard.id, input);
            setEditingCard(null);
          }}
          existingGroups={groups.filter((g) => g !== "すべて")}
        />
      )}
    </div>
  );
}

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
    setTags((prev) => prev.includes(part) ? prev.filter((t) => t !== part) : [...prev, part]);

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
          {existingGroups.length > 0 && (
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setCustomGroup(""); }}
              className="mb-2 w-full appearance-none rounded-xl border border-line bg-canvas px-3 py-2.5 text-[15px] text-ink outline-none focus:border-accent"
            >
              <option value="">未分類</option>
              {existingGroups.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          )}
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
