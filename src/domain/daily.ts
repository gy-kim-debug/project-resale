import {
  DAILY_RULES,
  LOTTERY_PRIZES,
  STOCKS,
  WALK_EVENTS,
  stockDefinition,
  type StockId,
  type WalkKind,
} from '../content/daily';
import { RULES } from '../content/rules';
import { weekOf, won, type Game } from './game';
import { isHundredWon, moneyRatio } from './money';
import type { StoryLine } from '../content/story';
export interface LotteryResult {
  week: number;
  ranks: number[];
  payout: number;
}
export type DailyScene =
  | { kind: 'lottery'; result: LotteryResult }
  | { kind: 'stroll'; event: WalkKind; reward: number };
export interface DailyState {
  version: 1;
  seed: number;
  quoteWeek: number;
  stocks: {
    id: StockId;
    quantity: number;
    cost: number;
    history: { week: number; price: number }[];
  }[];
  tickets: { week: number; count: number };
  draws: LotteryResult[];
  pending: DailyScene[];
  lastWalk?: WalkKind;
}
export function dailyState(g: Game): DailyState {
  return (
    g.daily ?? {
      version: 1,
      seed: (g.seed ^ 0x734ad985) >>> 0,
      quoteWeek: weekOf(g),
      stocks: STOCKS.map((s) => ({
        id: s.id,
        quantity: 0,
        cost: 0,
        history: [{ week: weekOf(g), price: s.initial }],
      })),
      tickets: { week: weekOf(g), count: 0 },
      draws: [],
      pending: [],
    }
  );
}
/** Separate saved RNG: opening a screen/reloading never advances a quote or outcome. */
function roll(d: DailyState, max: number) {
  d.seed = (Math.imul(d.seed, 1664525) + 1013904223) >>> 0;
  return Math.floor((d.seed / 4294967296) * max);
}
export const lotteryRank = (roll: number) =>
  roll < 1 ? 1 : roll < 10 ? 2 : roll < 100 ? 3 : roll < 1000 ? 4 : 0;
export const sharePrice = (s: DailyState['stocks'][number]) =>
  s.history.at(-1)!.price;
export const stockFee = (gross: number) =>
  gross > 0
    ? Math.min(
        gross,
        Math.max(100, moneyRatio(gross, DAILY_RULES.sellFeePercent)),
      )
    : 0;
export function changeDailyCash(g: Game, delta: number) {
  if (
    !Number.isSafeInteger(delta) ||
    delta % 100 ||
    g.cash + delta < 0 ||
    g.cash + delta > RULES.maxMoney
  )
    throw Error('거래 가능한 금액을 벗어났습니다.');
  g.cash += delta;
  if (delta > 0) g.stats.earned += delta;
  g.stats.peakCash = Math.max(g.stats.peakCash, g.cash);
}
export function buyLottery(g: Game, count: number) {
  const d = (g.daily ??= dailyState(g));
  if (
    !Number.isSafeInteger(count) ||
    count < 1 ||
    d.tickets.week !== weekOf(g) ||
    d.tickets.count + count > DAILY_RULES.lotteryLimit
  )
    throw Error('이번 주에 구매할 수 없는 수량입니다.');
  changeDailyCash(g, -count * DAILY_RULES.lotteryCost);
  d.tickets.count += count;
}
export function tradeStock(
  g: Game,
  id: string,
  side: 'buy' | 'sell',
  quantity: number,
) {
  const d = (g.daily ??= dailyState(g)),
    s = d.stocks.find((s) => s.id === id);
  if (
    !stockDefinition(id) ||
    !s ||
    !['buy', 'sell'].includes(side) ||
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > DAILY_RULES.stockLimit ||
    d.quoteWeek !== weekOf(g)
  )
    throw Error('선택할 수 없는 주식 주문입니다.');
  const gross = sharePrice(s) * quantity;
  if (side === 'buy') {
    if (s.quantity + quantity > DAILY_RULES.stockLimit)
      throw Error('종목별 보유 한도를 넘었습니다.');
    changeDailyCash(g, -gross);
    s.quantity += quantity;
    s.cost += gross;
    return -gross;
  }
  if (quantity > s.quantity) throw Error('보유 수량이 부족합니다.');
  const net = gross - stockFee(gross);
  const remainingCost =
    quantity === s.quantity
      ? 0
      : moneyRatio(s.cost, s.quantity - quantity, s.quantity);
  changeDailyCash(g, net);
  s.quantity -= quantity;
  s.cost = remainingCost;
  return net;
}
/** Called only after successful weekly debt payment; never on entering settlement. */
export function finishDailyWeek(g: Game, paidWeek: number) {
  const d = (g.daily ??= dailyState(g));
  if (d.quoteWeek > paidWeek) return;
  if (d.tickets.week === paidWeek && d.tickets.count > 0) {
    const ranks = Array.from({ length: d.tickets.count }, () =>
      lotteryRank(roll(d, 10000)),
    );
    const payout = Math.min(
      ranks.reduce<number>((n, rank) => n + LOTTERY_PRIZES[rank], 0),
      RULES.maxMoney - g.cash,
    );
    changeDailyCash(g, payout);
    const result = { week: paidWeek, ranks, payout };
    d.draws = [...d.draws, result].slice(-12);
    if (g.story) d.pending.push({ kind: 'lottery', result });
  }
  d.tickets = { week: paidWeek + 1, count: 0 };
  for (const s of d.stocks) {
    const definition = stockDefinition(s.id)!;
    const change =
      roll(d, definition.volatility * 2 + 1) - definition.volatility;
    const price = Math.max(
      100,
      Math.min(1000000000, moneyRatio(sharePrice(s), 100 + change)),
    );
    s.history = [...s.history, { week: paidWeek + 1, price }].slice(
      -DAILY_RULES.historyLimit,
    );
  }
  d.quoteWeek = paidWeek + 1;
}
export function takeWalk(g: Game) {
  const d = (g.daily ??= dailyState(g)),
    chance = roll(d, 100);
  const event: WalkKind =
    chance < 5
      ? 'wallet'
      : chance < 12
        ? 'neighbor'
        : chance < 22
          ? 'rain'
          : chance < 32
            ? 'cat'
            : 'quiet';
  const reward = Math.min(WALK_EVENTS[event].reward, RULES.maxMoney - g.cash);
  changeDailyCash(g, reward);
  d.lastWalk = event;
  if (event !== 'quiet' && g.story)
    d.pending.push({ kind: 'stroll', event, reward });
  return event;
}
export function startDailyScene(g: Game) {
  if (
    !g.story ||
    g.story.active ||
    g.status !== 'playing' ||
    !g.daily?.pending.length
  )
    return false;
  const leisure = g.daily.pending.shift()!;
  g.story.active = { kind: leisure.kind, step: 0, leisure };
  return true;
}
export function dailyLines(g: Game): StoryLine[] {
  const scene = g.story!.active!.leisure!,
    me = g.player?.nickname ?? '주인공';
  if (scene.kind === 'lottery')
    return [
      {
        speaker: '',
        text: `${scene.result.week}주차 복권 추첨이 끝났다. 구겨진 복권을 펼쳐 본다.`,
        motion: 'look',
      },
      {
        speaker: '추첨 결과',
        text: scene.result.ranks
          .map((r, i) => `${i + 1}번 복권 · ${r ? `${r}등` : '낙첨'}`)
          .join('\n'),
        motion: 'phone',
      },
      {
        speaker: me,
        text: scene.result.payout
          ? `${won(scene.result.payout)}이 들어왔다. 이번 주는 조금 숨통이 트이겠네.`
          : '이번엔 아니네. 다시 장터로 가자.',
        motion: 'listen',
      },
    ];
  return [
    { speaker: '', text: WALK_EVENTS[scene.event].text, motion: 'meet' },
    {
      speaker: me,
      text:
        scene.event === 'wallet'
          ? '주인을 찾아서 다행이네.'
          : scene.event === 'neighbor'
            ? '혼자였으면 꽤 힘들었겠어.'
            : scene.event === 'rain'
              ? '비가 그쳤다. 이제 돌아가 볼까.'
              : '다음에도 마주칠 수 있을까.',
      motion: 'leave',
    },
    ...(scene.reward
      ? [
          {
            speaker: '',
            text: `사례금 ${won(scene.reward)}을 받았다.`,
            motion: 'exchange' as const,
          },
        ]
      : []),
  ];
}
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const integer = (v: unknown, max: number): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= max;
const amount = (v: unknown) =>
  typeof v === 'number' && isHundredWon(v) && v <= RULES.maxMoney;
export function isLotteryResult(v: unknown, week: number): v is LotteryResult {
  return (
    record(v) &&
    integer(v.week, week) &&
    v.week > 0 &&
    Array.isArray(v.ranks) &&
    v.ranks.length > 0 &&
    v.ranks.length <= DAILY_RULES.lotteryLimit &&
    v.ranks.every((r) => integer(r, 4)) &&
    amount(v.payout) &&
    Number(v.payout) <=
      v.ranks.reduce((n: number, r) => n + LOTTERY_PRIZES[r as number], 0)
  );
}
export function isDailyScene(v: unknown, week: number): v is DailyScene {
  return (
    record(v) &&
    (v.kind === 'lottery'
      ? isLotteryResult(v.result, week)
      : v.kind === 'stroll' &&
        typeof v.event === 'string' &&
        Object.hasOwn(WALK_EVENTS, v.event) &&
        amount(v.reward) &&
        Number(v.reward) <= WALK_EVENTS[v.event as WalkKind].reward)
  );
}
export function isDailyState(v: unknown, week: number) {
  if (v === undefined) return true;
  if (
    !record(v) ||
    v.version !== 1 ||
    !integer(v.seed, 4294967295) ||
    v.quoteWeek !== week ||
    !record(v.tickets) ||
    v.tickets.week !== week ||
    !integer(v.tickets.count, DAILY_RULES.lotteryLimit) ||
    !Array.isArray(v.draws) ||
    v.draws.length > 12 ||
    !v.draws.every((d) => isLotteryResult(d, week - 1)) ||
    new Set(v.draws.map((d) => d.week)).size !== v.draws.length ||
    !Array.isArray(v.pending) ||
    v.pending.length > 2 ||
    !v.pending.every((p) => isDailyScene(p, week - 1)) ||
    (v.lastWalk !== undefined &&
      !Object.hasOwn(WALK_EVENTS, String(v.lastWalk))) ||
    !Array.isArray(v.stocks) ||
    v.stocks.length !== STOCKS.length
  )
    return false;
  const stocks = v.stocks;
  return STOCKS.every((definition, index) => {
    const s = stocks[index];
    if (
      !record(s) ||
      s.id !== definition.id ||
      !integer(s.quantity, DAILY_RULES.stockLimit) ||
      !amount(s.cost) ||
      (s.quantity === 0 && s.cost !== 0) ||
      !Array.isArray(s.history) ||
      !s.history.length ||
      s.history.length > DAILY_RULES.historyLimit
    )
      return false;
    const history = s.history;
    return (
      history.every(
        (p, i) =>
          record(p) &&
          integer(p.week, week) &&
          p.week > 0 &&
          (i === 0 || p.week === history[i - 1].week + 1) &&
          typeof p.price === 'number' &&
          isHundredWon(p.price) &&
          p.price >= 100 &&
          p.price <= 1000000000,
      ) && history.at(-1).week === week
    );
  });
}
