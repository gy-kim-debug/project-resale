import { storyLines } from '../src/domain/story';
import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_PLAYER, type PlayerProfile } from '../src/content/player';
import { isPlayer, playerOf } from '../src/domain/player';
import { newGame } from '../src/domain/engine';
import { isGame } from '../src/storage/validation';
import {
  parseSave,
  saveRepository,
  type SaveData,
  type SlotId,
  type SaveSlot,
} from '../src/storage/saveRepository';
import { useGameStore, flushSaves } from '../src/app/store';
const player: PlayerProfile = {
  nickname: '거래고수',
  appearance: { hair: 'cap', outfit: 'rose', skin: 'deep' },
};
const data = (name: string): SaveData => ({
  version: 2,
  game: newGame(42, { ...player, nickname: name }),
  favoriteIds: [],
  selectedMarket: 'street',
  readNotificationIds: [],
});

test('player settings validate, preserve economic RNG and round-trip while old profiles remain optional', () => {
  assert.ok(isPlayer(player));
  assert.ok(!isPlayer({ ...player, nickname: ' '.repeat(3) }));
  assert.ok(!isPlayer({ ...player, nickname: 'x'.repeat(13) }));
  assert.ok(!isPlayer({ ...player, nickname: '<script>' }));
  assert.ok(
    !isPlayer({
      ...player,
      appearance: { ...player.appearance, hair: 'invalid' },
    }),
  );
  const g = newGame(42, player),
    old = newGame(42);
  assert.ok(isGame(g));
  assert.deepEqual(g.board, old.board);
  assert.equal(g.seed, old.seed);
  assert.equal(g.cash, old.cash);
  assert.deepEqual(
    parseSave({ version: 2, game: g, favoriteIds: [] }).game.player,
    player,
  );
  assert.deepEqual(playerOf(old), DEFAULT_PLAYER);
  assert.equal(old.player, undefined);
  const original = structuredClone(player);
  newGame(42, player).player!.appearance.hair = 'long';
  assert.deepEqual(player, original);
  const bad = structuredClone(g);
  bad.player!.appearance.skin = 'invalid' as 'tan';
  assert.ok(!isGame(bad));
});

const records = new Map<SlotId, SaveData>();
let failSave = false,
  failCreate = false;
const summary = (): SaveSlot[] =>
  [1, 2, 3].map((id) => ({
    id: id as SlotId,
    updatedAt: id,
    ...(records.has(id as SlotId)
      ? { data: structuredClone(records.get(id as SlotId)!) }
      : {}),
  }));
saveRepository.load = async (id) =>
  records.has(id ?? 1) ? structuredClone(records.get(id ?? 1)!) : undefined;
saveRepository.save = async (save, id = 1) => {
  if (failSave) throw Error('disk full');
  records.set(id, structuredClone(save));
};
saveRepository.listSlots = async () => summary();
saveRepository.create = async (save, id) => {
  if (failCreate) throw Error('write failed');
  if (records.has(id)) throw Error('occupied');
  records.set(id, structuredClone(save));
};
saveRepository.remove = async (id) => {
  records.delete(id);
};
async function setup() {
  await flushSaves();
  records.clear();
  failSave = false;
  failCreate = false;
  useGameStore.setState({
    ready: true,
    game: null,
    screen: 'menu',
    activeSlot: 1,
    slots: summary(),
    action: null,
    changes: {},
    slotBusy: false,
    saveError: '',
    unsaved: false,
    storageBlocked: false,
    favoriteIds: [],
    readNotificationIds: [],
    selectedMarket: 'street',
  });
}

async function finishIntro() {
  const s = useGameStore;
  while (s.getState().game?.story?.active) {
    const g = s.getState().game!;
    assert.ok(
      await s
        .getState()
        .act(
          g.story!.active!.step < storyLines(g).length - 1
            ? { type: 'storyNext' }
            : { type: 'storyChoice', choice: 'continue' },
        ),
    );
  }
  await flushSaves();
}

test('new games only occupy empty slots and each profile/progress is independent', async () => {
  await setup();
  const s = useGameStore;
  assert.ok(await s.getState().createSlot(1, player));
  assert.equal(s.getState().screen, 'game');
  assert.equal(s.getState().game!.player!.nickname, '거래고수');
  const original = structuredClone(records.get(1));
  assert.equal(
    await s.getState().createSlot(1, { ...player, nickname: '덮어쓰기' }),
    false,
  );
  assert.deepEqual(records.get(1), original);
  assert.ok(await s.getState().returnToMenu());
  assert.ok(
    await s.getState().createSlot(2, { ...player, nickname: '두번째' }),
  );
  await finishIntro();
  assert.ok(await s.getState().act({ type: 'job', id: 'flyer' }));
  await flushSaves();
  assert.equal(records.get(2)!.game.weekActions, 1);
  assert.equal(records.get(1)!.game.weekActions, 0);
  assert.ok(await s.getState().returnToMenu());
  assert.ok(await s.getState().continueSlot(1));
  assert.equal(s.getState().game!.weekActions, 0);
  assert.equal(s.getState().game!.player!.nickname, '거래고수');
  assert.equal(s.getState().activeSlot, 1);
});
test('slot switches wait for pending saves and block during an action', async () => {
  await setup();
  const s = useGameStore;
  records.set(2, data('다른사람'));
  await s.getState().createSlot(1, player);
  await finishIntro();
  const action = s.getState().act({ type: 'job', id: 'flyer' });
  assert.equal(await s.getState().continueSlot(2), false);
  assert.equal(await s.getState().returnToMenu(), false);
  assert.equal(await s.getState().deleteSlot(1), false);
  await action;
  await flushSaves();
  assert.ok(await s.getState().returnToMenu());
  assert.ok(await s.getState().continueSlot(2));
  assert.equal(records.get(1)!.game.weekActions, 1);
  assert.equal(s.getState().game!.player!.nickname, '다른사람');
});
test('failed writes cannot silently exit or switch; retries keep the correct slot', async () => {
  await setup();
  const s = useGameStore;
  records.set(2, data('다른사람'));
  await s.getState().createSlot(1, player);
  await finishIntro();
  failSave = true;
  await s.getState().act({ type: 'job', id: 'flyer' });
  await flushSaves();
  assert.equal(s.getState().unsaved, true);
  assert.equal(await s.getState().returnToMenu(), false);
  assert.equal(s.getState().screen, 'game');
  assert.equal(await s.getState().continueSlot(2), false);
  assert.equal(records.get(1)!.game.weekActions, 0);
  failSave = false;
  assert.ok(await s.getState().returnToMenu());
  assert.equal(records.get(1)!.game.weekActions, 1);
  assert.equal(s.getState().unsaved, false);
  assert.ok(await s.getState().continueSlot(2));
});
test('failed creation, invalid profile, menu actions and deletion preserve other slots', async () => {
  await setup();
  const s = useGameStore;
  records.set(1, data('기존사람'));
  const original = structuredClone(records.get(1));
  failCreate = true;
  assert.equal(await s.getState().createSlot(2, player), false);
  assert.equal(s.getState().screen, 'menu');
  assert.deepEqual(records.get(1), original);
  assert.equal(records.has(2), false);
  failCreate = false;
  assert.equal(
    await s.getState().createSlot(2, { ...player, nickname: '' }),
    false,
  );
  assert.equal(await s.getState().act({ type: 'scavenge' }), false);
  await s.getState().continueSlot(1);
  assert.equal(await s.getState().deleteSlot(1), false);
  await s.getState().returnToMenu();
  assert.ok(await s.getState().deleteSlot(1));
  assert.equal(records.has(1), false);
  assert.equal(s.getState().game, null);
});
