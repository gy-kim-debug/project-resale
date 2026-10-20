import { openDB } from 'idb';
import type { Game } from '../domain/game';
import { isGame } from './validation';
export interface SaveData {
  version: 2;
  game: Game;
  favoriteIds: string[];
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
    value.favoriteIds.length > 100
  )
    throw Error(
      '저장 형식이 올바르지 않습니다. 기존 데이터는 덮어쓰지 않았습니다.',
    );
  return { version: 2, game: value.game, favoriteIds: value.favoriteIds };
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
