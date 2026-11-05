import type { MarketId } from '../domain/game';
export const GRADES = ['SSS', 'S', 'A', 'B', 'C', 'F'] as const;
export type Grade = (typeof GRADES)[number];
export const GRADE_PERCENT: Record<Grade, number> = {
  SSS: 150,
  S: 125,
  A: 110,
  B: 100,
  C: 60,
  F: 0,
};
export const GRADE_DESCRIPTION: Record<Grade, string> = {
  SSS: '새것에 가까운 최상 상태이며 구성품이 완전합니다.',
  S: '매우 좋은 상태이며 미세한 사용 흔적만 있습니다.',
  A: '가벼운 마모가 있지만 정상 사용 가능합니다.',
  B: '사용감이 뚜렷하지만 정상 사용 가능합니다.',
  C: '기능이나 구조에 문제가 있으나 수리 가능합니다.',
  F: '복구 불가능한 손상입니다. 폐기 대상입니다.',
};
/** Developer balance for H2. Each row sums to 100; independent of rarity/authenticity. */
export const GRADE_DISTRIBUTIONS = {
  normal: [1, 7, 22, 40, 25, 5],
  risk: [1, 3, 11, 30, 40, 15],
  special: [3, 17, 30, 30, 17, 3],
} as const;
export const DIFFICULTIES = ['easy', 'normal', 'hard'] as const;
export type RepairDifficulty = (typeof DIFFICULTIES)[number];
export const REPAIR_RULES = {
  easy: { name: '쉬움', chance: 80, cost: 5 },
  normal: { name: '보통', chance: 60, cost: 10 },
  hard: { name: '어려움', chance: 30, cost: 15 },
} as const;
export const MARKET_SKILLS: Partial<Record<MarketId, string>> = {
  street: '생활 수리',
  computers: '전자 수리',
  instruments: '악기 정비',
  cars: '차량 정비',
  property: '부동산 보수',
  auction: '경매품 복원',
};
export const DAMAGE_CASES = {
  street: [
    '연결부와 소모품 교체가 필요합니다.',
    '내부 부품과 마감 보수가 필요합니다.',
    '구조 손상과 여러 부품의 복구가 필요합니다.',
  ],
  computers: [
    '단자·배터리 등 교체가 필요합니다.',
    '전원·냉각 계통 정비가 필요합니다.',
    '핵심 회로와 복합 고장의 복구가 필요합니다.',
  ],
  instruments: [
    '소모품 교체와 조율이 필요합니다.',
    '구동부·배선과 외관 정비가 필요합니다.',
    '본체 구조와 주요 부품의 복원이 필요합니다.',
  ],
  cars: [
    '소모품과 센서 교체가 필요합니다.',
    '구동·전장 계통 정비가 필요합니다.',
    '주요 구동부와 복합 손상의 정비가 필요합니다.',
  ],
  property: [
    '수전·부속 설비 보수가 필요합니다.',
    '배관·전기와 내부 마감 보수가 필요합니다.',
    '설비 전반과 구조 손상의 보수가 필요합니다.',
  ],
  auction: [
    '부속품과 표면 정리가 필요합니다.',
    '재료 보강과 표면 복원이 필요합니다.',
    '구조와 정밀 부위의 전문 복원이 필요합니다.',
  ],
} as const;
