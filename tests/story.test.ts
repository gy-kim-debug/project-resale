import test from 'node:test';
import assert from 'node:assert/strict';
import { execute, newGame } from '../src/domain/engine';
import {
  enableStory,
  storyLines,
  storyChoices,
  beforeTrade,
  afterAction,
  type StoryScene,
} from '../src/domain/story';
import { isGame } from '../src/storage/validation';
import { ACTION_TICK, type Game } from '../src/domain/game';
import { parseSave } from '../src/storage/saveRepository';
function prepared() {
  const g = enableStory(newGame(7));
  g.minute = 3 * ACTION_TICK;
  g.weekActions = 3;
  g.cash = 100_000_000;
  g.stats.peakCash = g.cash;
  for (const i of g.board) i.expires = g.minute + 8 * ACTION_TICK;
  return g;
}
function attach(g: Game, s: StoryScene) {
  g.story!.active = s;
  s.step = storyLines(g).length - 1;
  return g;
}
function buyScene(kind: StoryScene['kind']) {
  const g = prepared();
  const i = g.board.find((x) => x.marketId === 'street' && x.price > 0)!;
  const extra = g.board.find(
    (x) => x.marketId === 'street' && x.price > 0 && x.id !== i.id,
  )!;
  return attach(g, {
    kind,
    step: 0,
    target: i.id,
    extra: kind === 'bundle' ? extra.id : undefined,
    price:
      kind === 'bundle'
        ? Math.round(
            (((i.negotiatedPrice ?? i.price) +
              (extra.negotiatedPrice ?? extra.price)) *
              0.95) /
              100,
          ) * 100
        : Math.max(100, Math.round((i.price * 0.9) / 100) * 100),
    name: i.seller,
    resume: { type: 'buy', id: i.id },
  });
}
test('intro advances and restores each beat without money, actions or RNG changes', () => {
  let g = enableStory(newGame(1), true);
  const original = structuredClone(g);
  assert.equal(isGame(g), true);
  assert.equal(execute(g, { type: 'wait' }).ok, false);
  while (g.story!.active!.step < storyLines(g).length - 1) {
    const r = execute(g, { type: 'storyNext' });
    assert.equal(r.ok, true);
    g = parseSave({ version: 2, game: r.game, favoriteIds: [] }).game;
  }
  g = execute(g, { type: 'storyChoice', choice: 'continue' }).game;
  assert.equal(g.story!.active, null);
  for (const key of ['cash', 'minute', 'seed', 'weekActions'] as const)
    assert.equal(g[key], original[key]);
  assert.equal(
    execute(g, { type: 'storyChoice', choice: 'continue' }).ok,
    false,
  );
});
test('trade events are deterministic, diverse, cooldown-limited and never consume economic RNG', () => {
  const found = new Set<string>();
  const g = prepared();
  g.story!.contacts = g.board.map((i) => i.seller);
  const item = g.board.find((i) => i.marketId === 'street' && i.price > 0)!;
  for (let n = 1; n < 3000; n++) {
    g.seed = n;
    const before = structuredClone(g);
    const s = beforeTrade(g, { type: 'buy', id: item.id });
    assert.deepEqual(g, before);
    assert.deepEqual(s, beforeTrade(g, { type: 'buy', id: item.id }));
    if (s) found.add(s.kind);
  }
  assert.deepEqual([...found].sort(), [
    'bundle',
    'memory',
    'missing',
    'model',
    'regular',
  ]);
  g.story!.lastAt = g.minute;
  assert.equal(beforeTrade(g, { type: 'buy', id: item.id }), null);
});
test('trigger pauses before payment; cancellation costs nothing and cannot reroll', () => {
  let g = buyScene('missing');
  g.story!.active = null;
  let id = '';
  for (let seed = 1; seed < 5000; seed++) {
    g.seed = seed;
    const item = g.board.find((i) => i.marketId === 'street' && i.price > 0)!;
    id = item.id;
    if (beforeTrade(g, { type: 'buy', id })) break;
  }
  const r = execute(g, { type: 'buy', id });
  assert.equal(r.ok, true);
  assert.ok(r.game.story!.active);
  assert.equal(r.game.cash, g.cash);
  assert.equal(r.game.minute, g.minute);
  assert.equal(r.game.seed, g.seed);
  g = r.game;
  g.story!.active!.step = storyLines(g).length - 1;
  const cancelled = execute(g, { type: 'storyChoice', choice: 'cancel' });
  assert.equal(cancelled.ok, true);
  assert.equal(cancelled.game.cash, g.cash);
  assert.equal(cancelled.game.weekActions, g.weekActions);
  assert.equal(beforeTrade(cancelled.game, { type: 'buy', id }), null);
});
test('missing-component discount purchases once; failure preserves unresolved event', () => {
  const g = buyScene('missing');
  const price = g.story!.active!.price!;
  const id = g.story!.active!.target!;
  const poor = structuredClone(g);
  poor.cash = 0;
  const no = execute(poor, { type: 'storyChoice', choice: 'deal' });
  assert.equal(no.ok, false);
  assert.deepEqual(no.game, poor);
  const r = execute(g, { type: 'storyChoice', choice: 'deal' });
  assert.equal(r.ok, true);
  assert.equal(r.game.cash, g.cash - price);
  assert.equal(r.game.weekActions, g.weekActions! + 1);
  assert.equal(r.game.inventory.find((i) => i.id === id)!.acquiredFor, price);
  assert.equal(r.game.story!.active, null);
  assert.equal(isGame(r.game), true);
  assert.equal(
    execute(r.game, { type: 'storyChoice', choice: 'deal' }).ok,
    false,
  );
});
test('bundle purchases two distinct items for displayed total using one action', () => {
  const g = buyScene('bundle');
  const price = g.story!.active!.price!;
  assert.equal(isGame(g), true);
  const r = execute(g, { type: 'storyChoice', choice: 'deal' });
  assert.equal(r.ok, true, r.message);
  assert.equal(r.game.inventory.length, 2);
  assert.equal(r.game.stats.purchases, 2);
  assert.equal(r.game.cash, g.cash - price);
  assert.equal(r.game.weekActions, g.weekActions! + 1);
  assert.equal(
    r.game.inventory.reduce((n, i) => n + i.acquiredFor!, 0),
    price,
  );
  assert.equal(isGame(r.game), true);
  const single = execute(g, { type: 'storyChoice', choice: 'continue' });
  assert.equal(single.game.inventory.length, 1);
});
test('model explanations disclose no hidden value, have no cost, and cannot repeat', () => {
  const g = buyScene('model');
  const r = execute(g, { type: 'storyChoice', choice: 'explain' });
  assert.equal(r.ok, true);
  assert.equal(r.game.minute, g.minute);
  assert.equal(r.game.cash, g.cash);
  assert.equal(r.game.seed, g.seed);
  assert.equal(
    storyChoices(r.game).some((c) => c.id === 'explain'),
    false,
  );
  assert.equal(
    execute(r.game, { type: 'storyChoice', choice: 'explain' }).ok,
    false,
  );
  assert.equal(
    r.game.board.find((i) => i.id === g.story!.active!.target)!.checked,
    false,
  );
});
test('regular request persists and memory story can end with a normal purchase', () => {
  const g = buyScene('regular');
  const kind = g.board.find((i) => i.id === g.story!.active!.target)!.kind;
  const r = execute(g, { type: 'storyChoice', choice: 'request' });
  assert.equal(r.ok, true);
  assert.ok(r.game.story!.requests.includes(kind));
  assert.equal(isGame(r.game), true);
  const m = execute(buyScene('memory'), {
    type: 'storyChoice',
    choice: 'continue',
  });
  assert.equal(m.ok, true);
  assert.equal(m.game.inventory.length, 1);
});
function inquiryScene() {
  const g = prepared();
  const i = g.board[0];
  g.board.shift();
  i.acquiredFor = 1000;
  g.inventory.push(i);
  g.sales.push({
    id: 'sale',
    itemId: i.id,
    price: 10000,
    created: g.minute,
    expires: g.minute + 5000,
    nextCheck: g.minute + 5000,
  });
  g.inquiries.push({
    id: 'buyer',
    saleId: 'sale',
    name: '구매자',
    price: 10000,
    max: 12000,
    rounds: 0,
  });
  return attach(g, {
    kind: 'rehaggle',
    step: 0,
    target: 'buyer',
    price: 9000,
    name: '구매자',
    resume: { type: 'accept', id: 'buyer' },
  });
}
test('buyer can accept lower or original price; cancelling leaves listing active', () => {
  const g = inquiryScene();
  assert.equal(isGame(g), true);
  for (const [choice, price] of [
    ['deal', 9000],
    ['continue', 10000],
  ] as const) {
    const r = execute(g, { type: 'storyChoice', choice });
    assert.equal(r.ok, true);
    assert.equal(r.game.cash, g.cash + price);
    assert.equal(r.game.inventory.length, 0);
    assert.equal(r.game.weekActions, g.weekActions! + 1);
    assert.equal(isGame(r.game), true);
  }
  const r = execute(g, { type: 'storyChoice', choice: 'cancel' });
  assert.equal(r.ok, true);
  assert.equal(r.game.sales.length, 1);
  assert.equal(r.game.inventory.length, 1);
  assert.equal(r.game.inquiries.length, 0);
  assert.equal(r.game.minute, g.minute);
});
test('competitor pays exact proposal once, without altering hidden item valuation', () => {
  const g = inquiryScene();
  g.inquiries = [];
  g.sales = [];
  attach(g, {
    kind: 'competitor',
    step: 0,
    target: g.inventory[0].id,
    price: 7000,
  });
  const r = execute(g, { type: 'storyChoice', choice: 'deal' });
  assert.equal(r.ok, true);
  assert.equal(r.game.cash, g.cash + 7000);
  assert.equal(r.game.inventory.length, 0);
  assert.equal(r.game.weekActions, g.weekActions! + 1);
  assert.equal(isGame(r.game), true);
});
test('post-action creditor and terminal stories are condition-based and only end once', () => {
  const g = prepared(),
    before = structuredClone(g);
  g.interestWeek = 1;
  g.minute += 20 * ACTION_TICK;
  g.weekActions = 0;
  afterAction(g, { type: 'payInterest' }, before);
  assert.equal(g.story!.active!.kind, 'creditor');
  g.story!.active!.step = storyLines(g).length - 1;
  let r = execute(g, { type: 'storyChoice', choice: 'continue' });
  assert.equal(r.ok, true);
  assert.equal(r.game.story!.active, null);
  for (const status of ['cleared', 'bankrupt'] as const) {
    const over = prepared();
    over.status = status;
    if (status === 'cleared') over.principal = 0;
    afterAction(over, { type: 'repay', amount: 100 }, before);
    assert.equal(
      over.story!.active!.kind,
      status === 'cleared' ? 'success' : 'failure',
    );
    assert.equal(isGame(over), true);
    over.story!.active!.step = storyLines(over).length - 1;
    r = execute(over, { type: 'storyChoice', choice: 'continue' });
    assert.equal(r.ok, true);
    assert.equal(r.game.story!.endingDone, true);
    afterAction(r.game, { type: 'wait' }, over);
    assert.equal(r.game.story!.active, null);
  }
});
test('malformed scene saves and stale/wrong choices are rejected without mutations', () => {
  const g = buyScene('missing');
  for (const mutate of [
    (x: Game) => {
      x.story!.active!.step = 99;
    },
    (x: Game) => {
      x.story!.active!.target = 'unknown';
    },
    (x: Game) => {
      x.story!.active!.price = 101;
    },
    (x: Game) => {
      x.story!.active!.resume = {
        type: 'accept',
        id: x.story!.active!.target!,
      };
    },
  ]) {
    const bad = structuredClone(g);
    mutate(bad);
    assert.equal(isGame(bad), false);
  }
  assert.equal(execute(g, { type: 'storyChoice', choice: 'hacked' }).ok, false);
  const early = structuredClone(g);
  early.story!.active!.step = 0;
  assert.equal(
    execute(early, { type: 'storyChoice', choice: 'deal' }).ok,
    false,
  );
  assert.equal(isGame(newGame(1)), true);
});

test('conditional follow-ups use real contacts; competitor bulk targets exclude listed stock and settle atomically', () => {
  const original = prepared();
  const items = original.board.splice(0, 3);
  for (const i of items) {
    i.acquiredFor = 1000;
    i.value = 10000;
    original.inventory.push(i);
  }
  original.sales.push({
    id: 'keep-sale',
    itemId: items[2].id,
    price: 15000,
    created: original.minute,
    expires: original.minute + 5000,
    nextCheck: original.minute + 5000,
  });
  original.story!.contacts = [items[0].seller];
  const found = new Map<string, Game>();
  for (let seed = 1; seed < 500; seed++) {
    const g = structuredClone(original);
    g.seed = seed;
    g.minute += ACTION_TICK;
    g.weekActions!++;
    afterAction(g, { type: 'wait' }, original);
    if (g.story!.active) found.set(g.story!.active.kind, g);
    if (found.size === 2) break;
  }
  assert.ok(found.has('regular'));
  assert.ok(found.has('competitor'));
  const regular = found.get('regular')!;
  regular.story!.active!.step = storyLines(regular).length - 1;
  const accepted = execute(regular, { type: 'storyChoice', choice: 'request' });
  assert.equal(accepted.ok, true);
  assert.equal(accepted.game.minute, regular.minute);
  assert.equal(accepted.game.cash, regular.cash);
  assert.equal(accepted.game.story!.requests.length, 1);
  const g = found.get('competitor')!;
  assert.deepEqual(
    g.story!.active!.targets,
    items.slice(0, 2).map((i) => i.id),
  );
  assert.equal(g.story!.active!.price, 14000);
  assert.equal(isGame(g), true);
  g.story!.active!.step = storyLines(g).length - 1;
  const r = execute(g, { type: 'storyChoice', choice: 'deal' });
  assert.equal(r.ok, true, r.message);
  assert.equal(r.game.inventory.length, 1);
  assert.equal(r.game.inventory[0].id, items[2].id);
  assert.equal(r.game.sales.length, 1);
  assert.equal(r.game.cash, g.cash + 14000);
  assert.equal(r.game.stats.sales, g.stats.sales + 2);
  assert.equal(r.game.weekActions, g.weekActions! + 1);
  assert.equal(isGame(r.game), true);
  const bad = structuredClone(g);
  bad.story!.active!.targets = [items[0].id, items[0].id];
  assert.equal(isGame(bad), false);
});
