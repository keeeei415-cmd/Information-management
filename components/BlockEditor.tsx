"use client";

/**
 * Notion 風ブロックエディタ。
 *
 * 仕様:
 * - グループ内は自由にテキスト行を入力できる (Enter で次の行)
 * - 各行の先頭に半透明の ＋ ボタン → トグルなどを追加
 * - トグルの中にさらにトグルを入れ子にできる (深さ無制限)
 * - トグルの中に何行でもテキストを書ける
 * - トグルのタイトルで Enter → トグルの中に行を追加
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

// ＋メニューの選択肢 (今後ここに追加していく)
const ADD_MENU: { type: BlockType; icon: string; label: string }[] = [
  { type: "text",   icon: "edit",         label: "テキスト行" },
  { type: "bullet", icon: "dot",          label: "箇条書き" },
  { type: "toggle", icon: "chevronRight", label: "トグル" },
];

/** ＋ボタンとそのメニュー */
function AddMenu({
  faint = true,
  onSelect,
  extraLabel,
  onSelectChild,
}: {
  faint?: boolean;
  onSelect: (t: BlockType) => void;
  /** トグル行のとき「この中に追加」メニューも出す */
  extraLabel?: string;
  onSelectChild?: (t: BlockType) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="追加"
        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded transition-colors ${
          faint
            ? "text-ink-tertiary/35 hover:bg-canvas hover:text-ink-secondary"
            : "text-ink-secondary hover:bg-canvas"
        }`}
      >
        <Icon name="plus" size={15} strokeWidth={2} />
      </button>
      {open && (
        <div className="absolute left-7 top-0 z-50 min-w-[170px] overflow-hidden rounded-xl border border-line bg-surface shadow-modal">
          {ADD_MENU.map((m) => (
            <button
              key={m.type}
              onClick={() => { setOpen(false); onSelect(m.type); }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[14px] text-ink hover:bg-canvas"
            >
              <Icon name={m.icon} size={15} className="text-ink-secondary" />
              {m.label}
            </button>
          ))}
          {onSelectChild && (
            <>
              <p className="border-t border-line px-3.5 py-1.5 text-[11px] font-medium text-ink-tertiary">
                {extraLabel ?? "この中に追加"}
              </p>
              {ADD_MENU.map((m) => (
                <button
                  key={"c" + m.type}
                  onClick={() => { setOpen(false); onSelectChild(m.type); }}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[14px] text-ink hover:bg-canvas"
                >
                  <Icon name={m.icon} size={15} className="text-ink-secondary" />
                  {m.label}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** 1行 (再帰) */
function BlockRow({
  block,
  blocks,
  apply,
}: {
  block: Block;
  blocks: Block[];
  /** ツリー全体を差し替えて保存する */
  apply: (next: Block[]) => void;
}) {
  const [editing, setEditing] = useState(block.text === "");
  const textRef  = useRef(block.text);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // 日本語入力(IME)の変換中かどうか
  const composingRef = useRef(false);

  useEffect(() => {
    if (editing && inputRef.current) {
      const el = inputRef.current;
      el.focus();
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editing]);

  /** 編集終了。空ならブロックごと削除する */
  const commit = () => {
    const text = textRef.current.trim();
    setEditing(false);
    if (!text) {
      // 空行は削除（ただし子を持つトグルは残す）
      if (block.children.length === 0) {
        apply(removeBlock(blocks, block.id));
        return;
      }
    }
    apply(updateBlock(blocks, block.id, { text: textRef.current }));
  };

  const isToggle = block.type === "toggle";

  return (
    <div>
      <div className="group/row flex items-start gap-0.5">
        {/* 半透明の ＋ */}
        <AddMenu
          onSelect={(t) => apply(insertAfter(blocks, block.id, newBlock(t)))}
          onSelectChild={isToggle ? (t) => apply(addChildBlock(blocks, block.id, newBlock(t))) : undefined}
        />

        {/* 行頭マーク */}
        {isToggle ? (
          <button
            onClick={() => apply(updateBlock(blocks, block.id, { collapsed: !block.collapsed }))}
            aria-label={block.collapsed ? "展開" : "折りたたむ"}
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-secondary hover:bg-canvas"
          >
            <Icon name={block.collapsed ? "chevronRight" : "chevronDown"} size={15} strokeWidth={2.4} />
          </button>
        ) : block.type === "bullet" ? (
          <span className="mx-2 mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink-tertiary" />
        ) : (
          <span className="w-1.5 shrink-0" />
        )}

        {/* テキスト */}
        {editing ? (
          <textarea
            ref={inputRef}
            defaultValue={block.text}
            rows={1}
            onCompositionStart={() => { composingRef.current = true; }}
            onCompositionEnd={() => { composingRef.current = false; }}
            onChange={(e) => {
              textRef.current = e.target.value;
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight}px`;
            }}
            onBlur={commit}
            onKeyDown={(e) => {
              // IME 変換確定の Enter は無視する（日本語入力対策）
              if (e.key === "Enter" && (composingRef.current || e.nativeEvent.isComposing)) {
                return;
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const t = textRef.current;
                setEditing(false);

                // 空行で Enter → 何もしない（行を増やさない）
                if (!t.trim()) {
                  if (block.children.length === 0) {
                    apply(removeBlock(blocks, block.id));
                  }
                  return;
                }

                if (isToggle) {
                  // トグルで Enter → 中にテキスト行を追加
                  let next = updateBlock(blocks, block.id, { text: t, collapsed: false });
                  next = addChildBlock(next, block.id, newBlock("text"));
                  apply(next);
                } else {
                  // 通常行 → 同じ階層に次の行
                  let next = updateBlock(blocks, block.id, { text: t });
                  next = insertAfter(next, block.id, newBlock(block.type));
                  apply(next);
                }
              }
              if (e.key === "Escape") commit();
              // 空行で Backspace → 行を削除
              if (e.key === "Backspace" && !textRef.current && block.children.length === 0) {
                e.preventDefault();
                setEditing(false);
                apply(removeBlock(blocks, block.id));
              }
            }}
            className={`mt-0.5 flex-1 resize-none rounded border border-accent bg-surface px-1.5 py-1 text-[14px] leading-relaxed text-ink outline-none ${
              isToggle ? "font-medium" : ""
            }`}
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className={`mt-0.5 min-h-[28px] flex-1 whitespace-pre-wrap break-words px-1.5 py-1 text-left text-[14px] leading-relaxed ${
              isToggle ? "font-medium" : ""
            } ${block.text ? "text-ink" : "text-ink-tertiary"}`}
          >
            {block.text || "入力…"}
          </button>
        )}

        {/* ホバー時の操作 */}
        {!editing && (
          <div className="ml-0.5 mt-1 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100">
            <button
              onClick={() => apply(moveBlock(blocks, block.id, -1))}
              aria-label="上へ"
              className="flex h-5 w-5 items-center justify-center rounded text-ink-tertiary hover:bg-canvas hover:text-ink"
            >
              <Icon name="up" size={11} />
            </button>
            <button
              onClick={() => apply(moveBlock(blocks, block.id, 1))}
              aria-label="下へ"
              className="flex h-5 w-5 items-center justify-center rounded text-ink-tertiary hover:bg-canvas hover:text-ink"
            >
              <Icon name="down" size={11} />
            </button>
            <button
              onClick={() => apply(removeBlock(blocks, block.id))}
              aria-label="削除"
              className="flex h-5 w-5 items-center justify-center rounded text-ink-tertiary hover:bg-red-50 hover:text-danger"
            >
              <Icon name="trash" size={11} />
            </button>
          </div>
        )}
      </div>

      {/* トグルの中身 */}
      {isToggle && !block.collapsed && (
        <div className="ml-[30px] border-l border-line pl-1.5">
          {block.children.map((child) => (
            <BlockRow key={child.id} block={child} blocks={blocks} apply={apply} />
          ))}
          {/* 中に行を追加 (常に薄く表示) */}
          <button
            onClick={() => {
              const last = block.children[block.children.length - 1];
              if (last && !last.text.trim() && last.children.length === 0) return;
              apply(addChildBlock(blocks, block.id, newBlock("text")));
            }}
            className="my-0.5 flex items-center gap-1.5 rounded px-1.5 py-1 text-[12px] text-ink-tertiary/50 hover:bg-canvas hover:text-ink-secondary"
          >
            <Icon name="plus" size={12} /> 行を追加
          </button>
        </div>
      )}
    </div>
  );
}

/** 公開コンポーネント */
export function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: Block[];
  onChange: (next: Block[]) => void;
}) {
  const addRow = () => {
    // 末尾がすでに空行なら増やさない
    const last = blocks[blocks.length - 1];
    if (last && !last.text.trim() && last.children.length === 0) return;
    onChange([...blocks, newBlock("text")]);
  };

  return (
    <div className="py-1">
      {blocks.map((block) => (
        <BlockRow key={block.id} block={block} blocks={blocks} apply={onChange} />
      ))}

      {/* 末尾: クリックで新しい行 */}
      <button
        onClick={addRow}
        className="mt-0.5 flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left text-[13px] text-ink-tertiary/50 hover:bg-canvas hover:text-ink-secondary"
      >
        <Icon name="plus" size={13} />
        {blocks.length === 0 ? "タップして入力を始める" : "行を追加"}
      </button>
    </div>
  );
}
