import type { Game } from './game';
import { RULES } from '../content/rules';
import { dayOf } from './game';

export const WEEK_TICKS = 7 * 1440;
export const completedWeeks = (g: Game) => Math.floor(g.minute / WEEK_TICKS);
export const paymentWeek = (g: Game) =>
  (g.interestWeek ?? completedWeeks(g)) + 1;
export const interestPending = (g: Game) => completedWeeks(g) >= paymentWeek(g);
/** 1 unit = 0.001 percentage points. 0.001%, 0.003%, 0.005%, ... */
export const weeklyRateUnits = (week: number) =>
  RULES.weeklyBaseRateUnits + (week - 1) * RULES.weeklyRateStepUnits;
export const weeklyRateText = (week: number) =>
  `${(weeklyRateUnits(week) / 1000).toFixed(3)}%`;
/** BigInt intermediates keep won rounding exact for large principal amounts. */
export const weeklyInterest = (principal: number, week: number) =>
  Number(
    (BigInt(principal) * BigInt(weeklyRateUnits(week)) + 99999n) / 100000n,
  );
export const interestAmount = (g: Game) =>
  weeklyInterest(g.principal, paymentWeek(g)) + g.interest;
export const daysUntilInterest = (g: Game) =>
  interestPending(g) ? 0 : 7 - ((dayOf(g) - 1) % 7);
