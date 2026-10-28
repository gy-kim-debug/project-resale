import { ITEM_CODEX, codexKey, isCodexKey } from '../content/collection';
import type { Game, Item } from './game';

export function unlockedItems(g: Game): Set<string> {
  return new Set(
    [...(g.discoveredItems ?? []), ...g.inventory.map(codexKey)].filter(
      isCodexKey,
    ),
  );
}
export function unlockItem(g: Game, item: Item) {
  const known = unlockedItems(g);
  const key = codexKey(item);
  if (isCodexKey(key)) known.add(key);
  g.discoveredItems = [...known];
}

/** Retired tier-only products must not create impossible collection goals. */
export function codexEntries(g: Game) {
  const known = unlockedItems(g);
  return ITEM_CODEX.filter((entry) => !entry.legacy || known.has(entry.key));
}
