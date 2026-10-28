import test from 'node:test';
import assert from 'node:assert/strict';
import { newGame, execute } from '../src/domain/engine';
import {
  dialogueChoices,
  dialogueReply,
  sellerEvent,
} from '../src/domain/tradeDialogue';
import { purchaseProfile } from '../src/domain/purchaseBargaining';
import { purchaseReply } from '../src/domain/bargaining';
import { isGame } from '../src/storage/validation';
import { TRADERS } from '../src/content/traders';
import { ITEM_CASES, caseApplies } from '../src/content/itemCases';
import { MARKETS } from '../src/content/markets';
import type { Game, Item } from '../src/domain/game';
function fixture() {
  const g = newGame(42);
  const i = g.board.find((i) => i.price > 0 && i.marketId === 'street')!;
  i.traderId = 'olive33';
  i.listing!.facts.seller = 'ordinary';
  return { g, i };
}
function reply(g: Game, i: Item, topic: Parameters<typeof dialogueReply>[1]) {
  const r = execute(g, { type: 'dialogue', id: i.id, topic });
  assert.ok(r.ok, r.message);
  assert.ok(isGame(r.game));
  return r.game;
}
test('dialogue is persisted and free without consuming RNG, money, stats or revealing actual value', () => {
  const { g, i } = fixture();
  const before = structuredClone(g);
  const after = reply(g, i, 'greet');
  assert.deepEqual(g, before);
  for (const key of [
    'seed',
    'minute',
    'weekActions',
    'cash',
    'principal',
    'stats',
  ] as const)
    assert.deepEqual(after[key], g[key]);
  const item = after.board.find((x) => x.id === i.id)!;
  assert.equal(item.chat?.length, 3);
  assert.equal(item.checked, false);
  assert.equal(item.value, i.value);
  assert.equal(item.base, i.base);
  assert.deepEqual(item.dialogue?.topics, ['greet']);
  assert.equal(item.chat?.[1].speaker, 'player');
  const loaded = JSON.parse(JSON.stringify(after));
  assert.ok(isGame(loaded));
  assert.deepEqual(
    dialogueChoices(loaded.board.find((x: Item) => x.id === i.id)!),
    dialogueChoices(item),
  );
});
test('questions trigger contextual choices; one response closes the event and cannot be farmed', () => {
  const { g, i } = fixture();
  let after = reply(g, i, 'condition');
  let item = after.board.find((x) => x.id === i.id)!;
  assert.deepEqual(
    dialogueChoices(item).map((x) => x.id),
    ['eventAccept', 'eventDecline'],
  );
  assert.equal(item.chat?.at(-1)?.text, sellerEvent(item));
  after = reply(after, item, 'eventAccept');
  item = after.board.find((x) => x.id === i.id)!;
  assert.ok(dialogueChoices(item).some((x) => x.id === 'detail'));
  assert.ok(!dialogueChoices(item).some((x) => x.id === 'eventDecline'));
  const bad = execute(after, {
    type: 'dialogue',
    id: i.id,
    topic: 'eventDecline',
  });
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.game, after);
  assert.throws(() => dialogueReply(item, 'condition'));
});
test('all personalities and all applicable cases finish bounded conversations and survive save validation', () => {
  for (const t of TRADERS)
    for (const market of MARKETS) {
      if (market.id === 'auction') continue;
      const g = newGame(21);
      const item = g.board.find((i) => i.marketId === market.id)!;
      item.traderId = t.id;
      for (const id of Object.keys(ITEM_CASES) as (keyof typeof ITEM_CASES)[]) {
        if (!caseApplies(id, item.kind, market.id)) continue;
        let current = { ...structuredClone(item), caseId: id };
        let count = 0;
        while (dialogueChoices(current).length) {
          current = dialogueReply(current, dialogueChoices(current)[0].id);
          assert.ok(++count <= 10);
        }
        assert.ok(current.chat!.length < 64);
        g.board = g.board.map((i) => (i.id === current.id ? current : i));
        assert.ok(isGame(g));
        assert.equal(current.value, item.value);
        assert.equal(current.condition, item.condition);
      }
    }
});
test('condition claims are stable, can be mistaken, and never disclose exact defects or prices', () => {
  let candid = 0,
    uncertain = 0;
  for (let n = 0; n < 200; n++) {
    const { i } = fixture();
    i.id = 'claim' + n;
    i.caseId = 'normal';
    i.condition = '고장';
    i.defect = 'SECRET';
    const a = dialogueReply(i, 'condition');
    assert.deepEqual(a, dialogueReply(i, 'condition'));
    const text = a.chat!.map((m) => m.text).join(' ');
    assert.ok(!text.includes('SECRET'));
    assert.ok(!text.includes(String(i.value)));
    if (text.includes('수리를 고려')) candid++;
    if (text.includes('괜찮은 편')) uncertain++;
  }
  assert.ok(candid > 130 && candid < 190);
  assert.ok(uncertain > 10);
});
test('tag claims cannot become an authentication oracle', () => {
  const { i } = fixture();
  i.listing!.tags = ['household', 'limited'];
  const before = dialogueReply(i, 'feature').chat;
  i.listing!.facts.limited = !i.listing!.facts.limited;
  i.listing!.facts.authentic = false;
  assert.deepEqual(dialogueReply(i, 'feature').chat, before);
  assert.match(before!.at(-1)!.text, /확답은 어렵/);
});
test('unopened, untested, vehicle and property questions use the appropriate context', () => {
  const { i } = fixture();
  i.caseId = 'unopened';
  assert.match(dialogueReply(i, 'condition').chat![2].text, /내부 작동/);
  i.special = 'unverified';
  assert.match(dialogueReply(i, 'condition').chat![2].text, /보증하지 않는/);
  const g = newGame();
  for (const m of ['cars', 'property']) {
    const x = g.board.find((i) => i.marketId === m)!;
    assert.match(
      dialogueChoices(x).find((c) => c.id === 'condition')!.text,
      m === 'cars' ? /차량/ : /설비/,
    );
  }
});
test('rapport is bounded and only reduces a newly established negotiation floor; firm stays firm', () => {
  const { i } = fixture();
  const before = purchaseProfile(i);
  let item = dialogueReply(i, 'greet');
  item = dialogueReply(item, 'thanks');
  assert.equal(item.dialogue?.rapport, 2);
  assert.ok(purchaseProfile(item).floorMin < before.floorMin);
  item.traderId = 'price31';
  assert.equal(purchaseProfile(item).floorMin, 1);
  item.traderId = 'olive33';
  const bargained = purchaseReply(item, item.offers[0], () => 0.5).item;
  if (!bargained.chatSettled) {
    const later = dialogueReply(bargained, 'background');
    assert.equal(
      later.purchaseBargain?.floor,
      bargained.purchaseBargain?.floor,
    );
  }
});
test('demographics can vary wording but never change economics or honesty', () => {
  const { i } = fixture();
  i.traderId = 'pine24';
  const a = dialogueReply(i, 'condition');
  i.traderId = 'moon37';
  const b = dialogueReply(i, 'condition');
  assert.deepEqual(purchaseProfile(a), purchaseProfile(b));
  assert.equal(a.value, b.value);
});
test('closed, walked, auction, invalid or repeated dialogue is rejected without state changes; free listings allow questions', () => {
  const { g, i } = fixture();
  for (const patch of [
    { chatSettled: true },
    { marketId: 'auction' as const },
    { purchaseBargain: { rounds: 1, floor: 100, patience: 2, walked: true } },
  ])
    assert.deepEqual(dialogueChoices({ ...i, ...patch }), []);
  const bad = execute(g, {
    type: 'dialogue',
    id: i.id,
    topic: 'invalid' as 'greet',
  });
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.game, g);
  i.price = 0;
  assert.ok(dialogueChoices(i).some((c) => c.id === 'condition'));
  assert.ok(!dialogueChoices(i).some((c) => c.id === 'quickDeal'));
  const old = structuredClone(g);
  delete old.board[0].dialogue;
  assert.ok(isGame(old));
  const malformed = reply(g, i, 'greet');
  malformed.board.find((x) => x.id === i.id)!.dialogue!.topics.push('greet');
  assert.equal(isGame(malformed), false);
});
