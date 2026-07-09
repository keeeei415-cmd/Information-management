"use client";

import { useMemo, useState } from "react";
import { CARD_COLORS, CARD_COLOR_KEYS } from "@/lib/colors";
import { useApp } from "@/lib/store";
import {
  BODY_PARTS,
  EMPTY_CLINICAL,
  getClinical,
  type Card,
  type CardColor,
  type ClinicalData,
  type Gender,
} from "@/lib/types";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

const labelClass = "mb-1.5 block text-[13px] font-medium text-ink-secondary";
const fieldClass =
  "w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-[15px] text-ink outline-none placeholder:text-ink-tertiary focus:border-accent";

const GENDERS: Gender[] = ["男性", "女性", "その他"];

/**
 * 症例記録の作成・編集モーダル。
 * 臨床データ (症状・評価・考察・治療内容・結果など) は card.metadata.clinical に保存する。
 * メモは card.content に保存する。
 */
export function CardEditor({
  card,
  tabId,
  groups = [],
  onClose,
}: {
  card?: Card;
  tabId: string;
  groups?: string[];
  onClose: () => void;
}) {
  const { addCard, patchCard, removeCard } = useApp();

  const initial: ClinicalData = card ? getClinical(card) : EMPTY_CLINICAL;

  const [title, setTitle]   = useState(card?.title ?? "");
  const [clinical, setClinical] = useState<ClinicalData>(initial);
  const [memo, setMemo]     = useState(card?.content ?? "");
  const [tags, setTags]     = useState<string[]>(card?.tags ?? []);
  const [color, setColor]   = useState<CardColor>(card?.color ?? "default");
  const [group, setGroup]   = useState(card?.category ?? "");
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroupInput, setNewGroupInput] = useState("");
  const [extraGroups, setExtraGroups]     = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // 既存グループ + このセッションで新規作成したグループを合算
  const allGroups = useMemo(
    () => [...new Set([...groups, ...extraGroups])],
    [groups, extraGroups]
  );

  const confirmNewGroup = () => {
    const name = newGroupInput.trim();
    if (!name) return;
    setExtraGroups((prev) => (prev.includes(name) ? prev : [...prev, name]));
    setGroup(name);
    setCreatingGroup(false);
    setNewGroupInput("");
  };

  const set = (key: keyof ClinicalData, value: string) =>
    setClinical((prev) => ({ ...prev, [key]: value }));

  const toggleTag = (part: string) =>
    setTags((prev) =>
      prev.includes(part) ? prev.filter((t) => t !== part) : [...prev, part]
    );

  const canSave = title.trim().length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const payload = {
      title: title.trim(),
      content: memo,
      category: group || null,
      tags,
      color,
      metadata: { clinical },
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
    if (!window.confirm("この記録を削除しますか?")) return;
    await removeCard(card.id);
    onClose();
  };

  /** テキストエリア項目の定義 (順番どおりに表示) */
  const textAreas: { key: keyof ClinicalData; label: string; rows: number }[] = [
    { key: "symptom", label: "症状", rows: 3 },
    { key: "assessment", label: "評価", rows: 3 },
    { key: "consideration", label: "考察", rows: 3 },
    { key: "treatment", label: "治療内容", rows: 3 },
    { key: "result", label: "結果", rows: 3 },
  ];

  return (
    <Modal
      title={card ? "記録を編集" : "新しい記録"}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-2">
          {card && (
            <button
              onClick={remove}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-danger hover:bg-red-50"
              aria-label="記録を削除"
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
          <label className={labelClass} htmlFor="rec-title">
            タイトル <span className="text-danger">*</span>
          </label>
          <input
            id="rec-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 50代 慢性腰痛 3回目"
            autoFocus
            className={fieldClass}
          />
          <p className="mt-1 text-[11px] text-ink-tertiary">
            個人情報 (氏名など) は入力しないでください
          </p>
        </div>

        <div>
          <label className={labelClass} htmlFor="rec-group">グループ</label>
          <select
            id="rec-group"
            value={group}
            onChange={(e) => {
              if (e.target.value === "__new__") {
                setCreatingGroup(true);
                e.target.value = group; // reset
              } else {
                setGroup(e.target.value);
              }
            }}
            className={`${fieldClass} appearance-none`}
          >
            <option value="">未分類</option>
            {allGroups.map((g) => <option key={g} value={g}>{g}</option>)}
            <option value="__new__">＋ 新規グループを作成…</option>
          </select>
          {creatingGroup && (
            <div className="mt-2 flex items-center gap-2">
              <input
                value={newGroupInput}
                onChange={(e) => setNewGroupInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmNewGroup();
                  if (e.key === "Escape") { setCreatingGroup(false); setNewGroupInput(""); }
                }}
                autoFocus
                placeholder="新しいグループ名"
                className={`${fieldClass} flex-1`}
              />
              <button
                onClick={confirmNewGroup}
                disabled={!newGroupInput.trim()}
                className="h-[46px] rounded-xl bg-accent px-4 text-[14px] font-semibold text-white disabled:opacity-40"
              >
                作成
              </button>
              <button
                onClick={() => { setCreatingGroup(false); setNewGroupInput(""); }}
                className="flex h-[46px] w-[46px] items-center justify-center rounded-xl border border-line text-ink-tertiary"
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass} htmlFor="rec-age">年齢</label>
            <select
              id="rec-age"
              value={clinical.age}
              onChange={(e) => set("age", e.target.value)}
              className={`${fieldClass} appearance-none`}
            >
              <option value="">選択</option>
              {Array.from({ length: 101 }, (_, i) => (
                <option key={i} value={String(i)}>
                  {i}歳
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>性別</label>
            <div className="flex gap-1.5">
              {GENDERS.map((g) => (
                <button
                  key={g}
                  onClick={() => set("gender", clinical.gender === g ? "" : g)}
                  className={`h-[46px] flex-1 rounded-xl border text-[13px] font-medium transition-colors ${
                    clinical.gender === g
                      ? "border-accent bg-accent text-white"
                      : "border-line bg-canvas text-ink-secondary"
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className={labelClass}>部位 (複数選択可)</label>
          {/* 選択済みチップ */}
          {tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[13px] font-medium text-white"
                >
                  {tag}
                  <button
                    onClick={() => toggleTag(tag)}
                    aria-label={`${tag}を外す`}
                    className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-white/20"
                  >
                    <Icon name="close" size={11} strokeWidth={2.5} />
                  </button>
                </span>
              ))}
            </div>
          )}
          {/* ドロップダウン */}
          <select
            value=""
            onChange={(e) => {
              const val = e.target.value;
              if (val) toggleTag(val);
              e.target.value = "";
            }}
            className={`${fieldClass} appearance-none`}
          >
            <option value="">＋ 部位を追加…</option>
            {BODY_PARTS.filter((p) => !tags.includes(p)).map((part) => (
              <option key={part} value={part}>{part}</option>
            ))}
          </select>
        </div>

        {textAreas.map(({ key, label, rows }) => (
          <div key={key}>
            <label className={labelClass} htmlFor={`rec-${key}`}>{label}</label>
            <textarea
              id={`rec-${key}`}
              value={clinical[key]}
              onChange={(e) => set(key, e.target.value)}
              rows={rows}
              className={`${fieldClass} resize-y`}
            />
          </div>
        ))}

        <div>
          <label className={labelClass} htmlFor="rec-memo">メモ</label>
          <textarea
            id="rec-memo"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="その他気づいたことなど"
            rows={3}
            className={`${fieldClass} resize-y`}
          />
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
