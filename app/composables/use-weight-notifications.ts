const weightWatchers = new Set<() => void>();

export function notifyWeightChange() {
  weightWatchers.forEach((fn) => fn());
}

export function onWeightChange(fn: () => void): () => void {
  weightWatchers.add(fn);
  return () => weightWatchers.delete(fn);
}
