"use client";

/**
 * Notion 風ブロックエディタ。
 *
 * ＋ボタン = 「この行を何にするか」を選ぶ (行の種類変換)。行の追加ではない。
 * Enter    = 下に新しい行を追加。
 * Backspace(空行) / ゴミ箱 = 行を削除し、上の行の末尾にカーソルを戻す。
 *
 * 種類を増やすときは BlockType (lib/outline.ts) と TYPE_MENU に足すだけでよい。
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

/** ＋メニュー: この行を何に変換するか */
const TYPE_MENU: { type: BlockType; icon: string; label: string }[] = [
  { type: "text",    icon: "edit",         label: "テキスト" },
  { type: "bullet",  icon: "dot",          label: "箇条書き" },
  { type: "todo",    icon: "square",       label: "チェックボックス" },
  { type: "toggle",  icon: "chevronRight", label: "トグル" },
  { type: "divider", icon: "minus",        label: "区切り線" },
];

/** ＋ボタン + 種類メニュー (画面に固定配置して見切れを防ぐ) */
function TypeMenu({
  current,
  onPick,
  onPickChild,
}: {
  current: BlockType;
  onPick: (t: BlockType) => void;
  onPickChild?: (t: BlockType) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const btnRef  = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // ボタン位置を基準にメニュー位置を決める (画面外に出ないよう調整)
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const MENU_W = 200;
    const MENU_H = onPickChild ? 460 : 250;
    let top  = r.top;
    let left = r.right + 6;
    if (left + MENU_W > window.innerWidth)  left = Math.max(8, r.left - MENU_W - 6);
    if (top + MENU_H > window.innerHeight)  top  = Math.max(8, window.innerHeight - MENU_H - 8);
    setPos({ top, left });
  }, [open, onPickChild]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node) && !btnRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onScroll = () => setOpen(false);
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((v) => !v)}
        aria-label="この行の種類を変更"
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-tertiary/35 transition-colors hover:bg-canvas hover:text-ink-secondary"
      >
        <Icon name="plus" size={15} strokeWidth={2} />
      </button>

      {open && (
        <div
          ref={menuRef}
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-[100] max-h-[70vh] w-[200px] overflow-y-auto rounded-xl border border-line bg-surface py-1 shadow-modal"
        >
          <p className="px-3.5 py-1.5 text-[11px] font-medium text-ink-tertiary">この行を変換</p>
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
              <p className="mt-1 border-t border-line px-3.5 pb-1.5 pt-2 text-[11px] font-medium text-ink-tertiary">
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
    </>
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
  focusId: string | null;
  setFocusId: (id: string | null) => void;
}) {
  const shouldFocus = focusId === block.id;
  const isDivider = block.type === "divider";
  const isToggle  = block.type === "toggle";
  const isTodo    = block.type === "todo";

  const [editing, setEditing] = useState(!isDivider && (block.text === "" || shouldFocus));
  const textRef  = useRef(block.text);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const composingRef = useRef(false);

  useEffect(() => {
    if (shouldFocus && !isDivider) setEditing(true);
  }, [shouldFocus, isDivider]);

  useEffect(() => {
    if (editing && inputRef.current) {
      const el = inputRef.current;
      el.focus();
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
      el.setSelectionRange(el.value.length, el.value.length);
      if (shouldFocus) setFocusId(null);
    }
  }, [editing, shouldFocus, setFocusId]);

  /** 表示順で1つ前のブロック id (削除後のフォーカス移動先) */
  const findPrevId = (): string | null => {
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

  const deleteAndFocusPrev = () => {
    const prevId = findPrevId();
    setEditing(false);
    apply(removeBlock(blocks, block.id));
    if (prevId) setFocusId(prevId);
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

  // ---- 区切り線は専用描画 ----
  if (isDivider) {
    return (
      <div className="group/row flex items-center gap-0.5">
        <TypeMenu current={block.type} onPick={(t) => apply(updateBlock(blocks, block.id, { type: t }))} />
        <div className="flex-1 py-2.5">
          <div className="h-px w-full bg-line" />
        </div>
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100">
          <button onClick={() => apply(moveBlock(blocks, block.id, -1))} aria-label="上へ"
            className="flex h-5 w-5 items-center justify-center rounded text-ink-tertiary hover:bg-canvas hover:text-ink">
            <Icon name="up" size={11} />
          </button>
          <button onClick={() => apply(moveBlock(blocks, block.id, 1))} aria-label="下へ"
            className="flex h-5 w-5 items-center justify-center rounded text-ink-tertiary hover:bg-canvas hover:text-ink">
            <Icon name="down" size={11} />
          </button>
          <button onClick={deleteAndFocusPrev} aria-label="削除"
            className="flex h-5 w-5 items-center justify-center rounded text-ink-tertiary hover:bg-red-50 hover:text-danger">
            <Icon name="trash" size={11} />
          </button>
        </div>
      </div>
    );
  }

  // ---- トグルは枠で囲って専用描画 ----
  if (isToggle) {
    return (
      <div className="my-1 overflow-visible rounded-lg border border-line bg-canvas/40">
        {/* トグルヘッダー */}
        <div className="group/row flex items-start gap-0.5 px-1.5 py-1">
          <TypeMenu
            current={block.type}
            onPick={(t) => apply(updateBlock(blocks, block.id, { type: t }))}
            onPickChild={(t) => apply(addChildBlock(blocks, block.id, newBlock(t)))}
          />

          {/* 黒い三角マーク */}
          <button
            onClick={() => apply(updateBlock(blocks, block.id, { collapsed: !block.collapsed }))}
            aria-label={block.collapsed ? "展開" : "折りたたむ"}
            className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink hover:bg-line/60"
          >
            <Icon name={block.collapsed ? "triangleRight" : "triangleDown"} size={11} filled />
          </button>

          {/* タイトル */}
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
                if (e.key === "Enter" && (composingRef.current || e.nativeEvent.isComposing)) return;
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  const t = textRef.current;
                  if (!t.trim()) {
                    if (block.children.length === 0) deleteAndFocusPrev();
                    return;
                  }
                  setEditing(false);
                  const nb = newBlock("text");
                  let next = updateBlock(blocks, block.id, { text: t, collapsed: false });
                  next = addChildBlock(next, block.id, nb);
                  apply(next);
                  setFocusId(nb.id);
                  return;
                }
                if (e.key === "Backspace" && !textRef.current && block.children.length === 0) {
                  e.preventDefault();
                  deleteAndFocusPrev();
                  return;
                }
                if (e.key === "Escape") commit();
              }}
              className="mt-0.5 flex-1 resize-none rounded border border-accent bg-surface px-1.5 py-1 text-[14px] font-semibold leading-relaxed text-ink outline-none"
            />
          ) : (
            <button
              onClick={() => setEditing(true)}
              className={`mt-0.5 min-h-[28px] flex-1 whitespace-pre-wrap break-words px-1.5 py-1 text-left text-[14px] font-semibold leading-relaxed ${
                block.text ? "text-ink" : "text-ink-tertiary"
              }`}
            >
              {block.text || "トグルのタイトル…"}
            </button>
          )}

          {!editing && (
            <div className="ml-0.5 mt-1 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100">
              <button onClick={() => apply(moveBlock(blocks, block.id, -1))} aria-label="上へ"
                className="flex h-5 w-5 items-center justify-center rounded text-ink-tertiary hover:bg-line hover:text-ink">
                <Icon name="up" size={11} />
              </button>
              <button onClick={() => apply(moveBlock(blocks, block.id, 1))} aria-label="下へ"
                className="flex h-5 w-5 items-center justify-center rounded text-ink-tertiary hover:bg-line hover:text-ink">
                <Icon name="down" size={11} />
              </button>
              <button onClick={deleteAndFocusPrev} aria-label="削除"
                className="flex h-5 w-5 items-center justify-center rounded text-ink-tertiary hover:bg-red-50 hover:text-danger">
                <Icon name="trash" size={11} />
              </button>
            </div>
          )}
        </div>

        {/* トグルの中身 */}
        {!block.collapsed && (
          <div className="border-t border-line bg-surface px-1.5 py-1">
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
                if (last && !last.text.trim() && last.children.length === 0 && last.type !== "divider") return;
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

  return (
    <div>
      <div className="group/row flex items-start gap-0.5">
        {/* ＋ = この行の種類を変換 */}
        <TypeMenu
          current={block.type}
          onPick={(t) => apply(updateBlock(blocks, block.id, { type: t }))}
        />

        {/* 行頭マーク */}
        {isTodo ? (
          <button
            onClick={() => apply(updateBlock(blocks, block.id, { checked: !block.checked }))}
            aria-label={block.checked ? "未完了に戻す" : "完了にする"}
            className={`mt-1 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-colors ${
              block.checked
                ? "border-success bg-success text-white"
                : "border-ink-tertiary text-transparent hover:border-success"
            }`}
          >
            <Icon name="check" size={11} strokeWidth={3} />
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
              if (e.key === "Enter" && (composingRef.current || e.nativeEvent.isComposing)) return;

              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const t = textRef.current;
                if (!t.trim()) {
                  if (block.children.length === 0) deleteAndFocusPrev();
                  return;
                }
                setEditing(false);
                const nb = newBlock(block.type);
                let next = updateBlock(blocks, block.id, { text: t });
                next = insertAfter(next, block.id, nb);
                apply(next);
                setFocusId(nb.id);
                return;
              }

              if (e.key === "Backspace" && !textRef.current && block.children.length === 0) {
                e.preventDefault();
                deleteAndFocusPrev();
                return;
              }

              if (e.key === "Escape") commit();
            }}
            className="mt-0.5 flex-1 resize-none rounded border border-accent bg-surface px-1.5 py-1 text-[14px] leading-relaxed text-ink outline-none"
          />
        ) : (
          <button
            onClick={() => setEditing(true)}
            className={`mt-0.5 min-h-[28px] flex-1 whitespace-pre-wrap break-words px-1.5 py-1 text-left text-[14px] leading-relaxed ${
              isTodo && block.checked ? "text-ink-tertiary line-through" : block.text ? "text-ink" : "text-ink-tertiary"
            }`}
          >
            {block.text || "入力…"}
          </button>
        )}

        {/* ホバー時の操作 */}
        {!editing && (
          <div className="ml-0.5 mt-1 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover/row:opacity-100">
            <button onClick={() => apply(moveBlock(blocks, block.id, -1))} aria-label="上へ"
              className="flex h-5 w-5 items-center justify-center rounded text-ink-tertiary hover:bg-canvas hover:text-ink">
              <Icon name="up" size={11} />
            </button>
            <button onClick={() => apply(moveBlock(blocks, block.id, 1))} aria-label="下へ"
              className="flex h-5 w-5 items-center justify-center rounded text-ink-tertiary hover:bg-canvas hover:text-ink">
              <Icon name="down" size={11} />
            </button>
            <button onClick={deleteAndFocusPrev} aria-label="削除"
              className="flex h-5 w-5 items-center justify-center rounded text-ink-tertiary hover:bg-red-50 hover:text-danger">
              <Icon name="trash" size={11} />
            </button>
          </div>
        )}
      </div>
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
    if (last && !last.text.trim() && last.children.length === 0 && last.type !== "divider") return;
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
