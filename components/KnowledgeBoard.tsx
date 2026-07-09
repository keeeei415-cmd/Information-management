"use client";

import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import {
  addChild,
  moveNode,
  newNode,
  outlineMatches,
  readOutline,
  removeNode,
  updateNode,
  type OutlineNode,
} from "@/lib/outline";
import { BODY_PARTS, type Card } from "@/lib/types";
import { Icon } from "./Icon";
import { OutlineRow } from "./OutlineRow";
/**
 * 「知識」タブの本体。
 * 1枚のカード = 1つの「部位」。カードの metadata.outline に階層メモを持つ。
 * 部位カードごとにトグルで開閉でき、中は OutlineRow が再帰描画する。
 */
export function KnowledgeBoard({
  tabId,
  query,
}: {
  tabId: string;
  query: string;
}) {
  const { cards, addCard, patchCard, removeCard } = useApp();

  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const partCards = useMemo(
    () => cards.filter((c) => c.tab_id === tabId),
    [cards, tabId]
  );

  // 検索: 部位名 or 中身にヒットしたカードだけ表示
  const visible = useMemo(() => {
    const q = query.trim();
    if (!q) return partCards;
    return partCards.filter(
      (c) =>
        c.title.toLowerCase().includes(q.toLowerCase()) ||
        outlineMatches(readOutline(c.metadata), q)
    );
  }, [partCards, query]);

  // 検索中は自動で開く
  const searching = query.trim().length > 0;

  const toggleOpen = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  /** ツリーを書き換えて保存する共通処理 */
  const saveTree = (card: Card, tree: OutlineNode[]) =>
    void patchCard(card.id, { metadata: { ...card.metadata, outline: tree } });

  const usedParts = new Set(partCards.map((c) => c.title));
  const remainingParts = BODY_PARTS.filter((p) => !usedParts.has(p));

  const addPart = async (name: string) => {
    await addCard({ tab_id: tabId, title: name, metadata: { outline: [] } });
  };

  return (
    <div className="px-3 pb-28">
      {visible.length === 0 && (
        <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface text-ink-tertiary">
            <Icon name={searching ? "search" : "plus"} size={24} />
          </div>
          <p className="text-[15px] font-medium text-ink-secondary">
            {searching ? "一致する知識がありません" : "部位を追加して知識を書き溜めましょう"}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {visible.map((card) => {
          const tree = readOutline(card.metadata);
          const isOpen = searching || openIds.has(card.id);
          return (
            <section
              key={card.id}
              className="overflow-hidden rounded-card border border-line bg-surface shadow-card"
            >
              {/* 部位ヘッダー */}
              <div className="flex items-center gap-2 px-2.5 py-2.5">
                <button
                  onClick={() => toggleOpen(card.id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-secondary hover:bg-canvas"
                  aria-label={isOpen ? "折りたたむ" : "展開"}
                >
                  <Icon name={isOpen ? "chevronDown" : "chevronRight"} size={18} strokeWidth={2.4} />
                </button>
                <h2 className="flex-1 text-[16px] font-semibold text-ink">{card.title}</h2>
                <button
                  onClick={() => {
                    if (window.confirm(`「${card.title}」を削除しますか?`)) {
                      void removeCard(card.id);
                    }
                  }}
                  aria-label="この部位を削除"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-tertiary hover:bg-red-50 hover:text-danger"
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>

              {/* 中身 (アウトライン) */}
              {isOpen && (
                <div className="border-t border-line px-2 py-2">
                  {tree.map((node) => (
                    <OutlineRow
                      key={node.id}
                      node={node}
                      depth={0}
                      editable={!searching}
                      query={query}
                      onChangeText={(id, text) => saveTree(card, updateNode(tree, id, { text }))}
                      onToggle={(id) =>
                        saveTree(
                          card,
                          updateNode(tree, id, {
                            collapsed: !findCollapsed(tree, id),
                          })
                        )
                      }
                      onAddChild={(id) => saveTree(card, addChild(tree, id, newNode()))}
                      onAddSibling={(id) => saveTree(card, addSiblingAfter(tree, id))}
                      onRemove={(id) => saveTree(card, removeNode(tree, id))}
                      onMove={(id, dir) => saveTree(card, moveNode(tree, id, dir))}
                    />
                  ))}

                  {!searching && (
                    <button
                      onClick={() => saveTree(card, [...tree, newNode()])}
                      className="mt-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-medium text-accent hover:bg-accent-soft"
                    >
                      <Icon name="plus" size={15} /> 項目を追加
                    </button>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* 部位の追加 */}
      {!searching && (
        <div className="mt-3">
          {remainingParts.length > 0 ? (
            <select
              value=""
              onChange={(e) => {
                const val = e.target.value;
                if (val) void addPart(val);
                e.target.value = "";
              }}
              className="w-full appearance-none rounded-card border border-dashed border-line bg-surface px-4 py-3 text-[14px] font-medium text-ink-secondary hover:border-accent hover:text-accent focus:outline-none"
            >
              <option value="">＋ 部位を追加…</option>
              {remainingParts.map((part) => (
                <option key={part} value={part}>{part}</option>
              ))}
            </select>
          ) : (
            <p className="py-2 text-center text-[13px] text-ink-tertiary">
              すべての部位が追加済みです
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// --- ローカル補助関数 ---

/** id ノードの現在の collapsed 値を取得 */
function findCollapsed(nodes: OutlineNode[], id: string): boolean {
  for (const n of nodes) {
    if (n.id === id) return n.collapsed;
    const found = findCollapsed(n.children, id);
    if (found) return found;
  }
  return false;
}

/** id と同じ階層の直後に空ノードを挿入 */
function addSiblingAfter(nodes: OutlineNode[], id: string): OutlineNode[] {
  const index = nodes.findIndex((n) => n.id === id);
  if (index >= 0) {
    const next = [...nodes];
    next.splice(index + 1, 0, newNode());
    return next;
  }
  return nodes.map((n) =>
    n.children.length ? { ...n, children: addSiblingAfter(n.children, id) } : n
  );
}
