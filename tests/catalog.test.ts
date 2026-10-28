import test from 'node:test';
import assert from 'node:assert/strict';
import legacySave from './fixtures/legacy-catalog-v2.json';
import {
  MARKETS,
  MARKET_LISTING_COUNT,
  LEGACY_BOARD_LIMIT,
  marketOf,
} from '../src/content/markets';
import { FIND_PRODUCTS } from '../src/content/marketProducts';
import { PRODUCT_CATEGORIES } from '../src/content/productCategories';
import { ITEM_CASES, caseApplies, itemCase } from '../src/content/itemCases';
import { chooseItemCase, caseQuality } from '../src/domain/itemCases';
import { newGame, execute } from '../src/domain/engine';
import { conditionValuePercent } from '../src/domain/itemProfiles';
import { moneyRatio } from '../src/domain/money';
import { parseSave } from '../src/storage/saveRepository';
import { isGame } from '../src/storage/validation';
import { ITEM_CODEX, codexKey } from '../src/content/collection';
import { itemArt, illustratedTitles } from '../src/content/itemArt';
import type { Game, Command } from '../src/domain/game';
function run(g: Game, c: Command) {
  const r = execute(g, c);
  assert.ok(r.ok, r.message);
  assert.ok(isGame(r.game));
  return r.game;
}
test('240 distinct products cover 36 categories with explicit safe per-product prices and reachable starting bands', () => {
  assert.deepEqual(
    MARKETS.map((m) => m.products.length),
    [48, 60, 36, 36, 30, 30],
  );
  const titles = new Set<string>(),
    categories = new Set<string>();
  for (const m of MARKETS)
    for (const p of m.products) {
      assert.ok(!titles.has(p.title));
      titles.add(p.title);
      categories.add(p.category!);
      assert.equal(PRODUCT_CATEGORIES[p.category!].kind, p.kind);
      assert.ok(p.min! >= m.min && p.max! <= m.max && p.min! <= p.max!);
      assert.equal(p.min! % 1000, 0);
      assert.equal(p.max! % 1000, 0);
    }
  assert.equal(titles.size, 240);
  assert.equal(categories.size, 36);
  assert.equal(Object.keys(PRODUCT_CATEGORIES).length, 36);
  assert.equal(MARKETS[0].min, 10000);
  assert.equal(MARKETS[1].min, 800000);
  assert.equal(MARKETS.at(-1)!.max, 50000000000);
});
test('100 seeds generate diverse nonduplicate 12-item boards within each product band, preserving entry prices and valid saves', () => {
  const seen = new Set<string>(),
    cases = new Set<string>(),
    variants = new Map<string, Set<string>>();
  for (let seed = 1; seed <= 100; seed++) {
    const g = newGame(seed);
    assert.ok(isGame(g));
    assert.deepEqual(g, newGame(seed));
    assert.ok(g.board.length <= LEGACY_BOARD_LIMIT);
    for (const market of MARKETS) {
      const stock = g.board.filter(
        (i) => marketOf(i) === market.id && i.price > 0,
      );
      assert.equal(stock.length, MARKET_LISTING_COUNT);
      assert.equal(
        new Set(stock.map((i) => i.title)).size,
        MARKET_LISTING_COUNT,
      );
      assert.equal(Math.min(...stock.map((i) => i.price)), market.min);
      for (const i of stock) {
        const p = market.products.find((p) => p.title === i.title)!;
        assert.equal(i.category, p.category);
        assert.ok(i.price >= p.min! && i.price <= p.max!);
        assert.equal(i.price % 100, 0);
        assert.equal(i.base % 100, 0);
        assert.equal(
          i.value,
          moneyRatio(i.base, conditionValuePercent(i.kind, i.condition)),
        );
        assert.ok(i.caseId && caseApplies(i.caseId, i.kind, i.marketId));
        seen.add(i.title);
        cases.add(i.caseId!);
        if (!variants.has(i.title)) variants.set(i.title, new Set());
        variants.get(i.title)!.add(i.caseId!);
      }
    }
    assert.deepEqual(
      parseSave({ version: 2, game: g, favoriteIds: [] }).game,
      g,
    );
  }
  assert.equal(seen.size, 240);
  assert.equal(cases.size, 24);
  assert.ok([...variants.values()].filter((s) => s.size >= 2).length >= 200);
});
test('case choice is fixed and constrained to context, changes value/price/quality tuning, and cannot promise authenticity', () => {
  assert.equal(Object.keys(ITEM_CASES).length, 24);
  for (const [id, rule] of Object.entries(ITEM_CASES)) {
    assert.ok(rule.weight > 0);
    assert.ok(rule.valuePercent >= 75 && rule.valuePercent <= 125);
    assert.ok(rule.askPercent >= 80 && rule.askPercent <= 112);
    assert.ok(!('authentic' in rule), id);
  }
  for (const market of MARKETS)
    for (const product of market.products) {
      const chosen = chooseItemCase(product.title, product.kind, market.id);
      assert.equal(
        chooseItemCase(product.title, product.kind, market.id),
        chosen,
      );
      assert.ok(caseApplies(chosen, product.kind, market.id));
    }
  assert.ok(!caseApplies('highMileage', '디지털', 'computers'));
  assert.ok(!caseApplies('certificate', '수집품', 'street'));
  assert.ok(caseQuality(0.3, 'unopened') > caseQuality(0.3, 'untested'));
  assert.ok(caseQuality(0, 'untested') >= 0 && caseQuality(1, 'unopened') < 1);
  assert.ok(itemCase('fullset').valuePercent > itemCase('bare').valuePercent);
});
test('new category/case survive buy, free appraisal, repair, resell registration and backup without reroll', () => {
  let g = newGame(9);
  g.cash = 10000000;
  const item = g.board.find(
    (i) => i.marketId === 'street' && i.price > 0 && i.condition !== '양호',
  )!;
  assert.ok(item);
  g = run(g, { type: 'buy', id: item.id });
  const metadata = {
    category: item.category,
    caseId: item.caseId,
    base: item.base,
  };
  g = run(g, { type: 'check', id: item.id });
  assert.equal(g.weekActions, 1);
  g = run(g, { type: 'repair', id: item.id });
  assert.equal(g.weekActions, 1);
  g = run(g, { type: 'post', id: item.id, price: 50000 });
  const owned = g.inventory[0];
  assert.deepEqual(
    { category: owned.category, caseId: owned.caseId, base: owned.base },
    metadata,
  );
  assert.deepEqual(parseSave({ version: 2, game: g, favoriteIds: [] }).game, g);
});
test('invalid subcategories and incompatible cases are rejected while real pre-expansion saves keep finances and owned values', () => {
  const g = newGame();
  for (const patch of [
    { category: 'unknown' },
    { category: 'apartments' },
    { caseId: 'unknown' },
    { caseId: 'certificate' },
  ]) {
    const bad = structuredClone(g);
    Object.assign(bad.board[0], patch);
    assert.equal(isGame(bad), false);
    assert.throws(() => parseSave({ version: 2, game: bad, favoriteIds: [] }));
  }
  const before = structuredClone(legacySave),
    loaded = parseSave(legacySave);
  assert.deepEqual(legacySave, before);
  assert.deepEqual(loaded.game.inventory, before.game.inventory);
  for (const field of [
    'cash',
    'principal',
    'interest',
    'minute',
    'seed',
    'stats',
  ] as const)
    assert.deepEqual(loaded.game[field], before.game[field]);
  assert.deepEqual(loaded.game.board, before.game.board);
  assert.deepEqual(loaded.game.discoveredItems, before.game.discoveredItems);
  const refreshed = run(loaded.game, {
    type: 'refresh',
    marketId: 'computers',
  });
  assert.equal(
    refreshed.board.filter((i) => i.marketId === 'computers').length,
    12,
  );
  assert.deepEqual(refreshed.inventory, before.game.inventory);
});
test('codex references all active products with correct ranges and category features; every expanded product has valid dot art', () => {
  assert.equal(ITEM_CODEX.filter((e) => !e.legacy).length, 240);
  const illustrated = new Set(illustratedTitles());
  for (const market of MARKETS)
    for (const p of market.products) {
      const entry = ITEM_CODEX.find((e) => e.key === codexKey(p))!;
      assert.ok(entry && !entry.legacy);
      assert.equal(entry.min, p.min);
      assert.equal(entry.max, p.max);
      assert.equal(entry.category, p.category);
      assert.ok(
        entry.features.includes(PRODUCT_CATEGORIES[p.category!].feature),
      );
      assert.ok(illustrated.has(p.title));
      const pixels = itemArt(p.title, p.kind);
      assert.ok(pixels.length > 0);
      for (const [x, y, w, h, color] of pixels)
        assert.ok(
          x >= 0 &&
            y >= 0 &&
            w > 0 &&
            h > 0 &&
            x + w <= 32 &&
            y + h <= 32 &&
            !!color,
          p.title,
        );
    }
  assert.notDeepEqual(
    itemArt('돔 텐트', '생활'),
    itemArt('입문용 자전거', '생활'),
  );
  assert.notDeepEqual(
    itemArt('그랜드 피아노', '악기'),
    itemArt('색소폰', '악기'),
  );
});
test('free findings use the broader low-priced catalog, always produce an item and mostly remain cheap', () => {
  assert.ok(FIND_PRODUCTS.length >= 20);
  const seen = new Set<string>(),
    values: number[] = [];
  for (let seed = 1; seed <= 150; seed++) {
    const g = run(newGame(seed), { type: 'scavenge' });
    assert.equal(g.inventory.length, 1);
    assert.equal(g.cash, 500000);
    assert.equal(g.weekActions, 1);
    const found = g.inventory[0];
    seen.add(found.title);
    values.push(found.value);
    assert.ok(FIND_PRODUCTS.some((p) => p.title === found.title));
    assert.equal(found.acquiredFor, 0);
    assert.ok(g.discoveredItems?.includes(codexKey(found)));
  }
  assert.ok(seen.size >= 20);
  values.sort((a, b) => a - b);
  assert.ok(values[Math.floor(values.length * 0.9)] < 50000);
});
