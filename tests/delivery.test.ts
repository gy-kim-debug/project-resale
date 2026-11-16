import { buyerOpening, saleReply } from '../src/domain/bargaining';
import { auctionBidOptions } from '../src/domain/auction';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MARKET_PRODUCTS } from '../src/content/marketProducts';
import { PRODUCT_CATEGORIES } from '../src/content/productCategories';
import { TRADERS } from '../src/content/traders';
import { PARCEL_CATEGORIES } from '../src/content/delivery';
import { newGame, execute } from '../src/domain/engine';
import type { Command, Game } from '../src/domain/game';
import {
  canParcel,
  chooseDelivery,
  inspectOnsite,
  listingDelivery,
  onsiteOffer,
  onsiteOffers,
  selectedDelivery,
} from '../src/domain/delivery';
import { dialogueOpening, dialogueReply } from '../src/domain/tradeDialogue';
import { canPurchaseOffer } from '../src/domain/purchaseBargaining';
import { parseSave } from '../src/storage/saveRepository';
import { isGame } from '../src/storage/validation';
import { DeliveryBadge } from '../src/components/DeliveryControls';
import { replyThreadId } from '../src/app/chatReplies';
function fixture() {
  const g = newGame(42);
  g.story = undefined;
  const i = g.board.find(
    (i) => i.price > 0 && i.kind === '디지털' && i.marketId === 'street',
  )!;
  i.delivery = { available: 'both' };
  i.traderId = 'olive33';
  i.listing!.facts.seller = 'ordinary';
  return { g, i };
}
function step(g: Game, command: Command) {
  const result = execute(g, command);
  assert.ok(result.ok, result.message);
  assert.ok(isGame(result.game));
  return result.game;
}
const reload = (g: Game) =>
  parseSave({ version: 2, game: g, favoriteIds: [] }).game;
test('every product category has physical parcel policy; vehicles/property/furniture and bulky exceptions cannot ship', () => {
  assert.deepEqual(
    Object.keys(PARCEL_CATEGORIES).sort(),
    Object.keys(PRODUCT_CATEGORIES).sort(),
  );
  for (const product of Object.values(MARKET_PRODUCTS).flat()) {
    assert.equal(typeof canParcel(product), 'boolean');
    if (['자동차', '부동산', '가구'].includes(product.kind))
      assert.equal(canParcel(product), false);
  }
  for (const title of [
    '대형 OLED TV',
    '그랜드 피아노',
    '콘트라베이스',
    '어쿠스틱 드럼 세트',
  ])
    assert.equal(
      canParcel({ title, category: 'dailyDigital', kind: '디지털' }),
      false,
    );
  assert.ok(
    canParcel({ title: '스마트폰', category: 'mobile', kind: '디지털' }),
  );
});
test('listing availability is factual, deterministic, persisted and does not use claim hashtags', () => {
  const g = newGame(42);
  const values = new Set(g.board.filter(canParcel).map(listingDelivery));
  assert.deepEqual(values, new Set(['meet', 'parcel', 'both']));
  const saved = reload(g);
  assert.deepEqual(
    saved.board.map(listingDelivery),
    g.board.map(listingDelivery),
  );
  for (const item of g.board) {
    const html = renderToStaticMarkup(createElement(DeliveryBadge, { item }));
    assert.match(html, /직거래|택배거래/);
    assert.ok(!html.includes('#'));
  }
});
test('both methods are selected by chat; no economic time/RNG/money or hidden value is changed', () => {
  const { g, i } = fixture();
  assert.equal(selectedDelivery(i), undefined);
  const after = step(g, { type: 'chooseDelivery', id: i.id, method: 'parcel' });
  for (const key of ['cash', 'minute', 'weekActions', 'seed', 'stats'] as const)
    assert.deepEqual(after[key], g[key]);
  const item = after.board.find((x) => x.id === i.id)!;
  assert.equal(selectedDelivery(item), 'parcel');
  assert.equal(item.checked, false);
  assert.equal(item.value, i.value);
  assert.match(item.chat!.at(-2)!.text, /택배/);
  assert.deepEqual(
    reload(after).board.find((x) => x.id === i.id),
    item,
  );
  assert.equal(
    replyThreadId({ type: 'chooseDelivery', id: i.id, method: 'parcel' }),
    `buy:${i.id}`,
  );
});
test('unsupported shipping and inspecting parcel trades reject atomically', () => {
  const { g, i } = fixture();
  const property = g.board.find((i) => i.kind === '부동산')!;
  for (const command of [
    { type: 'chooseDelivery', id: property.id, method: 'parcel' },
    { type: 'inspectOnsite', id: i.id },
  ] as Command[]) {
    const bad = execute(g, command);
    assert.equal(bad.ok, false);
    assert.deepEqual(bad.game, g);
  }
  const after = step(g, { type: 'chooseDelivery', id: i.id, method: 'parcel' });
  assert.equal(execute(after, { type: 'inspectOnsite', id: i.id }).ok, false);
});
test('onsite inspection is once-only, free and never appraises actual value/authenticity or unseals an unopened item', () => {
  const { g, i } = fixture();
  i.caseId = 'unopened';
  i.defect = 'SECRET-DEFECT';
  i.value = 987654300;
  const met = step(g, { type: 'chooseDelivery', id: i.id, method: 'meet' });
  const after = step(met, { type: 'inspectOnsite', id: i.id });
  const item = after.board.find((x) => x.id === i.id)!;
  const text = item.chat!.map((m) => m.text).join(' ');
  assert.match(text, /포장 안쪽 상태는 확인하지 못/);
  assert.ok(
    !text.includes('SECRET') &&
      !text.includes('987654300') &&
      !text.includes('987,654,300'),
  );
  assert.equal(item.checked, false);
  for (const key of ['cash', 'minute', 'weekActions', 'seed', 'stats'] as const)
    assert.deepEqual(after[key], met[key]);
  assert.equal(canPurchaseOffer(item), false);
  assert.equal(execute(after, { type: 'inspectOnsite', id: i.id }).ok, false);
  assert.equal(
    execute(after, { type: 'chooseDelivery', id: i.id, method: 'parcel' }).ok,
    false,
  );
  assert.deepEqual(
    reload(after).board.find((x) => x.id === i.id)!.delivery,
    item.delivery,
  );
});
test('onsite bargaining has acceptance/hold/walk outcomes, is once-only and preserves an agreed price on hold', () => {
  const { i } = fixture();
  i.traderId = TRADERS.find((t) => t.style === 'ordinary')!.id;
  i.negotiatedPrice = Math.round((i.price * 0.9) / 100) * 100;
  i.negotiation = 'accepted';
  const item = inspectOnsite(chooseDelivery(i, 'meet'));
  const price = onsiteOffers(item)[0];
  const accepted = onsiteOffer(item, price, () => 0);
  assert.equal(accepted.negotiatedPrice, price);
  const held = onsiteOffer(item, price, () => 0.99);
  assert.equal(held.negotiatedPrice, item.negotiatedPrice);
  assert.equal(held.chatClosed, undefined);
  const walked = onsiteOffer(item, price, () => 0.46);
  assert.equal(walked.chatClosed, true);
  assert.throws(() => onsiteOffer(accepted, price, () => 0));
  assert.deepEqual(onsiteOffers(held), []);
  assert.equal(item.value, accepted.value);
});
test('firm onsite seller retains 10 percent accept, 30 percent hold and 60 percent walk boundaries', () => {
  const { i } = fixture();
  i.listing!.facts.seller = 'firm';
  const item = inspectOnsite(chooseDelivery(i, 'meet'));
  const price = onsiteOffers(item)[0];
  assert.equal(onsiteOffer(item, price, () => 0.099).negotiatedPrice, price);
  assert.equal(onsiteOffer(item, price, () => 0.1).chatClosed, true);
  assert.equal(onsiteOffer(item, price, () => 0.699).chatClosed, true);
  assert.equal(onsiteOffer(item, price, () => 0.7).negotiatedPrice, null);
});
test('final purchase uses exactly one action and the selected method, not extra inspection/negotiation actions', () => {
  const { g, i } = fixture();
  let after = step(g, { type: 'chooseDelivery', id: i.id, method: 'meet' });
  after = step(after, { type: 'inspectOnsite', id: i.id });
  const original = after.board.find((x) => x.id === i.id)!;
  const price = original.negotiatedPrice ?? original.price;
  after = step(after, { type: 'buy', id: i.id });
  assert.equal(after.weekActions, g.weekActions! + 1);
  assert.equal(after.cash, g.cash - price);
  const acquired = after.inventory.find((x) => x.id === i.id)!;
  assert.equal(acquired.delivery?.selected, 'meet');
  assert.equal(acquired.checked, false);
});
test('own listings support both/one method; buyer chat can select method and inspect onsite before negotiating', () => {
  const { g, i } = fixture();
  let after = step(g, { type: 'buy', id: i.id });
  after = step(after, { type: 'check', id: i.id });
  after.inventory[0].stateGrade = 'B';
  after.inventory[0].condition = '사용감';
  after = step(after, {
    type: 'post',
    id: i.id,
    price: i.price,
    delivery: 'both',
  });
  assert.equal(after.sales[0].delivery, 'both');
  after.inquiries = [
    {
      id: 'delivery-buyer',
      saleId: after.sales[0].id,
      name: '테스트 구매자',
      price: Math.round((i.price * 0.8) / 100) * 100,
      max: i.price,
      rounds: 0,
    },
  ];
  after = step(after, {
    type: 'saleDelivery',
    id: 'delivery-buyer',
    method: 'meet',
  });
  const before = structuredClone(after);
  after = step(after, { type: 'saleInspect', id: 'delivery-buyer' });
  assert.equal(after.weekActions, before.weekActions);
  assert.equal(after.seed, before.seed);
  assert.equal(after.inquiries[0].inspected, true);
  assert.equal(
    execute(after, {
      type: 'saleDelivery',
      id: 'delivery-buyer',
      method: 'parcel',
    }).ok,
    false,
  );
  assert.ok(reload(after).inquiries[0].inspected);
  after = step(after, { type: 'accept', id: 'delivery-buyer' });
  assert.equal(after.inventory.length, 0);
  assert.match(
    after.chats!.find((t) => t.inquiryId === 'delivery-buyer')!.messages.at(-1)!
      .text,
    /직거래/,
  );
});
test('legacy saves without delivery still work; corrupt/impossible new metadata is rejected', () => {
  const g = newGame(42);
  for (const item of g.board) delete item.delivery;
  assert.ok(isGame(reload(g)));
  const property = g.board.find((x) => x.kind === '부동산')!;
  property.delivery = { available: 'parcel' };
  assert.throws(() => reload(g));
  property.delivery = { available: 'meet', selected: 'parcel' };
  assert.throws(() => reload(g));
  property.delivery = { available: 'meet', selected: 'meet', offered: true };
  assert.throws(() => reload(g));
});
test('repeated method switches keep saves bounded and never grant rapport/skill or economic RNG changes', () => {
  const { g, i } = fixture();
  let after = g;
  for (let n = 0; n < 40; n++)
    after = step(after, {
      type: 'chooseDelivery',
      id: i.id,
      method: n % 2 ? 'parcel' : 'meet',
    });
  assert.equal(after.board.find((x) => x.id === i.id)!.chat!.length, 64);
  assert.equal(after.seed, g.seed);
  assert.deepEqual(after.stats, g.stats);
  assert.ok(isGame(reload(after)));
});
test('chat wording is varied between items, stable on reload, and remains relevant to the selected topic', () => {
  const { i } = fixture();
  const openings = new Set<string>(),
    questions = new Set<string>(),
    replies = new Set<string>();
  for (let n = 0; n < 32; n++) {
    const item = { ...structuredClone(i), id: `wording-${n}` };
    openings.add(dialogueOpening(item)[0].text);
    const reply = dialogueReply(item, 'reason');
    questions.add(reply.chat![1].text);
    replies.add(reply.chat![2].text);
    assert.deepEqual(
      dialogueReply(JSON.parse(JSON.stringify(item)), 'reason').chat,
      reply.chat,
    );
    assert.match(reply.chat![2].text, /정리|이사|재고|모델|내놓|올렸|팔아/);
  }
  assert.ok(openings.size >= 3 && questions.size >= 3 && replies.size >= 3);
});

test('onsite proposal executes once, saves its RNG outcome, and rejects replay without drawing again', () => {
  const { g, i } = fixture();
  let after = step(g, { type: 'chooseDelivery', id: i.id, method: 'meet' });
  after = step(after, { type: 'inspectOnsite', id: i.id });
  const price = onsiteOffers(after.board.find((x) => x.id === i.id)!)[0];
  const command = { type: 'onsiteOffer', id: i.id, price } as const;
  const result = step(after, command);
  assert.deepEqual(step(reload(after), command), result);
  assert.notEqual(result.seed, after.seed);
  assert.equal(result.weekActions, after.weekActions);
  const bad = execute(reload(result), command);
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.game, reload(result));
});
test('own bulky listings cannot accept parcel registration or forged parcel inquiries', () => {
  const g = newGame(42);
  const item = g.board.find((i) => i.kind === '가구')!;
  g.board = g.board.filter((i) => i.id !== item.id);
  g.inventory = [item];
  const bad = execute(g, {
    type: 'post',
    id: item.id,
    price: item.price,
    delivery: 'parcel',
  });
  assert.equal(bad.ok, false);
  assert.deepEqual(bad.game, g);
  const posted = step(g, {
    type: 'post',
    id: item.id,
    price: item.price,
    delivery: 'meet',
  });
  posted.inquiries = [
    {
      id: 'forged',
      saleId: posted.sales[0].id,
      name: 'buyer',
      price: 100,
      max: 100,
      rounds: 0,
      delivery: 'parcel',
    },
  ];
  assert.throws(() => reload(posted));
});
test('an incompatible legacy bundle cannot silently ship a collection-only item or spend cash', () => {
  const { g, i } = fixture();
  i.delivery = { available: 'parcel', selected: 'parcel' };
  const extra = g.board.find(
    (x) => x.id !== i.id && x.marketId === i.marketId,
  )!;
  extra.delivery = { available: 'meet' };
  const result = execute(g, { type: 'buy', id: i.id }, true, extra.id);
  assert.equal(result.ok, false);
  assert.deepEqual(result.game, g);
});

test('auction retains winning bids and history while selecting a permitted fulfillment method after winning', () => {
  let g = newGame(42);
  g.cash = 10_000_000_000_000;
  g.stats.peakCash = g.cash;
  const id = g.board.find((i) => i.marketId === 'auction')!.id;
  assert.equal(
    execute(g, { type: 'chooseDelivery', id, method: 'meet' }).ok,
    false,
  );
  while (g.board.find((i) => i.id === id)!.auction!.status !== 'won') {
    const item = g.board.find((i) => i.id === id)!;
    const amount = auctionBidOptions(item).at(-1)!;
    g = step(g, { type: 'bid', id, amount });
  }
  const item = g.board.find((i) => i.id === id)!;
  const original = structuredClone(item.auction!);
  const method = listingDelivery(item) === 'parcel' ? 'parcel' : 'meet';
  g = step(g, { type: 'chooseDelivery', id, method });
  const selected = g.board.find((i) => i.id === id)!;
  assert.deepEqual(selected.auction, original);
  assert.deepEqual(
    selected.chat!.slice(0, original.history.length),
    original.history,
  );
  assert.deepEqual(onsiteOffers(selected), []);
  g = step(g, { type: 'buy', id });
  assert.equal(g.inventory[0].acquiredFor, original.currentBid);
  assert.equal(g.inventory[0].delivery?.selected, method);
});

test('buyer openings and price replies vary while retaining the exact same economic proposal', () => {
  const openings = new Set<string>(),
    replies = new Set<string>();
  for (let n = 0; n < 24; n++) {
    const q = {
      id: `buyer-${n}`,
      saleId: 'sale',
      name: 'buyer',
      price: 10000,
      max: 20000,
      rounds: 0,
    };
    const opening = buyerOpening(q);
    openings.add(opening[0].text);
    assert.match(opening[0].text, /10,000/);
    const result = saleReply(q, 20000, 15000, () => 1);
    assert.equal(result.inquiry!.price, 15000);
    assert.match(result.transcript.at(-1)!.text, /좋아요.*15,000/);
    replies.add(result.transcript.at(-1)!.text);
  }
  assert.ok(openings.size === 3 && replies.size === 3);
});
