import test from 'node:test';
import assert from 'node:assert/strict';
import { useGameStore, flushSaves } from '../src/app/store';
import { unreadCount } from '../src/app/notifications';
import {
  saveRepository,
  parseSave,
  type SaveData,
} from '../src/storage/saveRepository';
import { newGame, execute } from '../src/domain/engine';
import { auctionBidOptions } from '../src/domain/auction';
import { ACTION_TICK } from '../src/domain/game';
import {
  ACTION_DURATION_MS,
  changesBetween,
} from '../src/app/actionPresentation';

const writes: SaveData[] = [];
saveRepository.save = async (data) => {
  writes.push(structuredClone(data));
};
function setup() {
  writes.length = 0;
  useGameStore.setState({
    game: newGame(42),
    ready: true,
    tab: '활동',
    action: null,
    changes: {},
    notice: '',
    storageBlocked: false,
    favoriteIds: [],
    selectedMarket: 'street',
    readNotificationIds: [],
    saveError: '',
  });
}
test('action is committed once, briefly presented, then highlighted; all input paths are locked', async () => {
  setup();
  const store = useGameStore;
  const before = structuredClone(store.getState().game!);
  const completion = store.getState().act({ type: 'job', id: 'flyer' });
  const active = store.getState();
  assert.equal(active.action?.duration, 750);
  assert.ok(ACTION_DURATION_MS >= 500 && ACTION_DURATION_MS <= 1000);
  assert.equal(active.action?.before.minute, before.minute);
  assert.equal(active.action?.after.minute, before.minute + ACTION_TICK);
  assert.equal(active.game!.cash, 509000);
  assert.equal(active.notice, '');
  assert.equal(await active.act({ type: 'job', id: 'flyer' }), false);
  active.setTab('보관함');
  active.toggleFavorite('x');
  active.selectMarket('cars');
  assert.equal(store.getState().selectedMarket, 'street');
  active.startOver();
  assert.equal(active.importSave('{}'), false);
  assert.equal(store.getState().tab, '활동');
  assert.deepEqual(store.getState().favoriteIds, []);
  assert.equal(store.getState().game!.cash, 509000);
  assert.equal(await completion, true);
  await flushSaves();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].game.cash, 509000);
  assert.ok(!('action' in writes[0]));
  assert.equal(store.getState().action, null);
  assert.equal(store.getState().changes.cash, 9000);
  assert.equal(store.getState().changes.minute, ACTION_TICK);
  assert.match(store.getState().notice, /전단 배포 완료/);
});
test('navigation, favorites and rejected actions do not show presentation or consume time', async () => {
  setup();
  const s = useGameStore;
  const minute = s.getState().game!.minute;
  s.getState().setTab('내 정보');
  s.getState().toggleFavorite('x');
  assert.equal(s.getState().action, null);
  assert.equal(await s.getState().act({ type: 'buy', id: 'missing' }), false);
  assert.equal(s.getState().action, null);
  assert.equal(s.getState().game!.minute, minute);
});
test('zero-time discard still presents an action without advancing the clock', async () => {
  setup();
  const s = useGameStore;
  const g = structuredClone(s.getState().game!);
  const item = g.board.shift()!;
  g.inventory.push(item);
  s.setState({ game: g });
  const completion = s.getState().act({ type: 'discard', id: item.id });
  assert.equal(
    s.getState().action!.before.minute,
    s.getState().action!.after.minute,
  );
  assert.equal(await completion, true);
  assert.equal(s.getState().game!.inventory.length, 0);
  assert.equal(s.getState().changes.minute, undefined);
});
test('date boundaries and changed fields use actual engine deltas', () => {
  const before = newGame(1),
    after = structuredClone(before);
  after.minute += 1440;
  after.cash += 100;
  after.interest += 10000;
  assert.deepEqual(changesBetween(before, after), {
    minute: 1440,
    cash: 100,
    debt: 10000,
  });
});

test('chat replies and closure save immediately without time or loading', async () => {
  setup();
  const s = useGameStore;
  const g = s.getState().game!;
  const i = g.board[0];
  assert.equal(
    await s.getState().act({ type: 'offer', id: i.id, price: i.offers[0] }),
    true,
  );
  assert.equal(s.getState().action, null);
  assert.equal(s.getState().game!.minute, g.minute);
  assert.equal(s.getState().notice, '');
  await flushSaves();
  assert.equal(writes.at(-1)?.game.board[0].chat?.length, 3);
  const completion = s.getState().act({ type: 'closeChat', id: i.id });
  assert.equal(s.getState().action, null);
  assert.equal(await s.getState().act({ type: 'closeChat', id: i.id }), false);
  assert.equal(await completion, true);
  assert.equal(s.getState().game!.minute, g.minute);
});

test('seller counteroffers are saved immediately without presentation or transferring the item', async () => {
  setup();
  let g = newGame(42);
  g.inventory.push(g.board.shift()!);
  g = execute(g, { type: 'post', id: g.inventory[0].id, price: 1000 }).game;
  for (let n = 0; n < 8 && !g.inquiries.length; n++)
    g = execute(g, { type: 'wait' }).game;
  assert.ok(g.inquiries.length);
  g.inquiries[0].price = 100;
  g.inquiries[0].max = 500;
  const q = g.inquiries[0];
  useGameStore.setState({ game: g });
  const result = useGameStore
    .getState()
    .act({ type: 'counter', id: q.id, price: 200 });
  assert.equal(useGameStore.getState().action, null);
  assert.equal(await result, true);
  await flushSaves();
  assert.equal(writes.at(-1)?.game.inquiries[0].price, 200);
  assert.equal(useGameStore.getState().game!.minute, g.minute);
  assert.equal(useGameStore.getState().game!.inventory.length, 1);
  assert.equal(useGameStore.getState().game!.cash, g.cash);
});

test('outlet navigation updates and saves quotes immediately without action layer or result notice', async () => {
  setup();
  const g = structuredClone(useGameStore.getState().game!);
  useGameStore.setState({ game: g });
  assert.equal(
    await useGameStore.getState().act({ type: 'visit', id: 'scrap' }),
    true,
  );
  assert.equal(useGameStore.getState().action, null);
  assert.equal(useGameStore.getState().notice, '');
  assert.equal(useGameStore.getState().game!.minute, g.minute);
  await flushSaves();
  assert.equal(writes.at(-1)?.game.quotes?.outlet, 'scrap');
  assert.deepEqual(writes.at(-1)?.game.logs, g.logs);
});

test('weekly payment commits once, saves the paid week and resumes with zero cash', async () => {
  setup();
  const g = newGame(42);
  g.cash = 100000;
  g.minute = 7 * 1440;
  useGameStore.setState({ game: g });
  const completion = useGameStore.getState().act({ type: 'payInterest' });
  assert.equal(useGameStore.getState().game!.cash, 0);
  assert.equal(useGameStore.getState().game!.interestWeek, 1);
  assert.equal(
    await useGameStore.getState().act({ type: 'payInterest' }),
    false,
  );
  assert.equal(await completion, true);
  await flushSaves();
  assert.equal(writes.at(-1)?.game.interestWeek, 1);
  assert.equal(useGameStore.getState().game!.status, 'playing');
});

test('mail read state persists without changing game, time or action budget', async () => {
  await flushSaves();
  setup();
  const s = useGameStore;
  const game = structuredClone(s.getState().game!);
  const id = game.logs[0].id;
  assert.equal(unreadCount(game, []), game.logs.length);
  s.getState().readNotification(id);
  await flushSaves();
  assert.deepEqual(s.getState().game, game);
  assert.equal(s.getState().action, null);
  assert.equal(
    unreadCount(game, s.getState().readNotificationIds),
    game.logs.length - 1,
  );
  assert.deepEqual(writes.at(-1)?.readNotificationIds, [id]);
  const count = writes.length;
  s.getState().readNotification(id);
  s.getState().readNotification(-1);
  await flushSaves();
  assert.equal(writes.length, count);
  const backup = JSON.stringify(writes.at(-1));
  s.setState({ readNotificationIds: [] });
  assert.equal(s.getState().importSave(backup), true);
  assert.deepEqual(s.getState().readNotificationIds, [id]);
  await flushSaves();
  s.getState().startOver();
  assert.deepEqual(s.getState().readNotificationIds, []);
  await flushSaves();
});

test('all-read covers visible mail only; new mail is unread and expired ids are pruned', async () => {
  await flushSaves();
  setup();
  const s = useGameStore;
  const game = structuredClone(s.getState().game!);
  game.logs = Array.from({ length: 25 }, (_, i) => ({
    id: 1000 + i,
    minute: 0,
    text: `mail ${i}`,
  }));
  s.setState({ game });
  s.getState().readAllNotifications();
  await flushSaves();
  assert.equal(s.getState().readNotificationIds.length, 20);
  assert.equal(unreadCount(game, s.getState().readNotificationIds), 0);
  const next = structuredClone(game);
  next.logs.unshift({ id: 2000, minute: 0, text: 'new mail' });
  next.logs = next.logs.filter((log) => log.id !== 1001);
  s.setState({ game: next });
  s.getState().save();
  await flushSaves();
  assert.equal(unreadCount(next, s.getState().readNotificationIds), 1);
  assert.ok(!s.getState().readNotificationIds.includes(1001));
  s.setState({
    action: {
      id: 1,
      label: '처리 중',
      before: next,
      after: next,
      duration: 750,
    },
  });
  s.getState().readNotification(2000);
  s.getState().readAllNotifications();
  assert.equal(unreadCount(next, s.getState().readNotificationIds), 1);
  s.setState({ action: null });
});

test('older backups default to unread, malformed read metadata cannot overwrite progress', async () => {
  await flushSaves();
  setup();
  const s = useGameStore;
  const game = s.getState().game!;
  const old = { version: 2, game, favoriteIds: [] };
  assert.deepEqual(parseSave(old).readNotificationIds, []);
  for (const invalid of [[-1], ['1'], [1.5], Array(81).fill(1), null]) {
    assert.equal(
      s
        .getState()
        .importSave(JSON.stringify({ ...old, readNotificationIds: invalid })),
      false,
    );
    assert.deepEqual(s.getState().game, game);
  }
});

test('market selection is free, persisted and restored without changing any game state', async () => {
  await flushSaves();
  setup();
  const s = useGameStore;
  const before = structuredClone(s.getState().game!);
  s.getState().selectMarket('computers');
  assert.equal(s.getState().selectedMarket, 'computers');
  assert.deepEqual(s.getState().game, before);
  assert.equal(s.getState().action, null);
  await flushSaves();
  assert.equal(writes.at(-1)?.selectedMarket, 'computers');
  const backup = JSON.stringify(writes.at(-1));
  s.getState().selectMarket('property');
  assert.equal(s.getState().importSave(backup), true);
  assert.equal(s.getState().selectedMarket, 'computers');
  s.getState().selectMarket('aircraft');
  assert.equal(s.getState().selectedMarket, 'computers');
  s.getState().selectMarket('unknown' as never);
  assert.equal(s.getState().selectedMarket, 'computers');
  assert.deepEqual(s.getState().game, before);
  await flushSaves();
  s.getState().startOver();
  assert.equal(s.getState().selectedMarket, 'street');
  await flushSaves();
});

test('auction replies save immediately without loading or action cost; settlement still presents once', async () => {
  await flushSaves();
  setup();
  const s = useGameStore;
  const game = structuredClone(s.getState().game!);
  game.cash = 100000000000;
  s.setState({ game });
  const lot = game.board.find((i) => i.marketId === 'auction')!;
  while (
    s.getState().game!.board.find((i) => i.id === lot.id)!.auction!.status !==
    'won'
  ) {
    const live = s.getState().game!.board.find((i) => i.id === lot.id)!;
    await s
      .getState()
      .act({ type: 'bid', id: lot.id, amount: auctionBidOptions(live)[0] });
    assert.equal(s.getState().action, null);
    assert.equal(s.getState().game!.minute, game.minute);
    assert.equal(s.getState().game!.cash, game.cash);
  }
  await flushSaves();
  assert.equal(
    writes.at(-1)!.game.board.find((i) => i.id === lot.id)!.auction!.status,
    'won',
  );
  const settled = s.getState().act({ type: 'buy', id: lot.id });
  assert.ok(s.getState().action);
  assert.equal(await s.getState().act({ type: 'buy', id: lot.id }), false);
  await settled;
  await flushSaves();
  assert.equal(s.getState().game!.inventory[0].id, lot.id);
});
