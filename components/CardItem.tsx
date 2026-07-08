"use client";

import { CARD_COLORS } from "@/lib/colors";
import { useApp } from "@/lib/store";
import { getClinical, type Card, type ViewMode } from "@/lib/types";
import { dueStatus, formatDate } from "@/lib/utils";
import { Icon } from "./Icon";

/** 期限バッジ。期限切れは赤、今日はオレンジで示す */
function DueBadge({ card }: { card: Card }) {
  if (!card.due_date) return null;
  const status = dueStatus(card.due_date);
  const tone =
    status === "overdue" && !card.completed
      ? "text-danger"
      : status === "today" && !card.completed
        ? "text-warn"
        : "text-ink-tertiary";
  return (
    <span className={`flex items-center gap-1 text-[12px] ${tone}`}>
      <Icon name="calendar" size={13} />
      {formatDate(card.due_date)}
    </span>
  );
}

export function CardItem({
  card,
  view,
  tabName,
  manualSort = false,
  onEdit,
  onMove,
}: {
  card: Card;
  view: ViewMode;
  /** 全タブ検索時にタブ名を表示する */
  tabName?: string;
  /** 手動並び替えモードのとき移動ボタンを出す */
  manualSort?: boolean;
  onEdit: () => void;
  onMove?: (direction: -1 | 1) => void;
}) {
  const { patchCard } = useApp();
  const palette = CARD_COLORS[card.color] ?? CARD_COLORS.default;
  const clinical = getClinical(card);
  const patient = [clinical.age && `${clinical.age}歳`, clinical.gender]
    .filter(Boolean)
    .join("・");
  const preview = clinical.symptom || card.content;

  const toggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    void patchCard(card.id, { completed: !card.completed });
  };

  const togglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    void patchCard(card.id, { pinned: !card.pinned });
  };

  return (
    <article
      onClick={onEdit}
      className={`relative cursor-pointer overflow-hidden rounded-card border border-line shadow-card transition-shadow hover:shadow-md ${
        card.completed ? "opacity-60" : ""
      }`}
      style={{ backgroundColor: palette.bg }}
    >
      {/* 左端のカラーバー */}
      {palette.bar !== "transparent" && (
        <span
          className="absolute inset-y-0 left-0 w-1"
          style={{ backgroundColor: palette.bar }}
          aria-hidden
        />
      )}

      <div className={`flex gap-3 p-3.5 ${palette.bar !== "transparent" ? "pl-4" : ""}`}>
        {/* 完了チェック */}
        <button
          onClick={toggleComplete}
          aria-label={card.completed ? "未完了に戻す" : "完了にする"}
          className={`mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border transition-colors ${
            card.completed
              ? "border-success bg-success text-white"
              : "border-ink-tertiary bg-white/60 text-transparent hover:border-success"
          }`}
        >
          <Icon name="check" size={13} strokeWidth={2.6} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3
              className={`text-[15px] font-semibold leading-snug text-ink ${
                card.completed ? "line-through" : ""
              }`}
            >
              {card.title}
            </h3>
            <button
              onClick={togglePin}
              aria-label={card.pinned ? "ピン留めを外す" : "ピン留めする"}
              className={`shrink-0 ${
                card.pinned ? "text-warn" : "text-ink-tertiary/50 hover:text-ink-secondary"
              }`}
            >
              <Icon name="pin" size={16} strokeWidth={card.pinned ? 2.2 : 1.8} />
            </button>
          </div>

          {preview && (
            <p
              className={`mt-1 whitespace-pre-line text-[13px] leading-relaxed text-ink-secondary ${
                view === "grid" ? "line-clamp-4" : "line-clamp-2"
              }`}
            >
              {preview}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            {tabName && (
              <span className="rounded-md bg-ink/5 px-1.5 py-0.5 text-[11px] font-medium text-ink-secondary">
                {tabName}
              </span>
            )}
            {patient && (
              <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-medium text-accent">
                {patient}
              </span>
            )}
            {card.category && (
              <span className="text-[12px] text-ink-secondary">{card.category}</span>
            )}
            {card.tags.map((tag) => (
              <span key={tag} className="text-[12px] text-accent">
                #{tag}
              </span>
            ))}
            <DueBadge card={card} />
            <span className="ml-auto text-[11px] text-ink-tertiary">
              {formatDate(card.updated_at)}
            </span>
          </div>
        </div>

        {/* 手動並び替え時の移動ボタン */}
        {manualSort && onMove && (
          <div className="flex shrink-0 flex-col justify-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => onMove(-1)}
              aria-label="上へ移動"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-white text-ink-secondary hover:text-accent"
            >
              <Icon name="up" size={14} />
            </button>
            <button
              onClick={() => onMove(1)}
              aria-label="下へ移動"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-white text-ink-secondary hover:text-accent"
            >
              <Icon name="down" size={14} />
            </button>
          </div>
        )}
      </div>
    </article>
  );
}
