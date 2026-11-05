import { businessDefinition } from '../content/businesses';
import { RULES } from '../content/rules';
import type { Game } from './game';
/** Retired system: return historical purchase principal once, never recurring income. */
export function retireBusinesses(g: Game) {
  const owned = g.businesses ?? [];
  const credit =
    (g.businessRefund ?? 0) +
    owned.reduce((n, b) => n + (businessDefinition(b.id)?.cost ?? 0), 0);
  const paid = Math.min(credit, RULES.maxMoney - g.cash);
  g.cash += paid;
  g.stats.peakCash = Math.max(g.stats.peakCash, g.cash);
  if (credit > paid) g.businessRefund = credit - paid;
  else delete g.businessRefund;
  g.businesses = [];
  g.businessIncomeAmount = 0;
  g.businessIncomeWeek = 0;
  // An already-open historical receipt must remain valid after the refund.
  if (paid && g.story?.active?.kind === 'weekly' && g.story.active.settlement)
    g.story.active.settlement.cash = g.cash;
}
