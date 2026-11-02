import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { EndingPreview } from '../components/EndingPreview';
import { newGame } from '../domain/engine';
import { enableStory } from '../domain/story';
import { useGameStore } from './store';
export type EndingKind = 'success' | 'failure';
declare global {
  interface Window {
    previewEnding: (kind?: EndingKind) => boolean;
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
    const host = document.createElement('div');
    host.dataset.endingPreview = 'true';
    document.body.append(host);
    const app = document.getElementById('root');
    const previousInert = app?.inert ?? false;
    if (app) app.inert = true;
    const root = createRoot(host, { identifierPrefix: 'ending-preview-' });
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
    root.render(createElement(EndingPreview, { initialGame: game, close }));
    return true;
  };
}
