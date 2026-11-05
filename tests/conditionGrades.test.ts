import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  GRADES,
  GRADE_DISTRIBUTIONS,
  REPAIR_RULES,
} from '../src/content/conditionGrades';
import { MARKETS } from '../src/content/markets';
import {
  assignGrade,
  gradeDraw,
  canRepair,
  gradedValue,
  repairChance,
  marketSkillLevel,
  marketProgress,
  gainMarketExperience,
} from '../src/domain/conditionGrades';
import { newGame, execute, repairCost } from '../src/domain/engine';
import { parseSave } from '../src/storage/saveRepository';
import { isGame } from '../src/storage/validation';
import { instantSalePrice } from '../src/domain/instantSale';
import { AppraisalResult } from '../src/components/AppraisalResult';
import type { Game, Item } from '../src/domain/game';
const sample = (grade: 'B' | 'C' | 'F' = 'C') => {
  const g = newGame(42);
  g.cash = 10000000;
  g.stats.peakCash = g.cash;
  const i = g.board.shift()!;
  i.base = 100000;
  i.valuationReference = 100000;
  i.acquiredFor = 50000;
  assignGrade(i, grade === 'B' ? 0.4 : grade === 'C' ? 0.8 : 0.99, 0.5, 0.9);
  i.checked = true;
  g.inventory = [i];
  return { g, i };
};
function seedFor(
  first: (x: number) => boolean,
  second: (x: number) => boolean,
) {
  for (let seed = 0; seed < 1000000; seed += 17) {
    const a = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    const b = (Math.imul(1664525, a) + 1013904223) >>> 0;
    if (first(a / 4294967296) && second(b / 4294967296)) return seed;
  }
  throw Error('No seed');
}
test('all three grade distributions have exact weights and preserve the six ordered states', () => {
  for (const key of Object.keys(
    GRADE_DISTRIBUTIONS,
  ) as (keyof typeof GRADE_DISTRIBUTIONS)[]) {
    const count = Object.fromEntries(GRADES.map((g) => [g, 0]));
    for (let n = 0; n < 10000; n++) count[gradeDraw((n + 0.5) / 10000, key)]++;
    GRADES.forEach((g, n) =>
      assert.equal(count[g], GRADE_DISTRIBUTIONS[key][n] * 100),
    );
  }
});
test('graded values replace old condition multipliers, cap all bonuses, and F overrides rarity', () => {
  const { i } = sample();
  for (const [n, value] of [
    150000, 125000, 110000, 100000, 60000, 0,
  ].entries()) {
    assert.equal(gradedValue(i, GRADES[n]), value);
  }
  i.base = 300000;
  assert.equal(gradedValue(i, 'SSS'), 300000);
  assert.equal(gradedValue(i, 'F'), 0);
});
test('difficulty is generated independently of grade, concealed until appraisal, and stable through backup', () => {
  for (const market of MARKETS) {
    const g = newGame(21),
      item = g.board.find((i) => i.marketId === market.id)!;
    const copy = structuredClone(item);
    assert.ok(item.stateGrade);
    assert.equal(
      renderToStaticMarkup(createElement(AppraisalResult, { g, item })),
      '',
    );
    const roundtrip = parseSave({ version: 2, game: g, favoriteIds: [] }).game;
    assert.deepEqual(
      roundtrip.board.find((i) => i.id === item.id),
      copy,
    );
    assert.deepEqual(g, newGame(21));
  }
  const { i } = sample();
  const seen = new Set();
  for (let n = 0; n < 3; n++) {
    assignGrade(i, 0.8, (n + 0.5) / 3, 0.8);
    seen.add(i.repairDifficulty);
    assert.equal(i.stateGrade, 'C');
  }
  assert.equal(seen.size, 3);
});
test('market-specific growth uses cumulative thresholds, grants no cross-market or shared repair bonus, caps at Lv10', () => {
  const { g, i } = sample();
  g.stats.repairs = 1000;
  assert.equal(repairChance(g, i), 60);
  gainMarketExperience(g, { marketId: 'computers' }, 50);
  assert.equal(marketSkillLevel(g, 'computers'), 2);
  assert.equal(marketSkillLevel(g, 'street'), 0);
  gainMarketExperience(g, i, 20);
  assert.equal(repairChance(g, i), 62);
  assert.deepEqual(marketProgress(g, 'street'), {
    level: 1,
    current: 0,
    next: 30,
  });
  gainMarketExperience(g, i, 10000);
  assert.equal(g.marketExperience!.street, 650);
  i.repairDifficulty = 'easy';
  assert.equal(repairChance(g, i), 95);
  i.repairDifficulty = 'hard';
  assert.equal(repairChance(g, i), 50);
});
test('success consumes quote, no actions, repairs at most to the fixed ceiling, grants four XP and disallows retries', () => {
  for (const ceiling of ['A', 'B'] as const) {
    const { g, i } = sample();
    i.repairCeiling = ceiling;
    g.seed = seedFor(
      (x) => x < 0.6,
      () => true,
    );
    const before = structuredClone(g),
      fee = repairCost(i);
    const r = execute(g, { type: 'repair', id: i.id });
    assert.ok(r.ok, r.message);
    assert.equal(r.game.inventory[0].stateGrade, ceiling);
    assert.equal(r.game.cash, g.cash - fee);
    assert.equal(r.game.marketExperience!.street, 4);
    assert.equal(r.game.weekActions, g.weekActions);
    assert.equal(r.game.minute, g.minute);
    assert.equal(execute(r.game, { type: 'repair', id: i.id }).ok, false);
    assert.deepEqual(g, before);
    assert.ok(isGame(r.game));
  }
});
test('failed repair spends quoted fee, gives two XP, and preserves grade or degrades exactly one step', () => {
  for (const degrade of [true, false])
    for (const grade of ['B', 'C'] as const) {
      const { g, i } = sample(grade);
      g.seed = seedFor(
        (x) => x >= 0.6,
        (x) => (degrade ? x < 0.2 : x >= 0.2),
      );
      const r = execute(g, { type: 'repair', id: i.id });
      assert.ok(r.ok, r.message);
      assert.equal(
        r.game.inventory[0].stateGrade,
        degrade ? (grade === 'B' ? 'C' : 'F') : grade,
      );
      assert.equal(r.game.cash, g.cash - 10000);
      assert.equal(r.game.marketExperience!.street, 2);
      assert.equal(r.game.weekActions, g.weekActions);
      assert.equal(execute(r.game, { type: 'repair', id: i.id }).ok, false);
      assert.ok(isGame(r.game));
      assert.deepEqual(
        parseSave({ version: 2, game: r.game, favoriteIds: [] }).game,
        r.game,
      );
    }
});
test('all repair fees use the B reference, not purchase, rarity or actual value; no cost discount from skill', () => {
  const { g, i } = sample();
  i.base = 300000;
  i.acquiredFor = 100;
  i.value = 180000;
  for (const d of ['easy', 'normal', 'hard'] as const) {
    i.repairDifficulty = d;
    assert.equal(repairCost(i), 1000 * REPAIR_RULES[d].cost);
  }
  g.marketExperience = { street: 650 };
  assert.equal(repairCost(i), 15000);
});
test('F cannot be repaired or sold through any sale command and disposal is free with no XP', () => {
  const { g, i } = sample('F');
  assert.equal(instantSalePrice(i), 0);
  assert.equal(canRepair(i), false);
  for (const command of [
    { type: 'repair', id: i.id },
    { type: 'post', id: i.id, price: 100 },
    { type: 'outletSell', id: i.id },
  ] as const) {
    const r = execute(g, command);
    assert.equal(r.ok, false);
    assert.strictEqual(r.game, g);
  }
  const r = execute(g, { type: 'discard', id: i.id });
  assert.ok(r.ok);
  assert.equal(r.game.inventory.length, 0);
  assert.equal(r.game.cash, g.cash);
  assert.equal(r.game.minute, g.minute);
  assert.equal(r.game.marketExperience, undefined);
});
test('registered items cannot be repaired, including direct command invocation', () => {
  const { g, i } = sample('B');
  const posted = execute(g, { type: 'post', id: i.id, price: 100000 });
  assert.ok(posted.ok);
  const result = execute(posted.game, { type: 'repair', id: i.id });
  assert.equal(result.ok, false);
  assert.strictEqual(result.game, posted.game);
});
test('check gives two XP once and instant sale gives none', () => {
  const { g, i } = sample('B');
  i.checked = false;
  const checked = execute(g, { type: 'check', id: i.id });
  assert.ok(checked.ok);
  assert.equal(checked.game.marketExperience!.street, 2);
  assert.equal(execute(checked.game, { type: 'check', id: i.id }).ok, false);
  const sold = execute(checked.game, { type: 'outletSell', id: i.id });
  assert.ok(sold.ok);
  assert.equal(sold.game.marketExperience!.street, 2);
});
test('paid purchase and completed marketplace sale award XP to the original market exactly once', () => {
  let g = newGame(42);
  const item = g.board.find(
    (i) => i.marketId === 'computers' && i.stateGrade !== 'F',
  )!;
  g.cash = 100000000;
  g.stats.peakCash = g.cash;
  const buy = execute(g, { type: 'buy', id: item.id });
  assert.ok(buy.ok);
  g = buy.game;
  assert.equal(g.marketExperience!.computers, 2);
  assert.equal(execute(g, { type: 'buy', id: item.id }).ok, false);
  g.sales = [
    {
      id: 'sale',
      itemId: item.id,
      marketId: 'street',
      price: 1000000,
      created: 0,
      expires: 100000,
      nextCheck: 100000,
    },
  ];
  g.inquiries = [
    {
      id: 'buyer',
      saleId: 'sale',
      name: '구매자',
      price: 1000000,
      max: 1000000,
      rounds: 0,
    },
  ];
  const sale = execute(g, { type: 'accept', id: 'buyer' });
  assert.ok(sale.ok, sale.message);
  assert.equal(sale.game.marketExperience!.computers, 4);
  assert.equal(sale.game.marketExperience!.street, undefined);
  assert.equal(execute(sale.game, { type: 'accept', id: 'buyer' }).ok, false);
});
test('legacy items preserve value, price, condition and old repair history through import and appraisal', () => {
  const { g, i } = sample('B');
  delete i.stateGrade;
  delete i.repairDifficulty;
  delete i.repairCeiling;
  i.value = 73100;
  i.repaired = true;
  i.checked = false;
  const original = structuredClone(g);
  const loaded = parseSave({ version: 2, game: g, favoriteIds: [] }).game;
  assert.deepEqual(loaded.inventory, g.inventory);
  const r = execute(loaded, { type: 'check', id: i.id });
  assert.ok(r.ok);
  assert.equal(r.game.inventory[0].value, 73100);
  assert.equal(r.game.inventory[0].repaired, true);
  assert.equal(r.game.inventory[0].stateGrade, undefined);
  assert.deepEqual(g, original);
});
test('invalid grade metadata and invalid market experience reject imports before replacing saves', () => {
  const { g } = sample();
  const corrupt = (change: (x: Game) => void) => {
    const bad = structuredClone(g);
    change(bad);
    assert.equal(isGame(bad), false);
  };
  corrupt((x) => {
    x.inventory[0].stateGrade = 'SS' as Item['stateGrade'];
  });
  corrupt((x) => {
    x.inventory[0].repairDifficulty = 'extreme' as Item['repairDifficulty'];
  });
  corrupt((x) => {
    delete x.inventory[0].valuationReference;
  });
  corrupt((x) => {
    x.marketExperience = { street: 651 };
  });
  corrupt((x) => {
    x.marketExperience = { street: -1 };
  });
  corrupt((x) => {
    x.marketExperience = { aircraft: 20 };
  });
});
