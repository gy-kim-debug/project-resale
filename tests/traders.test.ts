import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TRADERS,
  chooseTrader,
  displayTrader,
  TRADER_STYLES,
} from '../src/content/traders';
import { buyerTerms, buyerWalkChance } from '../src/domain/traders';
import { newGame, execute } from '../src/domain/engine';
import {
  purchaseProfile,
  canPurchaseOffer,
} from '../src/domain/purchaseBargaining';
import { purchaseReply, saleReply } from '../src/domain/bargaining';
import { applySpecialListing } from '../src/domain/specialListings';
import { ITEM_CODEX, codexKey } from '../src/content/collection';
import { codexEntries, unlockedItems } from '../src/domain/collection';
import { MARKETS } from '../src/content/markets';
import { parseSave } from '../src/storage/saveRepository';
import { isGame } from '../src/storage/validation';
import type { Game, Command, Inquiry } from '../src/domain/game';
function run(g: Game, command: Command) {
  const r = execute(g, command);
  assert.ok(r.ok, r.message);
  assert.ok(isGame(r.game));
  return r.game;
}
test('trader identities are deterministic, valid and consistent with seller facts across markets', () => {
  assert.equal(TRADERS.length, new Set(TRADERS.map((t) => t.id)).size);
  const seen = new Set<string>();
  for (let seed = 1; seed <= 30; seed++) {
    const g = newGame(seed);
    assert.deepEqual(g, newGame(seed));
    assert.ok(isGame(g));
    for (const item of g.board) {
      const t = TRADERS.find((t) => t.id === item.traderId)!;
      assert.ok(t);
      assert.equal(item.seller, t.name);
      seen.add(t.style);
      if (item.listing?.facts.seller === 'firm') assert.equal(t.style, 'firm');
      if (['urgent', 'moving'].includes(item.listing?.facts.seller ?? ''))
        assert.equal(t.style, 'quick');
      assert.ok(t.age >= 18 && t.age <= 80);
    }
  }
  assert.equal(seen.size, Object.keys(TRADER_STYLES).length);
  assert.deepEqual(chooseTrader('fixed-key'), chooseTrader('fixed-key'));
  assert.deepEqual(
    displayTrader(undefined, 'old-1', '이웃'),
    displayTrader(undefined, 'old-1', '이웃'),
  );
});
test('seller personalities alter negotiation without touching hidden item values or demographics', () => {
  const base = newGame().board[0];
  base.listing!.facts.seller = 'ordinary';
  const profiles = Object.fromEntries(
    TRADERS.map((t) => [t.style, purchaseProfile({ ...base, traderId: t.id })]),
  );
  assert.equal(profiles.firm.floorMin, 1);
  assert.equal(profiles.firm.floorMax, 1);
  assert.ok(profiles.lowball.floorMin > profiles.flexible.floorMin);
  assert.equal(profiles.quick.patienceMax, 2);
  assert.ok(profiles.patient.patienceMin >= profiles.ordinary.patienceMin);
  for (const t of TRADERS) {
    const item = { ...base, traderId: t.id };
    assert.equal(canPurchaseOffer(item), t.style !== 'firm');
    assert.deepEqual(
      purchaseProfile(item),
      purchaseProfile({ ...item, base: 100, value: 100, condition: '고장' }),
    );
    if (t.style !== 'firm') {
      const first = purchaseReply(item, item.offers[0], () => 0.99);
      if (first.item.offers.length) {
        const second = purchaseReply(
          first.item,
          first.item.offers[0],
          () => 0.99,
        );
        assert.equal(
          first.item.purchaseBargain!.floor,
          second.item.purchaseBargain!.floor,
        );
        assert.equal(
          first.item.purchaseBargain!.patience,
          second.item.purchaseBargain!.patience,
        );
      }
      assert.equal(item.value, first.item.value);
      assert.equal(item.base, first.item.base);
    }
  }
});
test('clearance assignment keeps urgent seller identity coherent and leaves old NPC-free saves compatible', () => {
  const item = newGame(5).board.find(
    (i) => i.marketId === 'computers' && !i.special,
  )!;
  const special = applySpecialListing(item, 'clearance', 800000);
  assert.equal(TRADERS.find((t) => t.id === special.traderId)!.style, 'quick');
  assert.equal(special.listing!.facts.seller, 'urgent');
  delete item.traderId;
  const old = applySpecialListing(item, 'clearance', 800000);
  assert.equal(old.traderId, undefined);
});
test('buyer personalities affect opening prices, fixed offers and walkaways while keeping hundred-won amounts', () => {
  const terms = Object.fromEntries(
    TRADERS.map((t) => [t.style, buyerTerms(t.id, 100000, 95000, 70000)]),
  );
  assert.equal(terms.quick.price, 95000);
  assert.equal(terms.lowball.price, 57000);
  assert.equal(terms.flexible.price, 85500);
  assert.equal(terms.firm.max, terms.firm.price);
  for (const t of TRADERS) {
    const q: Inquiry = {
      id: 'q',
      saleId: 's',
      name: t.name,
      traderId: t.id,
      rounds: 0,
      ...buyerTerms(t.id, 100000, 95000, 70000),
    };
    assert.equal(q.price % 100, 0);
    assert.ok(q.price <= q.max);
    if (t.style === 'firm')
      assert.equal(saleReply(q, 100000, 80000, () => 0.99).inquiry, null);
    const result = saleReply(
      { ...q, price: 50000, max: 90000 },
      100000,
      95000,
      () => 0.2,
    );
    assert.equal(result.inquiry === null, buyerWalkChance(q) > 0.2);
  }
  const old: Inquiry = {
    id: 'old',
    saleId: 's',
    name: '동네 구매자',
    price: 50000,
    max: 90000,
    rounds: 0,
  };
  assert.equal(buyerWalkChance(old), 0.3);
});
test('new buyer inquiries persist profile IDs; all market seller IDs survive save reload', () => {
  let g = newGame(2);
  g.cash = 10000000;
  g = run(g, { type: 'buy', id: g.board[0].id });
  const item = g.inventory[0];
  g = run(g, { type: 'post', id: item.id, price: 100 });
  for (let n = 0; n < 5 && !g.inquiries.length; n++)
    g = run(g, { type: 'wait' });
  assert.equal(g.inquiries.length, 2);
  for (const q of g.inquiries)
    assert.equal(q.name, TRADERS.find((t) => t.id === q.traderId)!.name);
  assert.deepEqual(parseSave({ version: 2, game: g, favoriteIds: [] }).game, g);
  const bad = structuredClone(g);
  bad.inquiries[0].traderId = 'unknown';
  assert.equal(isGame(bad), false);
  bad.inquiries[0].traderId = g.inquiries[0].traderId;
  bad.board[0].traderId = 'unknown';
  assert.equal(isGame(bad), false);
});
test('codex contains every active market product, has unique keys and valid hundred-won reference ranges', () => {
  assert.equal(ITEM_CODEX.length, new Set(ITEM_CODEX.map((e) => e.key)).size);
  for (const m of MARKETS)
    for (const p of m.products)
      assert.ok(
        ITEM_CODEX.some(
          (e) => e.key === codexKey(p) && e.markets.includes(m.id),
        ),
      );
  for (const e of ITEM_CODEX) {
    assert.ok(e.min > 0 && e.max >= e.min);
    assert.equal(e.min % 100, 0);
    assert.equal(e.max % 100, 0);
    assert.ok(e.features.length);
    assert.ok(!e.markets.includes('aircraft'));
  }
});
test('codex unlocks on acquisition rather than viewing or negotiating, deduplicates and retains sold items', () => {
  let g = newGame(3);
  assert.equal(unlockedItems(g).size, 0);
  g.cash = 10000000;
  const item = g.board.find((i) => canPurchaseOffer(i) && i.price > 0)!;
  g = run(g, { type: 'offer', id: item.id, price: item.offers[0] });
  assert.equal(unlockedItems(g).size, 0);
  g = run(g, { type: 'buy', id: item.id });
  assert.ok(unlockedItems(g).has(codexKey(item)));
  assert.equal(g.inventory[0].checked, false);
  g = run(g, { type: 'outletSell', id: item.id });
  assert.ok(unlockedItems(g).has(codexKey(item)));
  assert.equal(g.inventory.length, 0);
  assert.deepEqual(
    parseSave({ version: 2, game: g, favoriteIds: [] }).game.discoveredItems,
    g.discoveredItems,
  );
  assert.equal(unlockedItems(newGame()).size, 0);
});
test('scavenging and free gifts unlock codex with no extra action or fees', () => {
  let g = newGame(1);
  const cash = g.cash;
  g = run(g, { type: 'scavenge' });
  assert.equal(g.weekActions, 1);
  assert.equal(g.cash, cash);
  assert.ok(unlockedItems(g).has(codexKey(g.inventory[0])));
  for (let seed = 1; seed < 30; seed++) {
    let gift = newGame(seed);
    const item = gift.board.find((i) => i.price === 0);
    if (!item) continue;
    gift = run(gift, { type: 'buy', id: item.id });
    assert.equal(gift.cash, 500000);
    assert.equal(gift.weekActions, 1);
    assert.ok(unlockedItems(gift).has(codexKey(item)));
    return;
  }
  assert.fail('gift fixture unavailable');
});
test('legacy owned items migrate into codex without changing prices or revealing board items; invalid unlocks are rejected', () => {
  const g = newGame(7);
  g.inventory.push(g.board.shift()!);
  delete g.discoveredItems;
  delete g.inventory[0].traderId;
  const before = structuredClone(g);
  const restored = parseSave({ version: 2, game: g, favoriteIds: [] });
  assert.deepEqual(restored.game.inventory, before.inventory);
  assert.deepEqual(g, before);
  assert.deepEqual(restored.game.discoveredItems, [codexKey(g.inventory[0])]);
  assert.deepEqual(parseSave(restored), restored);
  for (const discoveredItems of [
    ['garbage'],
    [codexKey(g.inventory[0]), codexKey(g.inventory[0])],
    ['<script>'],
    [42],
  ])
    assert.throws(() =>
      parseSave({
        version: 2,
        game: { ...restored.game, discoveredItems },
        favoriteIds: [],
      }),
    );
});

test('selling or discarding raw legacy stock retains its discovery even before repository migration', () => {
  for (const type of ['discard', 'outletSell'] as const) {
    const g = newGame(11);
    g.inventory.push(g.board.shift()!);
    delete g.discoveredItems;
    const key = codexKey(g.inventory[0]);
    const result = run(g, { type, id: g.inventory[0].id });
    assert.equal(result.inventory.length, 0);
    assert.ok(result.discoveredItems?.includes(key));
  }
});

test('retired tier items do not create impossible locked goals and appear only when previously acquired', () => {
  const g = newGame();
  const active = ITEM_CODEX.filter((e) => !e.legacy);
  assert.equal(codexEntries(g).length, active.length);
  const retired = ITEM_CODEX.find((e) => e.legacy)!;
  g.inventory.push({
    ...g.board.shift()!,
    title: retired.title,
    kind: retired.kind,
    listing: undefined,
    special: undefined,
  });
  assert.equal(codexEntries(g).length, active.length + 1);
  assert.ok(codexEntries(g).some((e) => e.key === retired.key));
  const saved = parseSave({
    version: 2,
    game: { ...g, discoveredItems: undefined },
    favoriteIds: [],
  });
  assert.ok(saved.game.discoveredItems!.includes(retired.key));
});
