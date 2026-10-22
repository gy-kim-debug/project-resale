import test from 'node:test';
import assert from 'node:assert/strict';
import {
  execute,
  newGame,
  listingLimit,
  marketValue,
} from '../src/domain/engine';
import {
  ACTION_TICK,
  actionsLeft,
  dayOf,
  type Command,
  type Game,
} from '../src/domain/game';
import { RULES } from '../src/content/rules';
import { isGame } from '../src/storage/validation';
import { parseSave } from '../src/storage/saveRepository';
import {
  weeklyInterest,
  weeklyRateText,
  interestAmount,
  interestPending,
  WEEK_TICKS,
} from '../src/domain/debt';
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
  g.board[0].price = g.cash + 1;
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
  original.inventory[0].checked = false;
  const legacy = { ...original, satiety: 0, hungerRemainder: 59 };
  const snapshot = structuredClone(legacy);
  const g = parseSave({ version: 2, game: legacy, favoriteIds: [] }).game;
  assert.equal('satiety' in g, false);
  assert.equal('hungerRemainder' in g, false);
  assert.equal(actionsLeft(g), 2);
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
  assert.equal(actionsLeft(worked), 2);
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
test('offer must be among choices, one attempt, accepted price used at purchase', () => {
  let g = rich(11);
  const i = g.board[0];
  assert.equal(execute(g, { type: 'offer', id: i.id, price: 1 }).ok, false);
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
    { type: 'repay', amount: 1 },
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
test('outlet requires visit, exact fixed price, quote expiry and listed blocking', () => {
  let g = owned();
  const id = g.inventory[0].id;
  assert.equal(execute(g, { type: 'outletSell', id }).ok, false);
  g = run(g, { type: 'visit', id: 'scrap' });
  const price = g.quotes!.prices[id],
    cash = g.cash;
  const sale = run(g, { type: 'outletSell', id });
  assert.equal(sale.cash, cash + price);
  assert.equal(sale.inventory.length, 0);
  g.minute += ACTION_TICK * 2;
  assert.equal(execute(g, { type: 'outletSell', id }).ok, false);
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
  assert.equal(g.principal, RULES.debt - 150);
  g = rich();
  g.principal = 101;
  g.interest = 7;
  g = run(g, { type: 'repay', amount: 101 });
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
        step({ type: 'payInterest' });
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
            i.negotiation !== 'rejected',
        )
        .sort((a, b) => b.price - a.price);
      const candidate = affordable[0];
      // Use only public prices and seller replies before buying; condition is hidden.
      if (candidate?.negotiation === 'none')
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
      assert.ok(g.cash < interestAmount(g));
      assert.equal(execute(g, { type: 'job', id: 'warehouse' }).ok, false);
    } else assert.equal(g.principal + g.interest, 0);
  });

test('each major action costs one daily action and inquiries start after registration', () => {
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
        ? { type, id: g.inventory[0].id, price: 1 }
        : type === 'visit'
          ? { type, id: 'scrap' }
          : type === 'repay'
            ? { type, amount: 1 }
            : { type, id: g.inventory[0].id };
    cases.push({ game: g, command, cost: type === 'visit' ? 0 : 1 });
  }
  let g = run(owned(), { type: 'post', id: owned().inventory[0].id, price: 1 });
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
  assert.equal(actionsLeft(g), 3);
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
  for (const price of [-1, 0, 100, 1.5, 1001, Infinity, NaN]) {
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

test('three major actions end exactly one day and refill the next daily budget', () => {
  let g = newGame(42);
  const originalBoard = g.board.map((i) => i.id);
  assert.equal(dayOf(g), 1);
  assert.equal(actionsLeft(g), 3);
  for (const left of [2, 1, 3]) {
    g = run(g, { type: 'job', id: 'flyer' });
    assert.equal(actionsLeft(g), left);
  }
  assert.equal(dayOf(g), 2);
  assert.equal(g.minute, 1440);
  assert.equal(g.cash, 527000);
  assert.notDeepEqual(
    g.board.map((i) => i.id),
    originalBoard,
  );
});

test('all jobs use exactly one action with no premature day ending', () => {
  let g = newGame();
  for (const remaining of [2, 1, 3]) {
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
  assert.equal(weeklyInterest(1, 1), 1);
  assert.equal(weeklyInterest(100001, 1), 2);
  assert.equal(weeklyInterest(0, 10), 0);
  const principal = 999999999999999;
  assert.equal(
    BigInt(weeklyInterest(principal, 101)),
    (BigInt(principal) * 201n + 99999n) / 100000n,
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
  assert.equal(actionsLeft(g), 3);
});

test('week boundary locks progress until payment, then increases the rate without spending an action', () => {
  let g = rich();
  g.minute = WEEK_TICKS - ACTION_TICK;
  g = run(g, { type: 'wait' });
  assert.equal(interestPending(g), true);
  assert.equal(g.interest, 0);
  assert.equal(g.cash, 100000);
  for (const type of ['job', 'wait', 'visit', 'discard', 'offer'] as const)
    assert.equal(execute(g, { type, id: 'scrap' } as Command).ok, false);
  const snapshot = structuredClone(g);
  assert.deepEqual(parseSave({ version: 2, game: g, favoriteIds: [] }).game, g);
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
  old.sales[0].expires = old.minute + 2880;
  old.sales[0].nextCheck = old.minute + 30;
  old.quotes = {
    outlet: 'scrap',
    at: old.minute - 15,
    prices: { [old.inventory[0].id]: 123 },
  };
  const before = structuredClone(old);
  const saved = parseSave({ version: 2, game: old, favoriteIds: ['kept'] });
  const g = saved.game;
  assert.deepEqual(old, before);
  assert.equal(g.timeMode, 'daily-actions');
  assert.equal(dayOf(g), 10);
  assert.equal(actionsLeft(g), 3);
  assert.deepEqual(g.inquiries, old.inquiries);
  assert.deepEqual(g.stats, old.stats);
  assert.equal(g.sales[0].price, old.sales[0].price);
  assert.equal(g.sales[0].expires - g.minute, 2880);
  assert.equal(g.sales[0].nextCheck - g.minute, ACTION_TICK);
  assert.deepEqual(g.quotes?.prices, old.quotes.prices);
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
  g.cash = price - 1;
  const snapshot = structuredClone(g);
  assert.equal(execute(g, { type: 'buy', id: g.board[0].id }).ok, false);
  assert.deepEqual(g, snapshot);
  g.cash = price + 1;
  const after = run(g, { type: 'buy', id: g.board[0].id });
  assert.equal(after.cash, 1);
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
  g.cash = 99999;
  const after = run(g, { type: 'wait' });
  assert.equal(after.status, 'bankrupt');
  assert.equal(after.cash, 99999);
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
  g = run(g, { type: 'repay', amount: 100000 });
  assert.equal(g.minute, WEEK_TICKS);
  assert.equal(interestAmount(g), 99999);
  g = run(g, { type: 'payInterest' });
  assert.equal(g.cash, 1);
  assert.equal(g.interestWeek, 1);
});
test('legacy saves keep arrears but begin weekly billing without retroactive invoices', () => {
  const g = rich();
  g.minute = WEEK_TICKS * 5 + ACTION_TICK;
  g.interest = 1234;
  delete g.interestWeek;
  const result = parseSave({ version: 2, game: g, favoriteIds: [] }).game;
  assert.equal(result.interestWeek, 5);
  assert.equal(result.interest, 1234);
  assert.equal(result.cash, g.cash);
  assert.equal(interestPending(result), false);
  assert.equal(interestAmount(result), 1100000 + 1234);
});
