interface Node {
  children: Map<string, Node>;
  isFile: boolean;
}

export interface TreeOptions {
  /** Only render directories (architecture preview). */
  directoriesOnly?: boolean;
  /** Maximum depth below the root that is rendered. */
  maxDepth?: number;
  /** Paths that should be hidden, e.g. `.gitkeep`. */
  hide?: (path: string) => boolean;
}

/** Renders a list of POSIX paths as a `tree`-style ASCII diagram. */
export function renderTree(root: string, paths: string[], options: TreeOptions = {}): string {
  const top: Node = { children: new Map(), isFile: false };
  for (const full of paths) {
    if (options.hide?.(full)) continue;
    const parts = full.split('/').filter(Boolean);
    let node = top;
    parts.forEach((part, index) => {
      const isFile = index === parts.length - 1;
      if (isFile && options.directoriesOnly) return;
      let child = node.children.get(part);
      if (!child) {
        child = { children: new Map(), isFile };
        node.children.set(part, child);
      }
      node = child;
    });
  }

  const lines = [`${root.replace(/\/$/, '')}/`];
  const walk = (node: Node, prefix: string, depth: number) => {
    const entries = [...node.children.entries()].sort(([a, an], [b, bn]) => {
      if (an.isFile !== bn.isFile) return an.isFile ? 1 : -1;
      return a.localeCompare(b);
    });
    entries.forEach(([name, child], i) => {
      const last = i === entries.length - 1;
      lines.push(`${prefix}${last ? '└── ' : '├── '}${name}${child.isFile ? '' : '/'}`);
      if (options.maxDepth === undefined || depth < options.maxDepth) {
        walk(child, `${prefix}${last ? '    ' : '│   '}`, depth + 1);
      }
    });
  };
  walk(top, '', 1);
  return lines.join('\n');
}
