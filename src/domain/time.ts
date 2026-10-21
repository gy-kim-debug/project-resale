import type { Game } from './game';

/** Legacy minute-based snapshots retain resources and relative deadlines. */
export function alignToHour(original: Game): Game {
  const offset = original.minute % 60;
  if (!offset) return original;
  const g = structuredClone(original);
  const shift = (minute: number) => Math.max(0, minute - offset);
  g.minute -= offset;
  g.lastEvent = shift(g.lastEvent);
  for (const item of [...g.board, ...g.inventory])
    item.expires = shift(item.expires);
  for (const sale of g.sales) {
    sale.created = shift(sale.created);
    sale.expires = shift(sale.expires);
    sale.nextCheck = shift(sale.nextCheck);
  }
  if (g.quotes) g.quotes.at = shift(g.quotes.at);
  if (g.event) g.event.expires = shift(g.event.expires);
  for (const entry of g.logs) entry.minute = shift(entry.minute);
  return g;
}
