import { ACTIONS_PER_WEEK, ACTION_TICK, type Game } from './game';
import { RULES } from '../content/rules';

export const WEEK_TICKS = ACTIONS_PER_WEEK * ACTION_TICK;
export const completedWeeks = (g: Game) => Math.floor(g.minute / WEEK_TICKS);
export const paymentWeek = (g: Game) =>
  (g.interestWeek ?? completedWeeks(g)) + 1;
export const interestPending = (g: Game) => g.settling === true;
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
  weeklyInterest(g.principal - mandatoryPrincipal(g), paymentWeek(g)) +
  g.interest;

/** Cap before exponentiation so even very old saves stay within safe KRW values. */
export const weeklyPrincipalTarget = (week: number) =>
  Math.min(
    RULES.maxMoney,
    RULES.weeklyPrincipalBase * 2 ** Math.min(35, Math.max(0, week - 1)),
  );
export const mandatoryPrincipal = (g: Game) =>
  Math.min(
    g.principal,
    Math.max(
      0,
      weeklyPrincipalTarget(paymentWeek(g)) - (g.principalRepaidThisWeek ?? 0),
    ),
  );
export const settlementAmount = (g: Game) =>
  mandatoryPrincipal(g) + interestAmount(g);
