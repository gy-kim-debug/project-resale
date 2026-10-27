import { BUSINESS_LIMIT_PER_TYPE, BUSINESSES } from '../src/content/businesses';
import {
  pendingBusinessIncome,
  weeklyBusinessIncome,
} from '../src/domain/business';
import { applySpecialListing } from '../src/domain/specialListings';
import { SPECIAL_LISTINGS } from '../src/content/specialListings';
import { roundMoney, moneyRatio, MONEY_UNIT } from '../src/domain/money';
import { normalizeMoney, allMoneyAligned } from '../src/domain/moneyMigration';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  execute,
  newGame,
  listingLimit,
  marketValue,
  checkCost,
  repairCost,
} from '../src/domain/engine';
import {
  ACTION_TICK,
  actionsLeft,
  dayOf,
  weekOf,
  type Command,
  type Game,
} from '../src/domain/game';
import {
  createListingInfo,
  listingAskPrice,
  listingValuePercent,
  listingFindings,
  tagIsTrue,
  sellerProfile,
} from '../src/domain/listingTags';
import { TAG_RULES, KIND_TAGS } from '../src/content/listingTags';
import type { ListingTag, SellerTrait } from '../src/domain/game';
import { auctionBidOptions } from '../src/domain/auction';
import { MARKETS, marketOf } from '../src/content/markets';
import { RULES } from '../src/content/rules';
import { isGame } from '../src/storage/validation';
import { parseSave } from '../src/storage/saveRepository';
import {
  weeklyInterest,
  weeklyRateText,
  interestAmount,
  mandatoryPrincipal,
  weeklyPrincipalTarget,
  settlementAmount,
  interestPending,
  WEEK_TICKS,
} from '../src/domain/debt';
import { purchaseReply, saleReply } from '../src/domain/bargaining';
import {
  openingPurchaseOffers,
  purchaseApproach,
  purchaseProfile,
  nextPurchaseOffers,
} from '../src/domain/purchaseBargaining';
import { BARGAINING_MARKETS } from '../src/content/bargaining';
import { instantSalePrice } from '../src/domain/instantSale';
import { acquisitionCost, compareItem } from '../src/domain/inventory';
function run(g: Game, c: Command) {
  const r = execute(g, c);
  assert.ok(r.ok, r.message);
  assert.ok(isGame(r.game), JSON.stringify(r.game));
  return r.game;
}
function nextDay(g: Game) {
  const day = dayOf(g);
  while (dayOf(g) === day) {
    for (const q of g.inquiries) g = run(g, { type: 'break', id: q.id });
    g = run(g, { type: 'wait' });
  }
  return g;
}
function rich(seed = 3) {
  const g = newGame(seed);
  g.cash = 100_000;
  g.stats.peakCash = 100_000;
  return g;
}
function owned() {
  const g = rich();
  g.inventory.push({ ...g.board[0], checked: true });
  g.board.shift();
  return g;
}
function pending() {
  let g = owned();
  g = run(g, { type: 'post', id: g.inventory[0].id, price: 1000 });
  for (let n = 0; n < 30 && !g.inquiries.length; n++)
    g = run(g, { type: 'wait' });
  assert.ok(g.inquiries.length);
  return g;
}

test('start, deterministic RNG, pure engine, rejected commands do not change time/RNG', () => {
  const g = newGame(42);
  assert.equal(g.cash, 500000);
  assert.equal(g.principal, 10_000_000_000);
  assert.deepEqual(g.inventory, []);
  assert.deepEqual(newGame(42), g);
  g.board[0].price = g.cash + 100;
  const snapshot = structuredClone(g);
  const failed = execute(g, { type: 'buy', id: g.board[0].id });
  assert.equal(failed.ok, false);
  assert.deepEqual(g, snapshot);
  assert.strictEqual(failed.game, g);
  const next = run(g, { type: 'job', id: 'flyer' });
  assert.equal(next.minute, g.minute + ACTION_TICK);
  assert.equal(next.cash, 509000);
  assert.deepEqual(g, snapshot);
});
test('obsolete hunger fields are discarded without blocking actions or changing progress', () => {
  const original = owned();
  original.minute = ACTION_TICK;
  original.weekActions = 1;
  original.inventory[0].checked = false;
  const legacy = { ...original, satiety: 0, hungerRemainder: 59 };
  const snapshot = structuredClone(legacy);
  const g = parseSave({ version: 2, game: legacy, favoriteIds: [] }).game;
  assert.equal('satiety' in g, false);
  assert.equal('hungerRemainder' in g, false);
  assert.equal(actionsLeft(g), 19);
  assert.deepEqual(legacy, snapshot);
  assert.deepEqual(g.inventory, original.inventory);
  for (const c of [
    { type: 'job', id: 'flyer' },
    { type: 'scavenge' },
    { type: 'refresh' },
    { type: 'check', id: g.inventory[0].id },
  ] as Command[])
    assert.equal(execute(g, c).ok, true);
  assert.equal(g.cash, original.cash);
  assert.equal(g.principal, original.principal);
  assert.deepEqual(parseSave({ version: 2, game: g, favoriteIds: [] }).game, g);
});
test('removed survival commands cannot spend money or advance the day', () => {
  const g = rich();
  for (const type of ['meal', 'treat', 'sleep']) {
    const snapshot = structuredClone(g);
    const result = execute(g, { type, id: 'free' } as unknown as Command);
    assert.equal(result.ok, false);
    assert.strictEqual(result.game, g);
    assert.deepEqual(g, snapshot);
  }
});
test('old survival fields are ignored and stripped without changing time, inventory or finances', () => {
  const g = rich();
  const old = { ...g, health: 0, fatigue: 0, fatigueRemainder: 59 };
  const restored = parseSave({ version: 2, game: old, favoriteIds: [] }).game;
  assert.deepEqual(restored, g);
  const worked = run(restored, { type: 'job', id: 'warehouse' });
  assert.equal(worked.minute, ACTION_TICK);
  assert.equal(actionsLeft(worked), 19);
});
test('obsolete survival fields do not modify hidden value or stochastic negotiation outcomes', () => {
  const a = rich(60),
    b = structuredClone(a);
  Object.assign(b, { health: 20, fatigue: 0 });
  const c: Command = {
    type: 'offer',
    id: a.board[0].id,
    price: a.board[0].offers[1],
  };
  const ra = run(a, c),
    rb = run(b, c);
  assert.equal(ra.board[0].value, rb.board[0].value);
  assert.equal(ra.board[0].negotiation, rb.board[0].negotiation);
  assert.equal(ra.seed, rb.seed);
});
test('free giveaways appear randomly regardless of capital; available giveaway is guaranteed', () => {
  let absent = false,
    present = false;
  for (let seed = 1; seed < 100; seed++) {
    const g = newGame(seed);
    const f = g.board.find((i) => i.price === 0);
    if (!f) absent = true;
    else {
      present = true;
      const next = run(g, { type: 'buy', id: f.id });
      assert.equal(next.inventory[0].id, f.id);
      assert.equal(next.cash, g.cash);
    }
  }
  assert.ok(absent && present);
});
test('scavenging always finds one item; capacity checked before cost/time', () => {
  let g = newGame();
  for (let n = 0; n < RULES.capacity; n++) {
    g = run(g, { type: 'scavenge' });
    assert.equal(g.inventory.length, n + 1);
  }
  const snapshot = structuredClone(g);
  assert.equal(execute(g, { type: 'scavenge' }).ok, false);
  assert.deepEqual(g, snapshot);
});
test('purchase costs are atomic, no transport fee, value needs separate check', () => {
  let g = rich();
  const item = g.board[0],
    cash = g.cash;
  g = run(g, { type: 'buy', id: item.id });
  assert.equal(g.cash, cash - item.price);
  assert.equal(g.inventory[0].checked, false);
  assert.equal(
    g.board.some((i) => i.id === item.id),
    false,
  );
  assert.equal(execute(g, { type: 'buy', id: item.id }).ok, false);
  g = run(g, { type: 'check', id: item.id });
  assert.equal(g.inventory[0].checked, true);
  assert.ok(g.stats.checks === 1);
});
test('stale purchase offers are rejected and current seller quote is charged once', () => {
  let g = rich(11);
  const i = g.board[0];
  assert.equal(execute(g, { type: 'offer', id: i.id, price: 100 }).ok, false);
  g = run(g, { type: 'offer', id: i.id, price: i.offers[1] });
  assert.equal(
    execute(g, { type: 'offer', id: i.id, price: i.offers[0] }).ok,
    false,
  );
  const cash = g.cash,
    price = g.board[0].negotiatedPrice ?? i.price;
  g = run(g, { type: 'buy', id: i.id });
  assert.equal(g.cash, cash - price);
});
test('listing capacity, immutable price, inventory slots preserved, cancel permits repost', () => {
  let g = owned();
  const item = g.inventory[0];
  g = run(g, { type: 'post', id: item.id, price: 5000 });
  assert.equal(g.inventory.length, 1);
  assert.equal(
    execute(g, { type: 'post', id: item.id, price: 6000 }).ok,
    false,
  );
  assert.equal(execute(g, { type: 'discard', id: item.id }).ok, false);
  g = run(g, { type: 'cancel', id: item.id });
  g = run(g, { type: 'post', id: item.id, price: 6000 });
  assert.equal(g.sales[0].price, 6000);
  for (const price of [-1, 1.5, Infinity, NaN, Number.MAX_SAFE_INTEGER + 1])
    assert.equal(
      execute(owned(), { type: 'post', id: item.id, price }).ok,
      false,
    );
});
test('pending inquiries block actions; breaking one chat preserves listing and other buyers', () => {
  let g = pending();
  assert.ok(g.inquiries.length >= 2);
  const serialized = parseSave(
    JSON.parse(JSON.stringify({ version: 2, game: g, favoriteIds: [] })),
  );
  assert.deepEqual(serialized.game, g);
  for (const c of [
    { type: 'repay', amount: 100 },
    { type: 'discard', id: g.inventory[0].id },
    { type: 'refresh' },
  ] as Command[])
    assert.equal(execute(g, c).ok, false);
  const id = g.inventory[0].id;
  const sale = structuredClone(g.sales[0]);
  const other = structuredClone(g.inquiries[1]);
  g = run(g, { type: 'break', id: g.inquiries[0].id });
  assert.deepEqual(g.inquiries, [other]);
  assert.deepEqual(g.sales, [sale]);
  g = run(g, { type: 'break', id: other.id });
  assert.equal(g.inquiries.length, 0);
  assert.deepEqual(g.sales, [sale]);
  assert.equal(execute(g, { type: 'post', id, price: 3000 }).ok, false);
  g = run(g, { type: 'cancel', id });
  g = run(g, { type: 'post', id, price: 3000 });
  assert.equal(g.sales[0].price, 3000);
});
test('buyer rejection may raise or walk; rounds terminate but listing stays active', () => {
  for (let seed = 1; seed < 20; seed++) {
    let g = pending();
    g.seed = seed;
    let n = 0;
    while (g.inquiries.length && n++ < 10) {
      const old = { ...g.inquiries[0] };
      g = run(g, { type: 'reject', id: old.id });
      const continuing = g.inquiries.find((q) => q.id === old.id);
      if (continuing) assert.ok(continuing.price > old.price);
    }
    assert.equal(g.inquiries.length, 0);
    assert.equal(g.sales.length, 1);
  }
});
test('accepted sale transfers item and exact money once, improves trade ability', () => {
  let g = pending();
  const q = g.inquiries[0],
    cash = g.cash;
  g.stats.sales = 4;
  g = run(g, { type: 'accept', id: q.id });
  assert.equal(g.cash, cash + q.price);
  assert.equal(g.inventory.length, 0);
  assert.equal(g.sales.length, 0);
  assert.equal(g.inquiries.length, 0);
  assert.equal(listingLimit(g), 4);
  assert.equal(execute(g, { type: 'accept', id: q.id }).ok, false);
});
test('instant sale needs no visit, transfers exactly once and blocks listed assets', () => {
  let g = owned();
  const id = g.inventory[0].id;
  assert.equal(execute(g, { type: 'outletSell', id }).ok, true);
  g = run(g, { type: 'visit', id: 'scrap' });
  const price = g.quotes!.prices[id],
    cash = g.cash;
  const sale = run(g, { type: 'outletSell', id });
  assert.equal(sale.cash, cash + price);
  assert.equal(sale.inventory.length, 0);
  assert.equal(execute(sale, { type: 'outletSell', id }).ok, false);
  g = owned();
  g = run(g, { type: 'post', id: g.inventory[0].id, price: 99999999 });
  g = run(g, { type: 'visit', id: 'scrap' });
  assert.equal(
    execute(g, { type: 'outletSell', id: g.inventory[0].id }).ok,
    false,
  );
});
test('repair charges once and may fail, appraisal required, value depends on item only', () => {
  const g = owned();
  const i = g.inventory[0];
  i.condition = '고장';
  i.value = Math.floor(i.base * 0.18);
  i.checked = false;
  assert.equal(execute(g, { type: 'repair', id: i.id }).ok, false);
  i.checked = true;
  const next = run(g, { type: 'repair', id: i.id });
  assert.ok(next.cash < g.cash);
  assert.equal(next.inventory[0].repaired, true);
  assert.equal(execute(next, { type: 'repair', id: i.id }).ok, false);
});
test('principal repayments are separate from interest; legacy interest remains payable and final payment clears', () => {
  let g = rich();
  g.interest = 100;
  g = run(g, { type: 'repay', amount: 150 });
  assert.equal(g.interest, 100);
  assert.equal(g.principal, RULES.debt - 200);
  g = rich();
  g.principal = 100;
  g.interest = 100;
  g = run(g, { type: 'repay', amount: 100 });
  assert.equal(g.status, 'playing');
  g = run(g, { type: 'payInterest' });
  assert.equal(g.status, 'cleared');
  assert.equal(execute(g, { type: 'job', id: 'flyer' }).ok, false);
});
test('expiry frees listing without disposing item; fixed capacity never grows', () => {
  let g = owned();
  g = run(g, { type: 'post', id: g.inventory[0].id, price: 999999999 });
  g.minute += 2880;
  g = nextDay(g);
  assert.equal(g.sales.length, 0);
  assert.equal(g.inventory.length, 1);
  assert.ok(g.inventory.length <= RULES.capacity);
});
test('conditional event chain and random market update', () => {
  let g = rich();
  g.stats.sales = 3;
  g.minute += ACTION_TICK;
  g = run(g, { type: 'wait' });
  assert.equal(g.event?.type, 'repair');
  g = run(g, { type: 'event', choice: 'yes' });
  assert.equal(g.eventStage, 2);
  assert.ok(g.stats.repairs >= 4);
  g = nextDay(g);
  g = nextDay(g);
  assert.equal(g.eventStage, 3);
  assert.ok(g.logs.some((l) => l.text.includes('감사금')));
});
test('corrupt data rejected, broken references and malformed bankrupt state rejected', () => {
  const g = newGame();
  assert.ok(isGame(g));
  assert.throws(() =>
    parseSave({ version: 2, game: { ...g, cash: 1.2 }, favoriteIds: [] }),
  );
  assert.equal(isGame({ ...g, inventory: [{}] }), false);
  assert.equal(isGame({ ...g, interestWeek: 99 }), false);
  assert.equal(isGame({ ...g, principal: -1 }), false);
  assert.equal(isGame({ ...g, seed: NaN }), false);
  assert.equal(
    isGame({ ...g, inquiries: [{ id: 'bad', saleId: 'missing' }] }),
    false,
  );
});

for (const seed of [1, 42, 210])
  test(`long-play seed ${seed} trades until clear or a verifiable unpaid weekly invoice`, () => {
    let g = newGame(seed);
    let commands = 0;
    const step = (c: Command) => {
      const r = execute(g, c);
      assert.ok(r.ok, r.message);
      g = r.game;
      commands++;
      assert.ok(isGame(g));
    };
    while (g.status === 'playing' && commands < 8000) {
      if (interestPending(g)) {
        if (mandatoryPrincipal(g) > 0) {
          step({ type: 'repay', amount: mandatoryPrincipal(g) });
          continue;
        }
        step({ type: 'payInterest' });
        continue;
      }
      if (actionsLeft(g) === 0) {
        for (const q of g.inquiries) step({ type: 'break', id: q.id });
        step({ type: 'startSettlement' });
        continue;
      }
      if (g.inquiries.length) {
        const q = [...g.inquiries].sort((a, b) => b.price - a.price)[0];
        step({ type: 'accept', id: q.id });
        continue;
      }
      if (g.cash >= g.principal + g.interest) {
        step({ type: 'repay', amount: g.principal + g.interest });
        continue;
      }
      if (g.sales.length) {
        step({ type: 'wait' });
        continue;
      }
      if (g.inventory.length) {
        const i = g.inventory[0];
        if (!i.checked) {
          const r = execute(g, { type: 'check', id: i.id });
          if (r.ok) {
            g = r.game;
            commands++;
          } else step({ type: 'job', id: 'shop' });
          continue;
        }
        step({ type: 'post', id: i.id, price: marketValue(g, i) });
        continue;
      }
      const affordable = g.board
        .filter(
          (i) =>
            i.price > 0 &&
            i.price <= g.cash * 0.6 &&
            !i.purchaseBargain?.walked &&
            (i.negotiation !== 'rejected' || !!i.purchaseBargain),
        )
        .sort((a, b) => b.price - a.price);
      const candidate = affordable[0];
      // Use only public prices and seller replies before buying; condition is hidden.
      if (candidate?.auction && candidate.auction.status !== 'won')
        step({
          type: 'bid',
          id: candidate.id,
          amount: auctionBidOptions(candidate)[0],
        });
      else if (
        candidate &&
        !candidate.chatSettled &&
        candidate.negotiation !== 'accepted' &&
        candidate.offers.length
      )
        step({ type: 'offer', id: candidate.id, price: candidate.offers[0] });
      else if (candidate) step({ type: 'buy', id: candidate.id });
      else if (g.cash < 35000) step({ type: 'job', id: 'shop' });
      else step({ type: 'refresh' });
    }
    console.log(
      JSON.stringify({
        simulation: 'honest bot uses actual checked value after purchase',
        seed,
        commands,
        days: Math.floor(g.minute / 1440) + 1,
        cash: g.cash,
        repaid: g.stats.repaid,
        status: g.status,
      }),
    );
    assert.ok(g.status === 'cleared' || g.status === 'bankrupt');
    assert.ok(commands > 40);
    if (g.status === 'bankrupt') {
      assert.ok(interestPending(g));
      assert.ok(g.cash < settlementAmount(g));
      assert.equal(execute(g, { type: 'job', id: 'warehouse' }).ok, false);
    } else assert.equal(g.principal + g.interest, 0);
  });

test('action costs distinguish major commands from free operations; inquiries start after registration', () => {
  const cases: { game: Game; command: Command; cost: number }[] = [];
  for (const [id, cost] of [
    ['flyer', 1],
    ['shop', 1],
    ['warehouse', 1],
  ] as const)
    cases.push({ game: rich(), command: { type: 'job', id }, cost });
  for (const type of ['scavenge', 'refresh', 'wait'] as const)
    cases.push({ game: rich(), command: { type }, cost: 1 });
  for (const type of ['buy', 'offer'] as const) {
    const g = rich();
    cases.push({
      game: g,
      command:
        type === 'offer'
          ? { type, id: g.board[0].id, price: g.board[0].offers[0] }
          : { type, id: g.board[0].id },
      cost: type === 'offer' ? 0 : 1,
    });
  }
  for (const type of ['check', 'repair', 'post', 'visit', 'repay'] as const) {
    const g = owned();
    g.inventory[0].checked = type !== 'check';
    g.inventory[0].condition = '고장';
    const command: Command =
      type === 'post'
        ? { type, id: g.inventory[0].id, price: 100 }
        : type === 'visit'
          ? { type, id: 'scrap' }
          : type === 'repay'
            ? { type, amount: 100 }
            : { type, id: g.inventory[0].id };
    cases.push({
      game: g,
      command,
      cost: ['visit', 'check', 'repair'].includes(type) ? 0 : 1,
    });
  }
  let g = run(owned(), {
    type: 'post',
    id: owned().inventory[0].id,
    price: 100,
  });
  assert.equal(
    g.inquiries.length,
    0,
    'posting itself does not generate an early inquiry',
  );
  assert.equal(g.sales[0].created, g.minute);
  assert.equal(g.sales[0].expires - g.minute, 48 * 60);
  assert.equal(g.sales[0].nextCheck - g.minute, ACTION_TICK);
  cases.push({
    game: g,
    command: { type: 'cancel', id: g.inventory[0].id },
    cost: 1,
  });
  g = run(owned(), { type: 'visit', id: 'scrap' });
  cases.push({
    game: g,
    command: { type: 'outletSell', id: g.inventory[0].id },
    cost: 1,
  });
  for (const type of ['accept', 'reject', 'break'] as const) {
    g = pending();
    if (type !== 'accept') continue; // free chat commands are covered separately
    cases.push({ game: g, command: { type, id: g.inquiries[0].id }, cost: 1 });
  }
  for (const choice of ['yes', 'no'] as const) {
    g = rich();
    g.event = {
      id: 'hour-event',
      type: 'deal',
      title: '제안',
      text: '행동 1회',
      expires: g.minute + 480,
    };
    cases.push({
      game: g,
      command: { type: 'event', choice },
      cost: choice === 'yes' ? 1 : 0,
    });
  }
  for (const { game, command, cost } of cases) {
    const next = run(game, command);
    assert.equal(
      next.minute - game.minute,
      cost * ACTION_TICK,
      JSON.stringify(command),
    );
    assert.equal(next.minute % ACTION_TICK, 0);
  }
});

test('legacy saves migrate once to a fresh three-action day without losing resources', () => {
  const old = run(owned(), { type: 'visit', id: 'scrap' });
  delete old.timeMode;
  old.minute = 3 * 1440 + 23 * 60 + 45;
  old.marketDay = 4;
  old.board[0].expires = old.minute + 30;
  old.lastEvent = old.minute - 180;
  old.quotes!.at = old.minute - 15;
  Object.assign(old, { satiety: 0, hungerRemainder: 15 });
  const snapshot = structuredClone(old);
  const migrated = parseSave({
    version: 2,
    game: old,
    favoriteIds: ['favorite'],
  });
  const g = migrated.game;
  assert.deepEqual(old, snapshot, 'migration is pure');
  assert.ok(isGame(g));
  assert.equal(g.minute, 3 * 1440);
  assert.equal(actionsLeft(g), 11);
  assert.equal(g.board[0].expires - g.minute, ACTION_TICK);
  assert.equal(g.minute - g.quotes!.at, 0);
  for (const key of ['cash', 'principal', 'interest', 'seed'] as const)
    assert.equal(g[key], old[key]);
  assert.deepEqual(migrated.favoriteIds, ['favorite']);
  assert.deepEqual(parseSave(migrated), migrated, 'migration is idempotent');
  const first = run(g, { type: 'wait' });
  assert.equal(first.interest, g.interest);
  const second = run(first, { type: 'wait' });
  const after = run(second, { type: 'wait' });
  assert.equal(after.minute, 4 * 1440);
  assert.equal(after.interest, g.interest);
  assert.equal(run(after, { type: 'wait' }).interest, after.interest);
});

test('purchase chat and closure are free; only purchase consumes transaction time', () => {
  const before = rich();
  const item = before.board[0];
  const chat = run(before, {
    type: 'offer',
    id: item.id,
    price: item.offers[1],
  });
  for (const key of ['minute', 'cash', 'interest', 'lastEvent'] as const)
    assert.equal(chat[key], before[key]);
  assert.equal(chat.board[0].chat?.length, 3);
  const restored = parseSave(
    JSON.parse(JSON.stringify({ version: 2, game: chat, favoriteIds: [] })),
  ).game;
  assert.deepEqual(restored, chat);
  const bought = run(restored, { type: 'buy', id: item.id });
  assert.equal(
    bought.minute - before.minute,
    ACTION_TICK,
    'chat plus exchange is one hour total',
  );
  assert.equal(bought.inventory[0].chatSettled, true);
  const closed = run(restored, { type: 'closeChat', id: item.id });
  assert.equal(closed.minute, before.minute);
  assert.equal(closed.board[0].chatSettled, true);
  assert.equal(execute(closed, { type: 'closeChat', id: item.id }).ok, false);
  const hungry = structuredClone(before);
  const hungryChat = run(hungry, {
    type: 'offer',
    id: item.id,
    price: item.offers[0],
  });
  assert.ok(
    run(hungryChat, { type: 'closeChat', id: item.id }).board[0].chatSettled,
  );
  const invalid = structuredClone(chat);
  invalid.board[0].chat = [{ speaker: 'other', text: 42 } as never];
  assert.equal(isGame(invalid), false);
});

test('sales chat and either side walking cost no time; completed sale costs one daily action', () => {
  const base = pending();
  let continued = false,
    walked = false;
  for (const seed of [1, 1000, 12345, 999999, 123456789]) {
    const g = structuredClone(base);
    g.seed = seed;
    const q = g.inquiries[0];
    q.price = 100;
    q.max = 1000;
    q.rounds = 0;
    const after = run(g, { type: 'reject', id: q.id });
    if (after.inquiries.some((inquiry) => inquiry.id === q.id)) {
      continued = true;
      for (const key of ['minute', 'interest', 'lastEvent'] as const)
        assert.equal(after[key], g[key]);
      assert.equal(after.inquiries[0].chat?.length, 3);
      assert.ok(after.inquiries[0].price > q.price);
      for (const type of ['accept', 'break'] as const) {
        const ended = run(after, { type, id: q.id });
        assert.equal(
          ended.minute - g.minute,
          type === 'accept' ? ACTION_TICK : 0,
        );
        assert.equal(
          ended.inquiries.length,
          type === 'accept' ? 0 : after.inquiries.length - 1,
        );
        assert.equal(ended.sales.length, type === 'accept' ? 0 : 1);
        assert.equal(execute(ended, { type, id: q.id }).ok, false);
      }
    } else {
      walked = true;
      assert.equal(after.minute, g.minute);
      assert.deepEqual(after.sales, g.sales);
      assert.equal(after.inquiries.length, g.inquiries.length - 1);
    }
  }
  assert.ok(continued && walked, 'both negotiation outcomes covered');
  const old = structuredClone(base);
  delete old.inquiries[0].chat;
  assert.ok(isGame(old), 'old v2 saves do not require chat histories');
});

test('removed pre-purchase inspection is rejected atomically; legacy inspection flag remains loadable', () => {
  const g = rich();
  const snapshot = structuredClone(g);
  const oldCommand = {
    type: 'inspect',
    id: g.board[0].id,
  } as unknown as Command;
  const result = execute(g, oldCommand);
  assert.equal(result.ok, false);
  assert.strictEqual(result.game, g);
  assert.deepEqual(g, snapshot);
  const legacy = JSON.parse(
    JSON.stringify({ version: 2, game: g, favoriteIds: [] }),
  );
  legacy.game.board[0].inspected = true;
  const restored = parseSave(legacy).game;
  assert.equal(restored.cash, g.cash);
  const bought = run(restored, { type: 'buy', id: restored.board[0].id });
  assert.equal(bought.inventory[0].condition, g.board[0].condition);
  assert.equal(
    bought.inventory[0].checked,
    false,
    'value and hidden defects still need appraisal',
  );
  assert.equal(bought.minute - g.minute, ACTION_TICK);
});

test('acquisition cost records the exact payment, survives appraisal, and free finds cost zero', () => {
  let g = rich();
  const item = g.board[0];
  g = run(g, { type: 'offer', id: item.id, price: item.offers[1] });
  const expected = g.board[0].negotiatedPrice ?? item.price;
  const before = g.cash;
  g = run(g, { type: 'buy', id: item.id });
  assert.equal(g.inventory[0].acquiredFor, expected);
  assert.equal(before - g.cash, expected);
  assert.deepEqual(compareItem(g, g.inventory[0]), {
    cost: expected,
    value: null,
    difference: null,
  });
  g = run(g, { type: 'check', id: item.id });
  assert.equal(acquisitionCost(g.inventory[0]), expected);
  assert.equal(
    compareItem(g, g.inventory[0]).value,
    marketValue(g, g.inventory[0]),
  );
  const found = run(rich(), { type: 'scavenge' });
  assert.equal(found.inventory[0].acquiredFor, 0);
  assert.equal(acquisitionCost(found.inventory[0]), 0);
  const free = rich();
  free.board[0].price = 0;
  free.board[0].negotiatedPrice = null;
  assert.equal(
    run(free, { type: 'buy', id: free.board[0].id }).inventory[0].acquiredFor,
    0,
  );
});

test('inventory comparison follows market changes and safely reads legacy costs without revealing unchecked values', () => {
  const g = owned();
  const item = g.inventory[0];
  item.acquiredFor = 1000;
  const first = compareItem(g, item);
  g.marketFactor += 20;
  const updated = compareItem(g, item);
  assert.equal(updated.cost, first.cost);
  assert.equal(updated.value, marketValue(g, item));
  assert.equal(updated.difference, updated.value! - 1000);
  assert.notEqual(updated.value, first.value);
  delete item.acquiredFor;
  item.negotiatedPrice = 700;
  assert.equal(acquisitionCost(item), 700);
  item.negotiatedPrice = null;
  assert.equal(acquisitionCost(item), item.price);
  item.acquiredFor = 0;
  assert.equal(acquisitionCost(item), 0);
  item.checked = false;
  assert.equal(compareItem(g, item).value, null);
  assert.ok(isGame(g));
  for (const invalid of [-1, 1.5, Number.MAX_SAFE_INTEGER, '1000']) {
    const bad = structuredClone(g) as unknown as {
      inventory: { acquiredFor: unknown }[];
    };
    bad.inventory[0].acquiredFor = invalid;
    assert.equal(isGame(bad), false);
  }
});

test('seller counteroffers can be accepted or countered; failed negotiation keeps the listing and other buyers', () => {
  const base = pending();
  base.sales[0].price = 1000;
  base.inquiries[0].price = 100;
  base.inquiries[0].max = 500;
  const q = base.inquiries[0];
  const sale = structuredClone(base.sales[0]);
  const accepted = run(base, { type: 'counter', id: q.id, price: 200 });
  assert.equal(accepted.inquiries[0].price, 200);
  assert.equal(accepted.inquiries[0].rounds, 1);
  assert.equal(
    accepted.inquiries[0].chat?.at(-1)?.text.includes('좋아요'),
    true,
  );
  for (const key of ['minute', 'cash', 'interest'] as const)
    assert.equal(accepted[key], base[key]);
  assert.deepEqual(accepted.sales, [sale]);
  assert.deepEqual(accepted.inquiries[1], base.inquiries[1]);
  const restored = parseSave(
    JSON.parse(JSON.stringify({ version: 2, game: accepted, favoriteIds: [] })),
  ).game;
  assert.deepEqual(restored, accepted);
  const sold = run(restored, { type: 'accept', id: q.id });
  assert.equal(sold.cash - base.cash, 200);
  assert.equal(sold.minute - base.minute, ACTION_TICK);
  assert.equal(sold.inventory.length, 0);
  assert.equal(sold.sales.length, 0);
  for (const price of [-1, 0, 100, 1.5, 1050, Infinity, NaN]) {
    const snapshot = structuredClone(base);
    const invalid = execute(base, { type: 'counter', id: q.id, price });
    assert.equal(invalid.ok, false);
    assert.deepEqual(base, snapshot);
    assert.strictEqual(invalid.game, base);
  }
  const exhausted = structuredClone(base);
  exhausted.inquiries[0].rounds = 2;
  assert.equal(
    execute(exhausted, { type: 'counter', id: q.id, price: 200 }).ok,
    false,
  );
  for (const seed of [1, 1000]) {
    const g = structuredClone(base);
    g.seed = seed;
    const result = run(g, { type: 'counter', id: q.id, price: 800 });
    assert.deepEqual(result.sales, [sale]);
    assert.deepEqual(result.inventory, base.inventory);
    assert.deepEqual(
      result.inquiries.find((i) => i.id === base.inquiries[1].id),
      base.inquiries[1],
    );
    const continuing = result.inquiries.find((i) => i.id === q.id);
    if (seed === 1) assert.equal(continuing, undefined);
    else
      assert.ok(
        continuing && continuing.price > 100 && continuing.price <= 500,
      );
    assert.equal(result.minute, g.minute);
  }
});

test('new buyers can inquire on the same unchanged listing after all previous chats break', () => {
  let g = pending();
  const sale = structuredClone(g.sales[0]);
  const previous = g.inquiries.map((q) => q.id);
  while (g.inquiries.length)
    g = run(g, { type: 'break', id: g.inquiries[0].id });
  assert.deepEqual(g.sales, [sale]);
  assert.equal(g.inventory.length, 1);
  for (let n = 0; n < 8 && !g.inquiries.length; n++)
    g = run(g, { type: 'wait' });
  assert.ok(g.inquiries.length);
  assert.equal(g.sales[0].id, sale.id);
  assert.equal(g.sales[0].price, sale.price);
  assert.equal(g.sales[0].expires, sale.expires);
  assert.ok(g.inquiries.every((q) => !previous.includes(q.id)));
});

test('outlet travel consumes no time, stats, RNG or journal entries; actual selling costs one daily action', () => {
  const original = owned();
  original.minute = 3 * 1440 + ACTION_TICK * 2;
  original.marketDay = 4;
  let g = original;
  for (const id of ['scrap', 'used', 'collector', 'scrap']) {
    g = run(g, { type: 'visit', id });
    assert.equal(g.quotes?.outlet, id);
    assert.equal(g.quotes?.at, original.minute);
    const { quotes: ignoredOriginal, ...before } = original;
    const { quotes: ignoredNext, ...after } = g;
    void ignoredOriginal;
    void ignoredNext;
    assert.deepEqual(after, before);
  }
  const playable = structuredClone(g);
  const quote = playable.quotes!.prices[playable.inventory[0].id];
  const sold = run(playable, {
    type: 'outletSell',
    id: playable.inventory[0].id,
  });
  assert.equal(sold.minute - playable.minute, ACTION_TICK);
  assert.equal(sold.cash - playable.cash, quote);
  assert.equal(sold.inventory.length, 0);
  assert.equal(
    sold.interest - playable.interest,
    0,
    'crossing a day no longer accrues daily interest',
  );
});

test('twenty major actions exhaust the weekly budget without automatic settlement', () => {
  let g = newGame(42);
  assert.equal(weekOf(g), 1);
  assert.equal(actionsLeft(g), 20);
  for (let used = 1; used <= 20; used++) {
    g = run(g, { type: 'job', id: 'flyer' });
    assert.equal(actionsLeft(g), 20 - used);
    assert.equal(weekOf(g), 1);
    assert.equal(interestPending(g), false);
  }
  const before = structuredClone(g);
  const failed = execute(g, { type: 'job', id: 'flyer' });
  assert.equal(failed.ok, false);
  assert.deepEqual(failed.game, before);
  assert.equal(g.cash, 500000 + 9000 * 20);
});

test('all jobs use exactly one action with no premature day ending', () => {
  let g = newGame();
  for (const remaining of [19, 18, 17]) {
    g = run(g, { type: 'job', id: 'warehouse' });
    assert.equal(actionsLeft(g), remaining);
  }
  assert.equal(dayOf(g), 2);
  assert.equal(g.cash, newGame().cash + 38000 * 3);
});

test('weekly rates increase by 0.002 percentage points and round won exactly', () => {
  for (const [week, rate, amount] of [
    [1, '0.001%', 100000],
    [2, '0.003%', 300000],
    [3, '0.005%', 500000],
    [4, '0.007%', 700000],
  ] as const) {
    assert.equal(weeklyRateText(week), rate);
    assert.equal(weeklyInterest(RULES.debt, week), amount);
  }
  assert.equal(weeklyInterest(1, 1), 0);
  assert.equal(weeklyInterest(100001, 1), 0);
  assert.equal(weeklyInterest(0, 10), 0);
  const principal = 999999999999999;
  assert.equal(
    BigInt(weeklyInterest(principal, 101)),
    ((BigInt(principal) * 201n + 5000000n) / 10000000n) * 100n,
  );
});

test('free navigation, bargaining, disposal and declining proposals never spend a daily action', () => {
  let g = owned();
  const before = g.minute;
  g = run(g, { type: 'visit', id: 'scrap' });
  g = run(g, { type: 'offer', id: g.board[0].id, price: g.board[0].offers[0] });
  g = run(g, { type: 'closeChat', id: g.board[0].id });
  g = run(g, { type: 'discard', id: g.inventory[0].id });
  g.event = {
    id: 'daily-event',
    type: 'deal',
    title: '제안',
    text: '일손',
    expires: g.minute + 1440,
  };
  g = run(g, { type: 'event', choice: 'no' });
  assert.equal(g.minute, before);
  assert.equal(actionsLeft(g), 20);
});

test('week boundary locks progress until payment, then increases the rate without spending an action', () => {
  let g = rich();
  g.cash = 150000;
  g.minute = WEEK_TICKS - ACTION_TICK;
  g.weekActions = 19;
  g = run(g, { type: 'wait' });
  assert.equal(interestPending(g), false);
  g = run(g, { type: 'startSettlement' });
  assert.equal(interestPending(g), true);
  assert.equal(g.interest, 0);
  assert.equal(g.cash, 150000);
  for (const type of ['job', 'wait', 'visit', 'discard', 'offer'] as const)
    assert.equal(execute(g, { type, id: 'scrap' } as Command).ok, false);
  const snapshot = structuredClone(g);
  assert.deepEqual(parseSave({ version: 2, game: g, favoriteIds: [] }).game, g);
  assert.equal(execute(g, { type: 'payInterest' }).ok, false);
  g = run(g, { type: 'repay', amount: 50000 });
  g = run(g, { type: 'payInterest' });
  assert.equal(g.minute, snapshot.minute);
  assert.equal(g.cash, 0);
  assert.equal(g.status, 'playing');
  assert.equal(g.interestWeek, 1);
  assert.equal(interestPending(g), false);
  assert.equal(interestAmount(g), 300000);
  assert.equal(execute(g, { type: 'payInterest' }).ok, false);
  assert.equal(run(g, { type: 'job', id: 'flyer' }).cash, 9000);
});

test('migration retains active listings, chats, prices and finances and refuses malformed new time grids', () => {
  const old = pending();
  delete old.timeMode;
  old.minute = 9 * 1440 + 13 * 60 + 15;
  old.marketDay = 10;
  old.interestWeek = 1;
  old.sales[0].expires = old.minute + 2880;
  old.sales[0].nextCheck = old.minute + 30;
  delete old.moneyUnit;
  old.quotes = {
    outlet: 'scrap',
    at: old.minute - 15,
    prices: { [old.inventory[0].id]: 123 },
  };
  const before = structuredClone(old);
  const saved = parseSave({ version: 2, game: old, favoriteIds: ['kept'] });
  const g = saved.game;
  assert.deepEqual(old, before);
  assert.equal(g.timeMode, 'weekly-actions');
  assert.equal(weekOf(g), 2);
  assert.equal(actionsLeft(g), 14);
  assert.deepEqual(g.inquiries, old.inquiries);
  assert.deepEqual(g.stats, old.stats);
  assert.equal(g.sales[0].price, old.sales[0].price);
  assert.equal(g.sales[0].expires - g.minute, 2880);
  assert.equal(g.sales[0].nextCheck - g.minute, ACTION_TICK);
  assert.deepEqual(g.quotes?.prices, { [old.inventory[0].id]: 100 });
  for (const key of ['cash', 'principal', 'interest', 'seed'] as const)
    assert.equal(g[key], old[key]);
  assert.deepEqual(parseSave(saved), saved);
  assert.equal(isGame({ ...g, minute: g.minute + 1 }), false);
  assert.equal(isGame({ ...g, timeMode: 'unknown' }), false);
});

test('spending the last cash does not end the game and owned items remain usable', () => {
  const g = rich();
  g.cash = g.board[0].price;
  const after = run(g, { type: 'buy', id: g.board[0].id });
  assert.equal(after.cash, 0);
  assert.equal(after.status, 'playing');
  assert.equal(after.inventory.length, 1);
  assert.equal(run(after, { type: 'job', id: 'flyer' }).cash, 9000);
});
test('repaying all cash toward principal stays playable; final full principal repayment clears', () => {
  const g = rich();
  const after = run(g, { type: 'repay', amount: g.cash });
  assert.equal(after.cash, 0);
  assert.equal(after.status, 'playing');
  const final = rich();
  final.principal = final.cash;
  const won = run(final, { type: 'repay', amount: final.cash });
  assert.equal(won.cash, 0);
  assert.equal(won.status, 'cleared');
});
test('insufficient funds refuse atomically; one remaining won keeps playing', () => {
  const g = rich();
  const price = g.board[0].price;
  g.cash = price - 100;
  const snapshot = structuredClone(g);
  assert.equal(execute(g, { type: 'buy', id: g.board[0].id }).ok, false);
  assert.deepEqual(g, snapshot);
  g.cash = price + 100;
  const after = run(g, { type: 'buy', id: g.board[0].id });
  assert.equal(after.cash, 100);
  assert.equal(after.status, 'playing');
});

test('new games start at 500000 won and old zero-cash saves remain playable without granting cash', () => {
  const fresh = newGame();
  assert.equal(fresh.cash, 500000);
  assert.equal(fresh.stats.peakCash, 500000);
  assert.equal(fresh.stats.earned, 0);
  const old = owned();
  old.cash = 0;
  old.minute = ACTION_TICK;
  delete old.interestWeek;
  old.timeMode = 'daily-actions';
  const snapshot = structuredClone(old);
  const restored = parseSave({ version: 2, game: old, favoriteIds: ['kept'] });
  assert.equal(restored.game.cash, 0);
  assert.equal(restored.game.status, 'playing');
  assert.equal(restored.game.minute, ACTION_TICK);
  assert.deepEqual(restored.game.inventory, old.inventory);
  assert.deepEqual(old, snapshot);
});

test('insufficient cash at the weekly deadline ends play even when cash and inventory remain', () => {
  const g = owned();
  g.minute = WEEK_TICKS - ACTION_TICK;
  g.weekActions = 19;
  g.cash = 99900;
  const exhausted = run(g, { type: 'wait' });
  assert.equal(exhausted.status, 'playing');
  const after = run(exhausted, { type: 'startSettlement' });
  assert.equal(after.status, 'bankrupt');
  assert.equal(after.cash, 99900);
  assert.equal(after.inventory.length, 1);
  assert.equal(execute(after, { type: 'job', id: 'flyer' }).ok, false);
  assert.deepEqual(
    parseSave({ version: 2, game: after, favoriteIds: [] }).game,
    after,
  );
});
test('repayment while payment is due reprices the invoice and costs no action', () => {
  let g = rich();
  g.cash = 200000;
  g.minute = WEEK_TICKS;
  g.weekActions = 20;
  g.settling = true;
  g = run(g, { type: 'repay', amount: 100000 });
  assert.equal(g.minute, WEEK_TICKS);
  assert.equal(interestAmount(g), 100000);
  g = run(g, { type: 'payInterest' });
  assert.equal(g.cash, 0);
  assert.equal(g.interestWeek, 1);
});
test('legacy saves keep arrears but begin weekly billing without retroactive invoices', () => {
  const g = rich();
  delete g.moneyUnit;
  g.timeMode = 'daily-actions';
  g.minute = 10080 * 5 + ACTION_TICK;
  g.interest = 1234;
  delete g.interestWeek;
  const result = parseSave({ version: 2, game: g, favoriteIds: [] }).game;
  assert.equal(result.interestWeek, 5);
  assert.equal(result.interest, 1200);
  assert.equal(result.cash, g.cash);
  assert.equal(interestPending(result), false);
  assert.equal(interestAmount(result), 1101000);
});

test('each market generates its own bounded prices and products while the entry market remains affordable', () => {
  for (let seed = 1; seed <= 100; seed++) {
    const g = newGame(seed);
    assert.ok(isGame(g));
    assert.equal(g.board.filter((i) => i.price > 0).length, MARKETS.length * 8);
    assert.equal(new Set(g.board.map((i) => i.id)).size, g.board.length);
    for (const market of MARKETS) {
      const paid = g.board.filter(
        (i) => marketOf(i) === market.id && i.price > 0,
      );
      assert.equal(paid.length, 8);
      for (const item of paid) {
        assert.ok(item.price >= market.min && item.price <= market.max);
        assert.equal(item.price % 100, 0);
        assert.ok(
          market.products.some(
            (p) => p.title === item.title && p.kind === item.kind,
          ),
        );
        assert.ok(
          Number.isSafeInteger(item.value) && Number.isSafeInteger(item.base),
        );
      }
      assert.ok(paid.some((i) => i.price === market.min));
      if (market.id === 'street')
        assert.ok(paid.every((i) => i.price <= g.cash));
    }
    assert.ok(
      g.board
        .filter((i) => i.price === 0)
        .every((i) => marketOf(i) === 'street'),
    );
  }
});
test('high-tier generation stays within safe won amounts and existing owned items are not repriced', () => {
  const original = owned();
  original.inventory[0].price = 1234;
  delete original.moneyUnit;
  original.inventory[0].acquiredFor = 1234;
  const saved = parseSave({ version: 2, game: original, favoriteIds: [] }).game;
  assert.deepEqual(saved.inventory, normalizeMoney(original).inventory);
  saved.cash = 5000000000;
  saved.stats.peakCash = saved.cash;
  const next = run(saved, { type: 'refresh' });
  assert.ok(
    next.board.some((i) => i.marketId === 'property' && i.price >= 100000000),
  );
  for (const i of next.board) {
    assert.ok(
      Number.isSafeInteger(i.price) &&
        Number.isSafeInteger(i.base) &&
        Number.isSafeInteger(i.value),
    );
    assert.ok(i.value <= RULES.maxMoney);
  }
  assert.deepEqual(next.inventory, normalizeMoney(original).inventory);
});

test('appraisal and repair spend money without using the last action, expiring listings or triggering weekly payment', () => {
  const g = owned();
  const item = g.inventory[0];
  item.checked = false;
  item.condition = '고장';
  item.value = Math.floor((item.base * 18) / 100);
  g.minute = WEEK_TICKS - ACTION_TICK;
  g.weekActions = 19;
  g.marketDay = 7;
  for (const listing of g.board) listing.expires = g.minute + 1;
  const other = g.board.shift()!;
  g.inventory.push(other);
  g.sales = [
    {
      id: 'sale-probe',
      itemId: other.id,
      price: 1000,
      created: g.minute - 1,
      expires: g.minute + 1,
      nextCheck: g.minute,
    },
  ];
  g.event = {
    id: 'event-probe',
    type: 'deal',
    title: '제안',
    text: '일손',
    expires: g.minute + 1,
  };
  g.quotes = { outlet: 'scrap', at: g.minute, prices: { [item.id]: 1000 } };
  const snapshot = structuredClone(g);
  const checkFee = checkCost(g, item),
    repairFee = repairCost(item);
  const checked = run(g, { type: 'check', id: item.id });
  assert.equal(checked.seed, g.seed);
  assert.equal(checked.cash, g.cash - checkFee);
  assert.equal(checked.inventory[0].checked, true);
  const repaired = run(checked, { type: 'repair', id: item.id });
  assert.equal(repaired.cash, g.cash - checkFee - repairFee);
  assert.equal(repaired.inventory[0].repaired, true);
  assert.equal(repaired.stats.repairs, g.stats.repairs + 1);
  for (const after of [checked, repaired]) {
    assert.equal(after.minute, g.minute);
    assert.equal(actionsLeft(after), 1);
    assert.equal(interestPending(after), false);
    assert.equal(after.status, 'playing');
    assert.deepEqual(after.sales, g.sales);
    assert.deepEqual(after.inquiries, g.inquiries);
    assert.deepEqual(after.board, g.board);
    assert.deepEqual(after.event, g.event);
    assert.deepEqual(after.quotes, g.quotes);
    assert.equal(after.marketFactor, g.marketFactor);
  }
  const retry = execute(repaired, { type: 'repair', id: item.id });
  assert.equal(retry.ok, false);
  assert.strictEqual(retry.game, repaired);
  const exhausted = run(repaired, { type: 'wait' });
  const due = run(exhausted, { type: 'startSettlement' });
  assert.equal(interestPending(due), true);
  assert.equal(due.status, 'bankrupt');
  assert.deepEqual(g, snapshot);
});

test('purchase bargaining continues for several rounds, saves hidden seller limits, and charges only at exchange', () => {
  let g = rich(17);
  if (g.board[0].listing) g.board[0].listing.facts.seller = 'ordinary';
  const start = structuredClone(g);
  const id = g.board[0].id;
  let previous = 0;
  let rounds = 0;
  while (!g.board[0].chatSettled && g.board[0].negotiation !== 'accepted') {
    const item = g.board[0];
    const offer = item.offers[0];
    assert.ok(offer > previous);
    previous = offer;
    const before = structuredClone(g);
    g = run(g, { type: 'offer', id, price: offer });
    rounds++;
    assert.equal(g.minute, start.minute);
    assert.equal(g.cash, start.cash);
    assert.deepEqual(g.inventory, start.inventory);
    assert.equal(g.board[0].price, start.board[0].price);
    assert.equal(g.board[0].chat?.length, 1 + 2 * rounds);
    assert.ok(isGame(g));
    const restored = parseSave(
      JSON.parse(JSON.stringify({ version: 2, game: g, favoriteIds: [] })),
    ).game;
    assert.deepEqual(restored, g);
    if (rounds > 1) {
      assert.equal(
        g.board[0].purchaseBargain!.floor,
        before.board[0].purchaseBargain!.floor,
      );
      assert.equal(
        g.board[0].purchaseBargain!.patience,
        before.board[0].purchaseBargain!.patience,
      );
    }
    assert.ok(rounds <= 6);
  }
  assert.ok(rounds >= 3);
  assert.equal(execute(g, { type: 'offer', id, price: previous }).ok, false);
  if (!g.board[0].purchaseBargain?.walked) {
    const cost = g.board[0].negotiatedPrice ?? g.board[0].price;
    const result = run(g, { type: 'buy', id });
    assert.equal(result.cash, start.cash - cost);
    assert.equal(result.inventory[0].acquiredFor, cost);
    assert.equal(result.minute, start.minute + ACTION_TICK);
    assert.ok(isGame(result));
  }
});

test('seller holds, concessions, agreements, final prices and walkaways vary without an infinite retry', () => {
  const outcomes = new Set<string>();
  for (let seed = 1; seed <= 100; seed++) {
    let g = rich(seed);
    const id = g.board[0].id;
    const original = structuredClone(g);
    for (let round = 0; round < 7; round++) {
      const item = g.board[0];
      if (item.chatSettled || item.negotiation === 'accepted') break;
      const previous = item.negotiatedPrice ?? item.price;
      g = run(g, { type: 'offer', id, price: item.offers[0] });
      const next = g.board[0];
      const quote = next.negotiatedPrice;
      if (!next.chatSettled && next.negotiation !== 'accepted') {
        outcomes.add(quote === previous ? 'hold' : 'concession');
        assert.ok(quote! <= previous);
      }
      assert.ok(isGame(g));
    }
    const item = g.board[0];
    assert.ok(item.chatSettled || item.negotiation === 'accepted');
    assert.equal(g.minute, original.minute);
    assert.equal(g.cash, original.cash);
    outcomes.add(
      item.purchaseBargain?.walked
        ? 'walked'
        : item.negotiation === 'accepted'
          ? 'agreed'
          : 'final',
    );
    if (item.purchaseBargain?.walked) {
      const rejected = execute(g, { type: 'buy', id });
      assert.equal(rejected.ok, false);
      assert.deepEqual(rejected.game, g);
    }
    const again = execute(g, { type: 'offer', id, price: 100 });
    assert.equal(again.ok, false);
    assert.deepEqual(again.game, g);
  }
  for (const expected of ['hold', 'concession', 'walked', 'agreed', 'final'])
    assert.ok(outcomes.has(expected), expected);
});

test('old purchase chats stay loadable and closed chats cannot restart; malformed seller state is rejected', () => {
  let g = rich(17);
  const id = g.board[0].id;
  g = run(g, { type: 'offer', id, price: g.board[0].offers[0] });
  const closed = run(g, { type: 'closeChat', id });
  assert.equal(
    execute(closed, { type: 'offer', id, price: closed.board[0].offers[0] }).ok,
    false,
  );
  const legacy = structuredClone(g);
  delete legacy.board[0].purchaseBargain;
  assert.ok(isGame(legacy));
  assert.deepEqual(
    parseSave({ version: 2, game: legacy, favoriteIds: [] }).game,
    legacy,
  );
  for (const bad of [
    { rounds: 7 },
    { floor: -1 },
    { patience: 9 },
    { walked: 'yes' },
  ]) {
    const invalid = structuredClone(g);
    Object.assign(invalid.board[0].purchaseBargain!, bad);
    assert.equal(isGame(invalid), false);
  }
});

test('listing claims are mostly truthful but every claim can be false; category labels remain exact', () => {
  let seed = 19;
  const random = () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const counts = new Map<ListingTag, { total: number; truth: number }>();
  for (let n = 0; n < 10000; n++) {
    const info = createListingInfo('수집품', random);
    assert.equal(info.tags[0], KIND_TAGS['수집품']);
    assert.equal(new Set(info.tags).size, 3);
    for (const tag of info.tags.slice(1)) {
      const count = counts.get(tag) ?? { total: 0, truth: 0 };
      count.total++;
      count.truth += Number(tagIsTrue(tag, info.facts));
      counts.set(tag, count);
    }
  }
  assert.equal(counts.size, 9);
  for (const [tag, count] of counts) {
    const rate = count.truth / count.total;
    assert.ok(Math.abs(rate - TAG_RULES.truthChance) < 0.04, `${tag}: ${rate}`);
    assert.ok(count.truth > 0 && count.truth < count.total);
  }
});

test('actual listing facts determine value independently of advertised labels', () => {
  const info = createListingInfo('수집품', () => 0);
  info.facts = {
    authentic: true,
    limited: false,
    discontinued: false,
    vintage: false,
    seller: 'ordinary',
  };
  assert.equal(listingValuePercent(info), 100);
  assert.ok(info.tags.includes('limited'));
  info.facts.limited = true;
  assert.equal(listingValuePercent(info), TAG_RULES.limitedValuePercent);
  info.facts.authentic = false;
  assert.equal(listingValuePercent(info), TAG_RULES.replicaValuePercent);
  const original = rich();
  const item = original.board[0];
  item.listing = info;
  info.facts.limited = false;
  assert.ok(listingFindings(item).includes('일반판 · 한정판 아님'));
  assert.ok(listingFindings(item).includes('가품'));
});

test('real urgency adjusts price and deadline while false urgency does not guarantee either effect', () => {
  const info = createListingInfo('수집품', () => 0);
  info.facts.seller = 'urgent';
  assert.equal(listingAskPrice(100000, info), 90000);
  assert.equal(listingAskPrice(0, info), 0);
  info.facts.seller = 'ordinary';
  assert.equal(listingAskPrice(100000, info), 100000);
  let real = 0,
    falseClaim = 0;
  for (let seed = 1; seed <= 100; seed++) {
    const g = newGame(seed);
    assert.ok(isGame(g));
    for (const item of g.board.filter((i) => i.price > 0)) {
      const seller = item.listing!.facts.seller;
      const duration = (item.expires - g.minute) / ACTION_TICK;
      assert.equal(
        duration,
        seller === 'urgent' || seller === 'moving' ? 2 : 3,
      );
      assert.equal(item.price % 100, 0);
      if (item.listing!.tags.includes('urgent')) {
        if (seller === 'urgent') real++;
        else {
          falseClaim++;
          assert.equal(duration, 3);
        }
      }
    }
  }
  assert.ok(real > falseClaim && falseClaim > 0);
});

test('bargaining uses actual seller traits; false firm tags can negotiate and true firm sellers hold the asking price', () => {
  const outcomes: Partial<Record<SellerTrait, number>> = {};
  for (const trait of ['ordinary', 'urgent', 'negotiable', 'firm'] as const) {
    const g = rich(42);
    const item = g.board[0];
    item.listing!.tags[2] = 'firm';
    item.listing!.facts.seller = trait;
    g.seed = 42;
    const profile = sellerProfile(item);
    const next = run(g, { type: 'offer', id: item.id, price: item.offers[0] });
    const result = next.board[0];
    outcomes[trait] = result.purchaseBargain!.floor;
    assert.equal(next.minute, g.minute);
    assert.equal(next.cash, g.cash);
    assert.ok(
      result.purchaseBargain!.floor >=
        Math.floor(item.price * profile.floorMin),
    );
    if (trait === 'firm') assert.equal(result.negotiatedPrice, item.price);
  }
  assert.ok(outcomes.urgent! < outcomes.ordinary!);
  assert.ok(outcomes.negotiable! < outcomes.firm!);
});

test('tags, actual facts and findings survive purchase, appraisal, repair and backup without rerolling', () => {
  let g = rich(31);
  const item = g.board[0];
  const original = structuredClone(item.listing);
  const price = item.price;
  g = run(g, { type: 'buy', id: item.id });
  assert.equal(g.inventory[0].acquiredFor, price);
  assert.deepEqual(g.inventory[0].listing, original);
  const now = g.minute;
  g = run(g, { type: 'check', id: item.id });
  assert.deepEqual(g.inventory[0].listing, original);
  assert.equal(g.minute, now);
  assert.ok(
    g.logs[0].text.includes(original!.facts.authentic ? '진품' : '가품'),
  );
  const restored = parseSave(
    JSON.parse(JSON.stringify({ version: 2, game: g, favoriteIds: [] })),
  ).game;
  assert.deepEqual(restored, JSON.parse(JSON.stringify(g)));
  if (restored.inventory[0].condition !== '양호') {
    const repaired = run(restored, { type: 'repair', id: item.id });
    assert.deepEqual(repaired.inventory[0].listing, original);
  }
  const legacy = structuredClone(g);
  for (const item of [...legacy.board, ...legacy.inventory])
    delete item.listing;
  assert.deepEqual(
    parseSave({ version: 2, game: legacy, favoriteIds: [] }).game,
    legacy,
  );
});

test('invalid listing metadata is rejected without replacing saves', () => {
  const g = newGame(31);
  for (const corrupt of [
    null,
    { tags: ['unknown'], facts: {} },
    { ...g.board[0].listing, tags: ['digital', 'limited', 'limited'] },
    {
      ...g.board[0].listing,
      facts: { ...g.board[0].listing!.facts, authentic: 'yes' },
    },
    {
      ...g.board[0].listing,
      facts: { ...g.board[0].listing!.facts, seller: 'anything' },
    },
  ]) {
    const invalid = structuredClone(g);
    invalid.board[0].listing = corrupt as never;
    assert.equal(isGame(invalid), false);
    assert.throws(() =>
      parseSave({ version: 2, game: invalid, favoriteIds: [] }),
    );
  }
});

test('market-specific refresh costs one action and keeps other unexpired boards and ongoing chats', () => {
  let g = newGame(42);
  const item = g.board.find((i) => i.marketId === 'computers')!;
  g = run(g, { type: 'offer', id: item.id, price: item.offers[0] });
  for (const item of g.board) item.expires = g.minute + 1440;
  const before = structuredClone(g);
  const after = run(g, { type: 'refresh', marketId: 'cars' });
  assert.equal(after.minute, before.minute + ACTION_TICK);
  assert.equal(after.cash, before.cash);
  assert.deepEqual(
    after.board.filter((i) => i.marketId !== 'cars'),
    before.board.filter((i) => i.marketId !== 'cars'),
  );
  assert.ok(
    after.board
      .filter((i) => i.marketId === 'cars')
      .every((i) => !before.board.some((old) => old.id === i.id)),
  );
  const invalid = execute(before, {
    type: 'refresh',
    marketId: 'unknown',
  } as never);
  assert.equal(invalid.ok, false);
  assert.deepEqual(invalid.game, before);
});

test('every market supports purchase, zero-action verification, source-specific listing and fixed-price outlets', () => {
  for (const market of MARKETS) {
    let g = newGame(31);
    g.cash = 100000000000;
    g.stats.peakCash = g.cash;
    const item = g.board.find((i) => i.marketId === market.id)!;
    if (item.auction) {
      while (g.board.find((i) => i.id === item.id)!.auction!.status !== 'won') {
        const live = g.board.find((i) => i.id === item.id)!;
        g = run(g, {
          type: 'bid',
          id: item.id,
          amount: auctionBidOptions(live)[0],
        });
      }
    }
    const price =
      g.board.find((i) => i.id === item.id)!.auction?.currentBid ?? item.price;
    g = run(g, { type: 'buy', id: item.id });
    assert.equal(g.inventory[0].marketId, market.id);
    assert.equal(g.inventory[0].acquiredFor, price);
    const before = structuredClone(g);
    g = run(g, { type: 'check', id: item.id });
    assert.equal(g.minute, before.minute);
    assert.equal(g.seed, before.seed);
    assert.deepEqual(g.board, before.board);
    assert.deepEqual(g.inquiries, before.inquiries);
    assert.ok(g.cash < before.cash);
    const listed = run(g, {
      type: 'post',
      id: item.id,
      price: marketValue(g, g.inventory[0]),
    });
    assert.equal(listed.sales[0].marketId, market.id);
    assert.ok(isGame(listed));
    const outletId = {
      street: 'scrap',
      computers: 'used',
      instruments: 'music',
      cars: 'carDealer',
      property: 'propertyBroker',
      aircraft: 'aircraftBroker',
      auction: 'collector',
    }[market.id];
    const visited = run(g, { type: 'visit', id: outletId });
    assert.ok(visited.quotes!.prices[item.id] > 0);
    const sold = run(visited, { type: 'outletSell', id: item.id });
    assert.equal(sold.inventory.length, 0);
    assert.equal(sold.minute, g.minute + ACTION_TICK);
    assert.ok(sold.cash > visited.cash);
    assert.ok(isGame(sold));
  }
});

test('legacy boards and assets are retained; new markets are introduced by an actual refresh', () => {
  const old = newGame(42);
  old.board = old.board.filter((i) => i.marketId === 'street');
  for (const item of old.board) delete item.marketId;
  old.board[0].price = 1234567;
  delete old.moneyUnit;
  const parsed = parseSave({ version: 2, game: old, favoriteIds: [] }).game;
  assert.deepEqual(parsed, normalizeMoney(old));
  assert.equal(parsed.board[0].price, 1234600);
  const after = run(parsed, { type: 'refresh', marketId: 'property' });
  assert.ok(after.board.some((i) => i.marketId === 'property'));
  assert.equal(after.board[0].price, 1234600);
  assert.equal(after.minute, old.minute + ACTION_TICK);
});

test('day-end refresh includes all active markets and preserves purchased assets and valid backups', () => {
  let g = newGame(1);
  const item = g.board[0];
  g = run(g, { type: 'buy', id: item.id });
  g = run(g, { type: 'wait' });
  const after = run(g, { type: 'refresh', marketId: 'property' });
  assert.equal(after.minute, 1440);
  for (const market of MARKETS)
    assert.equal(
      after.board.filter((i) => marketOf(i) === market.id && i.price > 0)
        .length,
      8,
    );
  assert.equal(after.inventory[0].id, item.id);
  const backup = JSON.parse(
    JSON.stringify({
      version: 2,
      game: after,
      favoriteIds: [],
      selectedMarket: 'property',
    }),
  );
  assert.deepEqual(parseSave(backup).game, JSON.parse(JSON.stringify(after)));
  assert.equal(parseSave(backup).selectedMarket, 'property');
  const invalid = structuredClone(after);
  invalid.board[0].marketId = 'invalid' as never;
  assert.equal(isGame(invalid), false);
  invalid.board[0].marketId = 'property';
  assert.equal(isGame(invalid), false);
  assert.throws(() => parseSave({ ...backup, selectedMarket: 'invalid' }));
});

test('retired aircraft market is absent from new boards and cannot be refreshed', () => {
  const game = newGame(42);
  assert.equal(MARKETS.length, 6);
  assert.ok(!game.board.some((item) => item.marketId === 'aircraft'));
  const result = execute(game, { type: 'refresh', marketId: 'aircraft' });
  assert.equal(result.ok, false);
  assert.deepEqual(result.game, game);
});

test('retired market saves drop only NPC aircraft listings and preserve owned assets, sales and finances', () => {
  const old = newGame(42);
  const aircraft = structuredClone(old.board[0]);
  aircraft.id = 'legacy-plane';
  aircraft.marketId = 'aircraft';
  aircraft.kind = '항공기';
  aircraft.title = '경량 항공기';
  aircraft.price = 2000000000;
  aircraft.acquiredFor = 2000000000;
  delete aircraft.listing;
  old.inventory = [aircraft];
  const unsold = structuredClone(aircraft);
  unsold.id = 'legacy-plane-listing';
  old.board.push(unsold);
  old.sales.push({
    id: 'legacy-sale',
    itemId: aircraft.id,
    marketId: 'aircraft',
    price: 2100000000,
    created: 0,
    expires: 2880,
    nextCheck: 480,
  });
  const data = parseSave({
    version: 2,
    game: old,
    favoriteIds: [],
    selectedMarket: 'aircraft',
  });
  assert.equal(data.selectedMarket, 'street');
  assert.ok(!data.game.board.some((item) => item.marketId === 'aircraft'));
  assert.deepEqual(data.game.inventory, old.inventory);
  assert.deepEqual(data.game.sales, old.sales);
  for (const key of [
    'cash',
    'principal',
    'interest',
    'seed',
    'minute',
  ] as const)
    assert.equal(data.game[key], old[key]);
  data.game.sales = [];
  const visited = run(data.game, { type: 'visit', id: 'aircraftBroker' });
  assert.ok(visited.quotes!.prices[aircraft.id] > 0);
  const sold = run(visited, { type: 'outletSell', id: aircraft.id });
  assert.equal(sold.inventory.length, 0);
});

test('auction bidding is free and stable, rival replies are bounded, and only won settlement transfers money once', () => {
  for (let seed = 1; seed <= 30; seed++) {
    let g = newGame(seed);
    g.cash = 100000000000;
    const lot = g.board.find((i) => i.marketId === 'auction')!;
    const before = structuredClone(g);
    assert.equal(execute(g, { type: 'buy', id: lot.id }).ok, false);
    assert.equal(
      execute(g, { type: 'offer', id: lot.id, price: lot.price }).ok,
      false,
    );
    let last = 0;
    while (g.board.find((i) => i.id === lot.id)!.auction!.status !== 'won') {
      const live = g.board.find((i) => i.id === lot.id)!;
      const next = auctionBidOptions(live)[0];
      assert.ok(next > last);
      last = next;
      const original = structuredClone(g);
      const duplicate = execute(g, { type: 'bid', id: lot.id, amount: 100 });
      assert.equal(duplicate.ok, false);
      assert.deepEqual(duplicate.game, original);
      g = run(g, { type: 'bid', id: lot.id, amount: next });
      assert.equal(g.minute, before.minute);
      assert.equal(g.cash, before.cash);
      assert.equal(g.seed, before.seed);
      assert.equal(g.inventory.length, 0);
      assert.ok(isGame(g));
      assert.ok(g.board.find((i) => i.id === lot.id)!.auction!.rounds <= 6);
      const restored = parseSave(
        JSON.parse(
          JSON.stringify({
            version: 2,
            game: g,
            favoriteIds: [],
            selectedMarket: 'auction',
          }),
        ),
      );
      assert.deepEqual(restored.game, g);
      g = restored.game;
    }
    const won = g.board.find((i) => i.id === lot.id)!;
    const paid = run(g, { type: 'buy', id: lot.id });
    assert.equal(paid.inventory[0].acquiredFor, won.auction!.currentBid);
    assert.equal(paid.cash, before.cash - won.auction!.currentBid);
    assert.equal(paid.minute, before.minute + ACTION_TICK);
    assert.equal(execute(paid, { type: 'buy', id: lot.id }).ok, false);
    assert.ok(isGame(paid));
  }
});

test('auction insufficient funds, withdrawal, malformed state and expired lots cannot be bypassed', () => {
  const game = newGame(3);
  const lot = game.board.find((i) => i.marketId === 'auction')!;
  const amount = auctionBidOptions(lot)[0];
  const poor = execute(game, { type: 'bid', id: lot.id, amount });
  assert.equal(poor.ok, false);
  assert.deepEqual(poor.game, game);
  game.cash = 100000000000;
  const withdrawn = run(game, { type: 'withdrawAuction', id: lot.id });
  assert.equal(withdrawn.minute, game.minute);
  assert.equal(withdrawn.cash, game.cash);
  assert.equal(
    execute(withdrawn, { type: 'bid', id: lot.id, amount }).ok,
    false,
  );
  assert.equal(execute(withdrawn, { type: 'buy', id: lot.id }).ok, false);
  for (const change of [
    { step: 0 },
    { rounds: 7 },
    { status: 'won', currentBid: 1 },
    { competitorMax: -1 },
    { history: [{ speaker: 'other', text: 10 }] },
  ]) {
    const invalid = structuredClone(game);
    Object.assign(invalid.board.find((i) => i.id === lot.id)!.auction!, change);
    assert.equal(isGame(invalid), false);
  }
  const expired = structuredClone(game);
  expired.board.find((i) => i.id === lot.id)!.expires = 0;
  assert.equal(execute(expired, { type: 'bid', id: lot.id, amount }).ok, false);
});

test('won auction settlement rechecks cash, inventory and weekly locks without losing the winning bid', () => {
  let game = newGame(22);
  game.cash = 100000000000;
  const lot = game.board.find((i) => i.marketId === 'auction')!;
  while (game.board.find((i) => i.id === lot.id)!.auction!.status !== 'won') {
    const live = game.board.find((i) => i.id === lot.id)!;
    game = run(game, {
      type: 'bid',
      id: lot.id,
      amount: auctionBidOptions(live)[0],
    });
  }
  const live = game.board.find((i) => i.id === lot.id)!;
  const lowCash = structuredClone(game);
  lowCash.cash = live.auction!.currentBid - 100;
  const refused = execute(lowCash, { type: 'buy', id: lot.id });
  assert.equal(refused.ok, false);
  assert.deepEqual(refused.game, lowCash);
  const full = structuredClone(game);
  full.inventory = Array.from({ length: RULES.capacity }, (_, n) => ({
    ...structuredClone(full.board[0]),
    id: `owned-${n}`,
  }));
  assert.equal(execute(full, { type: 'buy', id: lot.id }).ok, false);
  const due = structuredClone(game);
  due.minute = WEEK_TICKS;
  due.weekActions = 20;
  due.settling = true;
  due.board.find((i) => i.id === lot.id)!.expires = due.minute + 1440;
  assert.equal(execute(due, { type: 'buy', id: lot.id }).ok, false);
  assert.equal(execute(due, { type: 'withdrawAuction', id: lot.id }).ok, false);
  const withdrawn = run(game, { type: 'withdrawAuction', id: lot.id });
  assert.equal(execute(withdrawn, { type: 'buy', id: lot.id }).ok, false);
  assert.equal(withdrawn.cash, game.cash);
});

test('early settlement charges the full current rate once and discards unused actions', () => {
  let g = newGame(17);
  g = run(g, { type: 'job', id: 'warehouse' });
  const before = structuredClone(g);
  g = run(g, { type: 'startSettlement' });
  assert.equal(g.minute, before.minute);
  assert.equal(g.weekActions, 1);
  assert.equal(g.cash, before.cash);
  assert.equal(interestAmount(g), 100000);
  assert.equal(execute(g, { type: 'startSettlement' }).ok, false);
  assert.equal(execute(g, { type: 'wait' }).ok, false);
  assert.deepEqual(parseSave({ version: 2, game: g, favoriteIds: [] }).game, g);
  g = run(g, { type: 'repay', amount: 50000 });
  g = run(g, { type: 'payInterest' });
  assert.equal(g.cash, before.cash - 150000);
  assert.equal(weekOf(g), 2);
  assert.equal(actionsLeft(g), 20);
  assert.equal(g.minute, WEEK_TICKS);
  assert.equal(execute(g, { type: 'payInterest' }).ok, false);
  assert.equal(interestAmount(g), 300000);
});

test('zero budget allows free owned-item verification but refuses every paid transaction atomically', () => {
  let g = owned();
  g.weekActions = 20;
  g.minute = WEEK_TICKS;
  g.inventory[0].checked = false;
  g.board[0].expires = g.minute + ACTION_TICK;
  g = run(g, { type: 'check', id: g.inventory[0].id });
  for (const command of [
    { type: 'wait' },
    { type: 'job', id: 'flyer' },
    { type: 'refresh' },
    { type: 'scavenge' },
    { type: 'buy', id: g.board[0].id },
    { type: 'post', id: g.inventory[0].id, price: 10000 },
    { type: 'repay', amount: 100 },
  ] as Command[]) {
    const before = structuredClone(g);
    const result = execute(g, command);
    assert.equal(result.ok, false);
    assert.deepEqual(result.game, before);
  }
  assert.equal(g.status, 'playing');
  assert.equal(weekOf(g), 1);
  assert.equal(interestPending(g), false);
  assert.deepEqual(parseSave({ version: 2, game: g, favoriteIds: [] }).game, g);
  for (const changes of [
    { weekActions: 31 },
    { weekActions: -1 },
    { weekActions: 1.5 },
    { settling: 'yes' },
  ])
    assert.equal(isGame({ ...g, ...changes }), false);
});

test('daily saves retain paid weeks, used actions, asset deadlines and settlement state exactly once', () => {
  const old = owned();
  old.timeMode = 'daily-actions';
  old.interestWeek = 2;
  old.minute = 2 * 10080 + 5 * ACTION_TICK;
  old.inventory[0].expires = old.minute + 960;
  const before = structuredClone(old);
  const data = parseSave({ version: 2, game: old, favoriteIds: ['favorite'] });
  assert.equal(weekOf(data.game), 3);
  assert.equal(actionsLeft(data.game), 15);
  assert.equal(data.game.minute, 2 * WEEK_TICKS + 5 * ACTION_TICK);
  assert.equal(data.game.inventory[0].expires - data.game.minute, 960);
  assert.equal(data.game.cash, old.cash);
  assert.deepEqual(parseSave(data), data);
  assert.deepEqual(old, before);
});

test('instant selling always pays actual value times sixty percent, ignoring trends and old quotes', () => {
  for (const value of [1, 100001, 100000000000001])
    assert.equal(instantSalePrice({ value }), moneyRatio(value, 60));
  const g = owned();
  g.inventory[0].value = 100001;
  g.inventory[0].checked = false;
  g.marketFactor = 200;
  g.trend = g.inventory[0].kind;
  g.inventory[0].price = 9999999;
  g.inventory[0].acquiredFor = 1;
  const item = g.inventory[0];
  g.quotes = { outlet: 'collector', at: 0, prices: { [item.id]: 99999999 } };
  const before = structuredClone(g);
  const sold = run(g, { type: 'outletSell', id: item.id });
  assert.equal(sold.cash - before.cash, 60000);
  assert.equal(sold.inventory.length, 0);
  assert.equal(sold.stats.sales, before.stats.sales + 1);
  assert.equal(sold.minute - before.minute, ACTION_TICK);
  assert.equal(execute(sold, { type: 'outletSell', id: item.id }).ok, false);
  const exhausted = structuredClone(before);
  exhausted.weekActions = 20;
  const denied = execute(exhausted, { type: 'outletSell', id: item.id });
  assert.equal(denied.ok, false);
  assert.deepEqual(denied.game, exhausted);
});

test('all five ordinary markets share free repeated purchase negotiations and market-specific opening prices', () => {
  for (const market of MARKETS.filter((m) => m.id !== 'auction')) {
    let g = newGame(7);
    g.cash = 100000000000;
    const item = g.board.find((i) => i.marketId === market.id && i.price > 0)!;
    assert.deepEqual(item.offers, openingPurchaseOffers(item.price, market.id));
    item.listing!.facts.seller = 'ordinary';
    const before = structuredClone(g);
    g = run(g, { type: 'offer', id: item.id, price: item.offers[1] });
    assert.equal(g.minute, before.minute);
    assert.equal(g.cash, before.cash);
    assert.equal(g.weekActions, before.weekActions);
    const live = g.board.find((i) => i.id === item.id)!;
    assert.ok(live.purchaseBargain);
    assert.equal(live.chat!.length, 3);
    assert.equal(live.purchaseBargain!.previousOffer, item.offers[1]);
    assert.deepEqual(
      parseSave({ version: 2, game: g, favoriteIds: [] }).game,
      g,
    );
    assert.deepEqual(
      BARGAINING_MARKETS[
        market.id as keyof typeof BARGAINING_MARKETS
      ].opening.map((n) => Math.floor((item.price * n) / 100)),
      item.offers,
    );
  }
  assert.deepEqual(openingPurchaseOffers(100000, 'auction'), []);
  assert.deepEqual(openingPurchaseOffers(0, 'street'), []);
  assert.deepEqual(openingPurchaseOffers(100000), [70000, 85000]);
});

function bargainFixture(
  marketId: Game['board'][number]['marketId'],
  floor = 50000,
) {
  const item = structuredClone(
    newGame(1).board.find((i) => i.marketId === marketId && i.price > 0)!,
  );
  item.price = 100000;
  item.negotiatedPrice = 100000;
  item.negotiation = 'rejected';
  item.chatSettled = false;
  item.listing!.facts.seller = 'ordinary';
  item.purchaseBargain = {
    rounds: 1,
    floor,
    patience: 6,
    walked: false,
    previousOffer: 10000,
  };
  item.offers = nextPurchaseOffers(100000, 10000);
  item.chat = [{ speaker: 'other', text: '가격을 다시 제안해 주세요.' }];
  return item;
}

test('instrument gradual offers and property patience produce larger concessions with equal randomness', () => {
  const street = bargainFixture('street');
  const music = bargainFixture('instruments');
  const amount = music.offers[0];
  const unchanged = structuredClone(music);
  const baseline = purchaseReply(street, amount, () => 0.99);
  const gradual = purchaseReply(music, amount, () => 0.99);
  assert.ok(gradual.item.negotiatedPrice! < baseline.item.negotiatedPrice!);
  assert.equal(purchaseApproach(music, amount, 2).favorable, true);
  assert.deepEqual(music, unchanged, 'pure transition cannot mutate its input');
  const property = bargainFixture('property');
  const early = purchaseReply(property, amount, () => 0.99);
  property.purchaseBargain!.rounds = 2;
  const patient = purchaseReply(property, amount, () => 0.99);
  assert.ok(patient.item.negotiatedPrice! < early.item.negotiatedPrice!);
  assert.ok(patient.message.includes('몇 차례 조율'));
});

test('cars favor a decisive raise and computers favor close quotes but may walk on extreme lowballs', () => {
  const car = bargainFixture('cars', 90000);
  const amount = car.offers[2];
  assert.equal(purchaseApproach(car, amount, 2).favorable, true);
  assert.equal(purchaseApproach(car, car.offers[0], 2).favorable, false);
  const decisive = purchaseReply(car, amount, () => 0.99);
  assert.ok(decisive.message.includes('조건을 올려'));
  const computer = bargainFixture('computers', 95000);
  computer.offers = [80000, 90000];
  assert.equal(purchaseApproach(computer, 90000, 2).favorable, true);
  const walked = purchaseReply(computer, 80000, () => 0);
  assert.equal(walked.item.purchaseBargain!.walked, true);
  const precise = purchaseReply(computer, 90000, () => 0.99);
  assert.equal(precise.item.purchaseBargain!.walked, false);
  assert.ok(precise.item.negotiatedPrice! >= 95000);
  const street = bargainFixture('street', 95000);
  street.offers = [80000];
  assert.equal(
    purchaseReply(street, 80000, () => 0).item.purchaseBargain!.walked,
    false,
  );
});

test('true firm sellers never discount in any ordinary market and market tactics cannot bypass price floors', () => {
  for (const market of MARKETS.filter((m) => m.id !== 'auction')) {
    let item = bargainFixture(market.id);
    delete item.purchaseBargain;
    item.negotiation = 'none';
    item.negotiatedPrice = null;
    item.chat = undefined;
    item.listing!.facts.seller = 'firm';
    item.offers = openingPurchaseOffers(item.price, market.id);
    assert.equal(purchaseProfile(item).floorMin, 1);
    assert.equal(purchaseProfile(item).holdChance, 1);
    while (!item.chatSettled) {
      const reply = purchaseReply(item, item.offers[0], () => 0.99);
      item = reply.item;
      assert.equal(item.negotiatedPrice, item.price);
      assert.equal(item.purchaseBargain!.floor, item.price);
      assert.ok(item.purchaseBargain!.rounds <= 6);
    }
    assert.throws(() => purchaseReply(item, item.price - 1, () => 0));
  }
});

test('bargaining is independent of hidden item value and validates previous offers without resetting legacy chats', () => {
  const item = bargainFixture('instruments');
  const alternate = structuredClone(item);
  alternate.value = 1;
  alternate.base = 999999;
  alternate.checked = true;
  alternate.condition = '고장';
  const a = purchaseReply(item, item.offers[0], () => 0.8);
  const b = purchaseReply(alternate, item.offers[0], () => 0.8);
  for (const key of [
    'negotiatedPrice',
    'negotiation',
    'offers',
    'purchaseBargain',
    'chat',
  ] as const)
    assert.deepEqual(a.item[key], b.item[key]);
  const g = newGame();
  const legacy = g.board[0];
  g.board[0] = purchaseReply(legacy, legacy.offers[0], () => 0.9).item;
  delete g.board[0].purchaseBargain!.previousOffer;
  const restored = parseSave({ version: 2, game: g, favoriteIds: [] }).game;
  assert.deepEqual(restored, g);
  for (const previousOffer of [-1, 0, 1.5, restored.board[0].price + 1]) {
    const invalid = structuredClone(restored);
    invalid.board[0].purchaseBargain!.previousOffer = previousOffer;
    assert.equal(isGame(invalid), false);
  }
  assert.deepEqual(g.board[0].offers, restored.board[0].offers);
});

test('shared sale reply preserves buyer limits, two-round budget, immutability and one-inquiry walkaway', () => {
  const g = pending();
  const q = g.inquiries[0];
  q.price = 100;
  q.max = 500;
  q.rounds = 0;
  const before = structuredClone(q);
  const raised = saleReply(q, 1000, 800, () => 0.99);
  assert.deepEqual(q, before);
  assert.equal(raised.inquiry!.price, 300);
  assert.equal(raised.inquiry!.rounds, 1);
  const agreed = saleReply(raised.inquiry!, 1000, 400, () => 0.99);
  assert.equal(agreed.inquiry!.price, 400);
  assert.equal(agreed.inquiry!.rounds, 2);
  assert.throws(() => saleReply(agreed.inquiry!, 1000, 450, () => 0));
  assert.equal(saleReply(q, 1000, 800, () => 0).inquiry, null);
  assert.equal(
    saleReply({ ...q, rounds: 2 }, 1000, null, () => 0.99).inquiry,
    null,
  );
  assert.throws(() => saleReply(q, 1000, 1050, () => 0));
});

test('mandatory weekly principal doubles from 50000 and is capped by remaining debt safely', () => {
  for (const [week, amount] of [
    [1, 50000],
    [2, 100000],
    [3, 200000],
    [4, 400000],
    [5, 800000],
  ])
    assert.equal(weeklyPrincipalTarget(week), amount);
  const g = newGame();
  assert.equal(settlementAmount(g), 150000);
  g.principal = 12345;
  assert.equal(mandatoryPrincipal(g), 12300);
  assert.equal(interestAmount(g), 0);
  assert.equal(settlementAmount(g), 12300);
  assert.equal(weeklyPrincipalTarget(1000000), RULES.maxMoney);
  g.interestWeek = 1000000;
  assert.equal(mandatoryPrincipal(g), 12300);
});

test('voluntary partial principal prepayments count this week and payment order cannot be bypassed', () => {
  let g = newGame();
  g = run(g, { type: 'repay', amount: 20000 });
  assert.equal(g.principalRepaidThisWeek, 20000);
  assert.equal(mandatoryPrincipal(g), 30000);
  assert.equal(g.weekActions, 1);
  g = run(g, { type: 'startSettlement' });
  const snapshot = structuredClone(g);
  assert.equal(execute(g, { type: 'payInterest' }).ok, false);
  assert.deepEqual(g, snapshot);
  g = run(g, { type: 'repay', amount: mandatoryPrincipal(g) });
  assert.equal(g.minute, snapshot.minute);
  assert.equal(g.principalRepaidThisWeek, 50000);
  assert.equal(g.principal, RULES.debt - 50000);
  assert.equal(mandatoryPrincipal(g), 0);
  assert.equal(interestAmount(g), 100000);
  g = run(g, { type: 'payInterest' });
  assert.equal(g.cash, 350000);
  assert.equal(g.principalRepaidThisWeek, 0);
  assert.equal(g.interestWeek, 1);
  assert.equal(mandatoryPrincipal(g), 100000);
  assert.equal(interestAmount(g), 300000);
  assert.equal(actionsLeft(g), 20);
  assert.equal(execute(g, { type: 'payInterest' }).ok, false);
});

test('excess voluntary repayments reduce interest but do not prepay next weeks obligation', () => {
  let g = newGame();
  g = run(g, { type: 'repay', amount: 100000 });
  assert.equal(mandatoryPrincipal(g), 0);
  assert.equal(interestAmount(g), 100000);
  g = run(g, { type: 'startSettlement' });
  g = run(g, { type: 'payInterest' });
  assert.equal(g.cash, 300000);
  assert.equal(mandatoryPrincipal(g), 100000);
  assert.equal(g.stats.repaid, 200000);
  assert.equal(g.principal, RULES.debt - 100000);
});

test('mandatory principal or interest shortfalls end play while exact funds resume with zero cash', () => {
  for (const cash of [0, 49900, 100000, 149900]) {
    const g = newGame();
    g.cash = cash;
    const after = run(g, { type: 'startSettlement' });
    assert.equal(after.status, 'bankrupt');
    assert.equal(after.principal, g.principal);
    assert.equal(after.cash, cash);
  }
  let g = newGame();
  g.cash = 150000;
  g = run(g, { type: 'startSettlement' });
  g = run(g, { type: 'repay', amount: 50000 });
  g = run(g, { type: 'payInterest' });
  assert.equal(g.cash, 0);
  assert.equal(g.status, 'playing');
  assert.equal(run(g, { type: 'job', id: 'flyer' }).cash, 9000);
});

test('final remaining principal clears without excess mandatory charge and legacy interest is preserved', () => {
  let final = newGame();
  final.principal = 30000;
  final.cash = 30000;
  final = run(final, { type: 'startSettlement' });
  final = run(final, { type: 'repay', amount: 30000 });
  assert.equal(final.status, 'cleared');
  assert.equal(final.cash, 0);
  let arrears = newGame();
  arrears.interest = 1234;
  assert.equal(settlementAmount(arrears), 151200);
  arrears = run(arrears, { type: 'startSettlement' });
  arrears = run(arrears, { type: 'repay', amount: 50000 });
  assert.equal(interestAmount(arrears), 101200);
  arrears = run(arrears, { type: 'payInterest' });
  assert.equal(arrears.interest, 0);
  assert.equal(arrears.cash, 348800);
});

test('old thirty-action saves migrate once preserving assets, relative deadlines and known principal prepayments', () => {
  const old = owned();
  delete old.weeklyRulesVersion;
  delete old.principalRepaidThisWeek;
  old.interestWeek = 2;
  old.weekActions = 25;
  old.minute = 2 * 14400 + 25 * 480;
  old.inventory[0].expires = old.minute + 960;
  old.principal -= 100000;
  old.logs.unshift({
    id: ++old.serial,
    minute: old.minute,
    week: 3,
    text: '원금 100,000 원 상환했습니다.',
  });
  const snapshot = structuredClone(old);
  const saved = parseSave({ version: 2, game: old, favoriteIds: ['kept'] });
  const g = saved.game;
  assert.equal(g.weekActions, 20);
  assert.equal(actionsLeft(g), 0);
  assert.equal(g.interestWeek, 2);
  assert.equal(g.minute, 3 * WEEK_TICKS);
  assert.equal(g.principalRepaidThisWeek, 100000);
  assert.equal(mandatoryPrincipal(g), 100000);
  assert.equal(g.cash, old.cash);
  assert.equal(g.inventory[0].expires - g.minute, 960);
  assert.equal(g.seed, old.seed);
  assert.deepEqual(parseSave(saved), saved);
  assert.deepEqual(old, snapshot);
  const active = structuredClone(old);
  active.weekActions = 18;
  active.minute = 2 * 14400 + 18 * 480;
  assert.equal(
    actionsLeft(parseSave({ version: 2, game: active, favoriteIds: [] }).game),
    2,
  );
  for (const changes of [
    { weekActions: 21 },
    { principalRepaidThisWeek: -1 },
    { principalRepaidThisWeek: 1.5 },
    { weeklyRulesVersion: 3 },
  ])
    assert.equal(isGame({ ...g, ...changes }), false);
});

test('hundred-won rounding handles half boundaries, zero and exact large integer ratios', () => {
  for (const [input, expected] of [
    [0, 0],
    [1, 0],
    [49, 0],
    [50, 100],
    [99, 100],
    [1049, 1000],
    [1050, 1100],
    [1099, 1100],
  ])
    assert.equal(roundMoney(input), expected);
  const large = 999999999999999;
  assert.equal(
    moneyRatio(large, 201, 100000),
    Number(((BigInt(large) * 201n + 5000000n) / 10000000n) * 100n),
  );
  assert.equal(weeklyInterest(14949999, 1), 100);
  assert.equal(weeklyInterest(15000000, 1), 200);
  assert.equal(instantSalePrice({ value: 1050 }), 600);
  assert.equal(instantSalePrice({ value: 1250 }), 800);
  assert.throws(() => roundMoney(Infinity));
  assert.equal(Object.is(roundMoney(-49), -0), false);
});

test('typed repayment and listing amounts round before charging or recording without hidden residuals', () => {
  for (const [input, expected] of [
    [1049, 1000],
    [1050, 1100],
  ]) {
    const g = owned();
    const repaid = run(g, { type: 'repay', amount: input });
    assert.equal(g.cash - repaid.cash, expected);
    assert.equal(g.principal - repaid.principal, expected);
    assert.equal(repaid.principalRepaidThisWeek, expected);
    const posted = run(g, {
      type: 'post',
      id: g.inventory[0].id,
      price: input,
    });
    assert.equal(posted.sales[0].price, expected);
    assert.ok(allMoneyAligned(repaid));
    assert.ok(allMoneyAligned(posted));
  }
  const g = owned();
  for (const command of [
    { type: 'post', id: g.inventory[0].id, price: 49 },
    { type: 'repay', amount: 49 },
  ] as Command[]) {
    assert.equal(execute(g, command).ok, false);
    assert.equal(g.weekActions, 0);
  }
});

test('rounded bargaining offers remain distinct and strictly improve, ending when no hundred-won gap remains', () => {
  assert.deepEqual(openingPurchaseOffers(10100), [7100, 8600]);
  assert.deepEqual(nextPurchaseOffers(100000, 99900), []);
  const options = nextPurchaseOffers(100000, 99500);
  assert.equal(new Set(options).size, options.length);
  assert.ok(
    options.every((p) => p % MONEY_UNIT === 0 && p > 99500 && p < 100000),
  );
  const item = bargainFixture('street', 100000);
  item.price = 100000;
  item.negotiatedPrice = 100000;
  item.offers = [99900];
  item.purchaseBargain!.previousOffer = 99800;
  const last = purchaseReply(item, 99900, () => 0.99).item;
  assert.equal(last.chatSettled, true);
  assert.deepEqual(last.offers, []);
  assert.equal(last.negotiatedPrice, 100000);
});

test('new games and mixed trade/weekly payment sequences keep every ledger field on the hundred-won grid', () => {
  for (let seed = 1; seed <= 20; seed++) {
    let g = newGame(seed);
    assert.ok(allMoneyAligned(g));
    g.cash = 10000000;
    g.stats.peakCash = g.cash;
    const item = g.board.find((i) => i.price > 0 && i.marketId === 'street')!;
    g = run(g, { type: 'buy', id: item.id });
    g = run(g, { type: 'check', id: item.id });
    g = run(g, { type: 'outletSell', id: item.id });
    for (let week = 0; week < 4; week++) {
      g = run(g, { type: 'startSettlement' });
      g = run(g, { type: 'repay', amount: mandatoryPrincipal(g) });
      g = run(g, { type: 'payInterest' });
      assert.ok(allMoneyAligned(g));
      assert.deepEqual(
        parseSave({ version: 2, game: g, favoriteIds: [] }).game,
        g,
      );
    }
  }
});

test('legacy money migration rounds once without RNG, asset loss or duplicate offers', () => {
  const old = owned();
  delete old.moneyUnit;
  old.cash = 123456;
  old.principal = RULES.debt - 1234;
  old.interest = 567;
  old.principalRepaidThisWeek = 1234;
  const item = old.inventory[0];
  item.acquiredFor = 1050;
  item.base = 20001;
  item.value = 10001;
  item.chat = [{ speaker: 'other', text: '1,049 원에 거래했습니다.' }];
  old.sales = [
    {
      id: 'rounded-sale',
      itemId: item.id,
      price: 54321,
      created: 0,
      expires: 2880,
      nextCheck: 480,
    },
  ];
  old.inquiries = [
    {
      id: 'rounded-inquiry',
      saleId: 'rounded-sale',
      name: '구매자',
      price: 32549,
      max: 49999,
      rounds: 0,
    },
  ];
  const snapshot = structuredClone(old);
  const data = parseSave({ version: 2, game: old, favoriteIds: ['keep'] });
  assert.equal(data.game.cash, 123500);
  assert.equal(data.game.principal, RULES.debt - 1200);
  assert.equal(data.game.interest, 600);
  assert.equal(data.game.principalRepaidThisWeek, 1200);
  assert.equal(data.game.inventory[0].acquiredFor, 1100);
  assert.equal(
    data.game.inventory[0].chat![0].text,
    '1,000 원에 거래했습니다.',
  );
  assert.equal(data.game.sales[0].price, 54300);
  assert.equal(data.game.inquiries[0].price, 32500);
  assert.equal(data.game.seed, old.seed);
  assert.equal(data.game.minute, old.minute);
  assert.deepEqual(
    data.game.inventory.map((i) => i.id),
    old.inventory.map((i) => i.id),
  );
  assert.ok(allMoneyAligned(data.game));
  assert.deepEqual(parseSave(data), data);
  assert.deepEqual(old, snapshot);
  assert.equal(isGame({ ...data.game, cash: 123501 }), false);
});

test('legacy sub-unit current offers keep paid quotes consistent with the rounded contract', () => {
  const g = owned();
  delete g.moneyUnit;
  g.sales = [
    {
      id: 'tiny-sale',
      itemId: g.inventory[0].id,
      price: 1,
      created: 0,
      expires: 2880,
      nextCheck: 480,
    },
  ];
  g.inquiries = [
    {
      id: 'tiny-inquiry',
      saleId: 'tiny-sale',
      name: '구매자',
      price: 1,
      max: 100,
      rounds: 0,
      chat: [{ speaker: 'other', text: '1 원에 거래할 수 있을까요?' }],
    },
  ];
  const rounded = parseSave({ version: 2, game: g, favoriteIds: [] }).game;
  assert.equal(rounded.sales[0].price, 100);
  assert.equal(rounded.inquiries[0].price, 100);
  assert.equal(
    rounded.inquiries[0].chat![0].text,
    '100 원에 거래할 수 있을까요?',
  );
  const paid = run(rounded, { type: 'accept', id: 'tiny-inquiry' });
  assert.equal(paid.cash - rounded.cash, 100);
});

test('special listings appear occasionally, at most once per ordinary market, without changing stock counts or price bands', () => {
  const types = new Set<string>();
  let absent = false,
    present = false;
  for (let seed = 1; seed <= 100; seed++) {
    const g = newGame(seed);
    let count = 0;
    for (const market of MARKETS) {
      const listings = g.board.filter(
        (i) => i.marketId === market.id && i.price > 0,
      );
      assert.equal(listings.length, 8);
      const special = listings.filter((i) => i.special);
      assert.ok(special.length <= (market.id === 'auction' ? 0 : 1));
      count += special.length;
      for (const item of special) {
        types.add(item.special!);
        assert.ok(item.price >= market.min && item.price <= market.max);
        assert.ok(SPECIAL_LISTINGS[item.special!].markets.includes(market.id));
      }
    }
    absent ||= count === 0;
    present ||= count > 0;
    assert.ok(isGame(g));
    assert.ok(allMoneyAligned(g));
  }
  assert.ok(absent && present);
  assert.deepEqual([...types].sort(), ['clearance', 'collector', 'unverified']);
});

test('special discounts preserve hidden facts, collectors are not guaranteed genuine, and purchased metadata survives backup', () => {
  let g = newGame(14);
  g.cash = 1000000;
  g.stats.peakCash = g.cash;
  const item = g.board.find(
    (i) => i.marketId === 'street' && i.price >= 20000 && !i.special,
  )!;
  const original = structuredClone(item);
  item.listing!.facts.seller = 'ordinary';
  const clearance = applySpecialListing(item, 'clearance', 10000);
  assert.ok(clearance.price < item.price);
  assert.equal(clearance.expires, item.expires - ACTION_TICK);
  assert.equal(
    clearance.listing!.facts.authentic,
    item.listing!.facts.authentic,
  );
  assert.equal(clearance.listing!.facts.seller, 'urgent');
  const real = structuredClone(item);
  real.listing!.facts.authentic = true;
  const rare = applySpecialListing(real, 'collector', 10000);
  assert.equal(rare.value, real.value * 2);
  real.listing!.facts.authentic = false;
  assert.equal(applySpecialListing(real, 'collector', 10000).value, real.value);
  assert.throws(() => applySpecialListing(clearance, 'collector', 10000));
  assert.equal(item.value, original.value);
  g.board = g.board.map((i) => (i.id === item.id ? clearance : i));
  g = run(g, { type: 'buy', id: item.id });
  assert.equal(g.inventory[0].special, 'clearance');
  assert.equal(g.inventory[0].value, item.value);
  assert.deepEqual(parseSave({ version: 2, game: g, favoriteIds: [] }).game, g);
});

test('business purchase spends one action and caps each type at five without consuming inventory or purchase XP', () => {
  for (const business of BUSINESSES) {
    const original = newGame();
    original.cash = business.cost * 6;
    original.stats.peakCash = original.cash;
    let g = original;
    for (let n = 1; n <= BUSINESS_LIMIT_PER_TYPE; n++) {
      g = run(g, { type: 'buyBusiness', id: business.id });
      assert.equal(g.cash, original.cash - business.cost * n);
      assert.equal(g.weekActions, n);
      assert.equal(g.minute, n * 480);
      assert.equal(g.inventory.length, 0);
      assert.equal(g.stats.purchases, 0);
      assert.equal(g.businesses!.length, n);
      assert.equal(weeklyBusinessIncome(g), business.income * n);
      assert.deepEqual(
        parseSave({ version: 2, game: g, favoriteIds: [] }).game,
        g,
      );
    }
    for (const command of [
      { type: 'buyBusiness', id: business.id },
      { type: 'buyBusiness', id: 'unknown' },
    ] as Command[]) {
      const rejected = execute(g, command);
      assert.equal(rejected.ok, false);
      assert.deepEqual(rejected.game, g);
    }
    assert.equal(original.businesses!.length, 0);
  }
  const exhausted = newGame();
  exhausted.weekActions = 20;
  exhausted.minute = 20 * 480;
  assert.equal(
    execute(exhausted, { type: 'buyBusiness', id: 'stand' }).ok,
    false,
  );
  assert.equal(exhausted.businesses!.length, 0);
  assert.equal(exhausted.cash, RULES.startingCash);
});

test('business yields decrease from at most five percent and imports allow five of every type with aggregate income paid once', () => {
  let previous = Infinity;
  for (const business of BUSINESSES) {
    const rate = business.income / business.cost;
    assert.ok(rate > 0 && rate <= 0.05 && rate < previous);
    assert.equal(business.income % 100, 0);
    previous = rate;
  }
  const g = newGame();
  g.businesses = BUSINESSES.flatMap((b) =>
    Array.from({ length: BUSINESS_LIMIT_PER_TYPE }, () => ({
      id: b.id,
      purchasedWeek: 1,
    })),
  );
  assert.equal(g.businesses.length, 25);
  const loaded = parseSave({ version: 2, game: g, favoriteIds: [] }).game;
  const expected = BUSINESSES.reduce(
    (sum, b) => sum + b.income * BUSINESS_LIMIT_PER_TYPE,
    0,
  );
  assert.equal(weeklyBusinessIncome(loaded), expected);
  const settled = run(loaded, { type: 'startSettlement' });
  assert.equal(settled.cash, loaded.cash + expected);
  assert.equal(settled.businessIncomeAmount, expected);
  assert.equal(pendingBusinessIncome(settled), 0);
  assert.deepEqual(
    parseSave({ version: 2, game: settled, favoriteIds: [] }).game,
    settled,
  );
});

test('business income is paid before debt eligibility and once per settlement, including after reload and in later weeks', () => {
  let g = newGame();
  g.cash = 1000000;
  g.stats.peakCash = g.cash;
  g = run(g, { type: 'buyBusiness', id: 'stand' });
  const before = structuredClone(g);
  assert.equal(g.cash, 900000);
  assert.equal(pendingBusinessIncome(g), 5000);
  g = run(g, { type: 'startSettlement' });
  assert.equal(g.cash, 905000);
  assert.equal(g.businessIncomeWeek, 1);
  assert.equal(g.businessIncomeAmount, 5000);
  assert.equal(g.minute, before.minute);
  assert.equal(pendingBusinessIncome(g), 0);
  assert.equal(execute(g, { type: 'startSettlement' }).ok, false);
  g = parseSave({ version: 2, game: g, favoriteIds: [] }).game;
  assert.equal(g.cash, 905000);
  assert.equal(pendingBusinessIncome(g), 0);
  g = run(g, { type: 'repay', amount: 50000 });
  g = run(g, { type: 'payInterest' });
  assert.equal(g.cash, 755000);
  assert.equal(pendingBusinessIncome(g), 5000);
  g = run(g, { type: 'startSettlement' });
  assert.equal(g.cash, 760000);
  assert.equal(g.businessIncomeWeek, 2);
  g = run(g, { type: 'repay', amount: 100000 });
  g = run(g, { type: 'payInterest' });
  assert.equal(g.cash, 360000);
  assert.equal(g.businessIncomeWeek, 2);
  assert.ok(allMoneyAligned(g));
});

test('business income can fund the due bill, is not earned offline or by reading, and caps safely at wallet limits', () => {
  let g = newGame();
  g.cash = 245000;
  g = run(g, { type: 'buyBusiness', id: 'stand' });
  assert.equal(g.cash, 145000);
  const read = parseSave({ version: 2, game: g, favoriteIds: [] }).game;
  assert.deepEqual(read, g);
  g = run(g, { type: 'startSettlement' });
  assert.equal(g.cash, 150000);
  assert.equal(g.status, 'playing');
  g = run(g, { type: 'repay', amount: 50000 });
  g = run(g, { type: 'payInterest' });
  assert.equal(g.cash, 0);
  assert.equal(g.status, 'playing');
  let full = newGame();
  full.cash = RULES.maxMoney;
  full.stats.peakCash = full.cash;
  full = run(full, { type: 'buyBusiness', id: 'stand' });
  full.cash = RULES.maxMoney - 1000;
  full = run(full, { type: 'startSettlement' });
  assert.equal(full.cash, RULES.maxMoney);
  assert.equal(full.businessIncomeAmount, 1000);
});

test('business ownership and income metadata reject malformed imports while old saves gain no free investments', () => {
  const g = run(newGame(), { type: 'buyBusiness', id: 'stand' });
  assert.deepEqual(parseSave({ version: 2, game: g, favoriteIds: [] }).game, g);
  const invalids: ((v: Game) => void)[] = [
    (v) => {
      v.businesses = Array.from({ length: 6 }, () => ({ ...v.businesses![0] }));
    },
    (v) => {
      v.businesses![0].purchasedWeek = 2;
    },
    (v) => {
      v.businessIncomeWeek = 99;
    },
    (v) => {
      v.businessIncomeAmount = 51;
    },
    (v) => {
      v.businesses![0].id = 'bad' as 'stand';
    },
    (v) => {
      v.settling = true;
    },
  ];
  for (const edit of invalids) {
    const invalid = structuredClone(g);
    edit(invalid);
    assert.equal(isGame(invalid), false);
  }
  const old = newGame();
  delete old.businesses;
  delete old.businessIncomeWeek;
  delete old.businessIncomeAmount;
  const saved = parseSave({ version: 2, game: old, favoriteIds: [] }).game;
  assert.deepEqual(saved.businesses, []);
  assert.equal(saved.cash, old.cash);
  assert.equal(weeklyBusinessIncome(saved), 0);
  // A receipt paid under the previous rates remains historical cash, never a new claim.
  const priorRate = structuredClone(g);
  priorRate.settling = true;
  priorRate.businessIncomeWeek = 1;
  priorRate.businessIncomeAmount = 20000;
  priorRate.cash = 420000;
  const restored = parseSave({
    version: 2,
    game: priorRate,
    favoriteIds: [],
  }).game;
  assert.deepEqual(restored, priorRate);
  assert.equal(pendingBusinessIncome(restored), 0);
  assert.equal(execute(restored, { type: 'startSettlement' }).ok, false);
});

test('purchase experience improves new negotiation floors without changing hidden value or firm-seller rules', () => {
  const original = newGame(7).board.find(
    (i) => i.marketId === 'street' && !i.special,
  )!;
  original.listing!.facts.seller = 'ordinary';
  const beginner = purchaseReply(
    original,
    original.offers[0],
    () => 0.99,
    0,
  ).item;
  const experienced = purchaseReply(
    original,
    original.offers[0],
    () => 0.99,
    5,
  ).item;
  assert.ok(
    experienced.purchaseBargain!.floor < beginner.purchaseBargain!.floor,
  );
  assert.equal(experienced.value, beginner.value);
  assert.deepEqual(experienced.listing, beginner.listing);
  original.listing!.facts.seller = 'firm';
  assert.equal(
    purchaseReply(original, original.offers[0], () => 0.99, 10).item
      .purchaseBargain!.floor,
    original.price,
  );
  const progressed = newGame();
  progressed.stats.purchases = 4;
  const item = progressed.board.find(
    (i) => i.price > 0 && i.marketId === 'street',
  )!;
  const result = execute(progressed, { type: 'buy', id: item.id });
  assert.ok(result.ok);
  assert.equal(result.game.stats.purchases, 5);
  assert.ok(result.message.includes('매입 감각 Lv.1'));
  assert.equal(result.game.inventory[0].value, item.value);
});
