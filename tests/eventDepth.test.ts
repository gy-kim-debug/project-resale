import { MARKET_REFRESH_COUNT } from '../src/content/markets';
import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_KINDS } from '../src/content/story';
import { EVENT_VARIANTS } from '../src/content/eventScenes';
import { createEventPreview } from '../src/app/eventPreview';
import { execute } from '../src/domain/engine';
import { storyLines, storyChoices, afterAction } from '../src/domain/story';
import { isGame } from '../src/storage/validation';
import { parseSave } from '../src/storage/saveRepository';
import { ACTION_TICK, type Game } from '../src/domain/game';
function endLines(g: Game) {
  let next = g;
  while (
    next.story?.active &&
    next.story.active.step < storyLines(next).length - 1
  ) {
    const r = execute(next, { type: 'storyNext' });
    assert.equal(r.ok, true, r.message);
    next = r.game;
  }
  return next;
}
function choose(g: Game, id: string) {
  const r = execute(endLines(g), { type: 'storyChoice', choice: id });
  assert.equal(r.ok, true, r.message);
  assert.equal(isGame(r.game), true);
  return r.game;
}
function finishOutcome(g: Game) {
  if (!g.story?.active?.outcome) return g;
  return choose(g, 'continue');
}
const save = (g: Game) =>
  parseSave({ version: 2, game: g, favoriteIds: [] }).game;
test('18 events have 54 authored variants; every question and every final branch restores and validates', () => {
  assert.equal(EVENT_KINDS.length, 18);
  let variants = 0;
  for (const kind of EVENT_KINDS) {
    assert.equal(EVENT_VARIANTS[kind].length, 3);
    assert.equal(new Set(EVENT_VARIANTS[kind].map((x) => x[0])).size, 3);
    for (const variant of [0, 1, 2] as const) {
      variants++;
      const g = save(endLines(createEventPreview(kind, undefined, variant)));
      assert.equal(isGame(g), true, kind);
      const before = structuredClone(g);
      for (const question of storyChoices(g).filter((c) =>
        c.id.startsWith('ask:'),
      )) {
        const asked = choose(g, question.id);
        assert.equal(asked.seed, g.seed);
        assert.equal(asked.cash, g.cash);
        assert.equal(asked.minute, g.minute);
        assert.deepEqual(asked.stats, g.stats);
        const restored = save(endLines(asked));
        assert.ok(!storyChoices(restored).some((c) => c.id === question.id));
        assert.equal(
          execute(restored, { type: 'storyChoice', choice: question.id }).ok,
          false,
        );
      }
      for (const c of storyChoices(g).filter((c) => !c.id.startsWith('ask:'))) {
        let result = choose(g, c.id);
        result = save(result);
        if (result.story?.active?.outcome) {
          const paid = result.cash,
            used = result.weekActions;
          result = finishOutcome(result);
          assert.equal(result.cash, paid);
          assert.equal(result.weekActions, used);
          assert.equal(result.story!.active, null);
        }
        assert.deepEqual(g, before);
        assert.equal(isGame(result), true, kind + ':' + c.id);
      }
    }
  }
  assert.equal(variants, 54);
});
test('purchase conversations never expose hidden value, defects or authenticity, even after optional questions', () => {
  for (const kind of [
    'missing',
    'model',
    'memory',
    'rush',
    'appointment',
    'scam',
    'bundle',
  ] as const) {
    const original = createEventPreview(kind);
    const altered = structuredClone(original);
    for (const i of altered.board) {
      i.value = 999999900;
      i.base = 888888800;
      i.defect = 'SECRET';
      i.condition = '高額' as never;
      if (i.listing) i.listing.facts.authentic = !i.listing.facts.authentic;
    }
    assert.deepEqual(storyLines(original), storyLines(altered));
    for (const q of storyChoices(endLines(original)).filter((c) =>
      c.id.startsWith('ask:'),
    )) {
      const a = execute(endLines(original), {
        type: 'storyChoice',
        choice: q.id,
      });
      const b = execute(endLines(altered), {
        type: 'storyChoice',
        choice: q.id,
      });
      assert.equal(a.ok, true);
      assert.equal(b.ok, true);
      assert.deepEqual(storyLines(a.game), storyLines(b.game));
    }
  }
});
test('waiting is explicitly two actions and atomically rolls back when only one remains', () => {
  for (const kind of ['appointment', 'inspection'] as const) {
    const g = endLines(createEventPreview(kind));
    assert.equal(storyChoices(g).find((c) => c.id === 'wait')!.actions, 2);
    const result = choose(g, 'wait');
    assert.equal(result.weekActions, g.weekActions! + 2);
    assert.ok(result.story!.pending?.some((p) => p.kind === 'referral'));
    assert.ok(result.story!.active?.outcome);
    const poor = structuredClone(g);
    poor.weekActions = 19;
    poor.minute = 19 * ACTION_TICK;
    for (const i of poor.board) i.expires = poor.minute + 8 * ACTION_TICK;
    const refused = execute(poor, { type: 'storyChoice', choice: 'wait' });
    assert.equal(refused.ok, false);
    assert.deepEqual(refused.game, poor);
    const single = choose(poor, 'continue');
    assert.equal(single.weekActions, 20);
  }
});
test('reservation holds without money/actions; a later buyer returns with the locked quote and clears the listing exactly once', () => {
  const original = endLines(createEventPreview('reservation'));
  const quote = original.inquiries[0].price;
  let g = finishOutcome(choose(original, 'hold'));
  assert.equal(g.cash, original.cash);
  assert.equal(g.minute, original.minute);
  assert.equal(g.inquiries.length, 0);
  assert.equal(g.sales.length, 1);
  assert.equal(g.story!.pending![0].price, quote);
  for (let n = 0; n < 3; n++) {
    const r = execute(g, { type: 'wait' });
    assert.equal(r.ok, true, r.message);
    g = save(r.game);
  }
  assert.equal(g.story!.active!.kind, 'returnBuyer');
  assert.equal(g.story!.active!.price, quote);
  const cash = g.cash;
  g = choose(g, 'deal');
  assert.equal(g.cash, cash + quote);
  assert.equal(g.sales.length, 0);
  assert.equal(g.inventory.length, 0);
  assert.equal(execute(g, { type: 'storyChoice', choice: 'deal' }).ok, false);
  g = finishOutcome(save(g));
  assert.equal(g.cash, cash + quote);
  assert.equal(g.story!.pending!.length, 0);
});
test('memory purchase schedules previous-owner contact only while that same item is retained', () => {
  const original = endLines(createEventPreview('memory'));
  let g = finishOutcome(choose(original, 'continue'));
  const pending = g.story!.pending!.find((p) => p.kind === 'reunion')!;
  assert.ok(pending);
  assert.equal(pending.target, g.inventory[0].id);
  for (let n = 0; n < 3; n++) {
    const r = execute(g, { type: 'wait' });
    assert.equal(r.ok, true);
    g = r.game;
  }
  assert.equal(g.story!.active!.kind, 'reunion');
  assert.equal(g.story!.active!.target, pending.target);
  assert.equal(g.story!.active!.price, pending.price);
  assert.ok(g.story!.active!.price! <= (g.inventory[0].acquiredFor ?? 0));
  const gone = finishOutcome(choose(original, 'continue'));
  gone.inventory = [];
  gone.story!.lastAt = 0;
  gone.minute += 3 * ACTION_TICK;
  gone.weekActions! += 3;
  afterAction(gone, { type: 'wait' }, original);
  assert.ok(!gone.story!.pending!.some((p) => p.target === pending.target));
  assert.notEqual(gone.story!.active?.kind, 'reunion');
});
test('scam reporting removes only that listing, costs nothing, and its reaction cannot repeat the report', () => {
  const original = endLines(createEventPreview('scam'));
  const target = original.story!.active!.target;
  let g = choose(original, 'report');
  assert.equal(g.cash, original.cash);
  assert.equal(g.minute, original.minute);
  assert.equal(g.board.length, original.board.length - 1);
  assert.ok(!g.board.some((i) => i.id === target));
  assert.equal(g.story!.active!.outcome, 'reported');
  const count = g.logs.length;
  g = finishOutcome(g);
  assert.equal(g.logs.length, count);
});
test('market tips refresh only their named market for one action without cash, rare odds or old-item revaluation changes', () => {
  const original = endLines(createEventPreview('marketTip'));
  const others = original.board.filter((i) => i.marketId !== 'computers');
  const g = choose(original, 'look');
  assert.equal(g.cash, original.cash);
  assert.equal(g.weekActions, original.weekActions! + 1);
  assert.deepEqual(
    g.board.filter((i) => i.marketId !== 'computers'),
    others,
  );
  assert.equal(
    g.board.filter((i) => i.marketId === 'computers').length,
    original.board.filter((i) => i.marketId === 'computers').length +
      MARKET_REFRESH_COUNT,
  );
  for (const item of original.board)
    assert.deepEqual(
      g.board.find((i) => i.id === item.id),
      item,
    );
  assert.equal(g.story!.active!.outcome, 'discovered');
});
test('follow-up and branch corruption is rejected, and completed outcomes survive imports without paying again', () => {
  const g = choose(endLines(createEventPreview('reservation')), 'hold');
  for (const mutate of [
    (x: Game) => {
      x.story!.pending![0].price = 101;
    },
    (x: Game) => {
      x.story!.pending![0].variant = 8 as never;
    },
    (x: Game) => {
      x.story!.pending![0].kind = 'forged' as never;
    },
    (x: Game) => {
      x.story!.pending!.push(x.story!.pending![0]);
    },
    (x: Game) => {
      x.story!.active!.target = 'forged';
    },
  ]) {
    const bad = structuredClone(g);
    mutate(bad);
    assert.equal(isGame(bad), false);
  }
  const q = choose(endLines(createEventPreview('model')), 'ask:proof');
  const bad = structuredClone(q);
  bad.story!.active!.asked!.push('proof');
  assert.equal(isGame(bad), false);
  const cash = g.cash,
    actions = g.weekActions;
  const done = finishOutcome(save(g));
  assert.equal(done.cash, cash);
  assert.equal(done.weekActions, actions);
});

test('two-action waits retain exact ticks across day boundaries and remain loadable after weekly settlement', () => {
  let g = createEventPreview('appointment');
  g.weekActions = 17;
  g.minute = 17 * ACTION_TICK;
  for (const item of g.board) item.expires = g.minute + 8 * ACTION_TICK;
  g = finishOutcome(choose(g, 'wait'));
  assert.equal(g.weekActions, 19);
  assert.equal(g.minute, 19 * ACTION_TICK);
  let result = execute(g, { type: 'wait' });
  assert.equal(result.ok, true, result.message);
  g = save(result.game);
  assert.equal(g.weekActions, 20);
  assert.equal(g.minute, 20 * ACTION_TICK);
  for (const c of [
    { type: 'startSettlement' } as const,
    { type: 'repay', amount: 50000 } as const,
    { type: 'payInterest' } as const,
  ]) {
    result = execute(g, c);
    assert.equal(result.ok, true, result.message);
    g = save(result.game);
  }
  assert.equal(g.interestWeek, 1);
  assert.equal(g.weekActions, 0);
  assert.equal(g.minute, 20 * ACTION_TICK);
  assert.equal(isGame(g), true);
});

test('every event question uses spoken protagonist dialogue rather than its action label', () => {
  for (const kind of EVENT_KINDS)
    for (const variant of [0, 1, 2] as const) {
      const g = endLines(createEventPreview(kind, undefined, variant));
      for (const choice of storyChoices(g).filter((c) =>
        c.id.startsWith('ask:'),
      )) {
        const result = choose(g, choice.id);
        const lines = storyLines(result);
        assert.equal(lines[0].speaker, '주인공');
        assert.notEqual(lines[0].text, choice.label);
        assert.ok(/[?.!]$/.test(lines[0].text), lines[0].text);
        assert.equal(result.cash, g.cash);
        assert.equal(result.minute, g.minute);
        assert.equal(result.seed, g.seed);
        assert.deepEqual(storyLines(save(result)), lines);
      }
    }
});
test('each completed decision starts with the protagonist response, then the counterpart reaction, without replaying the transaction', () => {
  for (const kind of EVENT_KINDS) {
    const g = endLines(createEventPreview(kind));
    for (const choice of storyChoices(g).filter(
      (c) => !c.id.startsWith('ask:'),
    )) {
      const result = choose(g, choice.id);
      if (!result.story?.active?.outcome) continue;
      const lines = storyLines(result);
      assert.equal(lines.length, 2);
      assert.equal(lines[0].speaker, '주인공');
      assert.notEqual(lines[0].text, choice.label);
      assert.ok(lines[0].text.endsWith('.') || lines[0].text.endsWith('?'));
      const restored = save(result);
      assert.deepEqual(storyLines(restored), lines);
      const done = finishOutcome(restored);
      assert.equal(done.cash, result.cash);
      assert.equal(done.weekActions, result.weekActions);
    }
  }
});

test('question replies answer in the counterpart voice for payment concerns and settlement confirmation', () => {
  for (const variant of [0, 1, 2] as const) {
    const g = endLines(createEventPreview('scam', undefined, variant));
    const proof = choose(g, 'ask:proof');
    const reply = storyLines(proof)[1];
    assert.ok(!reply.text.includes('말만 돌아왔다'));
    assert.ok(reply.text.includes('입금') || reply.text.includes('계좌'));
    assert.notEqual(reply.speaker, '주인공');
  }
  const confirmed = choose(
    endLines(createEventPreview('creditor')),
    'ask:terms',
  );
  assert.ok(storyLines(confirmed)[1].text.includes('납부는 정상적으로 반영'));
});
