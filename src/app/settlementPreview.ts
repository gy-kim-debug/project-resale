import type { PlayerProfile } from '../content/player';
import type { SettlementEventId } from '../content/settlementEvents';
import { SETTLEMENT_EVENTS } from '../content/settlementEvents';
import { newGame, execute } from '../domain/engine';
import { enableStory } from '../domain/story';
import { ACTION_TICK, ACTIONS_PER_WEEK } from '../domain/game';
import { mandatoryPrincipal, settlementAmount } from '../domain/debt';
import { RULES } from '../content/rules';
/** Simulate an actual invoice in a fresh detached game. Never load or write a slot. */
export function createSettlementPreview(
  player?: PlayerProfile,
  theme?: SettlementEventId,
  week = 1,
) {
  if (!Number.isInteger(week) || week < 1 || week > 12)
    throw Error('미리보기 주차는 1~12입니다.');
  if (theme !== undefined && !Object.hasOwn(SETTLEMENT_EVENTS, theme))
    throw Error(`장면: ${Object.keys(SETTLEMENT_EVENTS).join(', ')}`);
  let g = enableStory(newGame(42, player));
  g.interestWeek = week - 1;
  g.minute = (week - 1) * ACTIONS_PER_WEEK * ACTION_TICK;
  if (theme === 'halfway') g.principal = 4900000000;
  if (theme === 'near') g.principal = 900000000;
  g.stats.repaid = RULES.debt - g.principal;
  g.cash = settlementAmount(g) + (theme === 'tight' ? 100 : 2000000);
  g.stats.peakCash = g.cash;
  for (const command of [
    { type: 'startSettlement' } as const,
    { type: 'repay', amount: mandatoryPrincipal(g) } as const,
    { type: 'payInterest' } as const,
  ]) {
    const result = execute(g, command);
    if (!result.ok) throw Error(result.message);
    g = result.game;
  }
  if (theme) g.story!.active!.settlement!.theme = theme;
  return g;
}
