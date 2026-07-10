"use client";

/**
 * Notion / Word 風ブロックエディタ。
 *
 * 書き味の方針:
 * - すべての行が常に入力可能 (クリックせずそのまま書ける)
 * - Enter で下に行が増える / 空行で Backspace で上の行末尾に戻る
 * - 右端の移動・削除ボタンは置かない (Word のように文章として書ける)
 * - ＋ボタン = この行を何にするか (箇条書き・トグル・チェック・区切り線)
 *
 * 種類を増やすときは lib/outline.ts の BlockType と TYPE_MENU に足すだけ。
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  addChildBlock,
  insertAfter,
  newBlock,
  removeBlock,
  updateBlock,
  type Block,
  type BlockType,
} from "@/lib/outline";
import { Icon } from "./Icon";

const TYPE_MENU: { type: BlockType; icon: string; label: string }[] = [
  { type: "text",    icon: "edit",         label: "テキスト" },
  { type: "bullet",  icon: "dot",          label: "箇条書き" },
  { type: "todo",    icon: "square",       label: "チェックボックス" },
  { type: "toggle",  icon: "chevronRight", label: "トグル" },
  { type: "divider", icon: "minus",        label: "区切り線" },
];

/** ＋ボタン + 種類メニュー (画面固定で見切れ防止) */
function TypeMenu({
  current,
  onPick,
  onPickChild,
  onDelete,
}: {
  current: BlockType;
  onPick: (t: BlockType) => void;
  onPickChild?: (t: BlockType) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef  = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const W = 210;
    const H = onPickChild ? 500 : 300;
    let top = r.top;
    let left = r.right + 6;
    if (left + W > window.innerWidth) left = Math.max(8, r.left - W - 6);
    if (top + H > window.innerHeight) top = Math.max(8, window.innerHeight - H - 8);
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
        className="mt-[3px] flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-tertiary/30 transition-colors hover:bg-canvas hover:text-ink-secondary"
      >
        <Icon name="plus" size={15} strokeWidth={2} />
      </button>

      {open && (
        <div
          ref={menuRef}
          style={{ top: pos.top, left: pos.left }}
          className="fixed z-[100] max-h-[70vh] w-[210px] overflow-y-auto rounded-xl border border-line bg-surface py-1 shadow-modal"
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

          <div className="mt-1 border-t border-line pt-1">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { setOpen(false); onDelete(); }}
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-[14px] text-danger hover:bg-red-50"
            >
              <Icon name="trash" size={15} />
              この行を削除
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/** 常時入力可能なテキスト欄 (Word のような書き味) */
function LiveTextarea({
  value,
  placeholder,
  bold,
  strike,
  autoFocus,
  onCommit,
  onEnter,
  onBackspaceEmpty,
}: {
  value: string;
  placeholder: string;
  bold?: boolean;
  strike?: boolean;
  autoFocus?: boolean;
  onCommit: (text: string) => void;
  onEnter: (text: string) => void;
  onBackspaceEmpty: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const textRef = useRef(value);
  const composingRef = useRef(false);

  // 高さを内容にあわせる
  const resize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    if (ref.current) resize(ref.current);
  }, []);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      const len = ref.current.value.length;
      ref.current.setSelectionRange(len, len);
    }
  }, [autoFocus]);

  // 外部から値が変わったら反映 (別グループを開いた時など)
  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) {
      ref.current.value = value;
      textRef.current = value;
      resize(ref.current);
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      defaultValue={value}
      rows={1}
      placeholder={placeholder}
      onCompositionStart={() => { composingRef.current = true; }}
      onCompositionEnd={() => { composingRef.current = false; }}
      onChange={(e) => {
        textRef.current = e.target.value;
        resize(e.target);
      }}
      onBlur={() => onCommit(textRef.current)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (composingRef.current || e.nativeEvent.isComposing)) return;
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onEnter(textRef.current);
          return;
        }
        if (e.key === "Backspace" && !textRef.current) {
          e.preventDefault();
          onBackspaceEmpty();
        }
      }}
      className={`mt-0.5 flex-1 resize-none border-0 bg-transparent px-1 py-1 text-[14px] leading-relaxed text-ink outline-none placeholder:text-ink-tertiary/60 ${
        bold ? "font-semibold" : ""
      } ${strike ? "text-ink-tertiary line-through" : ""}`}
    />
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
  const isDivider = block.type === "divider";
  const isToggle  = block.type === "toggle";
  const isTodo    = block.type === "todo";

  /** 表示順で1つ前のブロック id */
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
    apply(removeBlock(blocks, block.id));
    if (prevId) setFocusId(prevId);
  };

  const commit = (text: string) => {
    if (!text.trim() && block.children.length === 0 && !isDivider) {
      apply(removeBlock(blocks, block.id));
      return;
    }
    apply(updateBlock(blocks, block.id, { text }));
  };

  const handleEnter = (text: string) => {
    if (!text.trim()) {
      if (block.children.length === 0) deleteAndFocusPrev();
      return;
    }
    const nb = newBlock(isToggle ? "text" : block.type);
    let next = updateBlock(blocks, block.id, isToggle ? { text, collapsed: false } : { text });
    next = isToggle ? addChildBlock(next, block.id, nb) : insertAfter(next, block.id, nb);
    apply(next);
    setFocusId(nb.id);
  };

  // ---- 区切り線 ----
  if (isDivider) {
    return (
      <div className="flex items-center gap-0.5">
        <TypeMenu
          current={block.type}
          onPick={(t) => apply(updateBlock(blocks, block.id, { type: t }))}
          onDelete={deleteAndFocusPrev}
        />
        <div className="flex-1 py-2.5">
          <div className="h-px w-full bg-line" />
        </div>
      </div>
    );
  }

  // ---- トグル (枠で囲う) ----
  if (isToggle) {
    return (
      <div className="my-1 rounded-lg border border-line">
        <div className="flex items-start gap-0.5 rounded-t-lg bg-canvas/60 px-1.5 py-1">
          <TypeMenu
            current={block.type}
            onPick={(t) => apply(updateBlock(blocks, block.id, { type: t }))}
            onPickChild={(t) => apply(addChildBlock(blocks, block.id, newBlock(t)))}
            onDelete={deleteAndFocusPrev}
          />
          <button
            onClick={() => apply(updateBlock(blocks, block.id, { collapsed: !block.collapsed }))}
            aria-label={block.collapsed ? "展開" : "折りたたむ"}
            className="mt-[7px] flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink hover:bg-line/60"
          >
            <Icon name={block.collapsed ? "triangleRight" : "triangleDown"} size={11} filled />
          </button>
          <LiveTextarea
            value={block.text}
            placeholder="トグルのタイトル"
            bold
            autoFocus={focusId === block.id}
            onCommit={commit}
            onEnter={handleEnter}
            onBackspaceEmpty={() => { if (block.children.length === 0) deleteAndFocusPrev(); }}
          />
        </div>

        {!block.collapsed && (
          <div className="rounded-b-lg border-t border-line bg-surface px-1.5 py-1">
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
              className="my-0.5 flex items-center gap-1.5 rounded px-1.5 py-1 text-[12px] text-ink-tertiary/45 hover:bg-canvas hover:text-ink-secondary"
            >
              <Icon name="plus" size={12} /> 行を追加
            </button>
          </div>
        )}
      </div>
    );
  }

  // ---- 通常行 (テキスト / 箇条書き / チェック) ----
  return (
    <div className="flex items-start gap-0.5">
      <TypeMenu
        current={block.type}
        onPick={(t) => apply(updateBlock(blocks, block.id, { type: t }))}
        onDelete={deleteAndFocusPrev}
      />

      {isTodo ? (
        <button
          onClick={() => apply(updateBlock(blocks, block.id, { checked: !block.checked }))}
          aria-label={block.checked ? "未完了に戻す" : "完了にする"}
          className={`mt-[7px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border transition-colors ${
            block.checked
              ? "border-success bg-success text-white"
              : "border-ink-tertiary text-transparent hover:border-success"
          }`}
        >
          <Icon name="check" size={11} strokeWidth={3} />
        </button>
      ) : block.type === "bullet" ? (
        <span className="mx-2 mt-[13px] h-1.5 w-1.5 shrink-0 rounded-full bg-ink-tertiary" />
      ) : (
        <span className="w-1 shrink-0" />
      )}

      <LiveTextarea
        value={block.text}
        placeholder=""
        strike={isTodo && block.checked}
        autoFocus={focusId === block.id}
        onCommit={commit}
        onEnter={handleEnter}
        onBackspaceEmpty={deleteAndFocusPrev}
      />
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
        className="mt-0.5 flex w-full items-center gap-1.5 rounded-lg px-2 py-2 text-left text-[13px] text-ink-tertiary/45 hover:bg-canvas hover:text-ink-secondary"
      >
        <Icon name="plus" size={13} />
        {blocks.length === 0 ? "ここに入力を始める" : "行を追加"}
      </button>
    </div>
  );
}
