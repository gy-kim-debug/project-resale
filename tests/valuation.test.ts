import test from 'node:test';
import assert from 'node:assert/strict';
import legacySave from './fixtures/legacy-catalog-v2.json';
import {
  referenceValue,
  generatedBase,
  boostedBase,
  capValue,
} from '../src/domain/valuation';
import { rarityBoostPercent } from '../src/domain/itemProfiles';
import { newGame, execute, marketValue } from '../src/domain/engine';
import { moneyRatio } from '../src/domain/money';
import { applySpecialListing } from '../src/domain/specialListings';
import { parseSave } from '../src/storage/saveRepository';
import { isGame } from '../src/storage/validation';

test('exact rarity thresholds reserve 1% for jackpots, 11% for modest bonuses, 88% normal', () => {
  const counts = new Map<number, number>();
  for (let n = 0; n < 10000; n++) {
    const v = rarityBoostPercent('수집품', n / 10000);
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  assert.deepEqual(Object.fromEntries(counts), {
    100: 8800,
    150: 1100,
    300: 100,
  });
  assert.equal(rarityBoostPercent('수집품', 0.989999), 150);
  assert.equal(rarityBoostPercent('수집품', 0.99), 300);
});
test('reference values span 0.8–1.3 asking in hundred-won amounts and do not reroll', () => {
  const seen = new Set<number>();
  for (let n = 0; n < 1000; n++) {
    const ref = referenceValue(100000, 'item' + n);
    assert.ok(ref >= 80000 && ref <= 130000);
    assert.equal(ref % 100, 0);
    assert.equal(ref, referenceValue(100000, 'item' + n));
    seen.add(ref);
  }
  assert.equal(seen.size, 51);
});
test('stacking limited, rarity and accessories cannot exceed 3x; counterfeit and wear reductions remain', () => {
  assert.equal(generatedBase(100000, 200, 300, 125), 300000);
  assert.equal(generatedBase(100000, 100, 100, 100), 100000);
  assert.equal(generatedBase(100000, 5, 100, 100), 5000);
  assert.equal(moneyRatio(generatedBase(100000, 5, 100, 100), 30), 1500);
  assert.equal(
    boostedBase({ base: 250000, valuationReference: 100000 }, 200),
    300000,
  );
  assert.equal(boostedBase({ base: 100000 }, 200), 200000);
  assert.equal(capValue(405000, 100000), 300000);
});
test('all generated markets, special listings and current values stay capped, valid and deterministic', () => {
  let collector = 0,
    losses = 0,
    normal = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const g = newGame(seed);
    assert.ok(isGame(g));
    assert.deepEqual(g, newGame(seed));
    g.marketFactor = 115;
    for (const i of g.board) {
      assert.ok(i.valuationReference! > 0);
      const cap = i.valuationReference! * 3;
      assert.ok(i.base <= cap);
      assert.ok(i.value <= cap);
      g.trend = i.kind;
      assert.ok(marketValue(g, i) <= cap);
      if (i.price > 0 && !i.special) {
        assert.ok(i.valuationReference! >= moneyRatio(i.price, 80));
        assert.ok(i.valuationReference! <= moneyRatio(i.price, 130));
        if (i.value < i.price) losses++;
        if (i.value <= i.price * 1.3) normal++;
      }
      if (i.special === 'collector') collector++;
    }
  }
  assert.ok(collector > 0 && losses > 1000 && normal > 3000);
});
test('collector boosts cap after rarity and condition stays applied; old uncapped items still retain their values', () => {
  const i = newGame(42).board.find(
    (i) => i.price > 0 && i.marketId === 'street' && !i.special,
  )!;
  i.listing!.facts.authentic = true;
  i.valuationReference = 100000;
  i.base = 250000;
  i.condition = '사용감';
  i.value = 200000;
  const r = applySpecialListing(i, 'collector', 10000);
  assert.equal(r.base, 300000);
  assert.ok(r.value <= r.base);
  assert.equal(i.base, 250000);
  const old = structuredClone(legacySave);
  const loaded = parseSave(old).game;
  assert.deepEqual(loaded.inventory, old.game.inventory);
  assert.deepEqual(loaded.board, old.game.board);
  const item = loaded.inventory[0];
  assert.equal(item.valuationReference, undefined);
  loaded.marketFactor = 115;
  loaded.trend = item.kind;
  assert.equal(marketValue(loaded, item), moneyRatio(item.value, 135));
});
test('buy, appraise, save/reload and repair never redraw or bypass the new reference and cap', () => {
  let g = newGame(42);
  g.cash = 100000000;
  g.stats.peakCash = g.cash;
  const i = g.board.find((i) => i.price > 0 && i.marketId === 'street')!;
  const ref = i.valuationReference;
  let r = execute(g, { type: 'buy', id: i.id });
  assert.ok(r.ok);
  g = r.game;
  r = execute(g, { type: 'check', id: i.id });
  assert.ok(r.ok);
  g = r.game;
  assert.equal(g.inventory[0].valuationReference, ref);
  assert.equal(g.inventory[0].value, i.value);
  const loaded = parseSave({ version: 2, game: g, favoriteIds: [] }).game;
  assert.deepEqual(loaded, g);
  assert.ok(isGame(g));
  if (g.inventory[0].condition !== '양호') {
    r = execute(g, { type: 'repair', id: i.id });
    assert.ok(r.ok);
    assert.equal(r.game.inventory[0].valuationReference, ref);
    assert.ok(r.game.inventory[0].value <= ref! * 3);
  }
  const bad = structuredClone(g);
  bad.inventory[0].valuationReference = 101;
  assert.equal(isGame(bad), false);
});
