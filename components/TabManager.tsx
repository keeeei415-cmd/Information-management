"use client";

import { useState } from "react";
import { useApp } from "@/lib/store";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

/** タブの作成・名前変更・並び替え・削除をまとめた管理画面 */
export function TabManager({ onClose }: { onClose: () => void }) {
  const { tabs, cards, addTab, renameTab, moveTab, removeTab } = useApp();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const create = async () => {
    const name = newName.trim();
    if (!name) return;
    setNewName("");
    await addTab(name);
  };

  const startEdit = (id: string, current: string) => {
    setEditingId(id);
    setEditingName(current);
  };

  const commitEdit = async () => {
    if (!editingId) return;
    const name = editingName.trim();
    if (name) await renameTab(editingId, name);
    setEditingId(null);
  };

  const remove = async (id: string, name: string) => {
    const count = cards.filter((c) => c.tab_id === id).length;
    const message =
      count > 0
        ? `タブ「${name}」と中のカード ${count} 件を削除しますか?`
        : `タブ「${name}」を削除しますか?`;
    if (!window.confirm(message)) return;
    await removeTab(id);
  };

  return (
    <Modal title="タブの管理" onClose={onClose}>
      {/* 新規作成 */}
      <div className="mb-4 flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void create()}
          placeholder="新しいタブ名"
          className="h-11 flex-1 rounded-xl border border-line bg-canvas px-3 text-[15px] text-ink outline-none placeholder:text-ink-tertiary focus:border-accent"
        />
        <button
          onClick={create}
          disabled={!newName.trim()}
          className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-white disabled:opacity-40"
          aria-label="タブを追加"
        >
          <Icon name="plus" size={20} />
        </button>
      </div>

      {/* 一覧 */}
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
        {tabs.length === 0 && (
          <li className="px-4 py-6 text-center text-[14px] text-ink-tertiary">
            タブがありません。上の欄から作成してください。
          </li>
        )}
        {tabs.map((tab, index) => (
          <li key={tab.id} className="flex items-center gap-2 bg-surface px-3 py-2.5">
            {editingId === tab.id ? (
              <input
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void commitEdit()}
                onBlur={commitEdit}
                autoFocus
                className="h-9 flex-1 rounded-lg border border-accent bg-canvas px-2 text-[15px] text-ink outline-none"
              />
            ) : (
              <button
                onClick={() => startEdit(tab.id, tab.name)}
                className="flex-1 truncate text-left text-[15px] text-ink"
              >
                {tab.name}
              </button>
            )}
            <button
              onClick={() => void moveTab(tab.id, -1)}
              disabled={index === 0}
              aria-label="上へ"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary hover:bg-canvas disabled:opacity-25"
            >
              <Icon name="up" size={15} />
            </button>
            <button
              onClick={() => void moveTab(tab.id, 1)}
              disabled={index === tabs.length - 1}
              aria-label="下へ"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary hover:bg-canvas disabled:opacity-25"
            >
              <Icon name="down" size={15} />
            </button>
            <button
              onClick={() => startEdit(tab.id, tab.name)}
              aria-label="名前を変更"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-secondary hover:bg-canvas"
            >
              <Icon name="edit" size={15} />
            </button>
            <button
              onClick={() => void remove(tab.id, tab.name)}
              aria-label="削除"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-danger hover:bg-red-50"
            >
              <Icon name="trash" size={15} />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[12px] leading-relaxed text-ink-tertiary">
        タブ名をタップすると名前を変更できます。タブを削除すると中のカードも削除されます。
      </p>
    </Modal>
  );
}
