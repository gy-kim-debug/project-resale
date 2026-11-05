import {
  drawLottoNumbers,
  lottoRank,
  validLottoNumbers,
  autoLottoNumbers,
} from '../src/domain/lottery';
import test from 'node:test';
import assert from 'node:assert/strict';
import { execute, newGame } from '../src/domain/engine';
import {
  dailyState,
  finishDailyWeek,
  lotteryRank,
  sharePrice,
  stockFee,
} from '../src/domain/daily';
import {
  LOTTERY_PRIZES,
  DAILY_RULES,
  STOCKS,
  WALK_EVENTS,
} from '../src/content/daily';
import { mandatoryPrincipal, settlementAmount } from '../src/domain/debt';
import { actionsLeft, type Command, type Game } from '../src/domain/game';
import { enableStory, storyLines, storyChoices } from '../src/domain/story';
import { parseSave } from '../src/storage/saveRepository';
import { isGame } from '../src/storage/validation';
import { parseResumeIntent } from '../src/app/resumeSession';
import { RULES } from '../src/content/rules';
function run(g: Game, c: Command) {
  const r = execute(g, c);
  assert.ok(r.ok, r.message);
  assert.ok(isGame(r.game), JSON.stringify(c));
  return r.game;
}
function finish(g: Game) {
  while (g.story?.active) {
    g = run(
      g,
      g.story.active.step < storyLines(g).length - 1
        ? { type: 'storyNext' }
        : { type: 'storyChoice', choice: storyChoices(g)[0].id },
    );
  }
  return g;
}
function paid(g: Game) {
  g = run(g, { type: 'startSettlement' });
  g = run(g, { type: 'repay', amount: mandatoryPrincipal(g) });
  return run(g, { type: 'payInterest' });
}
test('daily screen state is a pure optional addition and old business tab resumes into daily', () => {
  const g = newGame(5),
    before = structuredClone(g),
    d = dailyState(g);
  assert.deepEqual(g, before);
  assert.equal(g.daily, undefined);
  const weekly = paid(enableStory(newGame(5)));
  weekly.businesses = [{ id: 'stand', purchasedWeek: 1 }];
  const oldCash = weekly.cash;
  const migrated = parseSave({
    version: 2,
    game: weekly,
    favoriteIds: [],
  }).game;
  assert.equal(migrated.cash, oldCash + 100000);
  assert.equal(migrated.story!.active!.settlement!.cash, migrated.cash);
  assert.ok(isGame(migrated));
  assert.deepEqual(
    parseSave({ version: 2, game: migrated, favoriteIds: [] }).game,
    migrated,
  );
  assert.deepEqual(
    d.stocks.map((s) => sharePrice(s)),
    STOCKS.map((s) => s.initial),
  );
  assert.deepEqual(parseSave({ version: 2, game: g, favoriteIds: [] }).game, g);
  assert.deepEqual(
    parseResumeIntent(
      JSON.stringify({ version: 1, screen: 'game', slot: 2, tab: '사업' }),
    ),
    { screen: 'game', slot: 2, tab: '일상' },
  );
});
test('single part-time job earns exactly 20000, consumes one action and cannot exceed weekly action limit', () => {
  let g = newGame(5);
  for (let i = 0; i < 20; i++) {
    g.inquiries = [];
    g = run(g, { type: 'dailyWork' });
  }
  assert.equal(g.cash, 500000 + 20 * DAILY_RULES.workPay);
  assert.equal(actionsLeft(g), 0);
  for (const command of [{ type: 'dailyWork' }, { type: 'walk' }] as const) {
    const r = execute(g, command);
    assert.equal(r.ok, false);
    assert.strictEqual(r.game, g);
  }
  assert.equal(g.stats.earned, 400000);
});
test('lottery purchase is cash-only, capped per week, cannot execute malformed or unaffordable purchases', () => {
  let g = newGame(5);
  const board = structuredClone(g.board),
    seed = g.seed;
  g = run(g, { type: 'buyLottery', count: 1 });
  assert.equal(g.cash, 495000);
  assert.equal(g.weekActions, 0);
  assert.equal(g.daily!.tickets.count, 1);
  assert.deepEqual(g.board, board);
  assert.equal(g.seed, seed);
  for (const count of [1, 0, -1, 0.5, NaN, Infinity, 100]) {
    const r = execute(g, { type: 'buyLottery', count });
    assert.equal(r.ok, false);
    assert.strictEqual(r.game, g);
  }
  const empty = newGame();
  empty.cash = 0;
  assert.equal(execute(empty, { type: 'buyLottery', count: 1 }).ok, false);
});
test('legacy number-less ticket probabilities retain losses and their four original tiers', () => {
  const counts = [0, 0, 0, 0, 0];
  for (let n = 0; n < 10000; n++) counts[lotteryRank(n)]++;
  assert.deepEqual(counts, [9000, 1, 9, 90, 900]);
});
test('stock round trip charges a fee, costs no actions, saves cost basis and rejects oversell/invalid inputs atomically', () => {
  let g = newGame(5);
  const initial = structuredClone(g);
  g = run(g, { type: 'tradeStock', id: 'local', side: 'buy', quantity: 10 });
  assert.equal(g.cash, 300000);
  assert.equal(g.weekActions, 0);
  assert.equal(g.daily!.stocks[0].cost, 200000);
  g = run(g, { type: 'tradeStock', id: 'local', side: 'sell', quantity: 3 });
  assert.equal(g.cash, 359400);
  assert.equal(g.daily!.stocks[0].quantity, 7);
  assert.equal(g.daily!.stocks[0].cost, 140000);
  const saved = parseSave({ version: 2, game: g, favoriteIds: [] }).game;
  assert.deepEqual(saved, g);
  for (const command of [
    { type: 'tradeStock', id: 'local', side: 'sell', quantity: 8 },
    { type: 'tradeStock', id: 'unknown', side: 'buy', quantity: 1 },
    { type: 'tradeStock', id: 'local', side: 'buy', quantity: 10001 },
    { type: 'tradeStock', id: 'local', side: 'buy', quantity: NaN },
    { type: 'tradeStock', id: 'local', side: 'buy', quantity: 0.5 },
    { type: 'tradeStock', id: 'local', side: 'hack', quantity: 1 },
  ]) {
    const r = execute(g, command as Command);
    assert.equal(r.ok, false);
    assert.strictEqual(r.game, g);
  }
  g = run(g, { type: 'tradeStock', id: 'local', side: 'sell', quantity: 7 });
  assert.equal(g.cash, 498000);
  assert.equal(g.daily!.stocks[0].cost, 0);
  assert.equal(g.daily!.stocks[0].quantity, 0);
  assert.equal(stockFee(100), 100);
  assert.equal(stockFee(0), 0);
  assert.equal(g.seed, initial.seed);
});
test('quote and draw advance once only on successful payment, with result scene after repayment scene', () => {
  let g = enableStory(newGame(5));
  g = run(g, { type: 'buyLottery', count: 1 });
  const before = structuredClone(g.daily);
  g = run(g, { type: 'startSettlement' });
  assert.deepEqual(g.daily, before);
  g = run(g, { type: 'repay', amount: mandatoryPrincipal(g) });
  assert.deepEqual(g.daily, before);
  g = run(g, { type: 'payInterest' });
  assert.equal(g.daily!.quoteWeek, 2);
  assert.equal(g.daily!.tickets.count, 0);
  assert.equal(g.daily!.draws.length, 1);
  assert.equal(g.story!.active!.kind, 'weekly');
  assert.equal(g.daily!.pending.length, 1);
  const cash = g.cash,
    prices = structuredClone(g.daily!.stocks),
    seed = g.daily!.seed;
  while (g.story!.active!.kind === 'weekly')
    g = run(
      g,
      g.story!.active!.step < storyLines(g).length - 1
        ? { type: 'storyNext' }
        : { type: 'storyChoice', choice: storyChoices(g)[0].id },
    );
  assert.equal(g.story!.active!.kind, 'lottery');
  assert.match(storyLines(g)[1].text, /1번째 당첨 번호/);
  g = parseSave({ version: 2, game: g, favoriteIds: [] }).game;
  g = finish(g);
  assert.equal(g.cash, cash);
  assert.deepEqual(g.daily!.stocks, prices);
  assert.equal(g.daily!.seed, seed);
  assert.equal(g.daily!.pending.length, 0);
  finishDailyWeek(g, 1);
  assert.equal(g.cash, cash);
  assert.equal(g.daily!.draws.length, 1);
  assert.deepEqual(g.daily!.stocks, prices);
  assert.equal(execute(g, { type: 'payInterest' }).ok, false);
});
test('unpaid debt ends the game without lottery rescue or new quotes', () => {
  let g = newGame();
  g = run(g, { type: 'buyLottery', count: 1 });
  g.cash = 0;
  const d = structuredClone(g.daily);
  g = run(g, { type: 'startSettlement' });
  assert.equal(g.status, 'bankrupt');
  assert.deepEqual(g.daily, d);
});
test('weekly prices have gains and losses, bounded histories, 100-won precision and stable RNG on reload', () => {
  let gains = 0,
    losses = 0;
  for (let seed = 0; seed < 12; seed++) {
    let g = newGame(seed);
    g.cash = 1000000000000;
    g.stats.peakCash = g.cash;
    g = run(g, { type: 'tradeStock', id: 'local', side: 'buy', quantity: 1 });
    for (let i = 0; i < 28; i++) {
      const old = g.daily!.stocks.map(sharePrice);
      // Exercise long quote history independently of the debt campaign's ending.
      finishDailyWeek(g, i + 1);
      g.interestWeek = i + 1;
      g.minute = (i + 1) * 20 * 480;
      g.marketDay = Math.floor(g.minute / 1440) + 1;
      g.daily!.stocks.forEach((s, j) => {
        gains += Number(sharePrice(s) > old[j]);
        losses += Number(sharePrice(s) < old[j]);
        assert.ok(sharePrice(s) >= 100 && sharePrice(s) % 100 === 0);
        assert.ok(s.history.length <= 24);
      });
      assert.deepEqual(
        parseSave({ version: 2, game: g, favoriteIds: [] }).game,
        g,
      );
    }
  }
  assert.ok(gains > 0 && losses > 0);
});
test('walks consume one action; events and earned cash survive every dialogue step with no duplicate rewards', () => {
  const seen = new Set<string>();
  for (let seed = 0; seed < 100; seed++) {
    let g = enableStory(newGame(seed));
    const cash = g.cash;
    g = run(g, { type: 'walk' });
    const event = g.daily!.lastWalk!;
    seen.add(event);
    assert.equal(g.weekActions, 1);
    assert.equal(g.cash, cash + WALK_EVENTS[event].reward);
    const earned = g.cash;
    while (g.story?.active) {
      g = parseSave({ version: 2, game: g, favoriteIds: [] }).game;
      g = run(
        g,
        g.story!.active!.step < storyLines(g).length - 1
          ? { type: 'storyNext' }
          : { type: 'storyChoice', choice: storyChoices(g)[0].id },
      );
      assert.equal(g.cash, earned);
      assert.equal(g.weekActions, 1);
    }
  }
  assert.deepEqual([...seen].sort(), Object.keys(WALK_EVENTS).sort());
});
test('daily save validation rejects corrupt prices, duplicate draw weeks, invalid tiers/costs and mismatched scene data', () => {
  let g = newGame(5);
  g = run(g, { type: 'buyLottery', count: 1 });
  g = paid(g);
  const bad: ((g: Game) => void)[] = [
    (g) => {
      g.daily!.quoteWeek = 1;
    },
    (g) => {
      g.daily!.stocks[0].history[0].price = 12345;
    },
    (g) => {
      g.daily!.stocks[0].cost = 100;
    },
    (g) => {
      g.daily!.stocks[0].quantity = 10001;
    },
    (g) => {
      g.daily!.draws.push(g.daily!.draws[0]);
    },
    (g) => {
      g.daily!.draws[0].ranks[0] = 6;
    },
    (g) => {
      g.daily!.tickets.count = 6;
    },
    (g) => {
      g.daily!.pending = [
        { kind: 'stroll', event: 'wallet', reward: RULES.maxMoney },
      ];
    },
  ];
  for (const corrupt of bad) {
    const copy = structuredClone(g);
    corrupt(copy);
    assert.equal(isGame(copy), false);
  }
});
test('work, lottery and stocks respect mandatory inquiry and settlement locks', () => {
  const pending = newGame(5);
  const item = pending.board.shift()!;
  item.acquiredFor = item.price;
  pending.inventory.push(item);
  pending.sales.push({
    id: 'pending-sale',
    itemId: item.id,
    price: item.price,
    created: 0,
    expires: 4800,
    nextCheck: 480,
  });
  pending.inquiries.push({
    id: 'pending-inquiry',
    saleId: 'pending-sale',
    name: '구매자',
    price: item.price,
    max: item.price * 2,
    rounds: 0,
  });
  assert.ok(isGame(pending));
  for (const c of [
    { type: 'dailyWork' },
    { type: 'walk' },
    { type: 'buyLottery', count: 1 },
    { type: 'tradeStock', id: 'local', side: 'buy', quantity: 1 },
  ] as const) {
    const r = execute(pending, c);
    assert.equal(r.ok, false);
    assert.strictEqual(r.game, pending);
  }
  let g = newGame(5);
  g.cash = settlementAmount(g);
  g = run(g, { type: 'startSettlement' });
  for (const c of [
    { type: 'dailyWork' },
    { type: 'walk' },
    { type: 'buyLottery', count: 1 },
    { type: 'tradeStock', id: 'local', side: 'buy', quantity: 1 },
  ] as const)
    assert.equal(execute(g, c).ok, false);
});

test('every numbered lottery tier pays once after actual debt settlement', () => {
  let seed = 1;
  const expected = drawLottoNumbers((max) => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return Math.floor((seed / 4294967296) * max);
  });
  const others = Array.from({ length: 45 }, (_, i) => i + 1).filter(
    (n) => !expected.winning.includes(n) && n !== expected.bonus,
  );
  for (const target of [0, 1, 2, 3, 4, 5]) {
    let g = run(newGame(5), { type: 'buyLottery', count: 1 });
    const matches = [0, 6, 5, 5, 4, 3][target];
    const numbers = [
      ...expected.winning.slice(0, matches),
      ...(target === 2 ? [expected.bonus] : []),
    ];
    numbers.push(...others.slice(0, 6 - numbers.length));
    g.daily!.tickets.numbers = numbers;
    g.daily!.seed = 1;
    g = run(g, { type: 'startSettlement' });
    g = run(g, { type: 'repay', amount: mandatoryPrincipal(g) });
    const cash = g.cash;
    const r = execute(g, { type: 'payInterest' });
    assert.ok(r.ok);
    assert.ok(isGame(r.game));
    assert.equal(r.game.daily!.draws[0].ranks[0], target);
    assert.equal(r.game.daily!.draws[0].payout, LOTTERY_PRIZES[target]);
    assert.equal(
      r.game.cash,
      cash - (r.game.stats.repaid - g.stats.repaid) + LOTTERY_PRIZES[target],
    );
    assert.deepEqual(r.game.daily!.draws[0].winning, expected.winning);
  }
});
test('stock holding cap and cash ceiling reject orders without removing shares or money', () => {
  let g = newGame(9);
  g.cash = RULES.maxMoney;
  g.stats.peakCash = g.cash;
  g = run(g, { type: 'tradeStock', id: 'local', side: 'buy', quantity: 10000 });
  assert.equal(
    execute(g, { type: 'tradeStock', id: 'local', side: 'buy', quantity: 1 })
      .ok,
    false,
  );
  g.cash = RULES.maxMoney;
  const before = structuredClone(g),
    result = execute(g, {
      type: 'tradeStock',
      id: 'local',
      side: 'sell',
      quantity: 1,
    });
  assert.equal(result.ok, false);
  assert.strictEqual(result.game, g);
  assert.deepEqual(g, before);
});

test('automatic tickets and draws contain six distinct valid numbers and an exclusive bonus', () => {
  for (let seed = 1; seed <= 300; seed++) {
    let n = seed;
    const next = (max: number) => {
      n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
      return Math.floor((n / 4294967296) * max);
    };
    const numbers = autoLottoNumbers(next),
      draw = drawLottoNumbers(next);
    assert.ok(validLottoNumbers(numbers));
    assert.ok(validLottoNumbers(draw.winning));
    assert.ok(!draw.winning.includes(draw.bonus));
    assert.deepEqual(
      numbers,
      [...numbers].sort((a, b) => a - b),
    );
  }
  for (const v of [
    [1, 1, 2, 3, 4, 5],
    [0, 1, 2, 3, 4, 5],
    [1, 2, 3, 4, 5, 46],
    [1, 2, 3],
    null,
  ])
    assert.equal(validLottoNumbers(v), false);
  const winning = [1, 2, 3, 4, 5, 6];
  for (const [numbers, rank] of [
    [[1, 2, 3, 4, 5, 6], 1],
    [[1, 2, 3, 4, 5, 7], 2],
    [[1, 2, 3, 4, 5, 8], 3],
    [[1, 2, 3, 4, 8, 9], 4],
    [[1, 2, 3, 8, 9, 10], 5],
    [[1, 2, 8, 9, 10, 11], 0],
  ] as const)
    assert.equal(lottoRank([...numbers], winning, 7), rank);
});
test('legacy multi-ticket purchases and active results remain valid, with no additional purchases', () => {
  let g = enableStory(newGame(5));
  g.daily = dailyState(g);
  g.daily.tickets.count = 5;
  g = parseSave({ version: 2, game: g, favoriteIds: [] }).game;
  assert.equal(execute(g, { type: 'buyLottery', count: 1 }).ok, false);
  g = paid(g);
  assert.equal(g.daily!.draws[0].ranks.length, 5);
  assert.equal(g.daily!.draws[0].numbers, undefined);
  g = finish(g);
  const cash = g.cash;
  assert.deepEqual(parseSave({ version: 2, game: g, favoriteIds: [] }).game, g);
  g = run(g, { type: 'buyLottery', count: 1 });
  assert.ok(validLottoNumbers(g.daily!.tickets.numbers));
  assert.equal(g.cash, cash - DAILY_RULES.lotteryCost);
});
test('numbered result and ticket corruption is rejected without modifying the save', () => {
  let g = run(newGame(5), { type: 'buyLottery', count: 1 });
  const badTicket = structuredClone(g);
  badTicket.daily!.tickets.numbers = [1, 1, 2, 3, 4, 5];
  assert.equal(isGame(badTicket), false);
  g = paid(g);
  for (const edit of [
    (g: Game) => {
      g.daily!.draws[0].winning = [1, 1, 2, 3, 4, 5];
    },
    (g: Game) => {
      g.daily!.draws[0].bonus = g.daily!.draws[0].winning![0];
    },
    (g: Game) => {
      g.daily!.draws[0].ranks[0] = g.daily!.draws[0].ranks[0] === 0 ? 1 : 0;
    },
    (g: Game) => {
      delete g.daily!.draws[0].bonus;
    },
  ]) {
    const copy = structuredClone(g);
    edit(copy);
    assert.throws(() => parseSave({ version: 2, game: copy, favoriteIds: [] }));
  }
});
