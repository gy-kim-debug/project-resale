import test from 'node:test';
import assert from 'node:assert/strict';
import { EVENT_KINDS } from '../src/content/story';
import { QUESTIONS_FOR } from '../src/content/eventScenes';
import { createEventPreview } from '../src/app/eventPreview';
import { execute, newGame } from '../src/domain/engine';
import {
  storyLines,
  storyChoices,
  storyChoiceAffordable,
} from '../src/domain/story';
import { dialogueChoices } from '../src/domain/tradeDialogue';
import { isGame } from '../src/storage/validation';
import { buyerOpening } from '../src/domain/bargaining';
import type { Game } from '../src/domain/game';
function last(g: Game) {
  let next = g;
  while (next.story!.active!.step < storyLines(next).length - 1) {
    const r = execute(next, { type: 'storyNext' });
    assert.ok(r.ok, r.message);
    next = r.game;
  }
  return next;
}
function choose(g: Game, choice: string) {
  const r = execute(last(g), { type: 'storyChoice', choice });
  assert.ok(r.ok, `${g.story!.active!.kind}:${choice}: ${r.message}`);
  assert.ok(isGame(r.game));
  return r.game;
}
test('all 18 event types, 54 variants and every final choice charge their declared actions exactly once', () => {
  for (const kind of EVENT_KINDS)
    for (const variant of [0, 1, 2] as const) {
      const g = last(createEventPreview(kind, undefined, variant));
      for (const choice of storyChoices(g).filter(
        (c) => !c.id.startsWith('ask:'),
      )) {
        const after = choose(g, choice.id);
        assert.equal(
          after.weekActions! - g.weekActions!,
          choice.actions ?? 0,
          `${kind}:${choice.id}`,
        );
        if (after.story?.active?.outcome) {
          const before = JSON.parse(JSON.stringify(after)) as Game;
          const done = choose(JSON.parse(JSON.stringify(after)), 'continue');
          for (const key of [
            'cash',
            'inventory',
            'sales',
            'stats',
            'weekActions',
            'seed',
          ] as const)
            assert.deepEqual(
              done[key],
              before[key],
              `${kind}:${choice.id}:${key}`,
            );
        }
      }
      for (const question of QUESTIONS_FOR[kind]) {
        const after = choose(g, `ask:${question}`);
        assert.equal(storyLines(after).length, 2);
        assert.ok(storyLines(after).every((l) => !l.text.includes('{price}')));
        assert.ok(storyLines(after)[1].speaker);
        for (const key of [
          'cash',
          'inventory',
          'sales',
          'stats',
          'weekActions',
          'seed',
        ] as const)
          assert.deepEqual(after[key], g[key]);
      }
    }
});
test('initiator opens new chats: player for buying, buyer for selling; reopening never inserts messages', () => {
  let g = newGame(42);
  const i = g.board[0];
  g = execute(g, { type: 'startChat', id: i.id }).game;
  const chat = g.board[0].chat!;
  assert.deepEqual(
    chat.map((m) => m.speaker),
    ['player', 'other'],
  );
  assert.ok(chat[0].text.includes(i.title));
  assert.ok(!dialogueChoices(g.board[0]).some((c) => c.id === 'greet'));
  assert.deepEqual(
    execute(g, { type: 'startChat', id: i.id }).game.board[0].chat,
    chat,
  );
  assert.equal(
    buyerOpening({
      id: 'buyer',
      saleId: 'sale',
      name: 'buyer',
      price: 10000,
      max: 20000,
      rounds: 0,
    })[0].speaker,
    'other',
  );
  const legacy = structuredClone(g);
  legacy.board[0].chat = [{ speaker: 'other', text: '기존 대화입니다.' }];
  assert.deepEqual(
    execute(legacy, { type: 'startChat', id: i.id }).game.board[0].chat,
    legacy.board[0].chat,
  );
});
test('cancel ends only the current purchase chat and never transfers cash/items or leaves an active transaction', () => {
  for (const kind of [
    'missing',
    'model',
    'memory',
    'bundle',
    'appointment',
    'scam',
    'rush',
  ] as const) {
    const g = createEventPreview(kind),
      id = g.story!.active!.target!;
    const result = choose(g, 'cancel');
    assert.equal(result.cash, g.cash);
    assert.deepEqual(result.inventory, g.inventory);
    assert.equal(result.board.find((i) => i.id === id)!.chatClosed, true);
    assert.equal(
      result.chats!.find((t) => t.itemId === id)!.status,
      'cancelled',
    );
    assert.equal(execute(result, { type: 'buy', id }).ok, false);
  }
});
test('reservation follow-up never silently discards other buyers for the same item', () => {
  const g = createEventPreview('reservation');
  g.inquiries.push({
    ...g.inquiries[0],
    id: 'other-buyer',
    name: '다른 구매자',
  });
  const result = choose(g, 'hold');
  assert.deepEqual(
    result.inquiries.map((q) => q.id),
    ['other-buyer'],
  );
  assert.equal(
    result.chats!.find((t) => t.inquiryId === g.inquiries[0].id)!.status,
    'cancelled',
  );
  assert.equal(result.sales.length, g.sales.length);
  assert.equal(result.story!.pending![0].price, g.inquiries[0].price);
});
test('creditor acknowledgment cannot promise referrals; different bargaining decisions have distinct matching replies', () => {
  const creditor = choose(createEventPreview('creditor'), 'ask:terms');
  const text = storyLines(creditor)
    .map((l) => l.text)
    .join(' ');
  assert.match(text, /납부|정산/);
  assert.doesNotMatch(text, /소개|지인/);
  const g = createEventPreview('rehaggle');
  const original = choose(g, 'continue'),
    discounted = choose(g, 'deal');
  assert.equal(original.cash - g.cash, g.inquiries[0].price);
  assert.equal(discounted.cash - g.cash, g.story!.active!.price);
  assert.notDeepEqual(storyLines(original), storyLines(discounted));
  assert.match(storyLines(original)[0].text, /원래 합의/);
});
test('parcel event text and reactions retain delivery context after purchase removes the listing', () => {
  for (const kind of ['scam', 'rehaggle'] as const)
    for (const variant of [0, 1, 2] as const) {
      const g = createEventPreview(kind, undefined, variant);
      g.story!.active!.tradeMethod = 'parcel';
      assert.doesNotMatch(
        storyLines(g)
          .map((l) => l.text)
          .join(' '),
        /현장/,
      );
      if (kind === 'scam') {
        assert.match(
          storyChoices(last(g)).find((c) => c.id === 'continue')!.label,
          /예약금 없이/,
        );
        const after = choose(g, 'continue');
        assert.equal(after.story!.active!.tradeMethod, 'parcel');
        assert.doesNotMatch(
          storyLines(after)
            .map((l) => l.text)
            .join(' '),
          /현장|직접 만나/,
        );
      }
    }
});
test('bundle/bulk terms identify the exact items and price; property and car memories do not describe storage boxes', () => {
  for (const kind of ['bundle', 'competitor'] as const) {
    const g = createEventPreview(kind),
      scene = g.story!.active!;
    const after = choose(g, 'ask:terms');
    const text = storyLines(after)[1].text;
    for (const id of scene.targets ?? [
      scene.target!,
      ...(scene.extra ? [scene.extra] : []),
    ])
      assert.ok(
        text.includes(
          [...g.board, ...g.inventory].find((i) => i.id === id)!.title,
        ),
      );
  }
  for (const kind of ['자동차', '부동산'] as const) {
    const g = createEventPreview('memory', undefined, 2),
      scene = g.story!.active!;
    scene.target = g.board.find((i) => i.kind === kind)!.id;
    scene.resume!.id = scene.target;
    assert.doesNotMatch(
      storyLines(g)
        .map((l) => l.text)
        .join(' '),
      /상자/,
    );
  }
});

test('purchase choices are disabled by public affordability while questions and cancellation remain available', () => {
  for (const kind of ['missing', 'rush', 'bundle', 'model'] as const) {
    const g = createEventPreview(kind);
    g.cash = 0;
    for (const c of storyChoices(last(g))) {
      if (c.actions) assert.equal(storyChoiceAffordable(g, c), false);
      else assert.equal(storyChoiceAffordable(g, c), true);
    }
  }
});
