import type { Game, Item, MarketId, Condition } from './game';
import {
  GRADES,
  GRADE_PERCENT,
  GRADE_DESCRIPTION,
  GRADE_DISTRIBUTIONS,
  DIFFICULTIES,
  REPAIR_RULES,
  MARKET_SKILLS,
  DAMAGE_CASES,
  type Grade,
} from '../content/conditionGrades';
import { marketOf } from '../content/markets';
import { capValue } from './valuation';
import { moneyRatio } from './money';
export const skillMarket = (item: Pick<Item, 'marketId'>) => marketOf(item);
export function marketExperience(g: Game, market: MarketId) {
  return g.marketExperience?.[market] ?? 0;
}
export function marketSkillLevel(g: Game, market: MarketId) {
  let xp = marketExperience(g, market),
    lv = 0;
  while (lv < 10 && xp >= 20 + lv * 10) {
    xp -= 20 + lv * 10;
    lv++;
  }
  return lv;
}
export function marketProgress(g: Game, market: MarketId) {
  const level = marketSkillLevel(g, market);
  const used = level * (level + 3) * 5;
  return {
    level,
    current: level === 10 ? 0 : marketExperience(g, market) - used,
    next: 20 + level * 10,
  };
}
export function gainMarketExperience(
  g: Game,
  item: Pick<Item, 'marketId'>,
  xp: number,
) {
  const market = skillMarket(item);
  if (!MARKET_SKILLS[market]) return;
  g.marketExperience ??= {};
  g.marketExperience[market] = Math.min(650, marketExperience(g, market) + xp);
}
export function gradeDraw(
  random: number,
  distribution: keyof typeof GRADE_DISTRIBUTIONS,
): Grade {
  let edge = 0;
  return (
    GRADES.find((_, i) => {
      edge += GRADE_DISTRIBUTIONS[distribution][i];
      return random * 100 < edge;
    }) ?? 'F'
  );
}
export function gradeCondition(grade: Grade): Condition {
  return grade === 'F' || grade === 'C'
    ? '고장'
    : grade === 'B' || grade === 'A'
      ? '사용감'
      : '양호';
}
export function gradedValue(item: Item, grade = item.stateGrade!) {
  return capValue(
    moneyRatio(item.base, GRADE_PERCENT[grade]),
    item.valuationReference,
  );
}
export function gradeSummary(item: Item) {
  if (!item.stateGrade) return item.defect;
  const market = skillMarket(item) as keyof typeof DAMAGE_CASES;
  const damage =
    item.repairDifficulty &&
    DAMAGE_CASES[market]?.[DIFFICULTIES.indexOf(item.repairDifficulty)];
  return `${GRADE_DESCRIPTION[item.stateGrade]}${['B', 'C'].includes(item.stateGrade) && damage ? ` ${damage}` : ''}${item.stateGrade === 'C' && item.repairCeiling === 'B' ? ' 복구 후에도 마모와 변형이 남습니다.' : ''}`;
}
export function assignGrade(
  item: Item,
  draw: number,
  difficultyDraw: number,
  limitDraw: number,
  distribution: keyof typeof GRADE_DISTRIBUTIONS = 'normal',
) {
  item.stateGrade = gradeDraw(draw, distribution);
  item.repairDifficulty =
    DIFFICULTIES[Math.min(2, Math.floor(difficultyDraw * 3))];
  item.repairCeiling = limitDraw < 0.35 ? 'B' : 'A';
  if (item.stateGrade === 'B') item.repairCeiling = 'A';
  item.condition = gradeCondition(item.stateGrade);
  item.value = gradedValue(item);
  item.defect = gradeSummary(item);
}
export function canRepair(item: Item) {
  return item.stateGrade
    ? item.checked && !item.repaired && ['B', 'C'].includes(item.stateGrade)
    : item.checked && !item.repaired && item.condition !== '양호';
}
export function repairChance(g: Game, item: Item) {
  return item.stateGrade && item.repairDifficulty
    ? Math.min(
        95,
        REPAIR_RULES[item.repairDifficulty].chance +
          marketSkillLevel(g, skillMarket(item)) * 2,
      )
    : Math.min(95, 70 + Math.min(10, Math.floor(g.stats.repairs / 4)) * 5);
}
export function gradeRepairCost(item: Item) {
  return moneyRatio(
    item.valuationReference!,
    REPAIR_RULES[item.repairDifficulty!].cost,
  );
}
export function finishGradeRepair(
  item: Item,
  success: boolean,
  failureDraw: number,
) {
  if (success) item.stateGrade = item.repairCeiling!;
  else if (failureDraw < 0.2)
    item.stateGrade =
      GRADES[Math.min(GRADES.length - 1, GRADES.indexOf(item.stateGrade!) + 1)];
  item.condition = gradeCondition(item.stateGrade!);
  item.value = gradedValue(item);
  item.defect = `${gradeSummary(item)} ${success ? '수리를 마쳤습니다.' : '수리에 실패했습니다.'}`;
}
export function repairName(item: Item) {
  return skillMarket(item) === 'property'
    ? '보수'
    : skillMarket(item) === 'auction'
      ? '복원'
      : '수리';
}
