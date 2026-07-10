"use client";

/**
 * Notion / Word 風ブロックエディタ。
 *
 * 設計方針 (挙動の安定化):
 * - ブロックツリーは「このコンポーネントが持つローカル state」を唯一の真実とする。
 *   入力・改行・トグル開閉はすべて即座にローカル state に反映され、画面が巻き戻らない。
 * - 保存 (onChange) はデバウンスして裏で走らせる。保存完了を待たないので操作が引っかからない。
 * - textarea は完全な制御コンポーネント (value + onChange) にして、
 *   再描画で中身がズレる問題を防ぐ。
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type DragEvent } from "react";
import {
  addChildBlock,
  insertAfter,
  moveBlockTo,
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

// ---------------- ドラッグ状態 ----------------

type DropPos = "before" | "after" | "inside";

interface DragCtx {
  dragId: string | null;
  overId: string | null;
  position: DropPos;
  start: (id: string) => void;
  setOver: (id: string | null, pos: DropPos) => void;
  end: () => void;
}

// ---------------- ＋メニュー ----------------

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

// ---------------- 制御されたテキスト欄 ----------------

function BlockTextarea({
  value,
  placeholder,
  bold,
  strike,
  autoFocus,
  onFocused,
  onChangeText,
  onEnter,
  onBackspaceEmpty,
}: {
  value: string;
  placeholder: string;
  bold?: boolean;
  strike?: boolean;
  autoFocus?: boolean;
  onFocused?: () => void;
  onChangeText: (text: string) => void;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const composingRef = useRef(false);
  const onFocusedRef = useRef(onFocused);
  onFocusedRef.current = onFocused;

  // 高さを内容に合わせる
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  // 指定された行にカーソルを入れ、指示を消化する
  useEffect(() => {
    if (autoFocus && ref.current) {
      const el = ref.current;
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
      onFocusedRef.current?.();
    }
  }, [autoFocus]);

  return (
    <textarea
      ref={ref}
      value={value}
      rows={1}
      placeholder={placeholder}
      onCompositionStart={() => { composingRef.current = true; }}
      onCompositionEnd={() => { composingRef.current = false; }}
      onChange={(e) => onChangeText(e.target.value)}
      onKeyDown={(e) => {
        // 日本語変換確定の Enter は無視
        if (e.key === "Enter" && (composingRef.current || e.nativeEvent.isComposing)) return;
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onEnter();
          return;
        }
        if (e.key === "Backspace" && value === "") {
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

// ---------------- 1行 (再帰) ----------------

function BlockRow({
  block,
  blocks,
  apply,
  focusId,
  setFocusId,
  drag,
}: {
  block: Block;
  blocks: Block[];
  apply: (next: Block[]) => void;
  focusId: string | null;
  setFocusId: (id: string | null) => void;
  drag: DragCtx;
}) {
  const isDivider = block.type === "divider";
  const isToggle  = block.type === "toggle";
  const isTodo    = block.type === "todo";

  const isDragging = drag.dragId === block.id;
  const dropHint   = drag.overId === block.id ? drag.position : null;

  /** この行をドロップ先として登録するハンドラ群 */
  const dropProps = {
    onDragOver: (e: DragEvent<HTMLDivElement>) => {
      if (!drag.dragId || drag.dragId === block.id) return;
      e.preventDefault();
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const ratio = (e.clientY - r.top) / r.height;
      // トグルは中央にドロップで「中に入れる」
      let pos: DropPos = ratio < 0.5 ? "before" : "after";
      if (isToggle && ratio > 0.3 && ratio < 0.7) pos = "inside";
      drag.setOver(block.id, pos);
    },
    onDragLeave: () => drag.setOver(null, "before"),
    onDrop: (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (drag.dragId && drag.overId) {
        apply(moveBlockTo(blocks, drag.dragId, drag.overId, drag.position));
      }
      drag.end();
    },
  };

  /** ドラッグハンドル (＋の左) */
  const handle = (
    <button
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", block.id);
        drag.start(block.id);
      }}
      onDragEnd={() => drag.end()}
      onMouseDown={(e) => e.preventDefault()}
      aria-label="ドラッグして移動"
      className="mt-[3px] flex h-6 w-5 shrink-0 cursor-grab items-center justify-center rounded text-ink-tertiary/25 transition-colors hover:bg-canvas hover:text-ink-secondary active:cursor-grabbing"
    >
      <Icon name="grip" size={14} strokeWidth={2.6} />
    </button>
  );

  /** ドロップ位置のガイド線 */
  const guide = (where: "before" | "after") =>
    dropHint === where ? (
      <div className="pointer-events-none h-0.5 rounded-full bg-accent" />
    ) : null;

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
    setFocusId(prevId);
  };

  const handleEnter = () => {
    // 同じ階層の下に、同じ種類の行を追加する
    const nb = newBlock(block.type);
    // トグルは閉じた状態で作る (勝手に展開しない)
    if (nb.type === "toggle") nb.collapsed = true;
    apply(insertAfter(blocks, block.id, nb));
    setFocusId(nb.id);
  };

  // ---- 区切り線 ----
  if (isDivider) {
    return (
      <div className={isDragging ? "opacity-40" : ""}>
        {guide("before")}
        <div className="flex items-center gap-0.5" {...dropProps}>
          {handle}
          <TypeMenu
            current={block.type}
            onPick={(t) => apply(updateBlock(blocks, block.id, { type: t }))}
            onDelete={deleteAndFocusPrev}
          />
          <div className="flex-1 py-2.5">
            <div className="h-px w-full bg-line" />
          </div>
        </div>
        {guide("after")}
      </div>
    );
  }

  // ---- トグル ----
  if (isToggle) {
    return (
      <div className={isDragging ? "opacity-40" : ""}>
        {guide("before")}
        <div
          className={`my-1 rounded-lg border ${
            dropHint === "inside" ? "border-accent bg-accent-soft/40" : "border-line"
          }`}
        >
        <div className="flex items-start gap-0.5 rounded-t-lg bg-canvas/60 px-1.5 py-1" {...dropProps}>
          {handle}
          <TypeMenu
            current={block.type}
            onPick={(t) => apply(updateBlock(blocks, block.id, { type: t }))}
            onPickChild={(t) => {
              const nb = newBlock(t);
              apply(addChildBlock(updateBlock(blocks, block.id, { collapsed: false }), block.id, nb));
              setFocusId(nb.id);
            }}
            onDelete={deleteAndFocusPrev}
          />
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => apply(updateBlock(blocks, block.id, { collapsed: !block.collapsed }))}
            aria-label={block.collapsed ? "展開" : "折りたたむ"}
            className="mt-[7px] flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink hover:bg-line/60"
          >
            <Icon name={block.collapsed ? "triangleRight" : "triangleDown"} size={11} filled />
          </button>
          <BlockTextarea
            value={block.text}
            placeholder="トグルのタイトル"
            bold
            autoFocus={focusId === block.id}
            onFocused={() => setFocusId(null)}
            onChangeText={(text) => apply(updateBlock(blocks, block.id, { text }))}
            onEnter={handleEnter}
            onBackspaceEmpty={() => { if (block.children.length === 0) deleteAndFocusPrev(); }}
          />
        </div>

        {!block.collapsed && (
          <div className="rounded-b-lg border-t border-line bg-surface px-1.5 py-1">
            {block.children.length === 0 ? (
              <button
                onClick={() => {
                  const nb = newBlock("text");
                  apply(addChildBlock(blocks, block.id, nb));
                  setFocusId(nb.id);
                }}
                className="w-full px-2 py-2 text-left text-[13px] text-ink-tertiary/45 hover:text-ink-secondary"
              >
                ここに入力
              </button>
            ) : (
              block.children.map((child) => (
                <BlockRow
                  key={child.id}
                  block={child}
                  blocks={blocks}
                  apply={apply}
                  focusId={focusId}
                  setFocusId={setFocusId}
                  drag={drag}
                />
              ))
            )}
          </div>
        )}
        </div>
        {guide("after")}
      </div>
    );
  }

  // ---- 通常行 ----
  return (
    <div className={isDragging ? "opacity-40" : ""}>
      {guide("before")}
      <div className="flex items-start gap-0.5" {...dropProps}>
        {handle}
        <TypeMenu
          current={block.type}
          onPick={(t) => apply(updateBlock(blocks, block.id, { type: t }))}
          onDelete={deleteAndFocusPrev}
        />

      {isTodo ? (
        <button
          onMouseDown={(e) => e.preventDefault()}
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

        <BlockTextarea
          value={block.text}
          placeholder=""
          strike={isTodo && block.checked}
          autoFocus={focusId === block.id}
          onFocused={() => setFocusId(null)}
          onChangeText={(text) => apply(updateBlock(blocks, block.id, { text }))}
          onEnter={handleEnter}
          onBackspaceEmpty={deleteAndFocusPrev}
        />
      </div>
      {guide("after")}
    </div>
  );
}

// ---------------- 公開コンポーネント ----------------

export function BlockEditor({
  blocks: initialBlocks,
  onChange,
}: {
  blocks: Block[];
  onChange: (next: Block[]) => void;
}) {
  /**
   * ローカル state を唯一の真実とする。
   * これにより、保存(サーバー往復)の遅延で画面が巻き戻る現象を防ぐ。
   */
  // key={card.id} により、グループごとに新しいインスタンスが作られる。
  // そのため useState の初期値だけで正しく初期化される。
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [focusId, setFocusId] = useState<string | null>(null);

  // 保存はデバウンスして裏で実行 (操作を待たせない)
  const saveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef  = useRef<Block[] | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const apply = useCallback((next: Block[]) => {
    setBlocks(next);      // 画面は即座に更新
    pendingRef.current = next;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (pendingRef.current) {
        onChangeRef.current(pendingRef.current);
        pendingRef.current = null;
      }
    }, 400);
  }, []);

  // アンマウント時 (グループを閉じた時など) に未保存分を確定させる
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (pendingRef.current) {
        onChangeRef.current(pendingRef.current);
        pendingRef.current = null;
      }
    };
  }, []);

  // ---- ドラッグ状態 ----
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [position, setPosition] = useState<DropPos>("before");

  const drag: DragCtx = {
    dragId,
    overId,
    position,
    start: (id) => setDragId(id),
    setOver: (id, pos) => { setOverId(id); setPosition(pos); },
    end: () => { setDragId(null); setOverId(null); },
  };

  if (blocks.length === 0) {
    return (
      <div className="py-1">
        <button
          onClick={() => {
            const nb = newBlock("text");
            apply([nb]);
            setFocusId(nb.id);
          }}
          className="w-full px-2 py-3 text-left text-[13px] text-ink-tertiary/45 hover:text-ink-secondary"
        >
          ここに入力を始める
        </button>
      </div>
    );
  }

  return (
    <div className="py-1" onDragEnd={() => drag.end()}>
      {blocks.map((block) => (
        <BlockRow
          key={block.id}
          block={block}
          blocks={blocks}
          apply={apply}
          focusId={focusId}
          setFocusId={setFocusId}
          drag={drag}
        />
      ))}
    </div>
  );
}
