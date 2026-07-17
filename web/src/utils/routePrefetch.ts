type PrefetchFn = () => Promise<unknown>;

const REGISTRY: Record<string, PrefetchFn> = {
};

const triggered = new Set<string>();

export function prefetchRoute(path: string): void {
  if (triggered.has(path)) return;
  const fn = REGISTRY[path];
  if (!fn) return;
  triggered.add(path);
  fn().catch(() => {
    triggered.delete(path);
  });
}
