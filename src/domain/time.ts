import { ACTION_TICK, dayOf, type Game } from './game';
import { completedWeeks, interestPending, interestAmount } from './debt';

/** Pure save normalization: remove obsolete survival data and migrate legacy time once. */
export function toDailyActions(original: Game): Game {
  const g = structuredClone(original) as Game & {
    satiety?: unknown;
    hungerRemainder?: unknown;
    health?: unknown;
    fatigue?: unknown;
    fatigueRemainder?: unknown;
  };
  // Retired listings disappear, while already owned assets and sales remain intact.
  g.board = g.board.filter((item) => item.marketId !== 'aircraft');
  delete g.satiety;
  delete g.hungerRemainder;
  delete g.health;
  delete g.fatigue;
  delete g.fatigueRemainder;
  g.interestWeek ??= completedWeeks(g);
  if (
    g.status === 'playing' &&
    interestPending(g) &&
    g.cash < interestAmount(g)
  ) {
    g.status = 'bankrupt';
    g.inquiries = [];
  }
  if (g.timeMode === 'daily-actions') return g;
  const oldNow = g.minute;
  const now = Math.floor(oldNow / 1440) * 1440;
  const deadline = (old: number) =>
    Math.max(0, now + Math.ceil((old - oldNow) / ACTION_TICK) * ACTION_TICK);
  g.minute = now;
  g.timeMode = 'daily-actions';
  g.marketDay = dayOf(g);
  g.lastEvent = Math.max(
    0,
    now -
      Math.floor(Math.max(0, oldNow - g.lastEvent) / ACTION_TICK) * ACTION_TICK,
  );
  for (const item of [...g.board, ...g.inventory])
    item.expires = deadline(item.expires);
  for (const sale of g.sales) {
    sale.created = Math.min(now, deadline(sale.created));
    sale.expires = deadline(sale.expires);
    sale.nextCheck = Math.max(now + ACTION_TICK, deadline(sale.nextCheck));
  }
  if (g.quotes)
    g.quotes = oldNow - g.quotes.at >= 120 ? null : { ...g.quotes, at: now };
  if (g.event) {
    g.event.expires = deadline(g.event.expires);
    g.event.text =
      g.event.type === 'repair'
        ? '정비 교육을 제안합니다. 5,000원 · 행동 1회.'
        : '이사 정리 일손을 구합니다. 보상 15,000원 · 행동 1회.';
  }
  return g;
}
