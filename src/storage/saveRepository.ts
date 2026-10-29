import { unlockedItems } from '../domain/collection';
import { openDB } from 'idb';
import type { Game, MarketId } from '../domain/game';
import { isMarketId, isActiveMarketId } from '../content/markets';
import { isGame } from './validation';
import { toWeeklyActions } from '../domain/time';
export interface SaveData {
  version: 2;
  game: Game;
  favoriteIds: string[];
  selectedMarket?: MarketId;
  readNotificationIds?: number[];
}
export const SLOT_IDS = [1, 2, 3] as const;
export type SlotId = (typeof SLOT_IDS)[number];
export interface SaveSlot {
  id: SlotId;
  data?: SaveData;
  updatedAt: number;
  error?: string;
}
export const isSlotId = (id: unknown): id is SlotId =>
  SLOT_IDS.some((slot) => slot === id);
const slotKey = (id: SlotId) => {
  if (!isSlotId(id)) throw Error('없는 저장 슬롯입니다.');
  return `slot:${id}`;
};
export interface SaveRepository {
  load(slot?: SlotId): Promise<SaveData | undefined>;
  save(data: SaveData, slot?: SlotId): Promise<void>;
  listSlots(): Promise<SaveSlot[]>;
  create(data: SaveData, slot: SlotId): Promise<void>;
  remove(slot: SlotId): Promise<void>;
}
export function parseSave(value: unknown): SaveData {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('version' in value) ||
    value.version !== 2 ||
    !('game' in value) ||
    !isGame(value.game) ||
    !('favoriteIds' in value) ||
    !Array.isArray(value.favoriteIds) ||
    !value.favoriteIds.every((v: unknown) => typeof v === 'string') ||
    value.favoriteIds.length > 100 ||
    ('selectedMarket' in value && !isMarketId(value.selectedMarket)) ||
    ('readNotificationIds' in value &&
      (!Array.isArray(value.readNotificationIds) ||
        value.readNotificationIds.length > 80 ||
        !value.readNotificationIds.every(
          (id: unknown) =>
            typeof id === 'number' && Number.isSafeInteger(id) && id >= 0,
        )))
  )
    throw Error(
      '저장 형식이 올바르지 않습니다. 기존 데이터는 덮어쓰지 않았습니다.',
    );
  const game = toWeeklyActions(value.game);
  if (game.discoveredItems === undefined)
    game.discoveredItems = [...unlockedItems(game)];
  if (!isGame(game))
    throw Error(
      '저장 금액 변환에 실패했습니다. 기존 데이터는 덮어쓰지 않았습니다.',
    );
  return {
    version: 2,
    game,
    favoriteIds: value.favoriteIds,
    selectedMarket:
      'selectedMarket' in value && isActiveMarketId(value.selectedMarket)
        ? value.selectedMarket
        : 'street',
    readNotificationIds:
      'readNotificationIds' in value
        ? [...new Set(value.readNotificationIds as number[])].filter((id) =>
            game.logs.some((log) => log.id === id),
          )
        : [],
  };
}
const database = () =>
  openDB('resale-game', 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('saves')) db.createObjectStore('saves');
    },
  });
/** Copy legacy current exactly once, atomically. Retain the original as a recovery copy. */
async function migrate(db: Awaited<ReturnType<typeof database>>) {
  const tx = db.transaction('saves', 'readwrite');
  if (!(await tx.store.get('slots-initialized'))) {
    const current: unknown = await tx.store.get('current');
    if (current !== undefined && (await tx.store.get('slot:1')) === undefined) {
      if (
        typeof current === 'object' &&
        current !== null &&
        'version' in current &&
        current.version === 1
      )
        await tx.store.put(current, 'legacy-v1');
      else {
        await tx.store.put(current, 'slot:1');
        await tx.store.put(0, 'slot-time:1');
      }
    }
    await tx.store.put(true, 'slots-initialized');
  }
  await tx.done;
}
export const saveRepository: SaveRepository = {
  async load(slot = 1) {
    const key = slotKey(slot),
      db = await database();
    try {
      await migrate(db);
      const value: unknown = await db.get('saves', key);
      return value === undefined ? undefined : parseSave(value);
    } finally {
      db.close();
    }
  },
  async listSlots() {
    const db = await database();
    try {
      await migrate(db);
      const tx = db.transaction('saves', 'readonly');
      const raw = await Promise.all(
        SLOT_IDS.map(async (id) => ({
          id,
          value: await tx.store.get(slotKey(id)),
          time: await tx.store.get(`slot-time:${id}`),
        })),
      );
      await tx.done;
      return raw.map(({ id, value, time }): SaveSlot => {
        const updatedAt =
          typeof time === 'number' &&
          Number.isSafeInteger(time) &&
          time >= 0 &&
          Number.isFinite(new Date(time).getTime())
            ? time
            : 0;
        try {
          return {
            id,
            updatedAt,
            ...(value === undefined ? {} : { data: parseSave(value) }),
          };
        } catch {
          return { id, updatedAt, error: '저장 데이터를 읽을 수 없습니다.' };
        }
      });
    } finally {
      db.close();
    }
  },
  async save(data, slot = 1) {
    const key = slotKey(slot);
    parseSave(data);
    const db = await database();
    try {
      await migrate(db);
      const tx = db.transaction('saves', 'readwrite');
      await tx.store.put(data, key);
      await tx.store.put(Date.now(), `slot-time:${slot}`);
      await tx.done;
    } finally {
      db.close();
    }
  },
  async create(data, slot) {
    const key = slotKey(slot);
    parseSave(data);
    const db = await database();
    try {
      await migrate(db);
      const tx = db.transaction('saves', 'readwrite');
      if ((await tx.store.get(key)) !== undefined) {
        await tx.done;
        throw Error('이미 사용 중인 슬롯입니다. 다른 슬롯을 선택하세요.');
      }
      await tx.store.put(data, key);
      await tx.store.put(Date.now(), `slot-time:${slot}`);
      await tx.done;
    } finally {
      db.close();
    }
  },
  async remove(slot) {
    const key = slotKey(slot),
      db = await database();
    try {
      await migrate(db);
      const tx = db.transaction('saves', 'readwrite');
      await tx.store.delete(key);
      await tx.store.delete(`slot-time:${slot}`);
      await tx.done;
    } finally {
      db.close();
    }
  },
};
