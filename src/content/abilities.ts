export const ABILITIES = [
  { stat: 'purchases', name: '매입 감각', each: 5 },
  { stat: 'sales', name: '거래 감각', each: 5 },
  { stat: 'checks', name: '감정 지식', each: 4 },
  { stat: 'repairs', name: '수리 기술', each: 4 },
] as const;
export type AbilityStat = (typeof ABILITIES)[number]['stat'];
