"use client";

/**
 * 知識タブ画面。
 * グループ / サブグループ の2階層構造。
 * - カードの category = "グループ名" または "グループ名/サブグループ名"
 * - グループ定義は特殊カード (GROUPS_CARD_TITLE) の metadata.groups に保存
 *   型: { groups: GroupDef[] }
 *   GroupDef: { name: string; subs: string[] }
 */

import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { BODY_PARTS, type Card } from "@/lib/types";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

const UNGROUPED = "未分類";
const GROUPS_CARD_TITLE = "__groups__";

interface GroupDef {
  name: string;
  subs: string[];
}

export interface KnowledgeScreenHandle {
  openAddGroup: () => void;
  openAddCard:  () => void;
}

export const KnowledgeScreen = forwardRef<KnowledgeScreenHandle>((_, ref) => {
  const { cards, addCard, patchCard, removeCard, tabs } = useApp();

  const [query, setQuery]     = useState("");
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set()); // "グループ名" or "グループ名/サブ名"
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [creating, setCreating]       = useState(false);

  // グループ追加
  const [addingGroup, setAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  // サブグループ追加 (追加先グループ名)
  const [addingSubFor, setAddingSubFor] = useState<string | null>(null);
  const [newSubName, setNewSubName]     = useState("");

  useImperativeHandle(ref, () => ({
    openAddGroup: () => setAddingGroup(true),
    openAddCard:  () => setCreating(true),
  }));

  const knowledgeTabId = useMemo(
    () => tabs.find((t) => t.name === "知識")?.id ?? null,
    [tabs]
  );

  const allKnowledgeCards = useMemo(
    () => knowledgeTabId ? cards.filter((c) => c.tab_id === knowledgeTabId) : [],
    [cards, knowledgeTabId]
  );

  const groupsCard = useMemo(
    () => allKnowledgeCards.find((c) => c.title === GROUPS_CARD_TITLE) ?? null,
    [allKnowledgeCards]
  );

  const knowledgeCards = useMemo(
    () => allKnowledgeCards.filter((c) => c.title !== GROUPS_CARD_TITLE),
    [allKnowledgeCards]
  );

  // グループ定義一覧
  const groupDefs = useMemo<GroupDef[]>(() => {
    const raw = (groupsCard?.metadata as { groups?: GroupDef[] })?.groups;
    if (Array.isArray(raw)) return raw;
    return [];
  }, [groupsCard]);

  // groupDefs に存在しないグループ/サブグループをカードから補完する
  const allGroupDefs = useMemo<GroupDef[]>(() => {
    const map = new Map<string, Set<string>>();
    groupDefs.forEach((g) => map.set(g.name, new Set(g.subs)));
    knowledgeCards.forEach((c) => {
      if (!c.category) return;
      const [gName, subName] = c.category.split("/");
      if (!map.has(gName)) map.set(gName, new Set());
      if (subName) map.get(gName)!.add(subName);
    });
    return groupDefs
      .map((g) => ({ name: g.name, subs: Array.from(map.get(g.name) ?? []) }))
      .concat(
        // groupDefs にないグループ（カードから補完）
        [...map.entries()]
          .filter(([name]) => !groupDefs.some((g) => g.name === name))
          .map(([name, subsSet]) => ({ name, subs: Array.from(subsSet) }))
      );
  }, [groupDefs, knowledgeCards]);

  const searching = query.trim().length > 0;

  const toggleKey = (key: string) =>
    setOpenKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  /** groupsCard を更新 (なければ新規作成) する共通処理 */
  const saveGroupDefs = async (defs: GroupDef[]) => {
    if (!knowledgeTabId) return;
    const meta = { groups: defs };
    if (groupsCard) {
      await patchCard(groupsCard.id, { metadata: meta });
    } else {
      await addCard({ tab_id: knowledgeTabId, title: GROUPS_CARD_TITLE, metadata: meta });
    }
  };

  const addGroup = async () => {
    const name = newGroupName.trim();
    setNewGroupName(""); setAddingGroup(false);
    if (!name || allGroupDefs.some((g) => g.name === name)) return;
    const next = [...groupDefs, { name, subs: [] }];
    await saveGroupDefs(next);
    setOpenKeys((prev) => new Set(prev).add(name));
  };

  const addSub = async (groupName: string) => {
    const sub = newSubName.trim();
    setNewSubName(""); setAddingSubFor(null);
    if (!sub) return;
    const next = allGroupDefs.map((g) =>
      g.name === groupName ? { ...g, subs: g.subs.includes(sub) ? g.subs : [...g.subs, sub] } : g
    );
    await saveGroupDefs(next);
    setOpenKeys((prev) => new Set(prev).add(`${groupName}/${sub}`));
  };

  const removeGroup = async (groupName: string) => {
    if (!window.confirm(`グループ「${groupName}」を削除しますか?\n中のカードは「${UNGROUPED}」に移動します。`)) return;
    const members = knowledgeCards.filter((c) => (c.category ?? "").startsWith(groupName));
    for (const m of members) await patchCard(m.id, { category: null });
    await saveGroupDefs(groupDefs.filter((g) => g.name !== groupName));
  };

  const removeSub = async (groupName: string, subName: string) => {
    if (!window.confirm(`「${subName}」を削除しますか?`)) return;
    const cat = `${groupName}/${subName}`;
    const members = knowledgeCards.filter((c) => c.category === cat);
    for (const m of members) await patchCard(m.id, { category: groupName }); // サブのカードは親グループへ
    await saveGroupDefs(allGroupDefs.map((g) =>
      g.name === groupName ? { ...g, subs: g.subs.filter((s) => s !== subName) } : g
    ));
  };

  /** カードをグループ/サブに振り分ける */
  const getCardsFor = (key: string): Card[] => {
    const q = query.trim().toLowerCase();
    return knowledgeCards.filter((c) => {
      const cat = c.category ?? "";
      const matchCat = cat === key;
      if (!matchCat) return false;
      if (!q) return true;
      return c.title.toLowerCase().includes(q) || c.content.toLowerCase().includes(q) || c.tags.some((t) => t.toLowerCase().includes(q));
    });
  };

  /** グループ直下のカード (サブに属さないもの) */
  const getDirectCards = (groupName: string, subs: string[]): Card[] => {
    const subCats = new Set(subs.map((s) => `${groupName}/${s}`));
    const q = query.trim().toLowerCase();
    return knowledgeCards.filter((c) => {
      if ((c.category ?? "") !== groupName) return false;
      if (subCats.has(c.category ?? "")) return false;
      if (!q) return true;
      return c.title.toLowerCase().includes(q) || c.content.toLowerCase().includes(q) || c.tags.some((t) => t.toLowerCase().includes(q));
    });
  };

  const ungroupedCards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return knowledgeCards.filter((c) => {
      if (c.category) return false;
      if (!q) return true;
      return c.title.toLowerCase().includes(q) || c.content.toLowerCase().includes(q) || c.tags.some((t) => t.toLowerCase().includes(q));
    });
  }, [knowledgeCards, query]);

  const totalCount = (g: GroupDef) =>
    knowledgeCards.filter((c) => (c.category ?? "").startsWith(g.name)).length;

  const copyCard = (card: Card) => {
    if (!knowledgeTabId) return;
    void addCard({
      tab_id: knowledgeTabId,
      title: `${card.title} (コピー)`,
      content: card.content,
      category: card.category ?? undefined,
      tags: card.tags,
      color: card.color,
      metadata: card.metadata,
    });
  };

  // カードエディタに渡す選択肢
  const groupOptions = useMemo(() => allGroupDefs, [allGroupDefs]);

  return (
    <div>
      {/* 検索 */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3">
          <Icon name="search" size={16} className="shrink-0 text-ink-tertiary" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="知識を検索…"
            className="flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-tertiary"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="クリア">
              <Icon name="close" size={14} className="text-ink-tertiary" />
            </button>
          )}
        </div>
      </div>

      {/* グループ追加入力 */}
      {addingGroup && (
        <div className="mx-3 mb-2 flex items-center gap-2 rounded-card border border-line bg-surface p-2.5">
          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void addGroup()}
            autoFocus
            placeholder="グループ名 (例: 頚部)"
            className="h-10 flex-1 rounded-xl border border-accent bg-canvas px-3 text-[15px] text-ink outline-none"
          />
          <button onClick={() => void addGroup()} disabled={!newGroupName.trim()}
            className="h-10 rounded-xl bg-accent px-4 text-[14px] font-semibold text-white disabled:opacity-40">
            追加
          </button>
          <button onClick={() => { setAddingGroup(false); setNewGroupName(""); }}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line text-ink-tertiary">
            <Icon name="close" size={16} />
          </button>
        </div>
      )}

      {/* グループセクション */}
      <div className="space-y-2 px-3 pt-1">
        {allGroupDefs.length === 0 && ungroupedCards.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-20 text-center">
            <p className="text-[15px] font-medium text-ink-secondary">
              {searching ? "一致する知識がありません" : "右上のボタンからグループと知識を追加しましょう"}
            </p>
          </div>
        )}

        {allGroupDefs.map((groupDef) => {
          const gKey = groupDef.name;
          const isGroupOpen = searching || openKeys.has(gKey);
          const count = totalCount(groupDef);
          const directCards = getDirectCards(groupDef.name, groupDef.subs);

          return (
            <section key={gKey} className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
              {/* グループヘッダー */}
              <div className="flex items-center gap-2 px-2.5 py-2.5">
                <button onClick={() => toggleKey(gKey)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-secondary hover:bg-canvas">
                  <Icon name={isGroupOpen ? "chevronDown" : "chevronRight"} size={18} strokeWidth={2.4} />
                </button>
                <button onClick={() => toggleKey(gKey)} className="flex-1 text-left">
                  <span className="text-[16px] font-semibold text-ink">{groupDef.name}</span>
                  <span className="ml-2 text-[13px] text-ink-tertiary">{count}</span>
                </button>
                {/* サブグループ追加ボタン */}
                <button
                  onClick={() => { setAddingSubFor(gKey); setOpenKeys((p) => new Set(p).add(gKey)); }}
                  aria-label="サブグループを追加"
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-canvas text-ink-secondary hover:text-accent"
                >
                  <Icon name="folderPlus" size={15} />
                </button>
                <button onClick={() => void removeGroup(groupDef.name)} aria-label="グループを削除"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-tertiary hover:bg-red-50 hover:text-danger">
                  <Icon name="trash" size={15} />
                </button>
              </div>

              {/* グループ本体 */}
              {isGroupOpen && (
                <div className="border-t border-line bg-canvas/50 p-2">

                  {/* サブグループ追加入力 */}
                  {addingSubFor === gKey && (
                    <div className="mb-2 flex items-center gap-1.5 rounded-xl border border-accent/30 bg-surface p-2">
                      <input
                        value={newSubName}
                        onChange={(e) => setNewSubName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && void addSub(gKey)}
                        autoFocus
                        placeholder="サブグループ名"
                        className="h-9 flex-1 rounded-lg border border-accent bg-canvas px-2.5 text-[14px] text-ink outline-none"
                      />
                      <button onClick={() => void addSub(gKey)} disabled={!newSubName.trim()}
                        className="h-9 rounded-lg bg-accent px-3 text-[13px] font-semibold text-white disabled:opacity-40">
                        追加
                      </button>
                      <button onClick={() => { setAddingSubFor(null); setNewSubName(""); }}
                        className="flex h-9 w-9 items-center justify-center rounded-lg border border-line text-ink-tertiary">
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                  )}

                  {/* サブグループ一覧 */}
                  {groupDef.subs.map((sub) => {
                    const subKey = `${gKey}/${sub}`;
                    const isSubOpen = searching || openKeys.has(subKey);
                    const subCards = getCardsFor(subKey);
                    return (
                      <div key={subKey} className="mb-1.5 overflow-hidden rounded-xl border border-line bg-surface">
                        <div className="flex items-center gap-1.5 px-2 py-2">
                          <button onClick={() => toggleKey(subKey)}
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-tertiary hover:bg-canvas">
                            <Icon name={isSubOpen ? "chevronDown" : "chevronRight"} size={14} strokeWidth={2.4} />
                          </button>
                          <button onClick={() => toggleKey(subKey)} className="flex-1 text-left">
                            <span className="text-[14px] font-medium text-ink-secondary">{sub}</span>
                            <span className="ml-1.5 text-[12px] text-ink-tertiary">{subCards.length}</span>
                          </button>
                          <button onClick={() => void removeSub(gKey, sub)} aria-label="サブグループを削除"
                            className="flex h-6 w-6 items-center justify-center rounded text-ink-tertiary hover:text-danger">
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                        {isSubOpen && (
                          <div className="space-y-1.5 border-t border-line bg-canvas/30 p-1.5">
                            {subCards.length === 0 && (
                              <p className="py-2 text-center text-[12px] text-ink-tertiary">カードがありません</p>
                            )}
                            {subCards.map((card) => (
                              <KnowledgeCard key={card.id} card={card}
                                onCopy={() => copyCard(card)}
                                onEdit={() => setEditingCard(card)}
                                onDelete={() => { if (window.confirm(`「${card.title}」を削除しますか?`)) void removeCard(card.id); }} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* グループ直下のカード (サブなし) */}
                  {directCards.map((card) => (
                    <KnowledgeCard key={card.id} card={card}
                      onCopy={() => copyCard(card)}
                      onEdit={() => setEditingCard(card)}
                      onDelete={() => { if (window.confirm(`「${card.title}」を削除しますか?`)) void removeCard(card.id); }} />
                  ))}
                </div>
              )}
            </section>
          );
        })}

        {/* 未分類 */}
        {ungroupedCards.length > 0 && (
          <section className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
            <div className="flex items-center gap-2 px-2.5 py-2.5">
              <button onClick={() => toggleKey(UNGROUPED)}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-secondary hover:bg-canvas">
                <Icon name={openKeys.has(UNGROUPED) ? "chevronDown" : "chevronRight"} size={18} strokeWidth={2.4} />
              </button>
              <button onClick={() => toggleKey(UNGROUPED)} className="flex-1 text-left">
                <span className="text-[16px] font-semibold text-ink">{UNGROUPED}</span>
                <span className="ml-2 text-[13px] text-ink-tertiary">{ungroupedCards.length}</span>
              </button>
            </div>
            {(searching || openKeys.has(UNGROUPED)) && (
              <div className="space-y-1.5 border-t border-line bg-canvas/50 p-2">
                {ungroupedCards.map((card) => (
                  <KnowledgeCard key={card.id} card={card}
                    onCopy={() => copyCard(card)}
                    onEdit={() => setEditingCard(card)}
                    onDelete={() => { if (window.confirm(`「${card.title}」を削除しますか?`)) void removeCard(card.id); }} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* モーダル */}
      {creating && knowledgeTabId && (
        <KnowledgeCardEditor
          onClose={() => setCreating(false)}
          onSave={(input) => {
            void addCard({ tab_id: knowledgeTabId, ...input });
            if (input.category) {
              const [g, s] = input.category.split("/");
              setOpenKeys((p) => { const n = new Set(p); n.add(g); if (s) n.add(input.category!); return n; });
            }
            setCreating(false);
          }}
          groupDefs={groupOptions}
        />
      )}
      {editingCard && (
        <KnowledgeCardEditor
          card={editingCard}
          onClose={() => setEditingCard(null)}
          onSave={(input) => {
            void patchCard(editingCard.id, input);
            setEditingCard(null);
          }}
          groupDefs={groupOptions}
        />
      )}
    </div>
  );
});
KnowledgeScreen.displayName = "KnowledgeScreen";

// ---- カード1枚コンポーネント ----
function KnowledgeCard({ card, onCopy, onEdit, onDelete }: {
  card: Card;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <article className="rounded-xl border border-line bg-surface" style={{ borderLeft: "3px solid #007AFF" }}>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[14px] font-semibold text-ink">{card.title}</h3>
          <div className="flex shrink-0 gap-1">
            <button onClick={onCopy} aria-label="コピー"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-canvas text-ink-secondary hover:text-accent">
              <Icon name="copy" size={13} />
            </button>
            <button onClick={onEdit} aria-label="編集"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-canvas text-ink-secondary hover:text-accent">
              <Icon name="edit" size={13} />
            </button>
            <button onClick={onDelete} aria-label="削除"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-canvas text-ink-secondary hover:text-danger">
              <Icon name="trash" size={13} />
            </button>
          </div>
        </div>
        {card.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {card.tags.map((t) => (
              <span key={t} className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">{t}</span>
            ))}
          </div>
        )}
        {card.content && (
          <p className="mt-1.5 line-clamp-2 whitespace-pre-line text-[12px] leading-relaxed text-ink-secondary">
            {card.content}
          </p>
        )}
      </div>
    </article>
  );
}

// ---- 知識カード専用エディタ ----
function KnowledgeCardEditor({
  card,
  onClose,
  onSave,
  groupDefs,
}: {
  card?: Card;
  onClose: () => void;
  onSave: (input: { title: string; content: string; category: string | null; tags: string[] }) => void;
  groupDefs: GroupDef[];
}) {
  const [title, setTitle]     = useState(card?.title ?? "");
  const [content, setContent] = useState(card?.content ?? "");
  const [tags, setTags]       = useState<string[]>(card?.tags ?? []);

  // グループ/サブ選択
  const initCat = card?.category ?? "";
  const [selGroup, setSelGroup] = useState(() => initCat.includes("/") ? initCat.split("/")[0] : initCat);
  const [selSub,   setSelSub]   = useState(() => initCat.includes("/") ? initCat.split("/")[1] : "");

  const finalCategory = selGroup ? (selSub ? `${selGroup}/${selSub}` : selGroup) : null;
  const selectedGroupDef = groupDefs.find((g) => g.name === selGroup);

  const toggleTag = (part: string) =>
    setTags((prev) => prev.includes(part) ? prev.filter((t) => t !== part) : [...prev, part]);

  return (
    <Modal
      title={card ? "知識を編集" : "新しい知識"}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <button onClick={onClose}
            className="h-11 flex-1 rounded-xl border border-line text-[15px] font-medium text-ink-secondary">
            キャンセル
          </button>
          <button
            disabled={!title.trim()}
            onClick={() => onSave({ title: title.trim(), content, category: finalCategory, tags })}
            className="h-11 flex-1 rounded-xl bg-accent text-[15px] font-semibold text-white disabled:opacity-40">
            保存
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink-secondary">タイトル <span className="text-danger">*</span></label>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 寝違え" autoFocus
            className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-[15px] text-ink outline-none placeholder:text-ink-tertiary focus:border-accent" />
        </div>

        {groupDefs.length > 0 && (
          <div className="space-y-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink-secondary">グループ</label>
              <select value={selGroup} onChange={(e) => { setSelGroup(e.target.value); setSelSub(""); }}
                className="w-full appearance-none rounded-xl border border-line bg-canvas px-3 py-2.5 text-[15px] text-ink outline-none focus:border-accent">
                <option value="">未分類</option>
                {groupDefs.map((g) => <option key={g.name} value={g.name}>{g.name}</option>)}
              </select>
            </div>
            {selectedGroupDef && selectedGroupDef.subs.length > 0 && (
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-ink-secondary">サブグループ (任意)</label>
                <select value={selSub} onChange={(e) => setSelSub(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-line bg-canvas px-3 py-2.5 text-[15px] text-ink outline-none focus:border-accent">
                  <option value="">なし（グループ直下）</option>
                  {selectedGroupDef.subs.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink-secondary">部位</label>
          {tags.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[13px] font-medium text-white">
                  {t}
                  <button onClick={() => toggleTag(t)} className="opacity-70 hover:opacity-100">
                    <Icon name="close" size={11} strokeWidth={2.5} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <select value="" onChange={(e) => { if (e.target.value) toggleTag(e.target.value); e.target.value = ""; }}
            className="w-full appearance-none rounded-xl border border-line bg-canvas px-3 py-2.5 text-[15px] text-ink outline-none focus:border-accent">
            <option value="">＋ 部位を選択…</option>
            {BODY_PARTS.filter((p) => !tags.includes(p)).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-[13px] font-medium text-ink-secondary">内容</label>
          <textarea value={content} onChange={(e) => setContent(e.target.value)}
            placeholder="治療のポイント・アプローチなど" rows={6}
            className="w-full resize-y rounded-xl border border-line bg-canvas px-3 py-2.5 text-[15px] text-ink outline-none placeholder:text-ink-tertiary focus:border-accent" />
        </div>
      </div>
    </Modal>
  );
}
