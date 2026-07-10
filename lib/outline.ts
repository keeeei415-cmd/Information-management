/**
 * 知識タブのブロックエディタ型定義。
 * card.metadata.blocks に Block[] として保存する。
 * DB スキーマ変更なし。
 *
 * 今後追加しやすい種類:
 *   "heading" | "image" | "link" | "checklist" | "divider" | ...
 */

export type BlockType = "text" | "bullet" | "toggle" | "todo" | "divider";

export interface Block {
  id: string;
  type: BlockType;
  text: string;
  collapsed: boolean;      // toggle 専用
  checked?: boolean;       // todo 専用
  children: Block[];       // toggle の中に入れ子
}

// ---- ファクトリ ----

export function newBlock(type: BlockType = "text"): Block {
  return {
    id: `b_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    text: "",
    collapsed: false,
    checked: false,
    children: [],
  };
}

// ---- DB 読み書き ----

export function readBlocks(metadata: Record<string, unknown>): Block[] {
  const raw = (metadata as { blocks?: Block[] })?.blocks;
  return Array.isArray(raw) ? raw : [];
}

// ---- ツリー操作（すべて純粋関数）----

export function updateBlock(
  blocks: Block[],
  id: string,
  patch: Partial<Block>
): Block[] {
  return blocks.map((b) => {
    if (b.id === id) return { ...b, ...patch };
    if (b.children.length) return { ...b, children: updateBlock(b.children, id, patch) };
    return b;
  });
}

export function removeBlock(blocks: Block[], id: string): Block[] {
  return blocks
    .filter((b) => b.id !== id)
    .map((b) =>
      b.children.length ? { ...b, children: removeBlock(b.children, id) } : b
    );
}

/** parentId の直下の末尾に block を追加する */
export function addChildBlock(
  blocks: Block[],
  parentId: string,
  block: Block
): Block[] {
  return blocks.map((b) => {
    if (b.id === parentId) return { ...b, collapsed: false, children: [...b.children, block] };
    if (b.children.length) return { ...b, children: addChildBlock(b.children, parentId, block) };
    return b;
  });
}

/** id と同じ階層の直後に block を挿入する */
export function insertAfter(blocks: Block[], id: string, block: Block): Block[] {
  const idx = blocks.findIndex((b) => b.id === id);
  if (idx >= 0) {
    const next = [...blocks];
    next.splice(idx + 1, 0, block);
    return next;
  }
  return blocks.map((b) =>
    b.children.length ? { ...b, children: insertAfter(b.children, id, block) } : b
  );
}

export function moveBlock(blocks: Block[], id: string, dir: -1 | 1): Block[] {
  const idx = blocks.findIndex((b) => b.id === id);
  if (idx >= 0) {
    const target = idx + dir;
    if (target < 0 || target >= blocks.length) return blocks;
    const next = [...blocks];
    [next[idx], next[target]] = [next[target], next[idx]];
    return next;
  }
  return blocks.map((b) =>
    b.children.length ? { ...b, children: moveBlock(b.children, id, dir) } : b
  );
}

/** 検索: テキストを再帰的に検索 */
export function blocksMatch(blocks: Block[], q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const walk = (list: Block[]): boolean =>
    list.some((b) => b.text.toLowerCase().includes(needle) || walk(b.children));
  return walk(blocks);
}

/** id のブロックを (子ごと) 取り出す。見つからなければ null */
export function findBlock(blocks: Block[], id: string): Block | null {
  for (const b of blocks) {
    if (b.id === id) return b;
    const found = findBlock(b.children, id);
    if (found) return found;
  }
  return null;
}

/** ある id が別の id の子孫かどうか (自分の中に自分を落とすのを防ぐ) */
export function isDescendant(blocks: Block[], ancestorId: string, targetId: string): boolean {
  const ancestor = findBlock(blocks, ancestorId);
  if (!ancestor) return false;
  const walk = (list: Block[]): boolean =>
    list.some((b) => b.id === targetId || walk(b.children));
  return walk(ancestor.children);
}

/**
 * ドラッグ&ドロップ用の並べ替え。
 * dragId のブロックを targetId の直前 (before) または直後 (after) に移動する。
 * targetId が dragId の子孫の場合は何もしない。
 */
export function moveBlockTo(
  blocks: Block[],
  dragId: string,
  targetId: string,
  position: "before" | "after" | "inside"
): Block[] {
  if (dragId === targetId) return blocks;
  if (isDescendant(blocks, dragId, targetId)) return blocks;

  const dragged = findBlock(blocks, dragId);
  if (!dragged) return blocks;

  // まず抜き取る
  const without = removeBlock(blocks, dragId);

  // 挿入する
  const insert = (list: Block[]): Block[] => {
    const out: Block[] = [];
    for (const b of list) {
      if (b.id === targetId) {
        if (position === "before") {
          out.push(dragged, { ...b, children: insert(b.children) });
          continue;
        }
        if (position === "after") {
          out.push({ ...b, children: insert(b.children) }, dragged);
          continue;
        }
        // inside: トグルの子として末尾に追加
        out.push({ ...b, collapsed: false, children: [...insert(b.children), dragged] });
        continue;
      }
      out.push(b.children.length ? { ...b, children: insert(b.children) } : b);
    }
    return out;
  };

  return insert(without);
}

/**
 * 空のブロックを取り除く。
 * ただし子を持つトグルは、中身があるので残す。
 * (編集中の行は保存対象外なので、表示時のクリーンアップに使う)
 */
export function pruneEmpty(blocks: Block[]): Block[] {
  return blocks
    .map((b) => ({ ...b, children: pruneEmpty(b.children) }))
    .filter(
      (b) =>
        b.type === "divider" ||       // 区切り線はテキストを持たないので常に残す
        b.text.trim() !== "" ||
        b.children.length > 0
    );
}
