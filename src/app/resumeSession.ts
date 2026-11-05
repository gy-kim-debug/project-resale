import { isSlotId, type SlotId } from '../storage/saveRepository';
export const SESSION_TABS = [
  '내 정보',
  '채무',
  '활동',
  '보관함',
  '사업',
] as const;
export type ResumeTab = (typeof SESSION_TABS)[number];
export type ResumeIntent =
  { screen: 'menu' } | { screen: 'game'; slot: SlotId; tab: ResumeTab };
const KEY = 'resale:resume';
export function parseResumeIntent(
  raw: string | null,
): ResumeIntent | undefined {
  if (raw === null) return undefined;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value !== 'object' ||
      value === null ||
      !('version' in value) ||
      value.version !== 1 ||
      !('screen' in value)
    )
      return { screen: 'menu' };
    if (value.screen === 'menu') return { screen: 'menu' };
    if (
      value.screen === 'game' &&
      'slot' in value &&
      isSlotId(value.slot) &&
      'tab' in value &&
      SESSION_TABS.includes(value.tab as ResumeTab)
    )
      return { screen: 'game', slot: value.slot, tab: value.tab as ResumeTab };
  } catch {
    /* Malformed UI state must never select a different game. */
  }
  return { screen: 'menu' };
}
/** Tab-local navigation intent only. Actual progress remains in the IndexedDB repository. */
export const resumeSession = {
  load(): ResumeIntent | undefined {
    try {
      return parseResumeIntent(window.sessionStorage.getItem(KEY));
    } catch {
      return { screen: 'menu' };
    }
  },
  save(intent: ResumeIntent): void {
    try {
      window.sessionStorage.setItem(
        KEY,
        JSON.stringify({ version: 1, ...intent }),
      );
    } catch {
      /* Storage restrictions must not block play or saves. */
    }
  },
  isReload(): boolean {
    try {
      return (
        (
          performance.getEntriesByType('navigation')[0] as
            PerformanceNavigationTiming | undefined
        )?.type === 'reload'
      );
    } catch {
      return false;
    }
  },
};
