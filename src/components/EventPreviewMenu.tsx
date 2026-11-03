import { useLayoutEffect, useState } from 'react';
import type { PlayerProfile } from '../content/player';
import { EVENT_KINDS, STORY_TITLES, type EventKind } from '../content/story';
import { createEventPreview } from '../app/eventPreview';
import type { Game } from '../domain/game';
import { EndingPreview } from './EndingPreview';
export function EventPreviewMenu({
  player,
  close,
  initialVariant = 0,
}: {
  player?: PlayerProfile;
  close: () => void;
  initialVariant?: 0 | 1 | 2;
}) {
  useLayoutEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = old;
      before?.focus({ preventScroll: true });
    };
  }, []);
  const [variant, setVariant] = useState<0 | 1 | 2>(initialVariant);
  const [game, setGame] = useState<Game | null>(null);
  function choose(kind: EventKind) {
    setGame(createEventPreview(kind, player, variant));
  }
  if (game)
    return (
      <EndingPreview
        key={game.story!.active!.kind}
        initialGame={game}
        close={() => setGame(null)}
      />
    );
  return (
    <div className="story-layer">
      <section
        className="story-player"
        role="dialog"
        aria-modal="true"
        aria-label="이벤트 미리보기"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault();
            close();
          }
          if (e.key === 'Tab') {
            const buttons = Array.from(
              e.currentTarget.querySelectorAll('button'),
            );
            const first = buttons[0],
              last = buttons.at(-1);
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <header className="story-toolbar">
          <h1>이벤트 미리보기</h1>
          <button autoFocus onClick={close}>
            닫기
          </button>
        </header>
        <div className="story-dialogue">
          <div className="filters" aria-label="이벤트 상황">
            {([0, 1, 2] as const).map((n) => (
              <button
                key={n}
                aria-pressed={variant === n}
                onClick={() => setVariant(n)}
              >
                상황 {n + 1}
              </button>
            ))}
          </div>
          <div className="story-choices">
            {EVENT_KINDS.map((kind) => (
              <button key={kind} onClick={() => choose(kind)}>
                {STORY_TITLES[kind]}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
