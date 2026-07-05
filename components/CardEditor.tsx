"use client";

import { useState } from "react";
import { CARD_COLORS, CARD_COLOR_KEYS } from "@/lib/colors";
import { useApp } from "@/lib/store";
import type { Card, CardColor } from "@/lib/types";
import { collectTags, toDateInputValue } from "@/lib/utils";
import { Icon } from "./Icon";
import { Modal } from "./Modal";
import { TagInput } from "./TagInput";

const labelClass = "mb-1.5 block text-[13px] font-medium text-ink-secondary";
const fieldClass =
  "w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-[15px] text-ink outline-none placeholder:text-ink-tertiary focus:border-accent";

/**
 * カードの作成・編集モーダル。
 * card を渡すと編集、渡さなければ tabId のタブに新規作成する。
 */
export function CardEditor({
  card,
  tabId,
  onClose,
}: {
  card?: Card;
  tabId: string;
  onClose: () => void;
}) {
  const { cards, addCard, patchCard, removeCard } = useApp();

  const [title, setTitle] = useState(card?.title ?? "");
  const [content, setContent] = useState(card?.content ?? "");
  const [category, setCategory] = useState(card?.category ?? "");
  const [tags, setTags] = useState<string[]>(card?.tags ?? []);
  const [color, setColor] = useState<CardColor>(card?.color ?? "default");
  const [dueDate, setDueDate] = useState(toDateInputValue(card?.due_date ?? null));
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const payload = {
      title: title.trim(),
      content,
      category: category.trim() || null,
      tags,
      color,
      due_date: dueDate ? new Date(`${dueDate}T00:00:00`).toISOString() : null,
    };
    if (card) {
      await patchCard(card.id, payload);
    } else {
      await addCard({ tab_id: tabId, ...payload });
    }
    onClose();
  };

  const remove = async () => {
    if (!card) return;
    if (!window.confirm("このカードを削除しますか?")) return;
    await removeCard(card.id);
    onClose();
  };

  return (
    <Modal
      title={card ? "カードを編集" : "新しいカード"}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          {card && (
            <button
              onClick={remove}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-danger hover:bg-red-50"
              aria-label="カードを削除"
            >
              <Icon name="trash" size={20} />
            </button>
          )}
          <button
            onClick={onClose}
            className="h-11 flex-1 rounded-xl border border-line text-[15px] font-medium text-ink-secondary"
          >
            キャンセル
          </button>
          <button
            onClick={save}
            disabled={!canSave}
            className="h-11 flex-1 rounded-xl bg-accent text-[15px] font-semibold text-white disabled:opacity-40"
          >
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="card-title">タイトル</label>
          <input
            id="card-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="タイトルを入力"
            autoFocus
            className={fieldClass}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="card-content">内容</label>
          <textarea
            id="card-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="メモ・詳細など"
            rows={5}
            className={`${fieldClass} resize-y`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor="card-category">カテゴリ (任意)</label>
            <input
              id="card-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="例: 買い物"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="card-due">期限 (任意)</label>
            <input
              id="card-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={fieldClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>タグ</label>
          <TagInput tags={tags} onChange={setTags} suggestions={collectTags(cards)} />
        </div>

        <div>
          <label className={labelClass}>カラー</label>
          <div className="flex flex-wrap gap-2.5">
            {CARD_COLOR_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => setColor(key)}
                aria-label={CARD_COLORS[key].label}
                title={CARD_COLORS[key].label}
                className={`h-8 w-8 rounded-full border transition-transform ${
                  color === key
                    ? "scale-110 border-2 border-accent"
                    : "border-line hover:scale-105"
                }`}
                style={{ backgroundColor: CARD_COLORS[key].dot }}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
