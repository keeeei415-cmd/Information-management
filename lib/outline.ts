/**
 * 「知識」タブで使う階層アウトラインの型と操作関数。
 * データは card.metadata.outline に OutlineNode[] として保存する。
 * 1枚のカード = 1つの「部位」(例: 頸) で、その中に項目→箇条書き→…と何層でもネストできる。
 *
 * すべて純粋関数 (元配列を壊さず新しい配列を返す) にしてあるので、
 * UI 側は「新しい木を作って保存」するだけでよい。
 */

export interface OutlineNode {
  id: string;
  text: string;
  collapsed: boolean; // トグルを閉じているか
  children: OutlineNode[];
}

export function newNode(text = ""): OutlineNode {
  return {
    id: `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    text,
    collapsed: false,
    children: [],
  };
}

/** card.metadata から安全にツリーを取り出す */
export function readOutline(metadata: Record<string, unknown>): OutlineNode[] {
  const raw = (metadata as { outline?: OutlineNode[] })?.outline;
  return Array.isArray(raw) ? raw : [];
}

/** 指定 id のノードを更新する (再帰) */
export function updateNode(
  nodes: OutlineNode[],
  id: string,
  patch: Partial<OutlineNode>
): OutlineNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, ...patch };
    if (n.children.length) return { ...n, children: updateNode(n.children, id, patch) };
    return n;
  });
}

/** 指定 id のノードを削除する (再帰) */
export function removeNode(nodes: OutlineNode[], id: string): OutlineNode[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) =>
      n.children.length ? { ...n, children: removeNode(n.children, id) } : n
    );
}

/** 指定 id のノードの子として新規ノードを追加し、追加したノードの id を返す */
export function addChild(
  nodes: OutlineNode[],
  parentId: string,
  child: OutlineNode
): OutlineNode[] {
  return nodes.map((n) => {
    if (n.id === parentId) {
      return { ...n, collapsed: false, children: [...n.children, child] };
    }
    if (n.children.length) {
      return { ...n, children: addChild(n.children, parentId, child) };
    }
    return n;
  });
}

/** ある id の兄弟リスト内で上下に移動する (再帰的に該当リストを探す) */
export function moveNode(
  nodes: OutlineNode[],
  id: string,
  direction: -1 | 1
): OutlineNode[] {
  const index = nodes.findIndex((n) => n.id === id);
  if (index >= 0) {
    const target = index + direction;
    if (target < 0 || target >= nodes.length) return nodes;
    const next = [...nodes];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  }
  return nodes.map((n) =>
    n.children.length ? { ...n, children: moveNode(n.children, id, direction) } : n
  );
}

/** 検索用: ツリー内のどこかに文字列が含まれるか */
export function outlineMatches(nodes: OutlineNode[], q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const walk = (list: OutlineNode[]): boolean =>
    list.some(
      (n) => n.text.toLowerCase().includes(needle) || walk(n.children)
    );
  return walk(nodes);
}
