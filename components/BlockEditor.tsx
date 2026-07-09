"use client";

/**
 * Notion 風ブロックエディタ。
 * グループ内のブロック一覧を受け取り、編集 UI を描画する。
 * 状態は持たず、変更はすべて onSave(newBlocks) で親に返す。
 */

import { useEffect, useRef, useState } from "react";
import {
  addChildBlock,
  insertAfter,
  moveBlock,
  newBlock,
  removeBlock,
  updateBlock,
  type Block,
  type BlockType,
} from "@/lib/outline";
import { Icon } from "./Icon";

// ---- ブロック種別メニュー ----
const BLOCK_TYPES: { type: BlockType; icon: string; label: string }[] = [
  { type: "bullet", icon: "dot",    label: "箇条書き" },
  { type: "toggle", icon: "chevronRight", label: "トグル" },
  { type: "text",   icon: "edit",   label: "テキスト" },
];

// ---- 1行コンポーネント ----
function BlockRow({
  block,
  depth,
  onSave,     // ツリー全体を保存
  blocks,     // ツリー全体（更新関数に渡す）
  onChangeAll,
}: {
  block: Block;
  depth: number;
  onSave: (b: Block[]) => void;
  blocks: Block[];
  onChangeAll: (b: Block[]) => void;
}) {
  const [editing, setEditing]   = useState(block.text === "");
  const [showMenu, setShowMenu] = useState(false);
  const textRef = useRef<string>(block.text);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const menuRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      const el = inputRef.current;
      el.focus();
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editing]);

  // メニュー外クリックで閉じる
  useEffect(() => {
    if (!showMenu) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showMenu]);

  const commit = () => {
    onChangeAll(updateBlock(blocks, block.id, { text: textRef.current }));
    setEditing(false);
  };

  const addBlock = (type: BlockType) => {
    setShowMenu(false);
    const nb = newBlock(type);
    onChangeAll(insertAfter(blocks, block.id, nb));
  };

  const addChild = (type: BlockType) => {
    setShowMenu(false);
    const nb = newBlock(type);
    onChangeAll(addChildBlock(blocks, block.id, nb));
  };

  const toggleCollapse = () =>
    onChangeAll(updateBlock(blocks, block.id, { collapsed: !block.collapsed }));

  const del = () => {
    const next = removeBlock(blocks, block.id);
    onChangeAll(next);
    onSave(next);
  };

  return (
    <div>
      <div
        className="group/row flex items-start gap-0.5 py-0.5"
        style={{ paddingLeft: depth * 20 }}
      >
        {/* ＋ ボタン (常に薄く、ホバーで濃く) */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu((v) => !v)}
            aria-label="ブロックを追加"
            className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink-tertiary/40 hover:bg-canvas hover:text-ink-secondary"
          >
            <Icon name="plus" size={14} strokeWidth={2} />
          </button>

          {/* ブロック種別メニュー */}
          {showMenu && (
            <div className="absolute left-6 top-0 z-50 overflow-hidden rounded-xl border border-line bg-surface shadow-modal">
              <p className="border-b border-line px-3 py-1.5 text-[11px] font-medium text-ink-tertiary">
                種類を選択
              </p>
              {/* 同じ階層に追加 */}
              {BLOCK_TYPES.map((bt) => (
                <button
                  key={bt.type}
                  onClick={() => addBlock(bt.type)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-[14px] text-ink hover:bg-canvas"
                >
                  <Icon name={bt.icon} size={15} className="text-ink-secondary" />
                  {bt.label}
                </button>
              ))}
              {/* トグルの中に追加 */}
              {block.type === "toggle" && (
                <>
                  <p className="border-t border-line px-3 py-1.5 text-[11px] font-medium text-ink-tertiary">
                    この中に追加
                  </p>
                  {BLOCK_TYPES.map((bt) => (
                    <button
                      key={"child-" + bt.type}
                      onClick={() => addChild(bt.type)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-[14px] text-ink hover:bg-canvas"
                    >
                      <Icon name={bt.icon} size={15} className="text-ink-secondary" />
                      {bt.label}（中に）
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* ブロック左アイコン */}
        {block.type === "toggle" ? (
          <button
            onClick={toggleCollapse}
            aria-label={block.collapsed ? "展開" : "折りたたむ"}
            className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink-secondary hover:bg-canvas"
          >
            <Icon
              name={block.collapsed ? "chevronRight" : "chevronDown"}
              size={14}
              strokeWidth={2.4}
            />
          </button>
        ) : block.type === "bullet" ? (
          <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink-tertiary" />
        ) : (
          <span className="w-2 shrink-0" />
        )}

        {/* テキスト本体 */}
        {editing ? (
          <textarea
            ref={inputRef}
            defaultValue={block.text}
            rows={1}
            onChange={(e) => {
              textRef.current = e.target.value;
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                commit();
                // 同じ種類で次の行を追加
                const nb = newBlock(block.type === "toggle" ? "bullet" : block.type);
                onChangeAll(insertAfter(blocks, block.id, nb));
              }
              if (e.key === "Escape") commit();
            }}
            className={`mt-0.5 flex-1 resize-none rounded border border-accent bg-surface px-1.5 py-0.5 text-[14px] leading-relaxed text-ink outline-none ${
              block.type === "toggle" ? "font-medium" : ""
            }`}
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className={`mt-0.5 flex-1 whitespace-pre-wrap break-words text-left text-[14px] leading-relaxed ${
              block.type === "toggle"
                ? "font-medium text-ink"
                : block.type === "text"
                ? "text-ink"
                : "text-ink"
            } ${block.text ? "" : "text-ink-tertiary"}`}
          >
            {block.text || "入力…"}
          </button>
        )}

        {/* 操作ボタン (ホバーで表示) */}
        {!editing && (
          <div className="ml-1 mt-0.5 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100">
            <button
              onClick={() => onChangeAll(moveBlock(blocks, block.id, -1))}
              aria-label="上へ"
              className="flex h-5 w-5 items-center justify-center rounded text-ink-tertiary hover:bg-canvas hover:text-ink"
            >
              <Icon name="up" size={11} />
            </button>
            <button
              onClick={() => onChangeAll(moveBlock(blocks, block.id, 1))}
              aria-label="下へ"
              className="flex h-5 w-5 items-center justify-center rounded text-ink-tertiary hover:bg-canvas hover:text-ink"
            >
              <Icon name="down" size={11} />
            </button>
            <button
              onClick={del}
              aria-label="削除"
              className="flex h-5 w-5 items-center justify-center rounded text-ink-tertiary hover:bg-red-50 hover:text-danger"
            >
              <Icon name="trash" size={11} />
            </button>
          </div>
        )}
      </div>

      {/* 子ブロック (トグルが開いているとき) */}
      {block.type === "toggle" && !block.collapsed && (
        <div
          className="ml-5 border-l border-line pl-1"
          style={{ marginLeft: depth * 20 + 20 }}
        >
          {block.children.map((child) => (
            <BlockRow
              key={child.id}
              block={child}
              depth={0}
              blocks={blocks}
              onSave={onSave}
              onChangeAll={onChangeAll}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ---- 公開コンポーネント ----
export function BlockEditor({
  blocks,
  onChange,
  onSave,
}: {
  blocks: Block[];
  onChange: (b: Block[]) => void;
  onSave: (b: Block[]) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showMenu]);

  const addRoot = (type: BlockType) => {
    setShowMenu(false);
    const nb = newBlock(type);
    const next = [...blocks, nb];
    onChange(next);
  };

  return (
    <div className="space-y-0.5 py-1">
      {blocks.map((block) => (
        <BlockRow
          key={block.id}
          block={block}
          depth={0}
          blocks={blocks}
          onSave={onSave}
          onChangeAll={(next) => { onChange(next); onSave(next); }}
        />
      ))}

      {/* 末尾の追加ボタン */}
      <div className="relative pt-1" ref={menuRef}>
        <button
          onClick={() => setShowMenu((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] text-ink-tertiary hover:bg-canvas hover:text-ink-secondary"
        >
          <Icon name="plus" size={14} />
          ブロックを追加
        </button>
        {showMenu && (
          <div className="absolute left-0 top-8 z-50 overflow-hidden rounded-xl border border-line bg-surface shadow-modal">
            {BLOCK_TYPES.map((bt) => (
              <button
                key={bt.type}
                onClick={() => addRoot(bt.type)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-[14px] text-ink hover:bg-canvas"
              >
                <Icon name={bt.icon} size={15} className="text-ink-secondary" />
                {bt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
