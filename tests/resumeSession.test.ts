import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseResumeIntent,
  resumeSession,
  type ResumeIntent,
} from '../src/app/resumeSession';
import { useGameStore, flushSaves } from '../src/app/store';
import {
  saveRepository,
  type SaveData,
  type SlotId,
  type SaveSlot,
} from '../src/storage/saveRepository';
import { newGame } from '../src/domain/engine';
import { enableStory } from '../src/domain/story';
import { createSettlementPreview } from '../src/app/settlementPreview';
import { DEFAULT_PLAYER } from '../src/content/player';
let intent: ResumeIntent | undefined,
  reload = false,
  failList = false,
  failSave = false;
const records = new Map<SlotId, SaveData>();
resumeSession.load = () => intent;
resumeSession.save = (value) => {
  intent = structuredClone(value);
};
resumeSession.isReload = () => reload;
saveRepository.listSlots = async () => {
  if (failList) throw Error('IndexedDB unavailable');
  return [1, 2, 3].map((id) => ({
    id: id as SlotId,
    updatedAt: id * 100,
    ...(records.has(id as SlotId)
      ? { data: structuredClone(records.get(id as SlotId)!) }
      : {}),
  }));
};
saveRepository.load = async (id = 1) =>
  records.has(id) ? structuredClone(records.get(id)!) : undefined;
saveRepository.save = async (data, id = 1) => {
  if (failSave) throw Error('full');
  records.set(id, structuredClone(data));
};
saveRepository.create = async (data, id) => {
  if (records.has(id)) throw Error('occupied');
  records.set(id, structuredClone(data));
};
function data(name: string): SaveData {
  return {
    version: 2,
    game: enableStory(newGame(42, { ...DEFAULT_PLAYER, nickname: name })),
    favoriteIds: [],
    selectedMarket: 'street',
    readNotificationIds: [],
  };
}
async function reset() {
  await flushSaves();
  intent = undefined;
  reload = false;
  failList = false;
  failSave = false;
  records.clear();
  records.set(1, data('첫번째'));
  records.set(2, data('두번째'));
  useGameStore.setState({
    ready: false,
    game: null,
    screen: 'menu',
    activeSlot: 1,
    slotBusy: false,
    action: null,
    changes: {},
    tab: '활동',
    saving: false,
    unsaved: false,
    storageBlocked: false,
    saveError: '',
    favoriteIds: [],
    readNotificationIds: [],
    selectedMarket: 'street',
  });
}
function cold() {
  useGameStore.setState({ ready: false, screen: 'menu', game: null });
  return useGameStore.getState().hydrate();
}
test('resume intent parses only supported slots and tabs, rejecting malformed or future data safely', () => {
  assert.equal(parseResumeIntent(null), undefined);
  assert.deepEqual(
    parseResumeIntent('{"version":1,"screen":"game","slot":2,"tab":"보관함"}'),
    { screen: 'game', slot: 2, tab: '보관함' },
  );
  for (const raw of [
    'bad',
    'null',
    '[]',
    '{"version":2,"screen":"game","slot":1,"tab":"활동"}',
    '{"version":1,"screen":"game","slot":4,"tab":"활동"}',
    '{"version":1,"screen":"game","slot":1,"tab":"unknown"}',
  ])
    assert.deepEqual(parseResumeIntent(raw), { screen: 'menu' });
});
test('reload restores the selected slot and tab even when another slot was saved more recently', async () => {
  await reset();
  intent = { screen: 'game', slot: 1, tab: '보관함' };
  const saved = records.get(1)!;
  saved.selectedMarket = 'computers';
  saved.favoriteIds = [saved.game.board[0].id];
  saved.readNotificationIds = [saved.game.logs[0].id];
  const before = structuredClone(saved);
  const first = useGameStore.getState().hydrate(),
    second = useGameStore.getState().hydrate();
  assert.strictEqual(first, second);
  await first;
  const s = useGameStore.getState();
  assert.equal(s.screen, 'game');
  assert.equal(s.activeSlot, 1);
  assert.equal(s.tab, '보관함');
  assert.equal(s.selectedMarket, 'computers');
  assert.deepEqual(s.favoriteIds, before.favoriteIds);
  assert.deepEqual(s.readNotificationIds, before.readNotificationIds);
  assert.deepEqual(s.game, before.game);
  assert.deepEqual(records.get(1), before);
});
test('existing-app reload without a marker resumes the latest valid save, while fresh entry and explicit menu remain menus', async () => {
  await reset();
  reload = true;
  await cold();
  assert.equal(useGameStore.getState().screen, 'game');
  assert.equal(useGameStore.getState().activeSlot, 2);
  assert.deepEqual(intent, { screen: 'game', slot: 2, tab: '활동' });
  await reset();
  await cold();
  assert.equal(useGameStore.getState().screen, 'menu');
  assert.deepEqual(intent, { screen: 'menu' });
  reload = true;
  await cold();
  assert.equal(useGameStore.getState().screen, 'menu');
});
test('missing or unreadable selected slots never silently continue a different slot', async () => {
  await reset();
  intent = { screen: 'game', slot: 3, tab: '채무' };
  reload = true;
  await cold();
  assert.equal(useGameStore.getState().screen, 'menu');
  assert.match(useGameStore.getState().saveError, /슬롯/);
  assert.deepEqual(intent, { screen: 'menu' });
  await reset();
  intent = { screen: 'game', slot: 1, tab: '사업' };
  const original = saveRepository.listSlots;
  saveRepository.listSlots = async () =>
    [
      { id: 1, updatedAt: 999, error: 'corrupt' },
      { id: 2, updatedAt: 10, data: records.get(2) },
      { id: 3, updatedAt: 0 },
    ] as SaveSlot[];
  await cold();
  assert.equal(useGameStore.getState().screen, 'menu');
  assert.notEqual(useGameStore.getState().screen, 'game');
  saveRepository.listSlots = original;
});
test('resume preserves intro and repayment dialogue positions, ledgers and economic RNG without executing actions', async () => {
  for (const weekly of [false, true]) {
    await reset();
    const d = records.get(1)!;
    d.game = weekly
      ? createSettlementPreview(DEFAULT_PLAYER, 'rain', 3)
      : enableStory(newGame(42, DEFAULT_PLAYER), true);
    if (weekly) {
      d.game.story!.active!.weeklyReply = 'ask';
      d.game.story!.active!.step = 1;
    } else d.game.story!.active!.step = 4;
    const before = structuredClone(d);
    intent = { screen: 'game', slot: 1, tab: '채무' };
    await cold();
    assert.equal(useGameStore.getState().screen, 'game');
    assert.deepEqual(useGameStore.getState().game, before.game);
    assert.deepEqual(records.get(1), before);
    assert.equal(useGameStore.getState().action, null);
  }
});
test('only successful slot entry and explicit successful menu exit change the resume intent', async () => {
  await reset();
  await cold();
  assert.equal(await useGameStore.getState().continueSlot(1), true);
  assert.deepEqual(intent, { screen: 'game', slot: 1, tab: '활동' });
  useGameStore.getState().setTab('사업');
  assert.deepEqual(intent, { screen: 'game', slot: 1, tab: '사업' });
  failSave = true;
  assert.equal(await useGameStore.getState().returnToMenu(), false);
  assert.equal(useGameStore.getState().screen, 'game');
  assert.deepEqual(intent, { screen: 'game', slot: 1, tab: '사업' });
  failSave = false;
  assert.equal(await useGameStore.getState().returnToMenu(), true);
  assert.deepEqual(intent, { screen: 'menu' });
  reload = true;
  await cold();
  assert.equal(useGameStore.getState().screen, 'menu');
  assert.equal(
    await useGameStore.getState().createSlot(3, DEFAULT_PLAYER),
    true,
  );
  assert.deepEqual(intent, { screen: 'game', slot: 3, tab: '활동' });
  const before = intent;
  assert.equal(
    await useGameStore.getState().createSlot(3, DEFAULT_PLAYER),
    false,
  );
  assert.deepEqual(intent, before);
});
test('storage read failure keeps recovery controls and can retry the same selected slot after recovery', async () => {
  await reset();
  intent = { screen: 'game', slot: 1, tab: '내 정보' };
  failList = true;
  await cold();
  assert.equal(useGameStore.getState().screen, 'menu');
  assert.equal(useGameStore.getState().storageBlocked, true);
  assert.equal(useGameStore.getState().game, null);
  assert.deepEqual(intent, { screen: 'game', slot: 1, tab: '내 정보' });
  failList = false;
  await cold();
  assert.equal(useGameStore.getState().screen, 'game');
  assert.equal(useGameStore.getState().activeSlot, 1);
  assert.equal(useGameStore.getState().storageBlocked, false);
});
