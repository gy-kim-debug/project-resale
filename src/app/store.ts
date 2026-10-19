import { create } from 'zustand';
import type { Category } from '../domain/models';
import { saveRepository } from '../storage/saveRepository';
export type Tab = '활동' | '내 정보' | '보관함' | '상점' | '채무';
export type Activity =
  | '장터'
  | '무료나눔'
  | '아르바이트'
  | '물건 수집'
  | '식사'
  | '수면'
  | '치료'
  | '매각처';
interface UiState {
  tab: Tab;
  activity: Activity | null;
  category: Category;
  selectedId: string | null;
  favoriteIds: string[];
  ready: boolean;
  saveError: string;
  setTab(tab: Tab): void;
  openActivity(activity: Activity | null): void;
  setCategory(category: Category): void;
  select(id: string | null): void;
  toggleFavorite(id: string): void;
  hydrate(): Promise<void>;
}
let saving = Promise.resolve();
export const useGameStore = create<UiState>((set, get) => ({
  tab: '활동',
  activity: null,
  category: '전체',
  selectedId: null,
  favoriteIds: [],
  ready: false,
  saveError: '',
  setTab: (tab) => set({ tab, activity: null, selectedId: null }),
  openActivity: (activity) => set({ tab: '활동', activity, selectedId: null }),
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
