"use client";

import { useRef } from "react";
import { Icon } from "@/components/Icon";
import { KnowledgeScreen, type KnowledgeScreenHandle } from "@/components/KnowledgeScreen";
import { AppProvider, useApp } from "@/lib/store";

function Home() {
  const { loading, error, reload } = useApp();
  const knowledgeRef = useRef<KnowledgeScreenHandle>(null);

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
            知識
            <span className="ml-2 align-middle text-[10px] font-normal text-ink-tertiary">v3</span>
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => knowledgeRef.current?.openAddGroup()}
              aria-label="グループを追加"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink-secondary hover:text-ink active:scale-95"
            >
              <Icon name="folderPlus" size={20} />
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
        <div className="pb-[calc(env(safe-area-inset-bottom)+2rem)]">
          <KnowledgeScreen ref={knowledgeRef} />
        </div>
      </main>
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
