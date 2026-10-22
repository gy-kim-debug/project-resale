import test from 'node:test';
import assert from 'node:assert/strict';
import { useGameStore, flushSaves } from '../src/app/store';
import { saveRepository, type SaveData } from '../src/storage/saveRepository';
import { newGame, execute } from '../src/domain/engine';
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
  assert.equal(active.game!.cash, 109000);
  assert.equal(active.notice, '');
  assert.equal(await active.act({ type: 'job', id: 'flyer' }), false);
  active.setTab('보관함');
  active.toggleFavorite('x');
  active.startOver();
  assert.equal(active.importSave('{}'), false);
  assert.equal(store.getState().tab, '활동');
  assert.deepEqual(store.getState().favoriteIds, []);
  assert.equal(store.getState().game!.cash, 109000);
  assert.equal(await completion, true);
  await flushSaves();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].game.cash, 109000);
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
