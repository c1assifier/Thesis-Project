import type { Module } from "./api";

export function sortModulesByOrder<T extends Pick<Module, "order_index">>(modules: T[]): T[] {
  return [...modules].sort((a, b) => a.order_index - b.order_index);
}

export function getUnlockedModuleIds(modules: Module[], completedModuleIds: number[]): Set<number> {
  const sortedModules = sortModulesByOrder(modules);
  const completedSet = new Set(completedModuleIds);
  const unlocked = new Set<number>();

  for (let index = 0; index < sortedModules.length; index += 1) {
    const current = sortedModules[index];
    if (index === 0) {
      unlocked.add(current.id);
      continue;
    }

    const previous = sortedModules[index - 1];
    if (completedSet.has(previous.id) || completedSet.has(current.id)) {
      unlocked.add(current.id);
    }
  }

  return unlocked;
}
