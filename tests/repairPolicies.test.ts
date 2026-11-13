import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MARKET_PRODUCTS } from '../src/content/marketProducts';
import {
  PRODUCT_CATEGORIES,
  type ProductCategory,
} from '../src/content/productCategories';
import {
  REPAIR_MODES,
  CATEGORY_REPAIR_MODE,
} from '../src/content/repairPolicies';
import { repairMode } from '../src/domain/repairPolicy';
import {
  assignGrade,
  canAttemptRepair,
  canRepair,
  visibleItemDescription,
} from '../src/domain/conditionGrades';
import { newGame, execute, repairCost } from '../src/domain/engine';
import { OwnedView } from '../src/components/GameViews';
import { parseSave } from '../src/storage/saveRepository';
import type { Game, Item } from '../src/domain/game';

function sample(title = '탁상 조명', category: ProductCategory = 'lighting') {
  const g = newGame(42);
  g.cash = 1_000_000;
  g.stats.peakCash = g.cash;
  g.seed = 0;
  g.story = undefined;
  const i = g.board.shift()!;
  Object.assign(i, {
    title,
    category,
    kind: '생활',
    base: 100_000,
    valuationReference: 100_000,
    acquiredFor: 50_000,
  });
  assignGrade(i, 0.8, 0.5, 0.9);
  i.checked = true;
  g.inventory = [i];
  return { g, i };
}
const mode = (
  title: string,
  category: ProductCategory,
  kind: Item['kind'] = PRODUCT_CATEGORIES[category].kind,
) => repairMode({ title, category, kind });
const html = (g: Game, item: Item) =>
  renderToStaticMarkup(
    createElement(OwnedView, {
      g,
      item,
      act: async () => true,
      open: () => {},
    }),
  );

test('every current category and catalogue product has a deterministic content policy without adding save flags', () => {
  assert.deepEqual(
    Object.keys(CATEGORY_REPAIR_MODE).sort(),
    Object.keys(PRODUCT_CATEGORIES).sort(),
  );
  const modes = new Set<string>();
  for (const p of Object.values(MARKET_PRODUCTS).flat()) {
    const copy = structuredClone(p),
      selected = repairMode(p);
    assert.ok(Object.hasOwn(REPAIR_MODES, selected));
    modes.add(selected);
    assert.equal(repairMode(structuredClone(p)), selected);
    assert.deepEqual(p, copy);
  }
  assert.ok(
    modes.has('none') && modes.has('electronics') && modes.has('building'),
  );
});
test('mixed categories distinguish parts and structures from completeness, land and raw gems', () => {
  for (const [title, cat] of [
    ['보드게임 묶음', 'hobby'],
    ['LP 레코드 묶음', 'hobby'],
    ['문학 전집', 'books'],
    ['도심 외곽 토지', 'land'],
    ['대로변 부지', 'land'],
    ['천연 다이아몬드', 'jewelry'],
    ['희귀 우표 컬렉션', 'rareCollections'],
    ['덤벨 세트', 'sport'],
  ] as const)
    assert.equal(mode(title, cat), 'none', title);
  for (const [title, cat] of [
    ['빈티지 라디오', 'hobby'],
    ['소장 피규어', 'hobby'],
    ['만년필', 'books'],
    ['휴대용 타자기', 'books'],
    ['소형 물류창고', 'land'],
    ['희귀 보석 목걸이', 'jewelry'],
    ['역사적 악기 컬렉션', 'rareCollections'],
    ['조립 데스크톱', 'computers'],
    ['일렉트릭 기타', 'guitars'],
  ] as const)
    assert.notEqual(mode(title, cat), 'none', title);
});
test('catalogue lookup supports missing old categories while unknown legacy assets keep kind-based repair behavior', () => {
  assert.equal(repairMode({ title: '문학 전집', kind: '생활' }), 'none');
  assert.equal(
    repairMode({ title: '소형 물류창고', kind: '부동산' }),
    'building',
  );
  assert.equal(
    repairMode({ title: '오래된 알 수 없는 생활 물건', kind: '생활' }),
    'general',
  );
  assert.equal(repairMode({ title: '__proto__', kind: '생활' }), 'general');
});
test('grade eligibility stays separate from structural eligibility, while appraisal and one-attempt gates remain', () => {
  const a = sample(),
    b = sample('문학 전집', 'books');
  assert.equal(canAttemptRepair(a.i), true);
  assert.equal(canAttemptRepair(b.i), true);
  assert.equal(canRepair(a.i), true);
  assert.equal(canRepair(b.i), false);
  assert.equal(repairCost(a.i), repairCost(b.i));
  for (const { i } of [a, b]) {
    i.checked = false;
    assert.equal(canAttemptRepair(i), false);
    i.checked = true;
    i.repaired = true;
    assert.equal(canAttemptRepair(i), false);
    i.repaired = false;
    for (const draw of [0, 0.02, 0.1, 0.99]) {
      assignGrade(i, draw, 0.5, 0.9);
      assert.equal(canAttemptRepair(i), false);
    }
  }
});
test('unsupported work is a no-op rejection: no money, action, seed, XP, logs or attempt consumed, including repeated clicks', () => {
  const { g, i } = sample('문학 전집', 'books');
  const before = structuredClone(g);
  for (let n = 0; n < 3; n++) {
    const r = execute(g, { type: 'repair', id: i.id });
    assert.equal(r.ok, false);
    assert.strictEqual(r.game, g);
    assert.equal(r.message, '작업을 진행하지 못했습니다.');
    assert.deepEqual(g, before);
    assert.equal(canAttemptRepair(i), true);
  }
  g.cash = 0;
  const r = execute(g, { type: 'repair', id: i.id });
  assert.equal(r.ok, false);
  assert.strictEqual(r.game, g);
  assert.equal(i.repaired, false);
});
test('supported repair retains cost, success ceiling, XP, no-action behavior, authenticity and retry prevention', () => {
  const { g, i } = sample();
  const before = structuredClone(g);
  const fee = repairCost(i);
  const r = execute(g, { type: 'repair', id: i.id });
  assert.equal(r.ok, true, r.message);
  const after = r.game.inventory[0];
  assert.equal(after.stateGrade, 'A');
  assert.equal(after.repaired, true);
  assert.equal(r.game.cash, g.cash - fee);
  assert.equal(r.game.weekActions, g.weekActions);
  assert.equal(r.game.minute, g.minute);
  assert.equal(r.game.stats.repairs, g.stats.repairs + 1);
  assert.equal(r.game.marketExperience!.street, 4);
  assert.deepEqual(after.listing, i.listing);
  assert.deepEqual(g, before);
  const repeat = execute(r.game, { type: 'repair', id: i.id });
  assert.equal(repeat.ok, false);
  assert.strictEqual(repeat.game, r.game);
});
test('owned UI omits unsupported repair panels and never renders internal modes or outcome forecasts', () => {
  for (const { g, i } of [sample(), sample('문학 전집', 'books')]) {
    const markup = html(g, i);
    if (canRepair(i)) {
      assert.match(markup, />수리하기<\/button>/);
      assert.match(markup, /비용.*10,000/);
    } else {
      assert.doesNotMatch(markup, />수리하기<\/button>|비용.*10,000/);
    }
    assert.doesNotMatch(
      markup,
      /수리 가능합니다|수리 대상|수리할 수 없는|성공률|성공 시|repairMode|repairable/,
    );
  }
});
test('old appraisal descriptions cannot promise repair availability and backup reads preserve original state', () => {
  const { g, i } = sample('문학 전집', 'books');
  i.defect =
    '기능이나 구조에 문제가 있으나 수리 가능합니다. 복구 후에도 마모와 변형이 남습니다.';
  const before = structuredClone(g);
  assert.doesNotMatch(visibleItemDescription(i), /수리 가능|복구 후/);
  assert.deepEqual(g, before);
  const restored = parseSave({ version: 2, game: g, favoriteIds: [] }).game;
  assert.equal(restored.inventory[0].defect, i.defect);
  assert.equal(canRepair(restored.inventory[0]), false);
  assert.equal(canAttemptRepair(restored.inventory[0]), true);
});
