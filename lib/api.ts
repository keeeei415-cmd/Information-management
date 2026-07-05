/**
 * データアクセス層。
 * Supabase への読み書きをすべてここに集約する。
 * UI やストアは DB の存在を意識せず、この層の関数だけを呼ぶ。
 * (将来 DB を差し替える・API Route 経由にする場合もこのファイルの変更で済む)
 */
import { supabase } from "./supabase";
import type { Card, CardInput, CardPatch, Tab } from "./types";

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? "unknown error"}`);
}

// ---------------- Tabs ----------------

export async function fetchTabs(): Promise<Tab[]> {
  const { data, error } = await supabase
    .from("tabs")
    .select("*")
    .order("position", { ascending: true });
  if (error) fail("タブの取得に失敗しました", error);
  return data as Tab[];
}

export async function createTab(name: string, position: number): Promise<Tab> {
  const { data, error } = await supabase
    .from("tabs")
    .insert({ name, position })
    .select()
    .single();
  if (error) fail("タブの作成に失敗しました", error);
  return data as Tab;
}

export async function renameTab(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("tabs").update({ name }).eq("id", id);
  if (error) fail("タブ名の変更に失敗しました", error);
}

/** 並び順をまとめて保存する */
export async function reorderTabs(orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    supabase.from("tabs").update({ position: index }).eq("id", id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) fail("タブの並び替えに失敗しました", failed.error);
}

/** タブ削除 (中のカードは DB 側の ON DELETE CASCADE で削除される) */
export async function deleteTab(id: string): Promise<void> {
  const { error } = await supabase.from("tabs").delete().eq("id", id);
  if (error) fail("タブの削除に失敗しました", error);
}

// ---------------- Cards ----------------

/** ゴミ箱 (deleted_at) に入っていないカードを全件取得 */
export async function fetchCards(): Promise<Card[]> {
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .is("deleted_at", null)
    .order("position", { ascending: true });
  if (error) fail("カードの取得に失敗しました", error);
  return data as Card[];
}

export async function createCard(input: CardInput): Promise<Card> {
  const { data, error } = await supabase.from("cards").insert(input).select().single();
  if (error) fail("カードの作成に失敗しました", error);
  return data as Card;
}

export async function updateCard(id: string, patch: CardPatch): Promise<Card> {
  const { data, error } = await supabase
    .from("cards")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) fail("カードの更新に失敗しました", error);
  return data as Card;
}

/**
 * カード削除。
 * 現在は物理削除だが、ゴミ箱機能を追加する際は
 * updateCard(id, { deleted_at: new Date().toISOString() }) に置き換えるだけでよい。
 */
export async function deleteCard(id: string): Promise<void> {
  const { error } = await supabase.from("cards").delete().eq("id", id);
  if (error) fail("カードの削除に失敗しました", error);
}

/** 手動並び替えの保存 */
export async function reorderCards(orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    supabase.from("cards").update({ position: index }).eq("id", id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) fail("カードの並び替えに失敗しました", failed.error);
}
