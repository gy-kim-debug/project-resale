import { lotteryShots } from './lotteryPresentation';
import {
  autoLottoNumbers,
  drawLottoNumbers,
  lottoRank,
  validLottoNumbers,
} from './lottery';
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
  numbers?: number[];
  winning?: number[];
  bonus?: number;
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
  /** Absent only in legacy weekly quote saves. */
  stockTick?: number;
  stockSeed?: number;
  stocks: {
    id: StockId;
    quantity: number;
    cost: number;
    history: { week: number; price: number; tick?: number }[];
  }[];
  tickets: { week: number; count: number; numbers?: number[] };
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
      stockTick: 0,
      stockSeed: (g.seed ^ 0x491a5e37) >>> 0,
      stocks: STOCKS.map((s) => ({
        id: s.id,
        quantity: 0,
        cost: 0,
        history: [{ week: weekOf(g), price: s.initial, tick: 0 }],
      })),
      tickets: { week: weekOf(g), count: 0 },
      draws: [],
      pending: [],
    }
  );
}
/** Separate saved RNG: opening a screen/reloading never advances a quote or outcome. */
function roll(d: { seed: number }, max: number) {
  d.seed = (Math.imul(d.seed, 1664525) + 1013904223) >>> 0;
  return Math.floor((d.seed / 4294967296) * max);
}
/** Former rank-only lottery; used solely for tickets already purchased in older saves. */
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
    count !== 1 ||
    d.tickets.week !== weekOf(g) ||
    d.tickets.count + count > DAILY_RULES.lotteryLimit
  )
    throw Error('이번 주에 구매할 수 없는 수량입니다.');
  changeDailyCash(g, -count * DAILY_RULES.lotteryCost);
  d.tickets.count = 1;
  d.tickets.numbers = autoLottoNumbers((max) => roll(d, max));
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
  upgradeStockState(g);
  if (d.quoteWeek > paidWeek) return;
  if (d.tickets.week === paidWeek && d.tickets.count > 0) {
    // Number-less tickets were already bought under the previous rules: honor them once.
    const numbers = d.tickets.numbers;
    const draw = numbers ? drawLottoNumbers((max) => roll(d, max)) : undefined;
    const ranks = draw
      ? [lottoRank(numbers!, draw.winning, draw.bonus)]
      : Array.from({ length: d.tickets.count }, () =>
          lotteryRank(roll(d, 10000)),
        );
    const payout = Math.min(
      ranks.reduce<number>((n, rank) => n + LOTTERY_PRIZES[rank], 0),
      RULES.maxMoney - g.cash,
    );
    changeDailyCash(g, payout);
    const result: LotteryResult = {
      week: paidWeek,
      ranks,
      payout,
      ...(draw ? { numbers: [...numbers!], ...draw } : {}),
    };
    d.draws = [...d.draws, result].slice(-12);
    if (g.story) d.pending.push({ kind: 'lottery', result });
  }
  d.tickets = { week: paidWeek + 1, count: 0 };
  d.quoteWeek = paidWeek + 1;
}
/** Metadata-only migration: preserve all recorded prices, positions and the daily RNG. */
export function upgradeStockState(g: Game) {
  const d = g.daily;
  if (!d || d.stockTick !== undefined) return;
  d.stockTick = d.quoteWeek - 1;
  d.stockSeed = (d.seed ^ 0x491a5e37) >>> 0;
  for (const s of d.stocks)
    for (const point of s.history) point.tick = point.week - 1;
}
/** One quote per actual action spent, with a private stream that never changes trading/lottery RNG. */
export function advanceStocks(g: Game, actions: number) {
  const d = (g.daily ??= dailyState(g));
  upgradeStockState(g);
  if (
    !Number.isSafeInteger(actions) ||
    actions < 0 ||
    !Number.isSafeInteger(d.stockTick! + actions)
  )
    throw Error('시세 진행 범위를 벗어났습니다.');
  const rng = { seed: d.stockSeed! };
  for (let i = 0; i < actions; i++) {
    d.stockTick!++;
    for (const s of d.stocks) {
      const definition = stockDefinition(s.id)!;
      const change =
        roll(rng, definition.volatility * 2 + 1) - definition.volatility;
      const price = Math.max(
        100,
        Math.min(1000000000, moneyRatio(sharePrice(s), 100 + change)),
      );
      s.history = [
        ...s.history,
        { week: weekOf(g), price, tick: d.stockTick },
      ].slice(-DAILY_RULES.historyLimit);
    }
  }
  d.stockSeed = rng.seed;
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
  if (scene.kind === 'lottery' && scene.result.winning) {
    return lotteryShots(scene.result, me).map((shot) => shot.line);
  }
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
  if (
    !record(v) ||
    !integer(v.week, week) ||
    v.week < 1 ||
    !Array.isArray(v.ranks) ||
    !v.ranks.length ||
    v.ranks.length > 5 ||
    !amount(v.payout)
  )
    return false;
  const numbered =
    v.numbers !== undefined || v.winning !== undefined || v.bonus !== undefined;
  if (numbered) {
    if (
      !validLottoNumbers(v.numbers) ||
      !validLottoNumbers(v.winning) ||
      !integer(v.bonus, 45) ||
      v.bonus < 1 ||
      v.winning.includes(v.bonus) ||
      v.ranks.length !== 1 ||
      v.ranks[0] !== lottoRank(v.numbers, v.winning, v.bonus)
    )
      return false;
  } else if (!v.ranks.every((r) => integer(r, 4))) return false;
  return (
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
    (v.stockTick === undefined) !== (v.stockSeed === undefined) ||
    (v.stockTick !== undefined &&
      (!integer(v.stockTick, Number.MAX_SAFE_INTEGER) ||
        !integer(v.stockSeed, 4294967295))) ||
    !record(v.tickets) ||
    v.tickets.week !== week ||
    !integer(v.tickets.count, 5) ||
    (v.tickets.numbers !== undefined &&
      (v.tickets.count !== 1 || !validLottoNumbers(v.tickets.numbers))) ||
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
    const actionMode = v.stockTick !== undefined;
    return (
      history.every((p, i) => {
        if (
          !record(p) ||
          !integer(p.week, week) ||
          p.week < 1 ||
          typeof p.price !== 'number' ||
          !isHundredWon(p.price) ||
          p.price < 100 ||
          p.price > 1000000000
        )
          return false;
        if (!actionMode)
          return (
            p.tick === undefined &&
            (i === 0 || p.week === history[i - 1].week + 1)
          );
        return (
          integer(p.tick, Number(v.stockTick)) &&
          (i === 0 ||
            (p.tick === history[i - 1].tick + 1 &&
              p.week >= history[i - 1].week))
        );
      }) &&
      (actionMode
        ? history.at(-1).tick === v.stockTick
        : history.at(-1).week === week)
    );
  });
}
