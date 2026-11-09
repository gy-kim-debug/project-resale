import test from 'node:test';
import assert from 'node:assert/strict';
import { execute, newGame } from '../src/domain/engine';
import { dailyState, advanceStocks, sharePrice } from '../src/domain/daily';
import { STOCKS } from '../src/content/daily';
import { parseSave } from '../src/storage/saveRepository';
import { isGame } from '../src/storage/validation';
import { enableStory, storyLines, storyChoices } from '../src/domain/story';
import { mandatoryPrincipal } from '../src/domain/debt';
import type { Command, Game } from '../src/domain/game';
function run(g: Game, c: Command) {
  const r = execute(g, c);
  assert.ok(r.ok, r.message);
  assert.ok(isGame(r.game), c.type);
  return r.game;
}
function prices(g: Game) {
  return dailyState(g).stocks.map((s) => s.history);
}
function legacy() {
  const g = newGame(7);
  g.interestWeek = 3;
  g.minute = 3 * 20 * 480;
  g.marketDay = Math.floor(g.minute / 1440) + 1;
  const d = dailyState(g);
  delete d.stockTick;
  delete d.stockSeed;
  d.quoteWeek = 4;
  d.tickets.week = 4;
  for (const s of d.stocks) {
    s.quantity = 2;
    s.cost = 2 * sharePrice(s);
    s.history = [
      { week: 2, price: sharePrice(s) - 1000 },
      { week: 3, price: sharePrice(s) - 500 },
      { week: 4, price: sharePrice(s) },
    ];
  }
  g.daily = d;
  return g;
}
test('every real action updates all themes once; last action and multi-action transactions obey actual cost', () => {
  for (const command of [
    { type: 'wait' },
    { type: 'dailyWork' },
    { type: 'walk' },
    { type: 'refresh', marketId: 'street' },
    { type: 'repay', amount: 100 },
  ] as const) {
    const g = newGame(7),
      r = run(g, command);
    assert.equal(r.weekActions, 1);
    assert.equal(r.daily!.stockTick, 1);
    for (const s of r.daily!.stocks) {
      assert.equal(s.history.length, 2);
      assert.equal(s.history[1].tick, 1);
    }
  }
  const last = newGame(7);
  last.weekActions = 19;
  last.minute = 19 * 480;
  const end = run(last, { type: 'wait' });
  assert.equal(end.daily!.stockTick, 1);
  assert.equal(end.weekActions, 20);
  const before = structuredClone(end);
  assert.equal(execute(end, { type: 'wait' }).ok, false);
  assert.deepEqual(end, before);
  const g = newGame(7);
  g.cash = 2000000;
  g.stats.peakCash = g.cash;
  const item = g.board.find((i) => i.marketId === 'street' && !i.special)!;
  const bought = execute(g, { type: 'buy', id: item.id }, true, undefined, 2);
  assert.ok(bought.ok);
  assert.ok(isGame(bought.game));
  assert.equal(bought.game.daily!.stockTick, 2);
  assert.equal(bought.game.daily!.stocks[0].history.length, 3);
  assert.equal(bought.game.weekActions, 2);
});
test('stock orders, appraisal, repair and chat never create quotes; invalid commands roll back all quote state', () => {
  let g = newGame(9);
  g.cash = 5000000;
  g.stats.peakCash = g.cash;
  g = run(g, { type: 'tradeStock', id: 'local', side: 'buy', quantity: 5 });
  const histories = structuredClone(prices(g)),
    seed = g.daily!.stockSeed;
  g = run(g, { type: 'tradeStock', id: 'local', side: 'sell', quantity: 2 });
  g = run(g, { type: 'buyLottery', count: 1 });
  assert.deepEqual(prices(g), histories);
  assert.equal(g.daily!.stockSeed, seed);
  assert.equal(g.daily!.stockTick, 0);
  const item = g.board.find(
    (i) => i.marketId === 'street' && i.stateGrade === 'B',
  )!;
  g = run(g, { type: 'buy', id: item.id });
  const before = structuredClone(prices(g));
  g = run(g, { type: 'check', id: item.id });
  assert.deepEqual(prices(g), before);
  const sale = execute(g, {
    type: 'tradeStock',
    id: 'local',
    side: 'sell',
    quantity: 1000,
  });
  assert.equal(sale.ok, false);
  assert.strictEqual(sale.game, g);
  const chatItem = g.board.find((i) => i.marketId === 'street' && !i.special)!;
  const chat = execute(g, {
    type: 'dialogue',
    id: chatItem.id,
    topic: 'greet',
  });
  assert.ok(chat.ok, chat.message);
  assert.deepEqual(prices(chat.game), before);
  const offerItem = g.board.find(
    (i) => i.marketId === 'street' && !i.special && i.offers.length,
  )!;
  const offer = execute(g, {
    type: 'offer',
    id: offerItem.id,
    price: offerItem.offers[0],
  });
  assert.ok(offer.ok, offer.message);
  assert.deepEqual(prices(offer.game), before);
  assert.equal(offer.game.daily!.stockSeed, g.daily!.stockSeed);
  const repair = g.inventory[0];
  repair.stateGrade = 'C';
  repair.condition = '고장';
  repair.checked = true;
  repair.repaired = false;
  const fixed = execute(g, { type: 'repair', id: repair.id });
  assert.ok(fixed.ok, fixed.message);
  assert.deepEqual(prices(fixed.game), before);
});
test('early settlement discards no-action time without moving prices; the next week resumes the same quote sequence', () => {
  let g = newGame(9);
  g.cash = 10000000;
  g.stats.peakCash = g.cash;
  g = run(g, { type: 'dailyWork' });
  const histories = structuredClone(prices(g)),
    tick = g.daily!.stockTick,
    seed = g.daily!.stockSeed;
  g = run(g, { type: 'startSettlement' });
  g = run(g, { type: 'repay', amount: mandatoryPrincipal(g) });
  g = run(g, { type: 'payInterest' });
  assert.equal(g.interestWeek, 1);
  assert.deepEqual(prices(g), histories);
  assert.equal(g.daily!.stockTick, tick);
  assert.equal(g.daily!.stockSeed, seed);
  g = run(g, { type: 'wait' });
  assert.equal(g.daily!.stockTick, tick! + 1);
  assert.equal(g.daily!.stocks[0].history.at(-1)!.week, 2);
});
test('legacy weekly saves migrate once without changing any price, cost, holding, cash or RNG outcome', () => {
  const old = legacy();
  assert.ok(isGame(old));
  const original = structuredClone(old);
  let g = parseSave({ version: 2, game: old, favoriteIds: [] }).game;
  assert.equal(g.daily!.stockTick, 3);
  assert.equal(g.daily!.seed, old.daily!.seed);
  assert.equal(g.seed, old.seed);
  assert.equal(g.cash, old.cash);
  g.daily!.stocks.forEach((s, i) => {
    assert.equal(s.quantity, original.daily!.stocks[i].quantity);
    assert.equal(s.cost, original.daily!.stocks[i].cost);
    assert.deepEqual(
      s.history.map((p) => ({ week: p.week, price: p.price })),
      original.daily!.stocks[i].history,
    );
    assert.deepEqual(
      s.history.map((p) => p.tick),
      [1, 2, 3],
    );
  });
  assert.deepEqual(parseSave({ version: 2, game: g, favoriteIds: [] }).game, g);
  assert.deepEqual(old, original);
  g = run(g, { type: 'wait' });
  assert.equal(g.daily!.stockTick, 4);
  assert.equal(g.daily!.stocks[0].history.at(-1)!.week, 4);
});
test('stock RNG is independent and action step reloads reproduce exactly; bounds, flat moves and losses are preserved', () => {
  let gains = 0,
    losses = 0,
    flat = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const g = newGame(seed);
    g.daily = dailyState(g);
    const other = structuredClone(g);
    other.daily!.seed = (other.daily!.seed ^ 0x12345678) >>> 0;
    advanceStocks(g, 3);
    advanceStocks(other, 3);
    assert.deepEqual(prices(g), prices(other));
    assert.notEqual(g.daily.seed, other.daily!.seed);
    const baseDailySeed = g.daily.seed,
      baseGameSeed = g.seed;
    for (let step = 0; step < 30; step++) {
      const before = g.daily.stocks.map(sharePrice);
      const restored = parseSave({ version: 2, game: g, favoriteIds: [] }).game;
      advanceStocks(g, 1);
      advanceStocks(restored, 1);
      assert.deepEqual(restored, g);
      assert.ok(isGame(g));
      assert.equal(g.daily.seed, baseDailySeed);
      assert.equal(g.seed, baseGameSeed);
      g.daily.stocks.forEach((s, i) => {
        const current = sharePrice(s);
        gains += Number(current > before[i]);
        losses += Number(current < before[i]);
        flat += Number(current === before[i]);
        assert.ok(
          current % 100 === 0 && current >= 100 && current <= 1000000000,
        );
        assert.ok(
          Math.abs(current - before[i]) <=
            (before[i] * STOCKS[i].volatility) / 100 + 50,
        );
        assert.ok(s.history.length <= 24);
      });
    }
  }
  assert.ok(gains > 0 && losses > 0 && flat > 0);
});
test('saving during a story or reading dialogue never advances stock quotes twice', () => {
  let g = enableStory(newGame(9), true);
  const before = structuredClone(dailyState(g));
  g = run(g, { type: 'storyNext' });
  assert.deepEqual(dailyState(g), before);
  while (g.story!.active) {
    g = run(
      g,
      g.story!.active!.step < storyLines(g).length - 1
        ? { type: 'storyNext' }
        : { type: 'storyChoice', choice: storyChoices(g)[0].id },
    );
  }
  g = run(g, { type: 'walk' });
  const snapshots = structuredClone(prices(g));
  while (g.story!.active) {
    g = parseSave({ version: 2, game: g, favoriteIds: [] }).game;
    g = run(
      g,
      g.story!.active!.step < storyLines(g).length - 1
        ? { type: 'storyNext' }
        : { type: 'storyChoice', choice: storyChoices(g)[0].id },
    );
    assert.deepEqual(prices(g), snapshots);
  }
});
test('mixed, missing, future and discontinuous quote metadata reject imports', () => {
  const g = run(newGame(7), { type: 'wait' });
  for (const corrupt of [
    (g: Game) => {
      delete g.daily!.stockSeed;
    },
    (g: Game) => {
      g.daily!.stockTick = 0;
    },
    (g: Game) => {
      g.daily!.stocks[0].history[1].tick = 8;
    },
    (g: Game) => {
      delete g.daily!.stocks[0].history[0].tick;
    },
    (g: Game) => {
      g.daily!.stocks[0].history[1].week = 2;
    },
  ]) {
    const bad = structuredClone(g);
    corrupt(bad);
    assert.throws(() => parseSave({ version: 2, game: bad, favoriteIds: [] }));
  }
});
