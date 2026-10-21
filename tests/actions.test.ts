import test from 'node:test';
import assert from 'node:assert/strict';
import { useGameStore, flushSaves } from '../src/app/store';
import { saveRepository, type SaveData } from '../src/storage/saveRepository';
import { newGame } from '../src/domain/engine';
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
  assert.equal(active.action?.after.minute, before.minute + 60);
  assert.equal(active.game!.cash, 9000);
  assert.equal(active.notice, '');
  assert.equal(await active.act({ type: 'job', id: 'flyer' }), false);
  active.setTab('보관함');
  active.toggleFavorite('x');
  active.startOver();
  assert.equal(active.importSave('{}'), false);
  assert.equal(store.getState().tab, '활동');
  assert.deepEqual(store.getState().favoriteIds, []);
  assert.equal(store.getState().game!.cash, 9000);
  assert.equal(await completion, true);
  await flushSaves();
  assert.equal(writes.length, 1);
  assert.equal(writes[0].game.cash, 9000);
  assert.ok(!('action' in writes[0]));
  assert.equal(store.getState().action, null);
  assert.equal(store.getState().changes.cash, 9000);
  assert.equal(store.getState().changes.minute, 60);
  assert.match(store.getState().notice, /전단 배포 완료/);
});
test('navigation, favorites and rejected actions do not show presentation or consume time', async () => {
  setup();
  const s = useGameStore;
  const minute = s.getState().game!.minute;
  s.getState().setTab('내 정보');
  s.getState().toggleFavorite('x');
  assert.equal(s.getState().action, null);
  assert.equal(
    await s.getState().act({ type: 'buy', id: s.getState().game!.board[0].id }),
    false,
  );
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
  after.satiety -= 18;
  after.interest += 10000;
  assert.deepEqual(changesBetween(before, after), {
    minute: 1440,
    cash: 100,
    satiety: -18,
    debt: 10000,
  });
});
