"use client";

import { useState } from "react";
import { Icon } from "./Icon";

/** タグ入力欄。Enter または「,」で確定し、チップとして表示する */
export function TagInput({
  tags,
  onChange,
  suggestions = [],
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const value = draft.trim().replace(/,/g, "");
    if (value && !tags.includes(value)) onChange([...tags, value]);
    setDraft("");
  };

  const remove = (tag: string) => onChange(tags.filter((t) => t !== tag));

  const unusedSuggestions = suggestions.filter((s) => !tags.includes(s)).slice(0, 8);

  return (
    <div>
      <div className="flex min-h-[44px] flex-wrap items-center gap-1.5 rounded-xl border border-line bg-canvas px-3 py-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-[13px] font-medium text-accent"
          >
            {tag}
            <button onClick={() => remove(tag)} aria-label={`タグ「${tag}」を削除`}>
              <Icon name="close" size={12} strokeWidth={2.2} />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            }
            if (e.key === "Backspace" && !draft && tags.length > 0) {
              remove(tags[tags.length - 1]);
            }
          }}
          onBlur={commit}
          placeholder={tags.length === 0 ? "タグを入力して Enter" : ""}
          className="min-w-[120px] flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-tertiary"
        />
      </div>
      {unusedSuggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {unusedSuggestions.map((s) => (
            <button
              key={s}
              onClick={() => onChange([...tags, s])}
              className="rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] text-ink-secondary hover:border-accent hover:text-accent"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
