import type { Game } from './game';
import { RULES } from '../content/rules';
import { interestAmount, mandatoryPrincipal } from './debt';
import type { SettlementReceipt } from '../content/settlementEvents';
/** Build a fixed receipt after the existing payment; no random draw or money change. */
export function settlementReceipt(g: Game, before: Game): SettlementReceipt {
  const nextPrincipal = mandatoryPrincipal(g),
    nextInterest = interestAmount(g);
  const week = g.interestWeek!;
  const businessIncome = g.businessIncomeAmount ?? 0;
  const theme =
    week === 1
      ? 'first'
      : g.principal <= RULES.debt / 10
        ? 'near'
        : g.principal <= RULES.debt / 2
          ? 'halfway'
          : g.cash < nextPrincipal + nextInterest
            ? 'tight'
            : businessIncome > 0
              ? 'business'
              : (['rain', 'envelope', 'quiet'] as const)[(week - 1) % 3];
  return {
    week,
    principalPaid: before.principalRepaidThisWeek ?? 0,
    interestPaid: g.stats.repaid - before.stats.repaid,
    remainingPrincipal: g.principal,
    cash: g.cash,
    businessIncome,
    nextPrincipal,
    nextInterest,
    theme,
  };
}
