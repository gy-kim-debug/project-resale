import test from 'node:test';
import assert from 'node:assert/strict';
import { execute, newGame } from '../src/domain/engine';
import {
  buyChatId,
  sellChatId,
  syncTradeChats,
  unreadChats,
  CHAT_LIMIT,
} from '../src/domain/chats';
import { parseSave } from '../src/storage/saveRepository';
import { isGame } from '../src/storage/validation';
import { parseResumeIntent } from '../src/app/resumeSession';
import { ACTION_TICK, type Game, type Command } from '../src/domain/game';
function run(g: Game, c: Command) {
  const r = execute(g, c);
  assert.ok(r.ok, r.message);
  assert.ok(isGame(r.game), c.type);
  return r.game;
}
function seller() {
  const g = newGame(42);
  g.cash = 5000000;
  g.stats.peakCash = g.cash;
  return g;
}
function buyer() {
  const g = seller();
  const i = g.board.find(
    (i) => i.marketId === 'street' && i.stateGrade === 'B',
  )!;
  g.board = g.board.filter((x) => x.id !== i.id);
  g.inventory = [{ ...i, acquiredFor: i.price }];
  g.sales = [
    {
      id: 'sale-1',
      itemId: i.id,
      marketId: 'street',
      price: 100000,
      created: 0,
      expires: 3840,
      nextCheck: 960,
    },
  ];
  g.inquiries = [
    {
      id: 'buyer-1',
      saleId: 'sale-1',
      name: '단골손님',
      price: 80000,
      max: 90000,
      rounds: 0,
    },
  ];
  return g;
}
const core = (g: Game) => ({
  cash: g.cash,
  minute: g.minute,
  seed: g.seed,
  actions: g.weekActions,
  principal: g.principal,
  stats: g.stats,
  stock: g.daily,
});
test('seller conversations start once, resume exact options/history after save and read without time, RNG or finance changes', () => {
  let g = seller();
  const i = g.board.find((i) => i.marketId === 'street' && !i.special)!;
  const before = core(g);
  g = run(g, { type: 'startChat', id: i.id });
  assert.deepEqual(core(g), before);
  assert.equal(g.chats!.length, 1);
  assert.equal(unreadChats(g), 1);
  const id = buyChatId(i.id),
    stamp = g.chats![0].updated;
  g = run(g, { type: 'readChat', id });
  assert.equal(unreadChats(g), 0);
  assert.equal(g.chats![0].updated, stamp);
  g = run(g, { type: 'startChat', id: i.id });
  assert.equal(g.chats!.length, 1);
  assert.equal(unreadChats(g), 0);
  g = run(g, { type: 'dialogue', id: i.id, topic: 'greet' });
  assert.equal(g.chats![0].messages.length, 3);
  assert.equal(unreadChats(g), 1);
  const beforeOffer = g.board.find((x) => x.id === i.id)!;
  const price = beforeOffer.offers[0];
  const offered = execute(g, { type: 'offer', id: i.id, price });
  if (offered.ok) g = offered.game;
  const loaded = parseSave(
    JSON.parse(JSON.stringify({ version: 2, game: g, favoriteIds: [] })),
  ).game;
  assert.deepEqual(loaded, g);
  assert.deepEqual(
    loaded.board.find((x) => x.id === i.id)?.offers,
    g.board.find((x) => x.id === i.id)?.offers,
  );
  assert.deepEqual(
    loaded.chats![0].messages,
    g.board.find((x) => x.id === i.id)!.chat,
  );
  const text = JSON.stringify(g.chats);
  assert.ok(
    !text.includes('floor') &&
      !text.includes('patience') &&
      !text.includes('value'),
  );
});
test('purchase completion persists as read-only history after resale and rejects a repeated purchase', () => {
  let g = seller();
  const i = g.board.find(
    (i) => i.marketId === 'street' && i.stateGrade === 'B',
  )!;
  g = run(g, { type: 'startChat', id: i.id });
  g = run(g, { type: 'buy', id: i.id });
  const id = buyChatId(i.id);
  assert.equal(g.chats!.find((t) => t.id === id)!.status, 'completed');
  const transcript = structuredClone(
    g.chats!.find((t) => t.id === id)!.messages,
  );
  const before = structuredClone(g);
  assert.equal(execute(g, { type: 'buy', id: i.id }).ok, false);
  assert.deepEqual(g, before);
  g = run(g, { type: 'outletSell', id: i.id });
  assert.equal(g.inventory.length, 0);
  g = parseSave({ version: 2, game: g, favoriteIds: [] }).game;
  assert.equal(g.chats!.find((t) => t.id === id)!.status, 'completed');
  assert.deepEqual(g.chats!.find((t) => t.id === id)!.messages, transcript);
});
test('explicit cancellation and real expiry end chats, while discovery preserves live conversations', () => {
  let g = seller();
  const i = g.board.find((i) => i.marketId === 'street')!;
  g = run(g, { type: 'startChat', id: i.id });
  g = run(g, { type: 'closeChat', id: i.id });
  assert.equal(g.chats![0].status, 'cancelled');
  assert.equal(execute(g, { type: 'buy', id: i.id }).ok, false);
  assert.equal(execute(g, { type: 'startChat', id: i.id }).ok, false);
  let active = seller();
  const listing = active.board.find((i) => i.marketId === 'street')!;
  active = run(active, { type: 'startChat', id: listing.id });
  active = run(active, { type: 'refresh', marketId: 'street' });
  assert.equal(
    active.chats!.find((t) => t.id === buyChatId(listing.id))!.status,
    'active',
  );
  active.board.find((i) => i.id === listing.id)!.expires =
    active.minute + ACTION_TICK;
  active = run(active, { type: 'refresh', marketId: 'street' });
  const t = active.chats!.find((t) => t.id === buyChatId(listing.id))!;
  assert.equal(t.status, 'expired');
  assert.ok(t.messages.length);
  assert.equal(execute(active, { type: 'buy', id: listing.id }).ok, false);
});
test('buyer negotiation resumes, seller can cancel without unlisting and later buyers get separate rooms', () => {
  let g = parseSave({ version: 2, game: buyer(), favoriteIds: [] }).game;
  assert.equal(g.chats!.length, 1);
  const original = core(g);
  g = run(g, { type: 'counter', id: 'buyer-1', price: 90000 });
  assert.deepEqual(core(g), original);
  g = parseSave({ version: 2, game: g, favoriteIds: [] }).game;
  assert.equal(g.inquiries[0].price, 90000);
  assert.equal(g.chats![0].messages.length, 3);
  g = run(g, { type: 'break', id: 'buyer-1' });
  assert.equal(g.sales.length, 1);
  assert.equal(g.inventory.length, 1);
  assert.equal(g.chats![0].status, 'cancelled');
  assert.match(g.chats![0].messages.at(-1)!.text, /하지 않을/);
  g.inquiries = [
    {
      id: 'buyer-2',
      saleId: 'sale-1',
      name: '다음손님',
      price: 100000,
      max: 100000,
      rounds: 0,
    },
  ];
  syncTradeChats(g);
  assert.equal(g.chats!.length, 2);
  assert.equal(
    g.chats!.find((t) => t.id === sellChatId('buyer-1'))!.status,
    'cancelled',
  );
  assert.equal(
    g.chats!.find((t) => t.id === sellChatId('buyer-2'))!.status,
    'active',
  );
});
test('successful buyer payment archives the exact agreed price and dialogue once; duplicate accept cannot credit cash', () => {
  let g = parseSave({ version: 2, game: buyer(), favoriteIds: [] }).game;
  const cash = g.cash;
  g = run(g, { type: 'accept', id: 'buyer-1' });
  assert.equal(g.cash, cash + 80000);
  assert.equal(g.inventory.length, 0);
  assert.equal(g.sales.length, 0);
  const t = g.chats!.find((t) => t.id === sellChatId('buyer-1'))!;
  assert.equal(t.status, 'completed');
  assert.equal(t.price, 80000);
  assert.match(t.messages.at(-1)!.text, /80,000/);
  const snapshot = structuredClone(g);
  assert.equal(execute(g, { type: 'accept', id: 'buyer-1' }).ok, false);
  assert.deepEqual(g, snapshot);
  assert.deepEqual(parseSave({ version: 2, game: g, favoriteIds: [] }).game, g);
});
test('buyer walkaway preserves the actual last counterproposal, response and active listing', () => {
  let g = buyer();
  g.inquiries[0].price = 90000;
  g.inquiries[0].max = 90000;
  g = parseSave({ version: 2, game: g, favoriteIds: [] }).game;
  g = run(g, { type: 'counter', id: 'buyer-1', price: 100000 });
  assert.equal(g.inquiries.length, 0);
  assert.equal(g.sales.length, 1);
  const t = g.chats![0];
  assert.equal(t.status, 'cancelled');
  assert.equal(t.messages.length, 3);
  assert.match(t.messages[1].text, /100,000/);
  assert.match(t.messages[2].text, /어려울/);
});
test('unanswered inquiries allow other actions and keep the original negotiation available', () => {
  let g = parseSave({ version: 2, game: buyer(), favoriteIds: [] }).game;
  const original = structuredClone(g);
  for (const c of [
    { type: 'wait' },
    { type: 'dailyWork' },
    { type: 'walk' },
    { type: 'refresh' },
    { type: 'buy', id: g.board[0].id },
    { type: 'repay', amount: 100 },
  ] as Command[]) {
    const r = execute(g, c);
    assert.equal(r.ok, true, r.message);
    assert.equal(r.game.minute, g.minute + ACTION_TICK);
    assert.deepEqual(r.game.inquiries, g.inquiries);
    assert.ok(isGame(r.game));
  }
  assert.deepEqual(g, original);
  g = run(g, { type: 'readChat', id: sellChatId('buyer-1') });
  g = run(g, { type: 'startChat', id: g.board[0].id });
  g = run(g, { type: 'check', id: g.inventory[0].id });
  assert.equal(g.minute, original.minute);
  assert.equal(g.inquiries.length, 1);
});
test('legacy conversations migrate without rewriting gameplay and malformed archives reject import', () => {
  const old = buyer(),
    snap = structuredClone(old);
  const g = parseSave({ version: 2, game: old, favoriteIds: [] }).game;
  assert.deepEqual(core(g), core(old));
  assert.deepEqual(old, snap);
  assert.deepEqual(parseSave({ version: 2, game: g, favoriteIds: [] }).game, g);
  for (const edit of [
    (g: Game) => {
      g.chats![0].id = 'bad';
    },
    (g: Game) => {
      g.chats![0].price = 51;
    },
    (g: Game) => {
      g.chats!.push(g.chats![0]);
    },
    (g: Game) => {
      g.chats![0].messages[0].speaker = 'system' as 'other';
    },
    (g: Game) => {
      g.chatSerial = 0;
    },
  ]) {
    const bad = structuredClone(g);
    edit(bad);
    assert.throws(() => parseSave({ version: 2, game: bad, favoriteIds: [] }));
  }
  assert.deepEqual(
    parseResumeIntent(
      JSON.stringify({
        version: 1,
        screen: 'game',
        slot: 1,
        tab: '알 수 없는 탭',
      }),
    ),
    { screen: 'menu' },
  );
  assert.deepEqual(
    parseResumeIntent(
      JSON.stringify({ version: 1, screen: 'game', slot: 1, tab: '내 정보' }),
    ),
    { screen: 'game', slot: 1, tab: '활동' },
  );
});
test('archive capacity prunes old closed rooms, retaining all current live conversations', () => {
  const g = parseSave({ version: 2, game: buyer(), favoriteIds: [] }).game;
  const live = structuredClone(g.chats![0]);
  for (let i = 0; i < CHAT_LIMIT; i++)
    g.chats!.push({
      ...live,
      id: sellChatId('old-' + i),
      inquiryId: 'old-' + i,
      status: 'completed',
      updated: ++g.chatSerial!,
    });
  syncTradeChats(g);
  assert.equal(g.chats!.length, CHAT_LIMIT);
  assert.ok(g.chats!.some((t) => t.id === live.id));
  assert.ok(isGame(g));
});

test('ignoring inquiries lets their listing expire, archives each chat, and preserves other sales and all owned assets', () => {
  let g = buyer();
  g.sales[0].expires = ACTION_TICK * 2;
  const other = g.board.shift()!;
  g.inventory.push({ ...other, acquiredFor: other.price });
  g.sales.push({
    id: 'other-sale',
    itemId: other.id,
    price: 100000,
    created: 0,
    expires: ACTION_TICK * 12,
    nextCheck: ACTION_TICK * 12,
  });
  g.inquiries.push({
    ...g.inquiries[0],
    id: 'other-buyer',
    saleId: 'other-sale',
  });
  g = parseSave({ version: 2, game: g, favoriteIds: [] }).game;
  const history = structuredClone(
    g.chats!.find((t) => t.id === sellChatId('buyer-1'))!.messages,
  );
  const inventory = structuredClone(g.inventory),
    cash = g.cash;
  g = run(g, { type: 'walk' });
  assert.equal(g.inquiries.length, 2);
  g = run(g, { type: 'walk' });
  assert.deepEqual(
    g.sales.map((s) => s.id),
    ['other-sale'],
  );
  assert.deepEqual(
    g.inquiries.map((q) => q.id),
    ['other-buyer'],
  );
  const archived = g.chats!.find((t) => t.id === sellChatId('buyer-1'))!;
  assert.equal(archived.status, 'expired');
  assert.deepEqual(archived.messages, history);
  assert.equal(
    g.chats!.find((t) => t.id === sellChatId('other-buyer'))!.status,
    'active',
  );
  assert.deepEqual(g.inventory, inventory);
  assert.equal(g.cash, cash);
  assert.ok(isGame(g));
  for (const type of ['accept', 'counter', 'reject'] as const) {
    const r = execute(g, {
      type,
      id: 'buyer-1',
      ...(type === 'counter' ? { price: 100000 } : {}),
    } as Command);
    assert.equal(r.ok, false);
    assert.strictEqual(r.game, g);
  }
  assert.deepEqual(
    parseSave(
      JSON.parse(JSON.stringify({ version: 2, game: g, favoriteIds: [] })),
    ).game,
    g,
  );
});

test('pending inquiries do not block posting or selling other items, while cancelling their own listing closes the related chats', () => {
  let g = buyer();
  const extra = g.board.find(
    (i) => i.marketId === 'street' && i.stateGrade !== 'F',
  )!;
  g.board = g.board.filter((i) => i.id !== extra.id);
  g.inventory.push({ ...extra, acquiredFor: extra.price });
  g = parseSave({ version: 2, game: g, favoriteIds: [] }).game;
  const original = structuredClone(g);
  for (const command of [
    { type: 'post', id: extra.id, price: 100000 },
    { type: 'outletSell', id: extra.id },
    { type: 'cancel', id: g.inventory[0].id },
  ] as Command[]) {
    const after = run(g, command);
    assert.equal(after.weekActions, 1);
    if (command.type === 'cancel') {
      assert.equal(after.inquiries.length, 0);
      assert.equal(after.sales.length, 0);
      assert.deepEqual(after.inventory, g.inventory);
      assert.equal(
        after.chats!.find((t) => t.id === sellChatId('buyer-1'))!.status,
        'expired',
      );
    } else {
      assert.deepEqual(after.inquiries, g.inquiries);
      assert.ok(after.sales.some((s) => s.id === 'sale-1'));
      assert.equal(
        after.inventory.some((i) => i.id === extra.id),
        command.type === 'post',
      );
    }
    assert.deepEqual(g, original);
  }
});
