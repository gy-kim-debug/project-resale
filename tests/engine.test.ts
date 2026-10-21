import test from 'node:test';
import assert from 'node:assert/strict';
import {
  execute,
  newGame,
  listingLimit,
  marketValue,
} from '../src/domain/engine';
import type { Command, Game } from '../src/domain/game';
import { RULES } from '../src/content/rules';
import { isGame } from '../src/storage/validation';
import { parseSave } from '../src/storage/saveRepository';
function run(g: Game, c: Command) {
  const r = execute(g, c);
  assert.ok(r.ok, r.message);
  assert.ok(isGame(r.game), JSON.stringify(r.game));
  return r.game;
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
  assert.equal(g.cash, 0);
  assert.equal(g.principal, 10_000_000_000);
  assert.deepEqual(g.inventory, []);
  assert.deepEqual(newGame(42), g);
  const snapshot = structuredClone(g);
  const failed = execute(g, { type: 'buy', id: g.board[0].id });
  assert.equal(failed.ok, false);
  assert.deepEqual(g, snapshot);
  assert.strictEqual(failed.game, g);
  const next = run(g, { type: 'job', id: 'flyer' });
  assert.equal(next.minute, g.minute + 60);
  assert.equal(next.cash, 9000);
  assert.deepEqual(g, snapshot);
});
test('satiety zero blocks consuming actions, not free meal / sleep / discard / inquiry replies', () => {
  let g = owned();
  g.satiety = 0;
  for (const c of [
    { type: 'job', id: 'flyer' },
    { type: 'scavenge' },
    { type: 'refresh' },
    { type: 'check', id: g.inventory[0].id },
    { type: 'visit', id: 'scrap' },
  ] as Command[])
    assert.equal(execute(g, c).ok, false);
  const healed = run(g, { type: 'meal', id: 'free' });
  assert.ok(healed.satiety > 0);
  assert.ok(run(g, { type: 'sleep' }).satiety === 0);
  const discarded = run(g, { type: 'discard', id: g.inventory[0].id });
  assert.equal(discarded.minute, g.minute);
  g = pending();
  g.satiety = 0;
  assert.ok(run(g, { type: 'accept', id: g.inquiries[0].id }).cash > g.cash);
});
test('free meals repeat to full, fixed sleep satiety loss, sleep preserves health', () => {
  let g = newGame(4);
  g.satiety = 0;
  g.health = 30;
  for (let i = 0; i < 8; i++) g = run(g, { type: 'meal', id: 'free' });
  assert.equal(g.satiety, 100);
  const h = g.health;
  g = run(g, { type: 'sleep' });
  assert.equal(g.satiety, 82);
  assert.equal(g.health, h);
  assert.equal(g.fatigue, 100);
  assert.equal(g.minute % 1440, 540);
});
test('fatigue zero ends day, health zero is final, death cannot be healed', () => {
  let g = newGame();
  g.fatigue = 1;
  const day = Math.floor(g.minute / 1440);
  g = run(g, { type: 'job', id: 'flyer' });
  assert.ok(Math.floor(g.minute / 1440) > day);
  assert.equal(g.fatigue, 100);
  g = newGame();
  g.health = 1;
  g.satiety = 1;
  g = run(g, { type: 'job', id: 'flyer' });
  assert.equal(g.health, 0);
  assert.equal(g.status, 'dead');
  assert.equal(execute(g, { type: 'meal', id: 'free' }).ok, false);
});
test('survival numbers do not modify hidden value or stochastic negotiation outcomes', () => {
  const a = rich(60),
    b = structuredClone(a);
  b.health = 20;
  b.satiety = 20;
  b.fatigue = 60;
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
test('free giveaways may be absent despite zero cash; available giveaway is guaranteed', () => {
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
      assert.equal(next.cash, 0);
    }
  }
  assert.ok(absent && present);
});
test('scavenging always finds one item; capacity checked before cost/time', () => {
  let g = newGame();
  for (let n = 0; n < RULES.capacity; n++) {
    g.satiety = 100;
    g.fatigue = 100;
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
test('pending inquiries block engine actions, survive serialization, break closes all and permits repost', () => {
  let g = pending();
  assert.ok(g.inquiries.length >= 2);
  const serialized = parseSave(
    JSON.parse(JSON.stringify({ version: 2, game: g, favoriteIds: [] })),
  );
  assert.deepEqual(serialized.game, g);
  for (const c of [
    { type: 'sleep' },
    { type: 'meal', id: 'free' },
    { type: 'repay', amount: 1 },
    { type: 'discard', id: g.inventory[0].id },
    { type: 'refresh' },
  ] as Command[])
    assert.equal(execute(g, c).ok, false);
  const id = g.inventory[0].id;
  g = run(g, { type: 'break', id: g.inquiries[0].id });
  assert.equal(g.inquiries.length, 0);
  assert.equal(g.sales.length, 0);
  g = run(g, { type: 'post', id, price: 3000 });
  assert.equal(g.sales[0].price, 3000);
});
test('buyer rejection may raise or walk; rounds terminate and no player counteroffer', () => {
  for (let seed = 1; seed < 20; seed++) {
    let g = pending();
    g.seed = seed;
    let n = 0;
    while (g.inquiries.length && n++ < 4) {
      const old = g.inquiries[0].price;
      g = run(g, { type: 'reject', id: g.inquiries[0].id });
      if (g.inquiries.length) assert.ok(g.inquiries[0].price > old);
    }
    assert.equal(g.inquiries.length, 0);
    assert.equal(g.sales.length, 0);
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
  g.minute += 120;
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
test('interest grace, ceil integer rounding, principal only, repayment interest first and clear', () => {
  let g = rich();
  g.interest = 100;
  g = run(g, { type: 'repay', amount: 150 });
  assert.equal(g.interest, 0);
  assert.equal(g.principal, RULES.debt - 50);
  g = newGame();
  for (let n = 0; n < 2; n++) g = run(g, { type: 'sleep' });
  assert.equal(g.interest, 0);
  g = run(g, { type: 'sleep' });
  assert.equal(g.interest, 10000);
  g = run(g, { type: 'sleep' });
  assert.equal(g.interest, 20000);
  g = rich();
  g.principal = 101;
  g.interest = 7;
  g = run(g, { type: 'repay', amount: 108 });
  assert.equal(g.status, 'cleared');
  assert.equal(g.principal + g.interest, 0);
  assert.equal(execute(g, { type: 'job', id: 'flyer' }).ok, false);
});
test('expiry frees listing without disposing item; fixed capacity never grows', () => {
  let g = owned();
  g = run(g, { type: 'post', id: g.inventory[0].id, price: 999999999 });
  g.minute += 2880;
  g = run(g, { type: 'sleep' });
  assert.equal(g.sales.length, 0);
  assert.equal(g.inventory.length, 1);
  assert.ok(g.inventory.length <= RULES.capacity);
});
test('conditional event chain and random market update', () => {
  let g = rich();
  g.stats.sales = 3;
  g.minute += 180;
  g = run(g, { type: 'wait' });
  assert.equal(g.event?.type, 'repair');
  g = run(g, { type: 'event', choice: 'yes' });
  assert.equal(g.eventStage, 2);
  assert.ok(g.stats.repairs >= 4);
  g = run(g, { type: 'sleep' });
  g = run(g, { type: 'sleep' });
  assert.equal(g.eventStage, 3);
  assert.ok(g.logs.some((l) => l.text.includes('감사금')));
});
test('corrupt data rejected, no restoring living health-zero or broken references', () => {
  const g = newGame();
  assert.ok(isGame(g));
  assert.throws(() =>
    parseSave({ version: 2, game: { ...g, cash: 1.2 }, favoriteIds: [] }),
  );
  assert.equal(isGame({ ...g, inventory: [{}] }), false);
  assert.equal(isGame({ ...g, health: 0 }), false);
  assert.equal(isGame({ ...g, principal: -1 }), false);
  assert.equal(isGame({ ...g, seed: NaN }), false);
  assert.equal(
    isGame({ ...g, inquiries: [{ id: 'bad', saleId: 'missing' }] }),
    false,
  );
});

for (const seed of [1, 42, 210])
  test(`long-play seed ${seed} grows from zero to full repayment through real commands`, () => {
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
      if (g.inquiries.length) {
        const q = [...g.inquiries].sort((a, b) => b.price - a.price)[0];
        step({ type: 'accept', id: q.id });
        continue;
      }
      if (g.health < 30 || g.satiety < 35) {
        step({ type: 'meal', id: g.cash >= 5000 ? 'meal' : 'free' });
        continue;
      }
      if (g.fatigue < 25) {
        step({ type: 'sleep' });
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
    assert.equal(
      g.status,
      'cleared',
      `Failed to reach goal after ${commands} actions; cash ${g.cash}`,
    );
  });

test('every paid-time action advances whole hours, and listing wait starts after registration', () => {
  const cases: { game: Game; command: Command; hours: number }[] = [];
  for (const [id, hours] of [
    ['flyer', 1],
    ['shop', 2],
    ['warehouse', 3],
  ] as const)
    cases.push({ game: rich(), command: { type: 'job', id }, hours });
  for (const id of ['free', 'rice', 'meal'])
    cases.push({ game: rich(), command: { type: 'meal', id }, hours: 1 });
  for (const type of ['treat', 'scavenge', 'refresh', 'wait'] as const)
    cases.push({ game: rich(), command: { type }, hours: 1 });
  for (const type of ['buy', 'offer'] as const) {
    const g = rich();
    cases.push({
      game: g,
      command:
        type === 'offer'
          ? { type, id: g.board[0].id, price: g.board[0].offers[0] }
          : { type, id: g.board[0].id },
      hours: type === 'offer' ? 0 : 1,
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
    cases.push({ game: g, command, hours: 1 });
  }
  let g = run(owned(), { type: 'post', id: owned().inventory[0].id, price: 1 });
  assert.equal(
    g.inquiries.length,
    0,
    'posting itself does not generate an early inquiry',
  );
  assert.equal(g.sales[0].created, g.minute);
  assert.equal(g.sales[0].expires - g.minute, 48 * 60);
  assert.equal(g.sales[0].nextCheck - g.minute, 60);
  cases.push({
    game: g,
    command: { type: 'cancel', id: g.inventory[0].id },
    hours: 1,
  });
  g = run(owned(), { type: 'visit', id: 'scrap' });
  cases.push({
    game: g,
    command: { type: 'outletSell', id: g.inventory[0].id },
    hours: 1,
  });
  for (const type of ['accept', 'reject', 'break'] as const) {
    g = pending();
    if (type !== 'accept') continue; // free chat commands are covered separately
    cases.push({ game: g, command: { type, id: g.inquiries[0].id }, hours: 1 });
  }
  for (const choice of ['yes', 'no'] as const) {
    g = rich();
    g.event = {
      id: 'hour-event',
      type: 'deal',
      title: '제안',
      text: '1시간',
      expires: g.minute + 480,
    };
    cases.push({ game: g, command: { type: 'event', choice }, hours: 1 });
  }
  for (const { game, command, hours } of cases) {
    const next = run(game, command);
    assert.equal(
      next.minute - game.minute,
      hours * 60,
      JSON.stringify(command),
    );
    assert.equal(next.minute % 60, 0);
  }
});

test('hourly actions settle midnight once and legacy saves retain resources and relative deadlines', () => {
  const old = run(owned(), { type: 'visit', id: 'scrap' });
  old.minute = 3 * 1440 + 23 * 60 + 45;
  old.marketDay = 4;
  old.board[0].expires = old.minute + 30;
  old.lastEvent = old.minute - 180;
  old.quotes!.at = old.minute - 15;
  old.hungerRemainder = 15;
  const snapshot = structuredClone(old);
  const migrated = parseSave({
    version: 2,
    game: old,
    favoriteIds: ['favorite'],
  });
  const g = migrated.game;
  assert.deepEqual(old, snapshot, 'migration is pure');
  assert.ok(isGame(g));
  assert.equal(g.minute, 3 * 1440 + 23 * 60);
  assert.equal(g.board[0].expires - g.minute, 30);
  assert.equal(g.minute - g.quotes!.at, 15);
  for (const key of [
    'cash',
    'principal',
    'interest',
    'satiety',
    'health',
    'fatigue',
    'hungerRemainder',
    'fatigueRemainder',
    'seed',
  ] as const)
    assert.equal(g[key], old[key]);
  assert.deepEqual(migrated.favoriteIds, ['favorite']);
  assert.deepEqual(parseSave(migrated), migrated, 'migration is idempotent');
  const after = run(g, { type: 'wait' });
  assert.equal(after.minute, 4 * 1440);
  assert.equal(after.interest - g.interest, 10_000);
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
  for (const key of [
    'minute',
    'cash',
    'interest',
    'satiety',
    'fatigue',
    'health',
    'lastEvent',
  ] as const)
    assert.equal(chat[key], before[key]);
  assert.equal(chat.board[0].chat?.length, 3);
  const restored = parseSave(
    JSON.parse(JSON.stringify({ version: 2, game: chat, favoriteIds: [] })),
  ).game;
  assert.deepEqual(restored, chat);
  const bought = run(restored, { type: 'buy', id: item.id });
  assert.equal(
    bought.minute - before.minute,
    60,
    'chat plus exchange is one hour total',
  );
  assert.equal(bought.inventory[0].chatSettled, true);
  const closed = run(restored, { type: 'closeChat', id: item.id });
  assert.equal(closed.minute, before.minute);
  assert.equal(closed.board[0].chatSettled, true);
  assert.equal(execute(closed, { type: 'closeChat', id: item.id }).ok, false);
  const hungry = structuredClone(before);
  hungry.satiety = 0;
  const hungryChat = run(hungry, {
    type: 'offer',
    id: item.id,
    price: item.offers[0],
  });
  assert.equal(hungryChat.health, hungry.health);
  assert.ok(
    run(hungryChat, { type: 'closeChat', id: item.id }).board[0].chatSettled,
  );
  const invalid = structuredClone(chat);
  invalid.board[0].chat = [{ speaker: 'other', text: 42 } as never];
  assert.equal(isGame(invalid), false);
});

test('sales chat and either side walking cost no time; completed sale takes one hour', () => {
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
    if (after.inquiries.length) {
      continued = true;
      for (const key of [
        'minute',
        'satiety',
        'fatigue',
        'health',
        'interest',
        'lastEvent',
      ] as const)
        assert.equal(after[key], g[key]);
      assert.equal(after.inquiries[0].chat?.length, 3);
      assert.ok(after.inquiries[0].price > q.price);
      for (const type of ['accept', 'break'] as const) {
        const ended = run(after, { type, id: q.id });
        assert.equal(ended.minute - g.minute, type === 'accept' ? 60 : 0);
        assert.equal(ended.inquiries.length, 0);
        assert.equal(execute(ended, { type, id: q.id }).ok, false);
      }
    } else {
      walked = true;
      assert.equal(after.minute, g.minute);
      assert.equal(after.sales.length, 0);
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
  assert.equal(bought.minute - g.minute, 60);
});
