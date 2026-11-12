import { create } from 'zustand';

const KEY = 'resale:options';
interface Preferences {
  soundEnabled: boolean;
  reducedMotion: boolean;
}
function stored(): Preferences {
  const fallback = { soundEnabled: false, reducedMotion: false };
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (
      raw &&
      typeof raw === 'object' &&
      'soundEnabled' in raw &&
      'reducedMotion' in raw &&
      typeof raw.soundEnabled === 'boolean' &&
      typeof raw.reducedMotion === 'boolean'
    )
      return {
        soundEnabled: raw.soundEnabled,
        reducedMotion: raw.reducedMotion,
      };
  } catch {
    /* Device preferences never block the game or its save slots. */
  }
  return fallback;
}
function persist(value: Preferences) {
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* Session settings still work if preferences cannot be stored. */
  }
}
export const useGameOptions = create<
  Preferences & {
    setSound(value: boolean): void;
    setReducedMotion(value: boolean): void;
  }
>((set, get) => ({
  ...stored(),
  setSound(soundEnabled) {
    set({ soundEnabled });
    persist(get());
  },
  setReducedMotion(reducedMotion) {
    set({ reducedMotion });
    persist(get());
  },
}));
let context: AudioContext | null = null;
export function gameAudioContext() {
  return context;
}
/** Called by a web UI gesture. Device lifecycle integration remains native work. */
export async function prepareGameAudio() {
  try {
    if (!context || context.state === 'closed') context = new AudioContext();
    if (context.state === 'running') return true;
    await context.resume();
    return gameAudioContext()?.state === 'running';
  } catch {
    return false;
  }
}
export function preparePreferredAudio() {
  if (useGameOptions.getState().soundEnabled) void prepareGameAudio();
}

export function reducedGameMotion() {
  return (
    useGameOptions.getState().reducedMotion ||
    (typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches)
  );
}
