import {
  ITEM_CASES,
  caseApplies,
  itemCase,
  type ItemCaseId,
} from '../content/itemCases';
import type { Kind, MarketId } from './game';
/** Deterministic independent case draw; not rerolled during purchase or appraisal. */
export function chooseItemCase(
  key: string,
  kind: Kind,
  marketId?: MarketId,
): ItemCaseId {
  const eligible = (Object.keys(ITEM_CASES) as ItemCaseId[]).filter((id) =>
    caseApplies(id, kind, marketId),
  );
  let hash = 2166136261;
  for (const char of key) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  let draw =
    (hash >>> 0) % eligible.reduce((sum, id) => sum + itemCase(id).weight, 0);
  for (const id of eligible) {
    draw -= itemCase(id).weight;
    if (draw < 0) return id;
  }
  return 'normal';
}
export const caseQuality = (quality: number, id?: ItemCaseId) =>
  Math.min(0.999999, Math.max(0, quality + itemCase(id).qualityShift));
