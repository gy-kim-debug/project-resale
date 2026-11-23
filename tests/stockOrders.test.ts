import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, execute } from '../src/domain/engine';
import {
  dailyState,
  stockOrderQuote,
  stockOrderLimit,
  stockFee,
  sharePrice,
} from '../src/domain/daily';
import { STOCKS } from '../src/content/daily';
import { RULES } from '../src/content/rules';
import { parseSave } from '../src/storage/saveRepository';
import type { Game, Command } from '../src/domain/game';
const save = (g: Game) =>
  parseSave(
    JSON.parse(JSON.stringify({ version: 2, game: g, favoriteIds: [] })),
  ).game;
function trade(g: Game, id: string, side: 'buy' | 'sell', quantity: number) {
  const result = execute(g, { type: 'tradeStock', id, side, quantity });
  assert.ok(result.ok, result.message);
  return result.game;
}
test('read-only order quotes match exact engine payments, fees, cost allocation and every theme', () => {
  for (const s of STOCKS) {
    let g = newGame(42);
    g.cash = 1_000_000;
    g.stats.peakCash = g.cash;
    const before = structuredClone(g),
      quote = stockOrderQuote(g, s.id, 'buy', 7);
    assert.deepEqual(g, before);
    g = trade(g, s.id, 'buy', 7);
    assert.equal(g.cash, quote.cashAfter);
    assert.equal(g.cash, before.cash - quote.net);
    const sell = stockOrderQuote(g, s.id, 'sell', 3),
      prior = structuredClone(g);
    g = trade(g, s.id, 'sell', 3);
    assert.equal(g.cash, sell.cashAfter);
    assert.equal(g.cash, prior.cash + sell.gross - stockFee(sell.gross));
    const held = g.daily!.stocks.find((i) => i.id === s.id)!;
    assert.equal(held.quantity, 4);
    assert.equal(held.cost, sell.remainingCost);
    assert.equal(g.weekActions, before.weekActions);
    assert.equal(g.minute, before.minute);
    assert.equal(g.seed, before.seed);
    assert.deepEqual(
      g.daily!.stocks.map((i) => i.history),
      dailyState(before).stocks.map((i) => i.history),
    );
  }
});
test('buy maximum respects cash and remaining holding limit; sell maximum respects net cash ceiling', () => {
  for (const cash of [0, 19900, 20000, 1000000]) {
    const g = newGame(42);
    g.cash = cash;
    g.stats.peakCash = Math.max(g.stats.peakCash, cash);
    const max = stockOrderLimit(g, 'local', 'buy');
    assert.equal(max, Math.floor(cash / 20000));
    if (max) assert.doesNotThrow(() => stockOrderQuote(g, 'local', 'buy', max));
    assert.throws(() => stockOrderQuote(g, 'local', 'buy', max + 1));
  }
  const g = newGame(42);
  g.daily = dailyState(g);
  g.daily.stocks[0].quantity = 10;
  g.daily.stocks[0].cost = 200000;
  for (const room of [0, 100, 19800, 39600, 1000000]) {
    g.cash = RULES.maxMoney - room;
    g.stats.peakCash = g.cash;
    const max = stockOrderLimit(g, 'local', 'sell');
    if (max)
      assert.doesNotThrow(() => stockOrderQuote(g, 'local', 'sell', max));
    if (max < 10)
      assert.throws(() => stockOrderQuote(g, 'local', 'sell', max + 1));
  }
  g.daily.stocks[0].quantity = 10000;
  g.cash = 1000000;
  assert.equal(stockOrderLimit(g, 'local', 'buy'), 0);
});
test('buy/sell records survive saves and distinguish actual proceeds from gross price and sold cost', () => {
  let g = newGame(42);
  g = trade(g, 'local', 'buy', 10);
  g = trade(g, 'local', 'sell', 3);
  g = trade(g, 'local', 'sell', 7);
  const records = g.daily!.stockOrders!;
  assert.equal(records.length, 3);
  assert.deepEqual(
    records.map((r) => r.side),
    ['sell', 'sell', 'buy'],
  );
  assert.deepEqual(
    records.map((r) => r.total),
    [138600, 59400, 200000],
  );
  assert.deepEqual(
    records.map((r) => r.basis),
    [140000, 60000, 200000],
  );
  assert.deepEqual(
    records.map((r) => r.profit),
    [-1400, -600, 0],
  );
  assert.deepEqual(save(g).daily!.stockOrders, records);
  assert.equal(g.daily!.stocks[0].cost, 0);
});
test('recent records stay bounded, free orders never move prices/RNG, and old saves gain no fake past records', () => {
  let g = newGame(42);
  const before = structuredClone(dailyState(g));
  for (let n = 0; n < 26; n++) g = trade(g, 'local', n % 2 ? 'sell' : 'buy', 1);
  assert.equal(g.daily!.stockOrders!.length, 20);
  assert.equal(g.weekActions, 0);
  assert.equal(g.daily!.stockSeed, before.stockSeed);
  assert.equal(g.daily!.seed, before.seed);
  assert.equal(sharePrice(g.daily!.stocks[0]), 20000);
  assert.equal(g.daily!.stockTick, 0);
  const legacy = structuredClone(g);
  delete legacy.daily!.stockOrders;
  const restored = save(legacy);
  assert.equal(restored.daily!.stockOrders, undefined);
  assert.equal(restored.cash, legacy.cash);
});
test('invalid or unaffordable orders preserve every existing record and all game state', () => {
  const g = trade(newGame(42), 'local', 'buy', 1);
  const commands: Command[] = [
    { type: 'tradeStock', id: 'local', side: 'sell', quantity: 2 },
    { type: 'tradeStock', id: 'local', side: 'buy', quantity: 10001 },
    { type: 'tradeStock', id: 'missing', side: 'buy', quantity: 1 },
    { type: 'tradeStock', id: 'local', side: 'buy', quantity: NaN },
  ];
  for (const command of commands) {
    const r = execute(g, command);
    assert.equal(r.ok, false);
    assert.deepEqual(r.game, g);
  }
});
test('corrupt trade histories are rejected before replacing a save', () => {
  const g = trade(trade(newGame(42), 'local', 'buy', 2), 'local', 'sell', 1);
  for (const key of [
    'stockId',
    'side',
    'quantity',
    'price',
    'gross',
    'fee',
    'total',
    'basis',
    'profit',
    'week',
    'tick',
  ] as const) {
    const bad = structuredClone(g);
    const row = bad.daily!.stockOrders![0] as unknown as Record<
      string,
      unknown
    >;
    row[key] =
      key === 'stockId'
        ? 'unknown'
        : key === 'side'
          ? 'swap'
          : key === 'week' || key === 'tick'
            ? 99999
            : 101;
    assert.throws(() => save(bad), key);
  }
  const overflow = structuredClone(g);
  overflow.daily!.stockOrders = Array(21).fill(g.daily!.stockOrders![0]);
  assert.throws(() => save(overflow));
  const malformed = structuredClone(g);
  (
    malformed.daily!.stockOrders![0] as unknown as Record<string, unknown>
  ).side = ['sell'];
  assert.throws(() => save(malformed));
});
