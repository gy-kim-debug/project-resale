import { openDB } from 'idb';
import type { Game, MarketId } from '../domain/game';
import { isMarketId } from '../content/markets';
import { isGame } from './validation';
import { toDailyActions } from '../domain/time';
export interface SaveData {
  version: 2;
  game: Game;
  favoriteIds: string[];
  selectedMarket?: MarketId;
  readNotificationIds?: number[];
}
export interface SaveRepository {
  load(): Promise<SaveData | undefined>;
  save(data: SaveData): Promise<void>;
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
  const game = toDailyActions(value.game);
  return {
    version: 2,
    game,
    favoriteIds: value.favoriteIds,
    selectedMarket:
      'selectedMarket' in value ? (value.selectedMarket as MarketId) : 'street',
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
export const saveRepository: SaveRepository = {
  async load() {
    const db = await database();
    try {
      const value: unknown = await db.get('saves', 'current');
      // v1 held favorites only, never actual progress; retain it as a separate backup.
      if (
        typeof value === 'object' &&
        value !== null &&
        'version' in value &&
        value.version === 1
      ) {
        await db.put('saves', value, 'legacy-v1');
        return undefined;
      }
      return value === undefined ? undefined : parseSave(value);
    } finally {
      db.close();
    }
  },
  async save(data) {
    const db = await database();
    try {
      await db.put('saves', data, 'current');
    } finally {
      db.close();
    }
  },
};
