"use client";

/**
 * Notion 風ブロックエディタ。
 *
 * ＋ボタンの意味:
 *   「その行を何にするか」を選ぶ = 行の種類変換 (テキスト/箇条書き/トグル)
 *   Notion の "/" コマンドに近い。行の追加ではない。
 *
 * 行の追加:
 *   Enter で下に新しい行が増える。
 *
 * 削除:
 *   空行で Backspace → 行が消えて、上の行の末尾にカーソルが移動する。
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

/** ＋メニュー: この行を何にするか (今後ここに項目を足していく) */
const TYPE_MENU: { type: BlockType; icon: string; label: string }[] = [
  { type: "text",   icon: "edit",         label: "テキスト" },
  { type: "bullet", icon: "dot",          label: "箇条書き" },
  { type: "toggle", icon: "chevronRight", label: "トグル" },
];

/** ＋ボタン + 種類メニュー */
function TypeMenu({
  current,
  onPick,
  onPickChild,
}: {
  current: BlockType;
  /** この行の種類を変える */
  onPick: (t: BlockType) => void;
  /** トグル行のとき、中に新しいブロックを追加する */
  onPickChild?: (t: BlockType) => void;
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
        onMouseDown={(e) => e.preventDefault()} // textarea の blur を防ぐ
        onClick={() => setOpen((v) => !v)}
        aria-label="この行の種類を変更"
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-tertiary/35 transition-colors hover:bg-canvas hover:text-ink-secondary"
      >
        <Icon name="plus" size={15} strokeWidth={2} />
      </button>

      {open && (
        <div className="absolute left-7 top-0 z-50 min-w-[180px] overflow-hidden rounded-xl border border-line bg-surface shadow-modal">
          <p className="border-b border-line px-3.5 py-1.5 text-[11px] font-medium text-ink-tertiary">
            この行を変換
          </p>
          {TYPE_MENU.map((m) => (
            <button
              key={m.type}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setOpen(false); onPick(m.type); }}
              className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[14px] hover:bg-canvas ${
                current === m.type ? "text-accent" : "text-ink"
              }`}
            >
              <Icon name={m.icon} size={15} className={current === m.type ? "text-accent" : "text-ink-secondary"} />
              {m.label}
              {current === m.type && <Icon name="check" size={13} className="ml-auto text-accent" />}
            </button>
          ))}

          {onPickChild && (
            <>
              <p className="border-t border-line px-3.5 py-1.5 text-[11px] font-medium text-ink-tertiary">
                この中に追加
              </p>
              {TYPE_MENU.map((m) => (
                <button
                  key={"c" + m.type}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setOpen(false); onPickChild(m.type); }}
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
  focusId,
  setFocusId,
}: {
  block: Block;
  blocks: Block[];
  apply: (next: Block[]) => void;
  /** フォーカスすべきブロックの id */
  focusId: string | null;
  setFocusId: (id: string | null) => void;
}) {
  const shouldFocus = focusId === block.id;
  const [editing, setEditing] = useState(block.text === "" || shouldFocus);
  const textRef  = useRef(block.text);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const composingRef = useRef(false);

  // 外部からフォーカス指示が来たら編集モードに入る
  useEffect(() => {
    if (shouldFocus) setEditing(true);
  }, [shouldFocus]);

  useEffect(() => {
    if (editing && inputRef.current) {
      const el = inputRef.current;
      el.focus();
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
      el.setSelectionRange(el.value.length, el.value.length); // 末尾にカーソル
      if (shouldFocus) setFocusId(null);
    }
  }, [editing, shouldFocus, setFocusId]);

  /** この行より前にある「最後の行」の id を返す (削除後のフォーカス移動先) */
  const findPrevId = (): string | null => {
    // 平坦化して順序どおりの id 配列を作る
    const flat: string[] = [];
    const walk = (list: Block[]) => {
      list.forEach((b) => {
        flat.push(b.id);
        if (b.type === "toggle" && !b.collapsed) walk(b.children);
      });
    };
    walk(blocks);
    const idx = flat.indexOf(block.id);
    return idx > 0 ? flat[idx - 1] : null;
  };

  const commit = () => {
    const text = textRef.current.trim();
    setEditing(false);
    if (!text && block.children.length === 0) {
      apply(removeBlock(blocks, block.id));
      return;
    }
    apply(updateBlock(blocks, block.id, { text: textRef.current }));
  };

  /** 行を削除して、上の行の末尾にカーソルを移す */
  const deleteAndFocusPrev = () => {
    const prevId = findPrevId();
    setEditing(false);
    apply(removeBlock(blocks, block.id));
    if (prevId) setFocusId(prevId);
  };

  const isToggle = block.type === "toggle";

  return (
    <div>
      <div className="group/row flex items-start gap-0.5">
        {/* ＋ = この行の種類を変換 */}
        <TypeMenu
          current={block.type}
          onPick={(t) => {
            // トグル→他 に変える時、子があるなら残す
            apply(updateBlock(blocks, block.id, { type: t }));
          }}
          onPickChild={isToggle ? (t) => apply(addChildBlock(blocks, block.id, newBlock(t))) : undefined}
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
              // IME 変換確定の Enter は無視
              if (e.key === "Enter" && (composingRef.current || e.nativeEvent.isComposing)) return;

              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const t = textRef.current;

                // 空行で Enter → 増やさない
                if (!t.trim()) {
                  if (block.children.length === 0) deleteAndFocusPrev();
                  return;
                }

                setEditing(false);
                const nb = newBlock(isToggle ? "text" : block.type);
                let next = updateBlock(blocks, block.id, isToggle ? { text: t, collapsed: false } : { text: t });
                next = isToggle
                  ? addChildBlock(next, block.id, nb)   // トグル → 中に行
                  : insertAfter(next, block.id, nb);    // 通常   → 下に行
                apply(next);
                setFocusId(nb.id); // 新しい行にカーソルを移す
                return;
              }

              // 空行で Backspace → 削除して上の行の末尾へ
              if (e.key === "Backspace" && !textRef.current && block.children.length === 0) {
                e.preventDefault();
                deleteAndFocusPrev();
                return;
              }

              if (e.key === "Escape") commit();
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
              onClick={deleteAndFocusPrev}
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
            <BlockRow
              key={child.id}
              block={child}
              blocks={blocks}
              apply={apply}
              focusId={focusId}
              setFocusId={setFocusId}
            />
          ))}
          <button
            onClick={() => {
              const last = block.children[block.children.length - 1];
              if (last && !last.text.trim() && last.children.length === 0) return;
              const nb = newBlock("text");
              apply(addChildBlock(blocks, block.id, nb));
              setFocusId(nb.id);
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
  const [focusId, setFocusId] = useState<string | null>(null);

  const addRow = () => {
    const last = blocks[blocks.length - 1];
    if (last && !last.text.trim() && last.children.length === 0) return;
    const nb = newBlock("text");
    onChange([...blocks, nb]);
    setFocusId(nb.id);
  };

  return (
    <div className="py-1">
      {blocks.map((block) => (
        <BlockRow
          key={block.id}
          block={block}
          blocks={blocks}
          apply={onChange}
          focusId={focusId}
          setFocusId={setFocusId}
        />
      ))}

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
