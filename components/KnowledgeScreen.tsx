"use client";

/**
 * 知識画面。
 * グループ（頸部・肩など）= 折りたたみセクション（色を選べる）
 * グループ内 = Notion 風ブロックエディタ
 *
 * データ構造:
 * - グループ定義カード: title == GROUPS_CARD_TITLE, metadata.groups = GroupDef[]
 * - コンテンツカード: title = グループ名, metadata.blocks = Block[]
 */

import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { blocksMatch, newBlock, pruneEmpty, readBlocks, type Block } from "@/lib/outline";
import { GROUP_COLORS, GROUP_COLOR_KEYS, getGroupColor, type GroupColor } from "@/lib/groupColors";
import { useApp } from "@/lib/store";
import { type Card } from "@/lib/types";
import { BlockEditor } from "./BlockEditor";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

const GROUPS_CARD_TITLE = "__knowledge_groups__";

interface GroupDef {
  name: string;
  color?: GroupColor;
}

export interface KnowledgeScreenHandle {
  openAddGroup: () => void;
  openAddCard:  () => void;
}

export const KnowledgeScreen = forwardRef<KnowledgeScreenHandle>((_, ref) => {
  const { cards, addCard, patchCard, tabs } = useApp();

  const [query,        setQuery]        = useState("");
  const [openGroups,   setOpenGroups]   = useState<Set<string>>(new Set());
  const [addingGroup,  setAddingGroup]  = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupDef | null>(null);

  useImperativeHandle(ref, () => ({
    openAddGroup: () => setAddingGroup(true),
    openAddCard:  () => setAddingGroup(true),
  }));

  const knowledgeTabId = useMemo(
    () => tabs.find((t) => t.name === "知識")?.id ?? tabs[0]?.id ?? null,
    [tabs]
  );

  const allCards = useMemo(
    () => knowledgeTabId ? cards.filter((c) => c.tab_id === knowledgeTabId) : [],
    [cards, knowledgeTabId]
  );

  const groupsCard = useMemo(
    () => allCards.find((c) => c.title === GROUPS_CARD_TITLE) ?? null,
    [allCards]
  );

  const groupDefs = useMemo<GroupDef[]>(() => {
    const raw = (groupsCard?.metadata as { groups?: GroupDef[] })?.groups;
    return Array.isArray(raw) ? raw : [];
  }, [groupsCard]);

  const contentCardMap = useMemo(() => {
    const map = new Map<string, Card>();
    allCards.forEach((c) => {
      if (c.title !== GROUPS_CARD_TITLE) map.set(c.title, c);
    });
    return map;
  }, [allCards]);

  const toggleGroup = (name: string) => {
    const willClose = openGroups.has(name);
    if (willClose) {
      const card = contentCardMap.get(name);
      if (card) {
        const cleaned = pruneEmpty(readBlocks(card.metadata));
        void patchCard(card.id, { metadata: { blocks: cleaned } });
      }
    }
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const saveGroupDefs = async (defs: GroupDef[]) => {
    if (!knowledgeTabId) return;
    const meta = { groups: defs };
    if (groupsCard) {
      await patchCard(groupsCard.id, { metadata: meta });
    } else {
      await addCard({ tab_id: knowledgeTabId, title: GROUPS_CARD_TITLE, metadata: meta });
    }
  };

  const addGroup = async (name: string, color: GroupColor) => {
    setAddingGroup(false);
    const trimmed = name.trim();
    if (!trimmed || groupDefs.some((g) => g.name === trimmed)) return;
    await saveGroupDefs([...groupDefs, { name: trimmed, color }]);
    if (knowledgeTabId) {
      await addCard({
        tab_id: knowledgeTabId,
        title: trimmed,
        metadata: { blocks: [newBlock("text")] },
      });
    }
    setOpenGroups((prev) => new Set(prev).add(trimmed));
  };

  /** グループ名と色を更新 */
  const updateGroup = async (oldName: string, newName: string, color: GroupColor) => {
    setEditingGroup(null);
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (trimmed !== oldName && groupDefs.some((g) => g.name === trimmed)) {
      window.alert(`「${trimmed}」は既に存在します`);
      return;
    }
    await saveGroupDefs(
      groupDefs.map((g) => (g.name === oldName ? { name: trimmed, color } : g))
    );
    if (trimmed !== oldName) {
      const card = contentCardMap.get(oldName);
      if (card) await patchCard(card.id, { title: trimmed });
      setOpenGroups((prev) => {
        const next = new Set(prev);
        if (next.delete(oldName)) next.add(trimmed);
        return next;
      });
    }
  };

  const removeGroup = async (name: string) => {
    if (!window.confirm(`グループ「${name}」とその内容を削除しますか?`)) return;
    await saveGroupDefs(groupDefs.filter((g) => g.name !== name));
    const card = contentCardMap.get(name);
    if (card) await patchCard(card.id, { metadata: { blocks: [] } });
  };

  const saveBlocks = (groupName: string, blocks: Block[]) => {
    const card = contentCardMap.get(groupName);
    if (!card) return;
    void patchCard(card.id, { metadata: { blocks } });
  };

  const searching = query.trim().length > 0;
  const q = query.trim().toLowerCase();

  const visibleGroups = useMemo(() => {
    if (!searching) return groupDefs;
    return groupDefs.filter((g) => {
      const card = contentCardMap.get(g.name);
      const blocks = card ? readBlocks(card.metadata) : [];
      return g.name.toLowerCase().includes(q) || blocksMatch(blocks, q);
    });
  }, [groupDefs, contentCardMap, searching, q]);

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

      {/* グループ一覧 */}
      <div className="space-y-2 px-3 pt-1 pb-4">
        {visibleGroups.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-20 text-center">
            <p className="text-[15px] font-medium text-ink-secondary">
              {searching
                ? "一致する知識がありません"
                : "右上のフォルダボタンからグループを追加しましょう"}
            </p>
          </div>
        )}

        {visibleGroups.map((g) => {
          const card   = contentCardMap.get(g.name);
          const blocks = card ? readBlocks(card.metadata) : [];
          const isOpen = searching || openGroups.has(g.name);
          const palette = GROUP_COLORS[getGroupColor(g.color)];

          return (
            <section
              key={g.name}
              className="overflow-hidden rounded-card border-[1.5px] shadow-card"
              style={{ borderColor: palette.border, backgroundColor: "#FFFFFF" }}
            >
              {/* グループヘッダー (ここだけ色を塗る) */}
              <div
                className="flex items-center gap-2 px-2.5 py-2.5"
                style={{ backgroundColor: palette.bg }}
              >
                <button
                  onClick={() => toggleGroup(g.name)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg hover:bg-black/5"
                  style={{ color: palette.text }}
                  aria-label={isOpen ? "折りたたむ" : "展開"}
                >
                  <Icon name={isOpen ? "chevronDown" : "chevronRight"} size={18} strokeWidth={2.4} />
                </button>
                <button onClick={() => toggleGroup(g.name)} className="flex-1 text-left">
                  <span className="text-[16px] font-semibold" style={{ color: palette.text }}>
                    {g.name}
                  </span>
                </button>
                <button
                  onClick={() => setEditingGroup(g)}
                  aria-label="グループを編集"
                  className="flex h-7 w-7 items-center justify-center rounded-lg opacity-55 hover:bg-black/5 hover:opacity-100"
                  style={{ color: palette.text }}
                >
                  <Icon name="edit" size={15} />
                </button>
                <button
                  onClick={() => void removeGroup(g.name)}
                  aria-label="グループを削除"
                  className="flex h-7 w-7 items-center justify-center rounded-lg opacity-55 hover:bg-red-50 hover:text-danger hover:opacity-100"
                  style={{ color: palette.text }}
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>

              {/* ブロックエディタ (中身は白) */}
              {isOpen && (
                <div className="border-t bg-surface px-3 py-2" style={{ borderColor: palette.border }}>
                  {card ? (
                    <BlockEditor
                      blocks={blocks}
                      onChange={(next) => saveBlocks(g.name, next)}
                    />
                  ) : (
                    <p className="py-4 text-center text-[13px] text-ink-tertiary">読み込み中…</p>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* グループ追加モーダル */}
      {addingGroup && (
        <GroupModal
          title="グループを追加"
          confirmLabel="追加"
          onClose={() => setAddingGroup(false)}
          onSave={(name, color) => void addGroup(name, color)}
        />
      )}

      {/* グループ編集モーダル */}
      {editingGroup && (
        <GroupModal
          title="グループを編集"
          confirmLabel="保存"
          initialName={editingGroup.name}
          initialColor={getGroupColor(editingGroup.color)}
          onClose={() => setEditingGroup(null)}
          onSave={(name, color) => void updateGroup(editingGroup.name, name, color)}
        />
      )}
    </div>
  );
});
KnowledgeScreen.displayName = "KnowledgeScreen";

// ---- グループ名 + 色 入力モーダル ----
function GroupModal({
  title,
  confirmLabel,
  initialName = "",
  initialColor = "none",
  onClose,
  onSave,
}: {
  title: string;
  confirmLabel: string;
  initialName?: string;
  initialColor?: GroupColor;
  onClose: () => void;
  onSave: (name: string, color: GroupColor) => void;
}) {
  const [name, setName]   = useState(initialName);
  const [color, setColor] = useState<GroupColor>(initialColor);
  const canSave = name.trim().length > 0;

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
            disabled={!canSave}
            onClick={() => { if (canSave) onSave(name.trim(), color); }}
            className="h-11 flex-1 rounded-xl bg-accent text-[15px] font-semibold text-white disabled:opacity-40">
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink-secondary">グループ名</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && canSave && onSave(name.trim(), color)}
            placeholder="例: 頸部"
            autoFocus
            className="w-full rounded-xl border border-line bg-canvas px-3 py-3 text-[16px] text-ink outline-none placeholder:text-ink-tertiary focus:border-accent"
          />
        </div>

        <div>
          <label className="mb-2 block text-[13px] font-medium text-ink-secondary">色</label>
          <div className="flex flex-wrap gap-2.5">
            {GROUP_COLOR_KEYS.map((key) => {
              const c = GROUP_COLORS[key];
              const selected = color === key;
              return (
                <button
                  key={key}
                  onClick={() => setColor(key)}
                  aria-label={c.label}
                  title={c.label}
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-transform ${
                    selected ? "scale-110 border-accent" : "border-line hover:scale-105"
                  }`}
                  style={{ backgroundColor: c.bg }}
                >
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: key === "none" ? "transparent" : c.dot, border: key === "none" ? "1.5px dashed #C7C7CC" : "none" }}
                  />
                </button>
              );
            })}
          </div>
          {/* プレビュー */}
          <div
            className="mt-3 overflow-hidden rounded-card border-[1.5px]"
            style={{ borderColor: GROUP_COLORS[color].border }}
          >
            <div className="px-3 py-2.5" style={{ backgroundColor: GROUP_COLORS[color].bg }}>
              <span className="text-[15px] font-semibold" style={{ color: GROUP_COLORS[color].text }}>
                {name.trim() || "プレビュー"}
              </span>
            </div>
            <div className="bg-surface px-3 py-2 text-[13px] text-ink-tertiary">
              中身は白のまま
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
