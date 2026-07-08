"use client";

import { useEffect, useRef, useState } from "react";
import type { OutlineNode } from "@/lib/outline";
import { Icon } from "./Icon";

/**
 * アウトラインの1行を描画する再帰コンポーネント。
 * 子ノードがあればトグルで開閉、なければ箇条書きの「・」を表示する。
 * 操作 (編集・子追加・移動・削除) はすべて親から渡された関数を呼ぶだけ。
 */
export function OutlineRow({
  node,
  depth,
  editable,
  query,
  onChangeText,
  onToggle,
  onAddChild,
  onAddSibling,
  onRemove,
  onMove,
}: {
  node: OutlineNode;
  depth: number;
  editable: boolean;
  query: string;
  onChangeText: (id: string, text: string) => void;
  onToggle: (id: string) => void;
  onAddChild: (id: string) => void;
  onAddSibling: (id: string) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, dir: -1 | 1) => void;
}) {
  const hasChildren = node.children.length > 0;
  const [editing, setEditing] = useState(node.text === "");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      const el = inputRef.current;
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  }, [editing]);

  // 検索語ハイライト用
  const highlight = (text: string) => {
    const q = query.trim();
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx < 0) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="rounded bg-yellow-200 px-0.5">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <div>
      <div
        className="group flex items-start gap-1 rounded-lg py-1 hover:bg-canvas"
        style={{ paddingLeft: depth * 20 }}
      >
        {/* トグル or 箇条書きマーク */}
        {hasChildren ? (
          <button
            onClick={() => onToggle(node.id)}
            aria-label={node.collapsed ? "展開" : "折りたたむ"}
            className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-ink-secondary hover:bg-line"
          >
            <Icon name={node.collapsed ? "chevronRight" : "chevronDown"} size={15} strokeWidth={2.4} />
          </button>
        ) : (
          <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center text-ink-tertiary">
            <Icon name="dot" size={16} strokeWidth={4} />
          </span>
        )}

        {/* テキスト本体 */}
        {editing && editable ? (
          <textarea
            ref={inputRef}
            defaultValue={node.text}
            rows={1}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
            onBlur={(e) => {
              onChangeText(node.id, e.currentTarget.value);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onChangeText(node.id, e.currentTarget.value);
                setEditing(false);
                onAddSibling(node.id); // Enter で同じ階層に新しい行
              }
              if (e.key === "Escape") {
                e.currentTarget.blur();
              }
            }}
            className="mt-0.5 flex-1 resize-none rounded-md border border-accent bg-surface px-2 py-1 text-[15px] leading-relaxed text-ink outline-none"
          />
        ) : (
          <button
            onClick={() => editable && setEditing(true)}
            className={`mt-0.5 flex-1 whitespace-pre-wrap break-words text-left text-[15px] leading-relaxed ${
              node.text ? "text-ink" : "text-ink-tertiary"
            } ${editable ? "cursor-text" : "cursor-default"}`}
          >
            {node.text ? highlight(node.text) : editable ? "入力…" : ""}
          </button>
        )}

        {/* 操作ボタン (編集モードのみ・ホバーで表示) */}
        {editable && !editing && (
          <div className="mt-0.5 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => onMove(node.id, -1)}
              aria-label="上へ"
              className="flex h-6 w-6 items-center justify-center rounded text-ink-tertiary hover:bg-line hover:text-ink"
            >
              <Icon name="up" size={13} />
            </button>
            <button
              onClick={() => onMove(node.id, 1)}
              aria-label="下へ"
              className="flex h-6 w-6 items-center justify-center rounded text-ink-tertiary hover:bg-line hover:text-ink"
            >
              <Icon name="down" size={13} />
            </button>
            <button
              onClick={() => onAddChild(node.id)}
              aria-label="子項目を追加"
              className="flex h-6 w-6 items-center justify-center rounded text-ink-tertiary hover:bg-line hover:text-accent"
            >
              <Icon name="plus" size={14} />
            </button>
            <button
              onClick={() => onRemove(node.id)}
              aria-label="削除"
              className="flex h-6 w-6 items-center justify-center rounded text-ink-tertiary hover:bg-red-50 hover:text-danger"
            >
              <Icon name="trash" size={13} />
            </button>
          </div>
        )}
      </div>

      {/* 子ノード (折りたたまれていなければ) */}
      {hasChildren && !node.collapsed && (
        <div>
          {node.children.map((child) => (
            <OutlineRow
              key={child.id}
              node={child}
              depth={depth + 1}
              editable={editable}
              query={query}
              onChangeText={onChangeText}
              onToggle={onToggle}
              onAddChild={onAddChild}
              onAddSibling={onAddSibling}
              onRemove={onRemove}
              onMove={onMove}
            />
          ))}
        </div>
      )}
    </div>
  );
}
