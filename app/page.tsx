"use client";

import { useRef, useState } from "react";
import { BottomNav, type AppScreen } from "@/components/BottomNav";
import { CasesScreen, type CasesScreenHandle } from "@/components/CasesScreen";
import { Icon } from "@/components/Icon";
import { KnowledgeScreen, type KnowledgeScreenHandle } from "@/components/KnowledgeScreen";
import { AppProvider, useApp } from "@/lib/store";

function Home() {
  const { loading, error, reload } = useApp();
  const [screen, setScreen] = useState<AppScreen>("cases");

  // 各画面の「グループ追加」「カード追加」を呼び出すためのref
  const casesRef     = useRef<CasesScreenHandle>(null);
  const knowledgeRef = useRef<KnowledgeScreenHandle>(null);

  const handleAddGroup = () => {
    if (screen === "cases")     casesRef.current?.openAddGroup();
    if (screen === "knowledge") knowledgeRef.current?.openAddGroup();
  };

  const handleAddCard = () => {
    if (screen === "cases")     casesRef.current?.openAddCard();
    if (screen === "knowledge") knowledgeRef.current?.openAddCard();
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-[14px] text-ink-tertiary">
        読み込み中…
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-canvas">
      {/* ヘッダー */}
      <header className="sticky top-0 z-30 border-b border-line bg-canvas">
        <div className="flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
          <h1 className="text-[20px] font-bold tracking-tight text-ink">
            {screen === "cases" ? "症例" : "知識"}
          </h1>
          <div className="flex items-center gap-2">
            {/* グループ追加 */}
            <button
              onClick={handleAddGroup}
              aria-label="グループを追加"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink-secondary hover:text-ink active:scale-95"
            >
              <Icon name="folderPlus" size={20} />
            </button>
            {/* カード追加 */}
            <button
              onClick={handleAddCard}
              aria-label={screen === "cases" ? "症例を追加" : "知識を追加"}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-white active:scale-95"
            >
              <Icon name="plus" size={22} strokeWidth={2.2} />
            </button>
          </div>
        </div>
      </header>

      {/* エラーバナー */}
      {error && (
        <div className="mx-3 mt-2 flex items-center justify-between rounded-xl border border-danger/30 bg-red-50 px-3 py-2 text-[13px] text-danger">
          <span>{error}</span>
          <button onClick={() => void reload()} className="font-semibold underline">再読み込み</button>
        </div>
      )}

      {/* 画面本体 */}
      <main className="flex-1 overflow-y-auto">
        <div className="pb-[calc(env(safe-area-inset-bottom)+4.5rem)]">
          {screen === "cases"
            ? <CasesScreen ref={casesRef} />
            : <KnowledgeScreen ref={knowledgeRef} />
          }
        </div>
      </main>

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
