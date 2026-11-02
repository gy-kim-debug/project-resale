import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { EventPreviewMenu } from '../components/EventPreviewMenu';
import { createEventPreview } from './eventPreview';
import { EVENT_KINDS, STORY_TITLES } from '../content/story';
import type { Game } from '../domain/game';
import { EndingPreview } from '../components/EndingPreview';
import { newGame } from '../domain/engine';
import { enableStory } from '../domain/story';
import { useGameStore } from './store';
export type EndingKind = 'success' | 'failure';
declare global {
  interface Window {
    previewEnding: (kind?: EndingKind) => boolean;
    previewEvent: (kind?: string) => boolean;
  }
}
let showing = false;
/** Explicit production console helper; no live state mutations or repository writes. */
export function installEndingPreview() {
  window.previewEnding = (kind = 'success') => {
    if (!['success', 'failure'].includes(kind))
      throw Error('success 또는 failure를 선택하세요.');
    const state = useGameStore.getState();
    if (showing || state.action || state.slotBusy) return false;
    const game = enableStory(state.game ?? newGame(1));
    game.status = kind === 'success' ? 'cleared' : 'bankrupt';
    if (kind === 'success') {
      game.principal = 0;
      game.interest = 0;
    }
    game.story!.active = { kind, step: 0 };
    game.story!.endingDone = false;
    return openPreview(game, 'ending');
  };
  window.previewEvent = (name) => {
    const state = useGameStore.getState();
    if (showing || state.action || state.slotBusy) return false;
    const kind =
      name === undefined
        ? undefined
        : EVENT_KINDS.find((id) => id === name || STORY_TITLES[id] === name);
    if (name !== undefined && !kind)
      throw Error(`이벤트: ${EVENT_KINDS.join(', ')}`);
    return openPreview(
      kind ? createEventPreview(kind, state.game?.player) : null,
      'event',
    );
  };
}
function openPreview(game: Game | null, mode: 'ending' | 'event') {
  const host = document.createElement('div');
  host.dataset.scenePreview = 'true';
  if (mode === 'ending') host.dataset.endingPreview = 'true';
  else host.dataset.eventPreview = 'true';
  document.body.append(host);
  const app = document.getElementById('root');
  const previousInert = app?.inert ?? false;
  if (app) app.inert = true;
  const root = createRoot(host, { identifierPrefix: 'scene-preview-' });
  showing = true;
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    if (app) app.inert = previousInert;
    root.unmount();
    host.remove();
    showing = false;
  }
  root.render(
    game
      ? createElement(EndingPreview, { initialGame: game, close })
      : createElement(EventPreviewMenu, {
          player: useGameStore.getState().game?.player,
          close,
        }),
  );
  return true;
}
