"use client";

/**
 * 知識タブ画面。
 * グループ（頸部・肩など）= 折りたたみセクション
 * グループ内 = Notion 風ブロックエディタ（箇条書き・トグル・テキスト）
 *
 * データ構造:
 * - グループ定義カード: title == GROUPS_CARD_TITLE, metadata.groups = GroupDef[]
 * - コンテンツカード: title = グループ名, metadata.blocks = Block[]
 *   ※グループ1つにつき1枚のカードがブロックを持つ
 */

import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { blocksMatch, newBlock, pruneEmpty, readBlocks, type Block } from "@/lib/outline";
import { useApp } from "@/lib/store";
import { type Card } from "@/lib/types";
import { BlockEditor } from "./BlockEditor";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

const GROUPS_CARD_TITLE = "__knowledge_groups__";

interface GroupDef { name: string }

export interface KnowledgeScreenHandle {
  openAddGroup: () => void;
  openAddCard:  () => void; // ここでは「ブロックを追加」に代わり使わないが互換用
}

export const KnowledgeScreen = forwardRef<KnowledgeScreenHandle>((_, ref) => {
  const { cards, addCard, patchCard, tabs } = useApp();

  const [query,       setQuery]       = useState("");
  const [openGroups,  setOpenGroups]  = useState<Set<string>>(new Set());
  const [addingGroup, setAddingGroup] = useState(false);

  useImperativeHandle(ref, () => ({
    openAddGroup: () => setAddingGroup(true),
    openAddCard:  () => setAddingGroup(true), // 知識タブでは＋＝グループ追加
  }));

  const knowledgeTabId = useMemo(
    () => tabs.find((t) => t.name === "知識")?.id ?? null,
    [tabs]
  );

  const allCards = useMemo(
    () => knowledgeTabId ? cards.filter((c) => c.tab_id === knowledgeTabId) : [],
    [cards, knowledgeTabId]
  );

  // グループ定義カード
  const groupsCard = useMemo(
    () => allCards.find((c) => c.title === GROUPS_CARD_TITLE) ?? null,
    [allCards]
  );

  const groupDefs = useMemo<GroupDef[]>(() => {
    const raw = (groupsCard?.metadata as { groups?: GroupDef[] })?.groups;
    return Array.isArray(raw) ? raw : [];
  }, [groupsCard]);

  // グループ名 → コンテンツカード の対応
  const contentCardMap = useMemo(() => {
    const map = new Map<string, Card>();
    allCards.forEach((c) => {
      if (c.title !== GROUPS_CARD_TITLE) map.set(c.title, c);
    });
    return map;
  }, [allCards]);

  const toggleGroup = (name: string) => {
    const willClose = openGroups.has(name);
    // 閉じるときに空行を掃除する
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

  const addGroup = async (name: string) => {
    setAddingGroup(false);
    const trimmed = name.trim();
    if (!trimmed || groupDefs.some((g) => g.name === trimmed)) return;
    const next = [...groupDefs, { name: trimmed }];
    await saveGroupDefs(next);
    // コンテンツカードを作成（空のブロックリスト）
    if (knowledgeTabId) {
      await addCard({
        tab_id: knowledgeTabId,
        title: trimmed,
        metadata: { blocks: [newBlock("text")] },
      });
    }
    setOpenGroups((prev) => new Set(prev).add(trimmed));
  };

  const removeGroup = async (name: string) => {
    if (!window.confirm(`グループ「${name}」とその内容を削除しますか?`)) return;
    await saveGroupDefs(groupDefs.filter((g) => g.name !== name));
    const card = contentCardMap.get(name);
    // カードは削除せずブロックを空にする（データ保持）
    if (card) await patchCard(card.id, { metadata: { blocks: [] } });
  };

  /** グループのブロックを保存する */
  const saveBlocks = (groupName: string, blocks: Block[]) => {
    const card = contentCardMap.get(groupName);
    if (!card || !knowledgeTabId) return;
    void patchCard(card.id, { metadata: { blocks } });
  };

  const searching = query.trim().length > 0;
  const q = query.trim().toLowerCase();

  // 検索: ブロック内テキストにヒットするグループのみ表示
  const visibleGroups = useMemo(() => {
    if (!searching) return groupDefs;
    return groupDefs.filter((g) => {
      const card = contentCardMap.get(g.name);
      const blocks = card ? readBlocks(card.metadata) : [];
      return (
        g.name.toLowerCase().includes(q) ||
        blocksMatch(blocks, q)
      );
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
          const card  = contentCardMap.get(g.name);
          const blocks = card ? readBlocks(card.metadata) : [];
          const isOpen = searching || openGroups.has(g.name);

          return (
            <section
              key={g.name}
              className="overflow-hidden rounded-card border border-line bg-surface shadow-card"
            >
              {/* グループヘッダー */}
              <div className="flex items-center gap-2 px-2.5 py-2.5">
                <button
                  onClick={() => toggleGroup(g.name)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-secondary hover:bg-canvas"
                  aria-label={isOpen ? "折りたたむ" : "展開"}
                >
                  <Icon
                    name={isOpen ? "chevronDown" : "chevronRight"}
                    size={18}
                    strokeWidth={2.4}
                  />
                </button>
                <button onClick={() => toggleGroup(g.name)} className="flex-1 text-left">
                  <span className="text-[16px] font-semibold text-ink">{g.name}</span>
                </button>
                <button
                  onClick={() => void removeGroup(g.name)}
                  aria-label="グループを削除"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-tertiary hover:bg-red-50 hover:text-danger"
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>

              {/* ブロックエディタ */}
              {isOpen && (
                <div className="border-t border-line px-3 py-2">
                  {card ? (
                    <BlockEditor
                      blocks={blocks}
                      onChange={(next) => saveBlocks(g.name, next)}
                    />
                  ) : (
                    <p className="py-4 text-center text-[13px] text-ink-tertiary">
                      読み込み中…
                    </p>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* グループ追加モーダル */}
      {addingGroup && (
        <GroupNameModal
          onClose={() => setAddingGroup(false)}
          onSave={(name) => void addGroup(name)}
        />
      )}
    </div>
  );
});
KnowledgeScreen.displayName = "KnowledgeScreen";

// ---- グループ名入力モーダル ----
function GroupNameModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState("");
  return (
    <Modal
      title="グループを追加"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="h-11 flex-1 rounded-xl border border-line text-[15px] font-medium text-ink-secondary"
          >
            キャンセル
          </button>
          <button
            disabled={!name.trim()}
            onClick={() => { if (name.trim()) onSave(name.trim()); }}
            className="h-11 flex-1 rounded-xl bg-accent text-[15px] font-semibold text-white disabled:opacity-40"
          >
            追加
          </button>
        </div>
      }
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && name.trim() && onSave(name.trim())}
        placeholder="例: 頸部"
        autoFocus
        className="w-full rounded-xl border border-line bg-canvas px-3 py-3 text-[16px] text-ink outline-none placeholder:text-ink-tertiary focus:border-accent"
      />
    </Modal>
  );
}
