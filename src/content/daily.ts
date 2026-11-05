/** Initial tuning for the side activities. These are fictional, offline markets. */
export const DAILY_RULES = {
  lotteryCost: 5000,
  lotteryLimit: 5,
  workPay: 20000,
  stockLimit: 10000,
  historyLimit: 24,
  sellFeePercent: 1,
} as const;
export const STOCKS = [
  {
    id: 'local',
    name: '동네유통',
    sector: '유통',
    initial: 20000,
    volatility: 8,
  },
  {
    id: 'tech',
    name: '새봄테크',
    sector: '전자',
    initial: 50000,
    volatility: 16,
  },
  {
    id: 'motion',
    name: '도약모터스',
    sector: '자동차',
    initial: 100000,
    volatility: 28,
  },
] as const;
export type StockId = (typeof STOCKS)[number]['id'];
export const stockDefinition = (id: string) => STOCKS.find((s) => s.id === id);
export const LOTTERY_PRIZES = [0, 1000000, 200000, 50000, 10000] as const;
export const WALK_EVENTS = {
  quiet: {
    name: '조용한 골목',
    text: '낡은 담벼락을 따라 한 바퀴 걸었다. 오늘은 별일이 없다.',
    reward: 0,
  },
  wallet: {
    name: '떨어진 지갑',
    text: '분실물 센터에 지갑을 맡겼다. 주인이 찾아와 사례금을 건넸다.',
    reward: 10000,
  },
  neighbor: {
    name: '무거운 짐',
    text: '계단 앞에서 곤란해하던 이웃의 짐을 들어줬다. 고맙다며 차비를 쥐여줬다.',
    reward: 5000,
  },
  rain: {
    name: '소나기',
    text: '갑자기 비가 쏟아졌다. 처마 아래에서 빗소리를 듣다가 돌아왔다.',
    reward: 0,
  },
  cat: {
    name: '골목의 고양이',
    text: '고양이가 앞장서서 걸었다. 골목 끝에 다다르자 어느새 사라졌다.',
    reward: 0,
  },
} as const;
export type WalkKind = keyof typeof WALK_EVENTS;
