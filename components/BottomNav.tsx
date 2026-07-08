"use client";

import { Icon } from "./Icon";

export type AppScreen = "cases" | "knowledge";

export function BottomNav({
  active,
  onChange,
}: {
  active: AppScreen;
  onChange: (s: AppScreen) => void;
}) {
  const items: { id: AppScreen; label: string; icon: string }[] = [
    { id: "cases",     label: "症例",  icon: "list" },
    { id: "knowledge", label: "知識",  icon: "tag"  },
  ];

  return (
    <nav
      aria-label="メインナビゲーション"
      className="fixed bottom-0 inset-x-0 z-40 flex border-t border-line bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      {items.map((item) => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            aria-current={isActive ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
              isActive ? "text-accent" : "text-ink-tertiary"
            }`}
          >
            <Icon
              name={item.icon}
              size={22}
              strokeWidth={isActive ? 2.2 : 1.8}
            />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
