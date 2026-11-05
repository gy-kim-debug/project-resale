import { createSettlementPreview } from '../src/app/settlementPreview';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { newGame, execute } from '../src/domain/engine';
import {
  enableStory,
  storyLines,
  storyChoices,
  afterAction,
} from '../src/domain/story';
import { interestAmount, mandatoryPrincipal } from '../src/domain/debt';
import { isGame } from '../src/storage/validation';
import { parseSave } from '../src/storage/saveRepository';
import { SETTLEMENT_EVENTS } from '../src/content/settlementEvents';
import { settlementReceipt } from '../src/domain/settlementEvents';
import { SettlementStage } from '../src/components/SettlementStage';
import { DEFAULT_PLAYER } from '../src/content/player';
import { ACTION_TICK, dayOf } from '../src/domain/game';
import type { Game, Command } from '../src/domain/game';
function run(g: Game, c: Command) {
  const r = execute(g, c);
  assert.ok(r.ok, r.message);
  assert.ok(isGame(r.game));
  return r.game;
}
function settle(g: Game) {
  g = run(g, { type: 'startSettlement' });
  g = run(g, { type: 'repay', amount: mandatoryPrincipal(g) });
  const before = structuredClone(g);
  return { before, g: run(g, { type: 'payInterest' }) };
}
function skip(g: Game) {
  while (g.story!.active!.step < storyLines(g).length - 1)
    g = run(g, { type: 'storyNext' });
  return g;
}
function close(g: Game, reply: 'ask' | 'end' = 'end') {
  g = skip(g);
  g = run(g, { type: 'storyChoice', choice: reply });
  g = skip(g);
  return run(g, { type: 'storyChoice', choice: 'continue' });
}
const initial = () => {
  const g = enableStory(newGame(42));
  g.cash = 100000000;
  g.stats.peakCash = g.cash;
  return g;
};
test('every paid week starts exactly one event before cooldown and its receipt records actual amounts', () => {
  let g = initial();
  for (let week = 1; week <= 5; week++) {
    g.minute += 20 * ACTION_TICK;
    g.weekActions = 20;
    g.marketDay = dayOf(g);
    g.story!.lastAt = g.minute;
    const paid = settle(g);
    g = paid.g;
    assert.equal(g.story!.active!.kind, 'weekly');
    assert.equal(g.story!.lastSettlementWeek, week);
    assert.equal(g.interestWeek, week);
    assert.equal(g.weekActions, 0);
    const receipt = g.story!.active!.settlement!;
    assert.equal(receipt.week, week);
    assert.equal(receipt.principalPaid, paid.before.principalRepaidThisWeek);
    assert.equal(receipt.interestPaid, interestAmount(paid.before));
    assert.equal(receipt.remainingPrincipal, g.principal);
    assert.equal(receipt.cash, g.cash);
    const snapshot = structuredClone(g);
    g = close(g, week % 2 ? 'ask' : 'end');
    for (const key of [
      'cash',
      'principal',
      'seed',
      'minute',
      'weekActions',
      'stats',
      'board',
      'inventory',
    ] as const)
      assert.deepEqual(g[key], snapshot[key]);
    assert.equal(g.story!.history.filter((k) => k === 'weekly').length, week);
    assert.equal(g.story!.active, null);
    const beforeAgain = structuredClone(g);
    afterAction(g, { type: 'payInterest' }, paid.before);
    assert.deepEqual(g, beforeAgain);
  }
});
test('partial principal payments and failed settlement never produce a paid event; final payoff prefers ending', () => {
  let g = initial();
  g = run(g, { type: 'repay', amount: 100 });
  assert.notEqual(g.story!.active?.kind, 'weekly');
  const poor = initial();
  poor.cash = 0;
  const failed = execute(poor, { type: 'startSettlement' });
  assert.ok(failed.ok);
  assert.equal(failed.game.status, 'bankrupt');
  assert.equal(failed.game.story!.active!.kind, 'failure');
  assert.equal(failed.game.story!.lastSettlementWeek, undefined);
  const final = initial();
  final.principal = 100;
  const cleared = run(final, { type: 'repay', amount: 100 });
  assert.equal(cleared.story!.active!.kind, 'success');
  assert.equal(cleared.story!.lastSettlementWeek, undefined);
});
test('prepayments and business receipts remain exact; adding story changes no payment or generation RNG', () => {
  let g = initial();
  g = run(g, { type: 'repay', amount: 1000000 });
  g = run(g, { type: 'startSettlement' });
  const before = structuredClone(g);
  const plain = structuredClone(g);
  delete plain.story;
  const expected = execute(plain, { type: 'payInterest' });
  assert.ok(expected.ok);
  const paid = run(g, { type: 'payInterest' });
  assert.equal(paid.story!.active!.settlement!.principalPaid, 1000000);
  for (const key of [
    'cash',
    'principal',
    'seed',
    'minute',
    'weekActions',
    'stats',
    'board',
    'inventory',
    'logs',
  ] as const)
    assert.deepEqual(paid[key], expected.game[key]);
  assert.equal(paid.cash, before.cash - interestAmount(before));
});
test('all themes have authored content and every camera renders custom character and receipt without side effects', () => {
  const { g } = settle(initial());
  const receipt = g.story!.active!.settlement!;
  for (const theme of Object.keys(
    SETTLEMENT_EVENTS,
  ) as (keyof typeof SETTLEMENT_EVENTS)[]) {
    g.story!.active!.settlement = { ...receipt, theme };
    const original = structuredClone(g);
    assert.equal(storyLines(g).length, 4);
    for (const step of [0, 1, 3]) {
      const html = renderToStaticMarkup(
        createElement(SettlementStage, {
          receipt: g.story!.active!.settlement,
          appearance: {
            ...DEFAULT_PLAYER.appearance,
            avatar: 'female',
            clothing: 'dress',
          },
          step,
          replying: false,
        }),
      );
      assert.ok(html.includes('viewBox="0 0 240 128"'));
      if (step === 1) assert.ok(html.includes('납부 완료'));
      else assert.ok(html.includes('data-avatar="female"'));
    }
    assert.deepEqual(g, original);
  }
});
test('both choices produce spoken replies and survive reload at every line without replaying repayment', () => {
  for (const reply of ['ask', 'end'] as const) {
    let { g } = settle(initial());
    g = skip(g);
    assert.deepEqual(
      storyChoices(g).map((c) => c.id),
      ['ask', 'end'],
    );
    g = run(g, { type: 'storyChoice', choice: reply });
    assert.equal(g.story!.active!.step, 0);
    assert.equal(g.story!.active!.weeklyReply, reply);
    const fixed = structuredClone(g);
    for (let n = 0; n < 3; n++) {
      g = parseSave({ version: 2, game: g, favoriteIds: [] }).game;
      assert.equal(g.story!.active!.step, n);
      assert.notEqual(
        storyLines(g)[n].text,
        reply === 'ask' ? '다음 주 납부액을 묻는다' : '통화를 마친다',
      );
      if (n < 2) g = run(g, { type: 'storyNext' });
    }
    g = run(g, { type: 'storyChoice', choice: 'continue' });
    assert.equal(g.story!.active, null);
    for (const key of ['cash', 'principal', 'seed', 'minute', 'stats'] as const)
      assert.deepEqual(g[key], fixed[key]);
    assert.equal(execute(g, { type: 'payInterest' }).ok, false);
  }
});
test('receipt and weekly history corruption reject imports; old saves without weekly fields still load', () => {
  const { g } = settle(initial());
  assert.ok(isGame(g));
  for (const change of [
    (x: Game) => {
      x.story!.active!.settlement!.week = 0;
    },
    (x: Game) => {
      x.story!.active!.settlement!.interestPaid = 101;
    },
    (x: Game) => {
      x.story!.active!.settlement!.remainingPrincipal = 100;
    },
    (x: Game) => {
      x.story!.active!.settlement!.theme = 'bad' as never;
    },
    (x: Game) => {
      x.story!.lastSettlementWeek = 20;
    },
    (x: Game) => {
      x.story!.active!.weeklyReply = 'bad' as never;
    },
  ]) {
    const bad = structuredClone(g);
    change(bad);
    assert.equal(isGame(bad), false);
  }
  const old = initial();
  assert.equal(old.story!.lastSettlementWeek, undefined);
  assert.deepEqual(
    parseSave({ version: 2, game: old, favoriteIds: [] }).game,
    old,
  );
  const before = structuredClone(g);
  before.interestWeek = 1;
  const rich = structuredClone(before);
  rich.interestWeek = 2;
  rich.cash = 100000000;
  rich.businessIncomeAmount = 5000;
  assert.equal(settlementReceipt(rich, before).theme, 'business');
  rich.principal = 5000000000;
  assert.equal(settlementReceipt(rich, before).theme, 'halfway');
  rich.principal = 1000000000;
  assert.equal(settlementReceipt(rich, before).theme, 'near');
});

test('detached preview themes and weeks simulate valid real payments without reading a live save', () => {
  for (const theme of Object.keys(
    SETTLEMENT_EVENTS,
  ) as (keyof typeof SETTLEMENT_EVENTS)[])
    for (const week of [1, 4, 12]) {
      const g = createSettlementPreview(undefined, theme, week);
      assert.ok(isGame(g));
      assert.equal(g.story!.active!.kind, 'weekly');
      assert.equal(g.story!.active!.settlement!.theme, theme);
      assert.equal(g.story!.active!.settlement!.week, week);
    }
  assert.throws(() => createSettlementPreview(undefined, undefined, 0));
  assert.throws(() => createSettlementPreview(undefined, 'unknown' as never));
});
