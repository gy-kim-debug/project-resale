import type { Kind } from '../domain/game';

export interface ItemTradeProfile {
  marketValuePercent: number;
  demandPercent: number;
  brokenChance: number;
  wornCutoff: number;
  wornValuePercent: number;
  brokenValuePercent: number;
  checkPercent: number;
  repairPercent: number;
  maxRarityPercent: number;
  brokenDescription: string;
  wornDescription: string;
  repairedDescription: string;
  featureValues?: {
    limited: number;
    discontinued: number;
    vintage: number;
    replica: number;
  };
}
const common: ItemTradeProfile = {
  marketValuePercent: 100,
  demandPercent: 100,
  brokenChance: 0.18,
  wornCutoff: 0.55,
  wornValuePercent: 75,
  brokenValuePercent: 18,
  checkPercent: 1,
  repairPercent: 12,
  maxRarityPercent: 400,
  brokenDescription: '작동 불량·부품 손상이 있습니다.',
  wornDescription: '마모와 작은 흠집이 있습니다.',
  repairedDescription: '수리 완료. 정상 작동합니다.',
};
/** First category personalities. Numeric values are initial tuning, not fixed design promises. */
export const ITEM_PROFILES: Record<Kind, ItemTradeProfile> = {
  생활: {
    ...common,
    marketValuePercent: 85,
    demandPercent: 125,
    brokenChance: 0.1,
    wornCutoff: 0.45,
    wornValuePercent: 80,
    brokenValuePercent: 25,
    maxRarityPercent: 150,
  },
  디지털: {
    ...common,
    brokenChance: 0.26,
    wornCutoff: 0.65,
    wornValuePercent: 65,
    brokenValuePercent: 15,
    repairPercent: 8,
    maxRarityPercent: 200,
  },
  가구: {
    ...common,
    demandPercent: 75,
    brokenChance: 0.12,
    wornCutoff: 0.65,
    wornValuePercent: 60,
    brokenValuePercent: 20,
    maxRarityPercent: 150,
    brokenDescription: '프레임 손상과 흔들림이 있습니다.',
    wornDescription: '표면 마모와 사용 흔적이 있습니다.',
  },
  수집품: {
    ...common,
    demandPercent: 65,
    brokenChance: 0.1,
    wornCutoff: 0.45,
    wornValuePercent: 85,
    brokenValuePercent: 30,
    checkPercent: 2,
    repairPercent: 15,
    featureValues: {
      limited: 200,
      discontinued: 150,
      vintage: 140,
      replica: 5,
    },
    brokenDescription: '파손과 구성품 손상이 있습니다.',
    repairedDescription: '보수 완료. 손상된 부분을 보수했습니다.',
    wornDescription: '작은 흠집과 보관 흔적이 있습니다.',
  },
  악기: {
    ...common,
    demandPercent: 85,
    brokenChance: 0.12,
    wornValuePercent: 85,
    brokenValuePercent: 25,
    repairPercent: 10,
    maxRarityPercent: 200,
    brokenDescription: '연주에 지장을 주는 부품 손상이 있습니다.',
    repairedDescription: '수리 완료. 연주 기능을 회복했습니다.',
    wornDescription: '외관 사용감이 있지만 보존 상태를 확인했습니다.',
  },
  자동차: {
    ...common,
    demandPercent: 75,
    brokenChance: 0.22,
    wornCutoff: 0.65,
    wornValuePercent: 65,
    brokenValuePercent: 15,
    checkPercent: 2,
    repairPercent: 16,
    maxRarityPercent: 200,
    brokenDescription: '주요 부품 정비가 필요합니다.',
    repairedDescription: '정비 완료. 주요 부품을 수리했습니다.',
    wornDescription: '마모와 정비할 부분이 있습니다.',
  },
  부동산: {
    ...common,
    demandPercent: 55,
    brokenChance: 0.12,
    wornCutoff: 0.4,
    wornValuePercent: 90,
    brokenValuePercent: 65,
    checkPercent: 2,
    repairPercent: 20,
    maxRarityPercent: 150,
    brokenDescription: '누수와 설비 하자를 확인했습니다.',
    repairedDescription: '수선 완료. 물리적 설비 하자를 보수했습니다.',
    wornDescription: '노후 마감과 수선할 부분이 있습니다.',
  },
  항공기: { ...common },
};
