"use client";

import { useState } from "react";
import { BottomNav, type AppScreen } from "@/components/BottomNav";
import { CasesScreen } from "@/components/CasesScreen";
import { KnowledgeScreen } from "@/components/KnowledgeScreen";
import { AppProvider, useApp } from "@/lib/store";

function Home() {
  const { loading, error, reload } = useApp();
  const [screen, setScreen] = useState<AppScreen>("cases");

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-[14px] text-ink-tertiary">
        読み込み中…
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col">
      {/* ヘッダー */}
      <header className="sticky top-0 z-30 bg-canvas/95 backdrop-blur">
        <div className="flex items-center px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2">
          <h1 className="text-[20px] font-bold tracking-tight text-ink">
            {screen === "cases" ? "症例" : "知識"}
          </h1>
        </div>
        <div className="h-px bg-line" />
      </header>

      {/* エラーバナー */}
      {error && (
        <div className="mx-3 mt-3 flex items-center justify-between rounded-xl border border-danger/30 bg-red-50 px-3 py-2 text-[13px] text-danger">
          <span>{error}</span>
          <button onClick={() => void reload()} className="font-semibold underline">
            再読み込み
          </button>
        </div>
      )}

      {/* 画面本体 */}
      <main className="flex-1 overflow-y-auto pt-2 pb-[calc(env(safe-area-inset-bottom)+4rem)]">
        {screen === "cases" ? <CasesScreen /> : <KnowledgeScreen />}
      </main>

      {/* 下部ナビ */}
      <BottomNav active={screen} onChange={setScreen} />
    </div>
  );
}

export default function Page() {
  return (
    <AppProvider>
      <Home />
    </AppProvider>
  );
}
