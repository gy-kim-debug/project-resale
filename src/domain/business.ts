import { businessDefinition } from '../content/businesses';
import { weekOf, type Game } from './game';
export const weeklyBusinessIncome = (g: Game) =>
  (g.businesses ?? []).reduce(
    (sum, owned) =>
      sum +
      (owned.purchasedWeek <= weekOf(g)
        ? (businessDefinition(owned.id)?.income ?? 0)
        : 0),
    0,
  );
export const pendingBusinessIncome = (g: Game) =>
  (g.businessIncomeWeek ?? g.interestWeek ?? 0) < weekOf(g)
    ? weeklyBusinessIncome(g)
    : 0;

export const businessCount = (g: Game, id: string) =>
  (g.businesses ?? []).filter((owned) => owned.id === id).length;
