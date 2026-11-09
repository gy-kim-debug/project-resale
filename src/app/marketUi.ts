import type { ProductCategory } from '../content/productCategories';
import { create } from 'zustand';
import type { Kind } from '../domain/game';
export interface MarketFilters {
  category: Kind | ProductCategory | '전체';
  onlyFavorites: boolean;
}
export const DEFAULT_MARKET_FILTERS: MarketFilters = {
  category: '전체',
  onlyFavorites: false,
};
/** Temporary view state survives detail/back navigation, never modifies game saves. */
export const useMarketUi = create<{
  filters: Record<string, MarketFilters>;
  update: (key: string, patch: Partial<MarketFilters>) => void;
}>((set) => ({
  filters: {},
  update: (key, patch) =>
    set((state) => ({
      filters: {
        ...state.filters,
        [key]: { ...(state.filters[key] ?? DEFAULT_MARKET_FILTERS), ...patch },
      },
    })),
}));
