import { create } from 'zustand';
import type { Category } from '../domain/models';
import { saveRepository } from '../storage/saveRepository';
export type Tab = '생존' | '게시판' | '보관함' | '생활' | '채무';
interface UiState {
  tab: Tab;
  category: Category;
  selectedId: string | null;
  favoriteIds: string[];
  ready: boolean;
  saveError: string;
  setTab(tab: Tab): void;
  setCategory(category: Category): void;
  select(id: string | null): void;
  toggleFavorite(id: string): void;
  hydrate(): Promise<void>;
}
let saving = Promise.resolve();
export const useGameStore = create<UiState>((set, get) => ({
  tab: '생존',
  category: '전체',
  selectedId: null,
  favoriteIds: [],
  ready: false,
  saveError: '',
  setTab: (tab) => set({ tab, selectedId: null }),
  setCategory: (category) => set({ category }),
  select: (selectedId) => set({ selectedId }),
  toggleFavorite(id) {
    if (!get().ready) return;
    const favoriteIds = get().favoriteIds.includes(id)
      ? get().favoriteIds.filter((item) => item !== id)
      : [...get().favoriteIds, id];
    set({ favoriteIds });
    saving = saving
      .then(() => saveRepository.save({ version: 1, favoriteIds }))
      .then(() => set({ saveError: '' }))
      .catch(() =>
        set({
          saveError:
            '기기에 저장하지 못했습니다. 현재 화면에서는 계속 사용할 수 있습니다.',
        }),
      );
  },
  async hydrate() {
    try {
      const saved = await saveRepository.load();
      set({ favoriteIds: saved?.favoriteIds ?? [], ready: true });
    } catch {
      set({
        ready: true,
        saveError: '저장 데이터를 불러오지 못했습니다. 임시 상태로 실행합니다.',
      });
    }
  },
}));
