import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createEventPreview } from '../src/app/eventPreview';
import { actionDelivery } from '../src/app/actionPresentation';
import { ActionScene } from '../src/components/ActionScene';
import {
  PARCEL_BUY_EVENTS,
  PARCEL_SELL_EVENTS,
  PARCEL_EVENT_KINDS,
} from '../src/content/parcelEvents';
import { execute } from '../src/domain/engine';
import {
  beforeTrade,
  storyLines,
  storyChoices,
  storyChoiceAffordable,
} from '../src/domain/story';
import { parseSave } from '../src/storage/saveRepository';
import { isGame } from '../src/storage/validation';
import { ACTION_TICK, type Game } from '../src/domain/game';
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
  assert.ok(r.ok, r.message);
  assert.ok(isGame(r.game));
  return r.game;
}
const saved = (g: Game) =>
  parseSave(
    JSON.parse(JSON.stringify({ version: 2, game: g, favoriteIds: [] })),
  ).game;
test('parcel and in-person transaction event pools are distinct for both buying and selling', () => {
  for (const side of ['buy', 'accept'] as const) {
    const g = createEventPreview(
      side === 'buy' ? 'parcelDispatch' : 'parcelPhotos',
    );
    const id = g.story!.active!.target!;
    g.story!.active = null;
    g.story!.lastAt = 0;
    const found = new Set<string>();
    for (let seed = 0; seed < 1500; seed++) {
      g.seed = seed;
      const scene = beforeTrade(g, { type: side, id });
      if (scene) {
        found.add(scene.kind);
        assert.equal(scene.tradeMethod, 'parcel');
      }
    }
    assert.deepEqual(
      found,
      new Set(side === 'buy' ? PARCEL_BUY_EVENTS : PARCEL_SELL_EVENTS),
    );
    if (side === 'buy')
      g.board.find((i) => i.id === id)!.delivery = {
        available: 'both',
        selected: 'meet',
      };
    else {
      g.inquiries[0].delivery = 'meet';
      g.sales[0].delivery = 'both';
    }
    let count = 0;
    for (let seed = 0; seed < 500; seed++) {
      g.seed = seed;
      const scene = beforeTrade(g, { type: side, id });
      if (scene) {
        count++;
        assert.ok(!PARCEL_EVENT_KINDS.some((kind) => kind === scene.kind));
      }
    }
    assert.ok(count > 0);
  }
});
test('the last weekly action never generates a parcel event whose only trade option needs two actions', () => {
  for (const side of ['buy', 'accept'] as const) {
    const g = createEventPreview(
        side === 'buy' ? 'parcelDispatch' : 'parcelPhotos',
      ),
      id = g.story!.active!.target!;
    g.story!.active = null;
    g.story!.lastAt = 0;
    g.weekActions = 19;
    g.minute = 19 * ACTION_TICK;
    for (const i of g.board) i.expires = g.minute + 10 * ACTION_TICK;
    if (g.sales[0]) g.sales[0].expires = g.minute + 10 * ACTION_TICK;
    let found = 0;
    for (let seed = 0; seed < 500; seed++) {
      g.seed = seed;
      const scene = beforeTrade(g, { type: side, id });
      if (scene) {
        found++;
        assert.equal(
          scene.kind,
          side === 'buy' ? 'parcelDispatch' : 'parcelPhotos',
        );
      }
    }
    assert.ok(found > 0);
  }
});
test('all 12 parcel scenarios use remote topics, preserve hidden values, and execute each choice exactly once', () => {
  for (const kind of PARCEL_EVENT_KINDS)
    for (const variant of [0, 1, 2] as const) {
      const g = saved(createEventPreview(kind, undefined, variant));
      for (const c of storyChoices(last(g))) {
        const before = JSON.parse(JSON.stringify(g)) as Game;
        const result = choose(g, c.id);
        assert.deepEqual(g, before);
        assert.doesNotMatch(
          storyLines(result)
            .map((l) => l.text)
            .join(' '),
          /현장에서|직접 만나|약속 장소|가까운 장소|현장 네고/,
        );
        if (c.id.startsWith('ask:')) {
          for (const key of [
            'cash',
            'weekActions',
            'seed',
            'inventory',
            'board',
          ] as const)
            assert.deepEqual(result[key], g[key]);
          assert.equal(storyLines(result).length, 2);
          continue;
        }
        assert.equal(result.weekActions! - g.weekActions!, c.actions ?? 0);
        const expected = g.story!.active!.price!;
        if (c.id === 'cancel') {
          assert.equal(result.cash, g.cash);
          assert.deepEqual(result.inventory, g.inventory);
        } else if (kind === 'parcelPacking' || kind === 'parcelDispatch') {
          const item = g.board.find((i) => i.id === g.story!.active!.target)!;
          const cost =
            c.id === 'wait' ? expected : (item.negotiatedPrice ?? item.price);
          assert.equal(result.cash, g.cash - cost);
          assert.equal(result.inventory[0].value, item.value);
          assert.equal(result.inventory[0].checked, item.checked);
          assert.equal(result.inventory[0].acquiredFor, cost);
          assert.equal(result.inventory[0].delivery?.selected, 'parcel');
        } else {
          assert.equal(
            result.cash,
            g.cash + (c.id === 'deal' ? expected : g.inquiries[0].price),
          );
          assert.equal(result.inventory.length, 0);
        }
        const restored = saved(result);
        const replay = choose(restored, 'continue');
        for (const key of [
          'cash',
          'weekActions',
          'inventory',
          'stats',
          'seed',
        ] as const)
          assert.deepEqual(replay[key], restored[key]);
      }
    }
});
test('waiting discounts, public affordability and final-action rejection agree with actual transaction charges', () => {
  for (const kind of PARCEL_BUY_EVENTS) {
    const g = last(createEventPreview(kind));
    g.cash = g.story!.active!.price!;
    const wait = storyChoices(g).find((c) => c.id === 'wait')!;
    assert.ok(storyChoiceAffordable(g, wait));
    assert.equal(choose(g, 'wait').cash, 0);
    const poor = structuredClone(g);
    poor.weekActions = 19;
    poor.minute = 19 * ACTION_TICK;
    for (const i of poor.board) i.expires = poor.minute + 10 * ACTION_TICK;
    const bad = execute(poor, { type: 'storyChoice', choice: 'wait' });
    assert.equal(bad.ok, false);
    assert.deepEqual(bad.game, poor);
  }
});
test('parcel scene imports reject an in-person method, non-shippable target or a missing quote', () => {
  for (const kind of PARCEL_EVENT_KINDS) {
    const g = createEventPreview(kind);
    assert.ok(isGame(g));
    const wrong = structuredClone(g);
    wrong.story!.active!.tradeMethod = 'meet';
    assert.throws(() => saved(wrong));
    const noPrice = structuredClone(g);
    delete noPrice.story!.active!.price;
    assert.throws(() => saved(noPrice));
    const method = structuredClone(g);
    if (PARCEL_BUY_EVENTS.some((id) => id === kind))
      method.board.find(
        (i) => i.id === method.story!.active!.target,
      )!.delivery = { available: 'both', selected: 'meet' };
    else method.inquiries[0].delivery = 'meet';
    assert.throws(() => saved(method));
  }
});
test('legacy parcel scenes keep their original choices and quotes while showing remote contact and pickup text', () => {
  for (const kind of ['appointment', 'inspection', 'rehaggle'] as const) {
    const g = createEventPreview(kind);
    g.story!.active!.tradeMethod = 'parcel';
    const price = g.story!.active!.price;
    const choices = storyChoices(last(g));
    assert.doesNotMatch(
      [
        ...storyLines(g).map((l) => l.text),
        ...choices.map((c) => c.label),
      ].join(' '),
      /직접 만나|가까운 장소|현장에서/,
    );
    assert.deepEqual(
      choices.map((c) => [c.id, c.actions]),
      kind === 'rehaggle'
        ? [
            ['ask:reason', undefined],
            ['ask:terms', undefined],
            ['deal', 1],
            ['continue', 1],
            ['cancel', undefined],
          ]
        : [
            ['ask:reason', undefined],
            ['ask:terms', undefined],
            ['wait', 2],
            ['continue', 1],
            ['cancel', undefined],
          ],
    );
    assert.equal(g.story!.active!.price, price);
    assert.ok(isGame(saved(g)));
  }
});
test('parcel completion layers show packing/dispatch instead of the in-person exchange without altering gameplay', () => {
  const g = createEventPreview('parcelPhotos');
  assert.equal(
    actionDelivery(g, { type: 'storyChoice', choice: 'deal' }),
    'parcel',
  );
  assert.equal(
    actionDelivery(g, { type: 'accept', id: g.inquiries[0].id }),
    'parcel',
  );
  const html = renderToStaticMarkup(
    createElement(ActionScene, { kind: 'sell', delivery: 'parcel' }),
  );
  assert.match(html, /data-scene="parcel"/);
  assert.match(html, /parcel-box/);
  assert.doesNotMatch(html, /scene-trader/);
  const normal = renderToStaticMarkup(
    createElement(ActionScene, { kind: 'sell', delivery: 'meet' }),
  );
  assert.match(normal, /scene-trader/);
  assert.doesNotMatch(normal, /data-scene="parcel"/);
});
