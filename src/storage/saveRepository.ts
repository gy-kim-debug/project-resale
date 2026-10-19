import { openDB } from 'idb';
export interface SaveData { version: 1; favoriteIds: string[] }
export interface SaveRepository { load(): Promise<SaveData | undefined>; save(data: SaveData): Promise<void> }
const database = () => openDB('resale-game', 1, { upgrade(db) { db.createObjectStore('saves'); } });
export const saveRepository: SaveRepository = {
  async load() { const db = await database(); try { const value: unknown = await db.get('saves', 'current'); if (value === undefined) return; if (typeof value !== 'object' || value === null || !('version' in value) || value.version !== 1 || !('favoriteIds' in value) || !Array.isArray(value.favoriteIds) || !value.favoriteIds.every((id: unknown) => typeof id === 'string')) throw new Error('지원하지 않는 저장 데이터'); return { version: 1, favoriteIds: value.favoriteIds }; } finally { db.close(); } },
  async save(data) { const db = await database(); try { await db.put('saves', data, 'current'); } finally { db.close(); } },
};
