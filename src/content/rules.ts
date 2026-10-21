/** v1 playable balance, chosen by developer under user's delegation. */
export const RULES = {
  debt: 10_000_000_000,
  capacity: 12,
  maxMoney: 1_000_000_000_000_000,
  actionFatigue: 12,
  interestDenominator: 1_000_000,
  graceDays: 3,
};
export const JOBS = [
  {
    id: 'flyer',
    title: '전단 배포',
    actions: 1,
    reward: 9_000,
    fatigue: 8,
  },
  {
    id: 'shop',
    title: '매장 정리',
    actions: 1,
    reward: 22_000,
    fatigue: 20,
  },
  {
    id: 'warehouse',
    title: '창고 분류',
    actions: 1,
    reward: 38_000,
    fatigue: 42,
  },
];
export const OUTLETS = [
  {
    id: 'scrap',
    title: '고물상',
    kinds: ['생활', '디지털', '가구', '수집품'],
    percent: 45,
  },
  { id: 'used', title: '중고 상점', kinds: ['디지털', '가구'], percent: 72 },
  { id: 'collector', title: '수집품 상점', kinds: ['수집품'], percent: 85 },
];
export const TIERS = [
  { threshold: 0, base: 6_000, name: '동네 생활용품' },
  { threshold: 30_000, base: 40_000, name: '소형 중고품' },
  { threshold: 150_000, base: 200_000, name: '가전·취미용품' },
  { threshold: 1_000_000, base: 1_200_000, name: '전문 장비' },
  { threshold: 10_000_000, base: 12_000_000, name: '빈티지·한정품' },
  { threshold: 100_000_000, base: 120_000_000, name: '고가 수집품' },
  { threshold: 1_000_000_000, base: 1_200_000_000, name: '희귀 경매품' },
  { threshold: 5_000_000_000, base: 6_000_000_000, name: '최상위 컬렉션' },
];
export const CATALOG = [
  {
    title: '탁상 조명',
    kind: '생활',
    description: '창고 정리 중입니다. 외관 사진 대신 설명을 꼼꼼히 읽어주세요.',
  },
  {
    title: '기계식 키보드',
    kind: '디지털',
    description: '사용하던 물건입니다. 보관 중이라 판매합니다.',
  },
  {
    title: '원목 의자',
    kind: '가구',
    description: '이사를 앞두고 내놓습니다. 사용감이 있습니다.',
  },
  {
    title: '빈티지 라디오',
    kind: '수집품',
    description: '가족이 보관하던 물건입니다. 정확한 가치는 잘 모르겠습니다.',
  },
  {
    title: '카메라 장비',
    kind: '디지털',
    description: '구성품은 모두 있습니다. 사용 이력이 있습니다.',
  },
  {
    title: '한정판 소장품',
    kind: '수집품',
    description: '오래 보관했습니다. 정품 여부는 보증하기 어렵습니다.',
  },
] as const;
export const TIER_TITLES = [
  [
    '탁상 조명',
    '기계식 키보드',
    '원목 의자',
    '빈티지 라디오',
    '보급형 카메라',
    '오래된 소장품',
  ],
  [
    '디자이너 조명',
    '게이밍 키보드',
    '빈티지 스툴',
    '아날로그 라디오',
    '구형 렌즈',
    '단종 피규어',
  ],
  [
    '수입 주방 도구',
    '고급 헤드폰',
    '원목 수납장',
    '한정판 레코드',
    '미러리스 카메라',
    '빈티지 만년필',
  ],
  [
    '빈티지 오디오 세트',
    '작업용 노트북',
    '디자이너 소파',
    '한정판 손목시계',
    '전문가용 렌즈',
    '서명된 초판본',
  ],
  [
    '고전 디자인 조명',
    '스튜디오 장비 세트',
    '빈티지 디자이너 가구',
    '희귀 기계식 시계',
    '중형 카메라 세트',
    '원작 드로잉',
  ],
  [
    '골동 장식품',
    '방송 장비 일괄',
    '소장용 고가구',
    '희귀 시계 컬렉션',
    '단종 촬영 장비',
    '유명 작가 소품',
  ],
  [
    '박물관급 장식 세트',
    '전문 스튜디오 재고',
    '고미술 가구 세트',
    '빈티지 명품 컬렉션',
    '역사적 촬영 장비',
    '작가의 초기 작품',
  ],
  [
    '역사적 장식 컬렉션',
    '아카이브 장비 컬렉션',
    '근대 디자인 컬렉션',
    '초희귀 시계 컬렉션',
    '소장 가치의 카메라 컬렉션',
    '희귀 미술품 컬렉션',
  ],
];
