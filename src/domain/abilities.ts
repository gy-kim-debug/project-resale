import type { Game } from './game';
import { ABILITIES, type AbilityStat } from '../content/abilities';
export const abilityLevel = (g: Game, stat: AbilityStat) =>
  Math.min(
    10,
    Math.floor(g.stats[stat] / ABILITIES.find((a) => a.stat === stat)!.each),
  );
