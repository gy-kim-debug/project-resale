import type { Item } from './game';
/** Stable presentation-only selection, never advances the economic RNG. */
export function chatWording(
  item: Pick<Item, 'id'> & Partial<Pick<Item, 'traderId' | 'caseId' | 'kind'>>,
  topic: string,
  lines: readonly string[],
): string {
  let hash = 2166136261;
  for (const char of `${item.id}:${item.traderId}:${item.caseId}:${item.kind}:${topic}`)
    hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return lines[(hash >>> 0) % lines.length];
}
