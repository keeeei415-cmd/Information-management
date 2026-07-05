"use client";

/**
 * アプリの状態管理ストア。
 * タブ・カードの全データをここで保持し、CRUD 操作を提供する。
 * UI の応答性のため「楽観的更新 → API 呼び出し → 失敗時は再取得で復元」の方針をとる。
 *
 * 新しい操作 (アーカイブなど) を追加する場合:
 *   1. lib/api.ts に関数を追加
 *   2. この Context に action を追加
 *   3. コンポーネントから useApp() で呼ぶ
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as api from "./api";
import type { Card, CardInput, CardPatch, Tab } from "./types";

interface AppState {
  tabs: Tab[];
  cards: Card[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  // tabs
  addTab: (name: string) => Promise<Tab | null>;
  renameTab: (id: string, name: string) => Promise<void>;
  moveTab: (id: string, direction: -1 | 1) => Promise<void>;
  removeTab: (id: string) => Promise<void>;
  // cards
  addCard: (input: CardInput) => Promise<void>;
  patchCard: (id: string, patch: CardPatch) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  moveCard: (id: string, direction: -1 | 1, visibleIds: string[]) => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setError(null);
      const [t, c] = await Promise.all([api.fetchTabs(), api.fetchCards()]);
      setTabs(t);
      setCards(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : "データの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  /** 失敗時に共通で行う復元処理 */
  const recover = useCallback(
    (e: unknown) => {
      setError(e instanceof Error ? e.message : "操作に失敗しました");
      void reload();
    },
    [reload]
  );

  // ---------------- Tabs ----------------

  const addTab = useCallback(
    async (name: string): Promise<Tab | null> => {
      try {
        const tab = await api.createTab(name, tabs.length);
        setTabs((prev) => [...prev, tab]);
        return tab;
      } catch (e) {
        recover(e);
        return null;
      }
    },
    [tabs.length, recover]
  );

  const renameTab = useCallback(
    async (id: string, name: string) => {
      setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, name } : t)));
      try {
        await api.renameTab(id, name);
      } catch (e) {
        recover(e);
      }
    },
    [recover]
  );

  const moveTab = useCallback(
    async (id: string, direction: -1 | 1) => {
      const index = tabs.findIndex((t) => t.id === id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= tabs.length) return;
      const next = [...tabs];
      [next[index], next[target]] = [next[target], next[index]];
      setTabs(next.map((t, i) => ({ ...t, position: i })));
      try {
        await api.reorderTabs(next.map((t) => t.id));
      } catch (e) {
        recover(e);
      }
    },
    [tabs, recover]
  );

  const removeTab = useCallback(
    async (id: string) => {
      setTabs((prev) => prev.filter((t) => t.id !== id));
      setCards((prev) => prev.filter((c) => c.tab_id !== id));
      try {
        await api.deleteTab(id);
      } catch (e) {
        recover(e);
      }
    },
    [recover]
  );

  // ---------------- Cards ----------------

  const addCard = useCallback(
    async (input: CardInput) => {
      try {
        const card = await api.createCard(input);
        setCards((prev) => [card, ...prev]);
      } catch (e) {
        recover(e);
      }
    },
    [recover]
  );

  const patchCard = useCallback(
    async (id: string, patch: CardPatch) => {
      setCards((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, ...patch, updated_at: new Date().toISOString() } : c
        )
      );
      try {
        const saved = await api.updateCard(id, patch);
        setCards((prev) => prev.map((c) => (c.id === id ? saved : c)));
      } catch (e) {
        recover(e);
      }
    },
    [recover]
  );

  const removeCard = useCallback(
    async (id: string) => {
      setCards((prev) => prev.filter((c) => c.id !== id));
      try {
        await api.deleteCard(id);
      } catch (e) {
        recover(e);
      }
    },
    [recover]
  );

  /** 手動並び替え: 表示中の並び (visibleIds) の中で 1 つ移動して position を振り直す */
  const moveCard = useCallback(
    async (id: string, direction: -1 | 1, visibleIds: string[]) => {
      const index = visibleIds.indexOf(id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= visibleIds.length) return;
      const next = [...visibleIds];
      [next[index], next[target]] = [next[target], next[index]];
      const posMap = new Map(next.map((cid, i) => [cid, i]));
      setCards((prev) =>
        prev.map((c) => (posMap.has(c.id) ? { ...c, position: posMap.get(c.id)! } : c))
      );
      try {
        await api.reorderCards(next);
      } catch (e) {
        recover(e);
      }
    },
    [recover]
  );

  const value = useMemo<AppState>(
    () => ({
      tabs,
      cards,
      loading,
      error,
      reload,
      addTab,
      renameTab,
      moveTab,
      removeTab,
      addCard,
      patchCard,
      removeCard,
      moveCard,
    }),
    [tabs, cards, loading, error, reload, addTab, renameTab, moveTab, removeTab, addCard, patchCard, removeCard, moveCard]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp は AppProvider の内側で使用してください");
  return ctx;
}
