import { create } from 'zustand';
import type { Command, Game } from '../domain/game';
import { execute, newGame } from '../domain/engine';
import {
  saveRepository,
  parseSave,
  type SaveData,
} from '../storage/saveRepository';
import {
  ACTION_DURATION_MS,
  HIGHLIGHT_DURATION_MS,
  actionLabel,
  changesBetween,
  type ActionPresentation,
  type Changes,
} from './actionPresentation';
export type Act = (command: Command) => Promise<boolean>;
export type Tab = '내 정보' | '채무' | '활동' | '보관함' | '상점';
interface State {
  game: Game | null;
  ready: boolean;
  saveError: string;
  saving: boolean;
  storageBlocked: boolean;
  notice: string;
  ok: boolean;
  favoriteIds: string[];
  tab: Tab;
  hydrate(): Promise<void>;
  action: ActionPresentation | null;
  changes: Changes;
  actionId: number;
  act: Act;
  setTab(tab: Tab): void;
  toggleFavorite(id: string): void;
  dismiss(): void;
  save(): void;
  importSave(raw: string): boolean;
  startOver(): void;
}
let queue = Promise.resolve();
let highlightTimer: ReturnType<typeof setTimeout> | undefined;
let actionFinished: Promise<boolean> = Promise.resolve(false);
let hydration: Promise<void> | null = null;
const seed = () => crypto.getRandomValues(new Uint32Array(1))[0];
export const useGameStore = create<State>((set, get) => ({
  game: null,
  ready: false,
  saveError: '',
  saving: false,
  storageBlocked: false,
  notice: '',
  ok: true,
  favoriteIds: [],
  tab: '활동',
  action: null,
  changes: {},
  actionId: 0,
  hydrate() {
    if (get().ready) return Promise.resolve();
    if (hydration) return hydration;
    hydration = (async () => {
      try {
        const saved = await saveRepository.load();
        set({
          game: saved?.game ?? newGame(seed()),
          favoriteIds: saved?.favoriteIds ?? [],
          ready: true,
        });
        if (!saved) get().save();
      } catch (e) {
        set({
          game: newGame(seed()),
          ready: true,
          storageBlocked: true,
          saveError: `저장 데이터를 불러오지 못했습니다. 자동 저장을 멈췄습니다. ${e instanceof Error ? e.message : ''} 백업을 가져오거나 새 게임을 명시적으로 시작할 수 있습니다.`,
        });
      }
    })();
    return hydration;
  },
  async act(command) {
    const current = get();
    const g = current.game;
    if (!g || !current.ready || current.action) return false;
    const result = execute(g, command);
    if (!result.ok) {
      set({ notice: result.message, ok: false });
      return false;
    }
    clearTimeout(highlightTimer);
    const id = current.actionId + 1;
    // Commit and save once before presentation: reload cannot lose or replay an action.
    set({
      game: result.game,
      notice: '',
      ok: true,
      changes: {},
      actionId: id,
      action: {
        id,
        label: actionLabel(command),
        before: g,
        after: result.game,
        duration: ACTION_DURATION_MS,
      },
    });
    get().save();
    actionFinished = new Promise<boolean>((resolve) => {
      setTimeout(() => {
        set({
          action: null,
          notice: result.message,
          changes: changesBetween(g, result.game),
        });
        highlightTimer = setTimeout(
          () => set({ changes: {} }),
          HIGHLIGHT_DURATION_MS,
        );
        resolve(true);
      }, ACTION_DURATION_MS);
    });
    return actionFinished;
  },
  setTab(tab) {
    if (get().action || get().game?.inquiries.length) return;
    set({ tab, notice: '' });
  },
  toggleFavorite(id) {
    if (!get().ready || get().action) return;
    const ids = get().favoriteIds;
    set({
      favoriteIds: ids.includes(id)
        ? ids.filter((i) => i !== id)
        : [...ids, id].slice(-100),
    });
    get().save();
  },
  dismiss: () => set({ notice: '' }),
  save() {
    const { game, favoriteIds, storageBlocked } = get();
    if (!game || storageBlocked) return;
    const data: SaveData = structuredClone({ version: 2, game, favoriteIds });
    set({ saving: true });
    queue = queue
      .then(() => saveRepository.save(data))
      .then(() => set({ saving: false, saveError: '' }))
      .catch(() =>
        set({
          saving: false,
          saveError:
            '기기에 저장하지 못했습니다. 백업 내보내기로 진행을 보관하세요. 다음 행동에서 자동 저장을 재시도합니다.',
        }),
      );
  },
  importSave(raw) {
    if (get().action) return false;
    try {
      const data = parseSave(JSON.parse(raw));
      clearTimeout(highlightTimer);
      set({
        changes: {},
        game: data.game,
        favoriteIds: data.favoriteIds,
        tab: '활동',
        notice: '백업을 불러왔습니다.',
        ok: true,
        storageBlocked: false,
        saveError: '',
      });
      get().save();
      return true;
    } catch (e) {
      set({
        notice: e instanceof Error ? e.message : '백업을 읽을 수 없습니다.',
        ok: false,
      });
      return false;
    }
  },
  startOver() {
    if (get().action) return;
    clearTimeout(highlightTimer);
    set({ changes: {} });
    set({
      game: newGame(seed()),
      favoriteIds: [],
      tab: '활동',
      notice: '새 게임을 시작했습니다. 이전 진행은 계승되지 않습니다.',
      ok: true,
      storageBlocked: false,
      saveError: '',
    });
    get().save();
  },
}));

export async function flushSaves() {
  await actionFinished;
  await queue;
}
