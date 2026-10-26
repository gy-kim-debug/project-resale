import { ACTION_TICK, ACTIONS_PER_WEEK, dayOf, type Game } from './game';
import { settlementAmount } from './debt';

/** Pure save normalization: remove obsolete survival data and migrate legacy time once. */
export function toWeeklyActions(original: Game): Game {
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
  if (g.timeMode === 'weekly-actions' && g.weeklyRulesVersion === 2) return g;
  const oldWeekTicks = g.timeMode === 'weekly-actions' ? 14400 : 10080;
  const legacyWeek = Math.floor(g.minute / oldWeekTicks);
  g.interestWeek ??= legacyWeek;
  const wasDue =
    g.timeMode === 'weekly-actions'
      ? g.settling === true
      : legacyWeek >= g.interestWeek + 1;
  const migrate = () => {
    const used =
      g.timeMode === 'weekly-actions'
        ? (g.weekActions ?? 0)
        : wasDue
          ? ACTIONS_PER_WEEK
          : Math.floor((g.minute % oldWeekTicks) / ACTION_TICK);
    g.weekActions = Math.min(ACTIONS_PER_WEEK, used);
    const shift =
      g.interestWeek! * ACTIONS_PER_WEEK * ACTION_TICK +
      g.weekActions * ACTION_TICK -
      g.minute;
    const shifted = (value: number) => Math.max(0, value + shift);
    for (const item of [...g.board, ...g.inventory])
      item.expires = shifted(item.expires);
    for (const sale of g.sales) {
      sale.created = shifted(sale.created);
      sale.expires = shifted(sale.expires);
      sale.nextCheck = shifted(sale.nextCheck);
    }
    if (g.quotes) g.quotes.at = shifted(g.quotes.at);
    if (g.event) g.event.expires = shifted(g.event.expires);
    g.lastEvent = shifted(g.lastEvent);
    for (const entry of g.logs)
      entry.week ??= Math.floor(entry.minute / oldWeekTicks) + 1;
    // Honor identifiable principal prepayments from the current week of an old save.
    g.principalRepaidThisWeek ??= g.logs.reduce((sum, entry) => {
      const match =
        entry.week === g.interestWeek! + 1
          ? /^원금 ([\d,]+) 원 상환했습니다\.$/.exec(entry.text)
          : null;
      return match
        ? Math.min(
            1_000_000_000_000_000,
            sum + Number(match[1].replaceAll(',', '')),
          )
        : sum;
    }, 0);
    g.minute += shift;
    g.marketDay = dayOf(g);
    g.settling = wasDue;
    g.timeMode = 'weekly-actions';
    g.weeklyRulesVersion = 2;
    if (wasDue && g.status === 'playing' && g.cash < settlementAmount(g)) {
      g.status = 'bankrupt';
      g.inquiries = [];
    }
    return g;
  };
  if (g.timeMode === 'weekly-actions' || g.timeMode === 'daily-actions')
    return migrate();
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
  return migrate();
}
