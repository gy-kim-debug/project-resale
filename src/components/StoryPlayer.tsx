import { Toast } from './Toast';
import { useLayoutEffect, useRef } from 'react';
import { useGameStore } from '../app/store';
import { STORY_TITLES } from '../content/story';
import { storyChoices, storyLines } from '../domain/story';
import { playerOf } from '../domain/player';
import { PixelCharacter } from './PixelCharacter';
import { Icon } from './Icon';
import { won } from '../domain/game';
export function StoryPlayer() {
  const game = useGameStore((s) => s.game)!;
  const act = useGameStore((s) => s.act);
  const notice = useGameStore((s) => s.notice);
  const noticeId = useGameStore((s) => s.noticeId);
  const ok = useGameStore((s) => s.ok);
  const dismiss = useGameStore((s) => s.dismiss);
  const scene = game.story!.active!;
  const lines = storyLines(game);
  const line = lines[scene.step];
  const last = scene.step === lines.length - 1;
  const ref = useRef<HTMLElement>(null);
  const solo = ['intro', 'success', 'failure'].includes(scene.kind);
  useLayoutEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = old;
      before?.focus({ preventScroll: true });
    };
  }, []);
  useLayoutEffect(() => {
    ref.current
      ?.querySelector<HTMLButtonElement>('[data-story-primary]')
      ?.focus({ preventScroll: true });
  }, [scene.step, scene.kind, scene.explained]);
  async function skip() {
    while (true) {
      const active = useGameStore.getState().game?.story?.active;
      if (
        !active ||
        active.step >= storyLines(useGameStore.getState().game!).length - 1
      )
        break;
      if (!(await act({ type: 'storyNext' }))) break;
    }
  }
  const target =
    game.board.find((i) => i.id === scene.target) ??
    game.inventory.find((i) => i.id === scene.target);
  const extra = game.board.find((i) => i.id === scene.extra);
  return (
    <div className="story-layer">
      <section
        ref={ref}
        className={`story-player story-${solo ? 'room' : 'street'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-title"
        onKeyDown={(e) => {
          if (e.key === 'Tab') {
            const buttons = Array.from(
              ref.current!.querySelectorAll<HTMLButtonElement>(
                'button:not(:disabled)',
              ),
            );
            const first = buttons[0],
              end = buttons.at(-1);
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              end?.focus();
            } else if (!e.shiftKey && document.activeElement === end) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <header className="story-toolbar">
          <h1 id="story-title">{STORY_TITLES[scene.kind]}</h1>
          {!last && <button onClick={() => void skip()}>건너뛰기</button>}
        </header>
        <div
          key={`${scene.kind}-${scene.step}`}
          className={`story-stage story-motion-${line.motion}`}
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 240 128"
            shapeRendering="crispEdges"
            focusable="false"
          >
            <rect
              width="240"
              height="128"
              fill={solo ? '#18212e' : '#121f2b'}
            />
            {solo ? (
              <>
                <rect x="12" y="12" width="58" height="46" fill="#3b4e60" />
                <rect x="16" y="16" width="50" height="38" fill="#0d1420" />
                <path d="M41 16v38M16 35h50" stroke="#3b4e60" strokeWidth="3" />
                <rect x="159" y="54" width="58" height="10" fill="#846a51" />
                <rect x="163" y="64" width="5" height="39" fill="#514337" />
                <rect x="208" y="64" width="5" height="39" fill="#514337" />
                <rect x="187" y="40" width="14" height="14" fill="#c0a36a" />
              </>
            ) : (
              <>
                <rect x="8" y="18" width="67" height="85" fill="#263947" />
                <rect x="160" y="8" width="70" height="95" fill="#24333e" />
                {[18, 43, 171, 201].map((x) => (
                  <rect
                    key={x}
                    x={x}
                    y="29"
                    width="15"
                    height="22"
                    fill="#526553"
                  />
                ))}
                <rect x="73" y="83" width="25" height="20" fill="#b2835c" />
                <rect x="83" y="83" width="4" height="20" fill="#e1b682" />
              </>
            )}
            <rect
              y="103"
              width="240"
              height="25"
              fill={solo ? '#302e30' : '#303c42'}
            />
            <rect y="103" width="240" height="2" fill="#536158" />
            <g className="story-actor">
              <g transform={`translate(${solo ? 105 : 69} 39) scale(2)`}>
                <PixelCharacter
                  animated
                  scale={1}
                  appearance={playerOf(game).appearance}
                />
              </g>
            </g>
            {!solo && (
              <g className="story-npc">
                <g transform="translate(186 39) scale(-2 2)">
                  <PixelCharacter animated variant="trader" scale={1} />
                </g>
              </g>
            )}
            {solo && (
              <g className="story-phone">
                <rect x="149" y="69" width="8" height="14" fill="#8294a8" />
                <rect x="151" y="71" width="4" height="9" fill="#91e0bc" />
              </g>
            )}
          </svg>
        </div>
        <div className="story-dialogue">
          {target && (
            <div className="story-item">
              {target.title}
              {(scene.targets?.length ?? 0) > 1 &&
                ` 외 ${scene.targets!.length - 1}개`}
              {extra && ` + ${extra.title}`}
              {scene.kind === 'bundle' && ` · ${won(scene.price!)}`}
            </div>
          )}
          {(scene.targets?.length ?? 0) > 1 && (
            <details className="story-targets">
              <summary>판매 대상 {scene.targets!.length}개</summary>
              <ul>
                {scene.targets!.map((id) => (
                  <li key={id}>
                    {game.inventory.find((i) => i.id === id)?.title}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <div
            className="story-line"
            onClick={() => {
              if (!last) void act({ type: 'storyNext' });
            }}
            aria-live="polite"
            aria-atomic="true"
          >
            <strong>{line.speaker || ' '}</strong>
            <p>{line.text}</p>
          </div>
          {!last ? (
            <button
              className="story-next"
              data-story-primary
              onClick={() => void act({ type: 'storyNext' })}
            >
              다음 <span aria-hidden="true">▾</span>
            </button>
          ) : (
            <div className="story-choices">
              {storyChoices(game).map((choice, index) => (
                <button
                  key={choice.id}
                  data-story-primary={index === 0 ? true : undefined}
                  onClick={() =>
                    void act({ type: 'storyChoice', choice: choice.id })
                  }
                >
                  {choice.label}
                  {choice.actions && (
                    <span className="story-action">
                      <Icon name="activity" size={16} />
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
      {notice && !ok && (
        <Toast
          key={noticeId}
          id={noticeId}
          message={notice}
          ok={false}
          dismiss={dismiss}
        />
      )}
    </div>
  );
}
