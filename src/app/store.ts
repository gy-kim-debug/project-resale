import type { PlayerProfile } from '../content/player';
import { isPlayer } from '../domain/player';
import { create } from 'zustand';
import type { Command, Game, MarketId } from '../domain/game';
import { isActiveMarketId } from '../content/markets';
import { mailboxLogs } from './notifications';
import { execute, newGame } from '../domain/engine';
import {
  saveRepository,
  parseSave,
  type SaveData,
  type SlotId,
  type SaveSlot,
} from '../storage/saveRepository';
import {
  ACTION_DURATION_MS,
  HIGHLIGHT_DURATION_MS,
  actionLabel,
  changesBetween,
  type ActionPresentation,
  actionScene,
  type Changes,
} from './actionPresentation';
export type Act = (command: Command) => Promise<boolean>;
export type Tab = '내 정보' | '채무' | '활동' | '보관함' | '사업';
interface State {
  screen: 'menu' | 'game';
  unsaved: boolean;
  activeSlot: SlotId;
  slots: SaveSlot[];
  slotBusy: boolean;
  continueSlot(id: SlotId): Promise<boolean>;
  createSlot(id: SlotId, player: PlayerProfile): Promise<boolean>;
  deleteSlot(id: SlotId): Promise<boolean>;
  returnToMenu(): Promise<boolean>;

  game: Game | null;
  ready: boolean;
  saveError: string;
  saving: boolean;
  storageBlocked: boolean;
  notice: string;
  noticeId: number;
  ok: boolean;
  favoriteIds: string[];
  selectedMarket: MarketId;
  selectMarket(id: MarketId): void;
  readNotificationIds: number[];
  readNotification(id: number): void;
  readAllNotifications(): void;
  tab: Tab;
  hydrate(): Promise<void>;
  action: ActionPresentation | null;
  changes: Changes;
  actionId: number;
  act: Act;
  setTab(tab: Tab): void;
  toggleFavorite(id: string): void;
  dismiss(expectedId?: number): void;
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
  screen: 'menu',
  unsaved: false,
  activeSlot: 1,
  slots: [],
  slotBusy: false,
  game: null,
  ready: false,
  saveError: '',
  saving: false,
  storageBlocked: false,
  notice: '',
  noticeId: 0,
  ok: true,
  favoriteIds: [],
  selectedMarket: 'street',
  readNotificationIds: [],
  tab: '활동',
  action: null,
  changes: {},
  actionId: 0,
  hydrate() {
    if (get().ready) return Promise.resolve();
    if (hydration) return hydration;
    hydration = (async () => {
      try {
        const slots = await saveRepository.listSlots();
        const recent = slots
          .filter((slot) => slot.data)
          .sort((a, b) => b.updatedAt - a.updatedAt)[0];
        const saved = recent?.data;
        set({
          slots,
          activeSlot: recent?.id ?? 1,
          screen: 'menu',
          game: saved?.game ?? null,
          favoriteIds: saved?.favoriteIds ?? [],
          selectedMarket: saved?.selectedMarket ?? 'street',
          readNotificationIds: saved?.readNotificationIds ?? [],
          ready: true,
        });
      } catch (e) {
        set({
          game: null,
          ready: true,
          storageBlocked: true,
          saveError: `저장 데이터를 불러오지 못했습니다. 자동 저장을 멈췄습니다. ${e instanceof Error ? e.message : ''} 백업을 가져오거나 새 게임을 명시적으로 시작할 수 있습니다.`,
        });
      }
    })();
    return hydration;
  },
  async continueSlot(id) {
    if (get().action || get().slotBusy || !get().ready) return false;
    set({ slotBusy: true });
    try {
      await flushSaves();
      if (get().unsaved && !get().storageBlocked)
        throw Error('이전 진행 저장을 확인한 뒤 다시 시도하세요.');
      const data = await saveRepository.load(id);
      if (!data) throw Error('비어 있는 슬롯입니다.');
      clearTimeout(highlightTimer);
      set({
        activeSlot: id,
        game: data.game,
        favoriteIds: data.favoriteIds,
        selectedMarket: data.selectedMarket ?? 'street',
        readNotificationIds: data.readNotificationIds ?? [],
        screen: 'game',
        tab: '활동',
        changes: {},
        notice: '',
        storageBlocked: false,
        saveError: '',
      });
      return true;
    } catch (e) {
      set({
        saveError:
          e instanceof Error ? e.message : '진행을 불러오지 못했습니다.',
      });
      return false;
    } finally {
      set({ slotBusy: false });
    }
  },
  async createSlot(id, player) {
    if (get().action || get().slotBusy || !get().ready) return false;
    set({ slotBusy: true });
    try {
      if (!isPlayer(player)) throw Error('닉네임과 캐릭터 설정을 확인하세요.');
      await flushSaves();
      if (get().unsaved && !get().storageBlocked)
        throw Error('기존 진행 저장을 확인한 뒤 다시 시도하세요.');
      const data: SaveData = {
        version: 2,
        game: newGame(seed(), player),
        favoriteIds: [],
        selectedMarket: 'street',
        readNotificationIds: [],
      };
      await saveRepository.create(data, id);
      const slots = await saveRepository.listSlots();
      clearTimeout(highlightTimer);
      set({
        slots,
        activeSlot: id,
        game: data.game,
        favoriteIds: [],
        selectedMarket: 'street',
        readNotificationIds: [],
        screen: 'game',
        tab: '활동',
        changes: {},
        notice: '',
        saveError: '',
        storageBlocked: false,
      });
      return true;
    } catch (e) {
      const slots = await saveRepository.listSlots().catch(() => get().slots);
      set({
        slots,
        saveError:
          e instanceof Error ? e.message : '새 게임을 저장하지 못했습니다.',
      });
      return false;
    } finally {
      set({ slotBusy: false });
    }
  },
  async deleteSlot(id) {
    if (get().action || get().slotBusy || get().screen !== 'menu') return false;
    set({ slotBusy: true });
    try {
      await flushSaves();
      await saveRepository.remove(id);
      const slots = await saveRepository.listSlots();
      set({
        slots,
        saveError: '',
        ...(id === get().activeSlot
          ? {
              game: null,
              favoriteIds: [],
              readNotificationIds: [],
              storageBlocked: false,
            }
          : {}),
      });
      return true;
    } catch {
      set({ saveError: '슬롯을 삭제하지 못했습니다.' });
      return false;
    } finally {
      set({ slotBusy: false });
    }
  },
  async returnToMenu() {
    if (get().action || get().slotBusy) return false;
    set({ slotBusy: true });
    try {
      get().save();
      await flushSaves();
      if (get().unsaved) return false;
      const slots = await saveRepository.listSlots();
      set({ screen: 'menu', slots, notice: '', changes: {} });
      return true;
    } catch {
      set({ saveError: '저장 상태를 확인하지 못했습니다.' });
      return false;
    } finally {
      set({ slotBusy: false });
    }
  },
  async act(command) {
    const current = get();
    const g = current.game;
    if (
      !g ||
      !current.ready ||
      current.action ||
      current.slotBusy ||
      current.screen !== 'game'
    )
      return false;
    const result = execute(g, command);
    if (!result.ok) {
      set({ notice: result.message, noticeId: get().noticeId + 1, ok: false });
      return false;
    }
    clearTimeout(highlightTimer);
    // Navigation and chat replies update immediately, without action presentation.
    if (
      [
        'startSettlement',
        'dialogue',
        'offer',
        'bid',
        'withdrawAuction',
        'reject',
        'counter',
        'break',
        'closeChat',
        'visit',
        'event',
      ].includes(command.type) &&
      result.game.minute === g.minute
    ) {
      set({
        game: result.game,
        noticeId: get().noticeId + 1,
        notice:
          command.type === 'dialogue' ||
          command.type === 'offer' ||
          command.type === 'bid' ||
          command.type === 'visit' ||
          ((command.type === 'reject' || command.type === 'counter') &&
            result.game.inquiries.some((q) => q.id === command.id))
            ? ''
            : result.message,
        ok: true,
        changes: {},
      });
      get().save();
      return true;
    }
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
        scene: actionScene(command, g),
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
          noticeId: get().noticeId + 1,
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
    if (get().action || get().slotBusy || get().game?.inquiries.length) return;
    set({ tab, notice: '' });
  },
  toggleFavorite(id) {
    if (!get().ready || get().action || get().slotBusy) return;
    const ids = get().favoriteIds;
    set({
      favoriteIds: ids.includes(id)
        ? ids.filter((i) => i !== id)
        : [...ids, id].slice(-100),
    });
    get().save();
  },
  selectMarket(id) {
    const current = get();
    if (
      !current.ready ||
      !current.game ||
      current.action ||
      current.slotBusy ||
      current.game.inquiries.length ||
      !isActiveMarketId(id) ||
      current.selectedMarket === id
    )
      return;
    set({ selectedMarket: id });
    get().save();
  },
  readNotification(id) {
    const { game, ready, action, readNotificationIds } = get();
    if (
      !game ||
      !ready ||
      get().slotBusy ||
      action ||
      readNotificationIds.includes(id) ||
      !mailboxLogs(game).some((log) => log.id === id)
    )
      return;
    set({ readNotificationIds: [...readNotificationIds, id] });
    get().save();
  },
  readAllNotifications() {
    const { game, ready, action, readNotificationIds } = get();
    if (!game || !ready || action || get().slotBusy) return;
    const unread = mailboxLogs(game).filter(
      (log) => !readNotificationIds.includes(log.id),
    );
    if (!unread.length) return;
    set({
      readNotificationIds: [
        ...readNotificationIds,
        ...unread.map((log) => log.id),
      ],
    });
    get().save();
  },
  dismiss(expectedId) {
    if (expectedId === undefined || get().noticeId === expectedId)
      set({ notice: '' });
  },
  save() {
    const { game, favoriteIds, storageBlocked, activeSlot } = get();
    if (!game || storageBlocked) return;
    const readNotificationIds = get().readNotificationIds.filter((id) =>
      game.logs.some((log) => log.id === id),
    );
    set({ readNotificationIds });
    const data: SaveData = structuredClone({
      version: 2,
      game,
      favoriteIds,
      readNotificationIds,
      selectedMarket: get().selectedMarket,
    });
    set({ saving: true, unsaved: true });
    queue = queue
      .then(() => saveRepository.save(data, activeSlot))
      .then(() =>
        set((state) => ({
          saving: false,
          saveError: '',
          unsaved: false,
          slots: [
            ...state.slots.filter((slot) => slot.id !== activeSlot),
            { id: activeSlot, data, updatedAt: Date.now() },
          ].sort((a, b) => a.id - b.id),
        })),
      )
      .catch(() =>
        set({
          saving: false,
          unsaved: true,
          saveError:
            '기기에 저장하지 못했습니다. 백업 내보내기로 진행을 보관하세요. 다음 행동에서 자동 저장을 재시도합니다.',
        }),
      );
  },
  importSave(raw) {
    if (get().action || get().slotBusy) return false;
    try {
      const data = parseSave(JSON.parse(raw));
      clearTimeout(highlightTimer);
      set({
        changes: {},
        game: data.game,
        favoriteIds: data.favoriteIds,
        selectedMarket: data.selectedMarket ?? 'street',
        readNotificationIds: data.readNotificationIds ?? [],
        tab: '활동',
        screen: 'game',
        notice: '백업을 불러왔습니다.',
        noticeId: get().noticeId + 1,
        ok: true,
        storageBlocked: false,
        saveError: '',
      });
      get().save();
      return true;
    } catch (e) {
      set({
        notice: e instanceof Error ? e.message : '백업을 읽을 수 없습니다.',
        noticeId: get().noticeId + 1,
        ok: false,
      });
      return false;
    }
  },
  startOver() {
    if (get().action || get().slotBusy) return;
    clearTimeout(highlightTimer);
    set({ changes: {} });
    set({
      game: newGame(seed()),
      screen: 'game',
      favoriteIds: [],
      selectedMarket: 'street',
      readNotificationIds: [],
      tab: '활동',
      notice: '새 게임을 시작했습니다. 이전 진행은 계승되지 않습니다.',
      noticeId: get().noticeId + 1,
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
