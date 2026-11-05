import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, execute } from '../src/domain/engine';
import type { Command } from '../src/domain/game';
import { parseSave } from '../src/storage/saveRepository';
import { instantSalePrice } from '../src/domain/instantSale';
import { acquisitionCost } from '../src/domain/inventory';
import { isGame } from '../src/storage/validation';
function oldAssets() {
  const g = newGame(42);
  g.cash = 1238000;
  g.stats.peakCash = g.cash;
  g.stats.earned = 38000;
  const owned = g.board
    .filter((i) => i.marketId === 'street' && i.value > 0)
    .slice(0, 2);
  g.board = g.board.filter((i) => !owned.some((o) => o.id === i.id));
  for (const i of owned) {
    i.price = 0;
    i.offers = [];
    i.acquiredFor = 0;
  }
  g.inventory = owned;
  g.board.push({ ...g.board[0], id: 'old-free-listing', price: 0, offers: [] });
  g.logs.push({
    id: ++g.serial,
    minute: 0,
    text: '창고 분류 완료. 38,000 원을 받았습니다.',
    category: 'activity',
  });
  return g;
}
test('retired work and scavenging commands cannot grant cash, inventory, XP or action progress', () => {
  for (const cash of [0, 500000, 1000000000]) {
    const g = newGame(42);
    g.cash = cash;
    g.stats.peakCash = Math.max(g.stats.peakCash, cash);
    const before = structuredClone(g);
    for (const command of [
      { type: 'job', id: 'flyer' },
      { type: 'job', id: 'shop' },
      { type: 'job', id: 'warehouse' },
      { type: 'scavenge' },
    ]) {
      const result = execute(g, command as unknown as Command);
      assert.equal(result.ok, false);
      assert.strictEqual(result.game, g);
      assert.deepEqual(g, before);
    }
  }
});
test('old free NPCs disappear on load, but owned gifts, scavenged goods, cash and historical income survive unchanged', () => {
  const old = oldAssets(),
    before = structuredClone(old);
  assert.ok(isGame(old));
  const loaded = parseSave({ version: 2, game: old, favoriteIds: [] }).game;
  assert.ok(loaded.board.every((i) => i.price > 0));
  assert.deepEqual(loaded.inventory, before.inventory);
  assert.deepEqual(loaded.logs, before.logs);
  for (const key of [
    'cash',
    'seed',
    'minute',
    'weekActions',
    'principal',
    'stats',
  ] as const)
    assert.deepEqual(loaded[key], before[key]);
  assert.deepEqual(old, before);
  assert.deepEqual(
    parseSave({ version: 2, game: loaded, favoriteIds: [] }).game,
    loaded,
  );
  assert.equal(execute(old, { type: 'buy', id: 'old-free-listing' }).ok, false);
});
test('previously acquired zero-cost goods can still be sold at the ordinary quote without recreating acquisition routes', () => {
  const g = parseSave({ version: 2, game: oldAssets(), favoriteIds: [] }).game;
  const item = g.inventory[0];
  assert.equal(acquisitionCost(item), 0);
  const listed = execute(g, { type: 'post', id: item.id, price: 10000 });
  assert.ok(listed.ok, listed.message);
  const sold = execute(g, { type: 'outletSell', id: item.id });
  assert.ok(sold.ok, sold.message);
  assert.equal(sold.game.cash, g.cash + instantSalePrice(item));
  assert.equal(sold.game.inventory.length, g.inventory.length - 1);
  assert.ok(isGame(sold.game));
  assert.ok(sold.game.board.every((i) => i.price > 0));
});
