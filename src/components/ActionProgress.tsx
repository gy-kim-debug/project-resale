import { ActionScene } from './ActionScene';
import { Icon } from './Icon';
import { useEffect, useRef, useState } from 'react';
import type { ActionPresentation } from '../app/actionPresentation';
import {
  actionsLeft,
  weekOf,
  dayStatus,
  ACTIONS_PER_WEEK,
} from '../domain/game';

/** Presentation only: the engine already committed the action and any new day. */
export function ActionBudget({ action }: { action: ActionPresentation }) {
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = setTimeout(() => setFinished(true), action.duration * 0.7);
    return () => clearTimeout(timer);
  }, [action]);
  const snapshot = finished ? action.after : action.before;
  return <HeaderBudget g={snapshot} />;
}
export function HeaderBudget({ g }: { g: ActionPresentation['after'] }) {
  const left = actionsLeft(g);
  return (
    <>
      <time className="header-week">
        <span className="status-day">{weekOf(g)}주차</span>
      </time>
      <div className="header-budget">
        <div className="header-budget-row">
          <span>남은 행동</span>
          <strong>
            <Icon name="activity" size={15} />
            <span>
              {left}
              <small> / {ACTIONS_PER_WEEK}</small>
            </span>
          </strong>
        </div>
        <div
          className="header-budget-track"
          role="meter"
          aria-label="남은 행동"
          aria-valuemin={0}
          aria-valuemax={ACTIONS_PER_WEEK}
          aria-valuenow={left}
        >
          <span style={{ width: `${(left / ACTIONS_PER_WEEK) * 100}%` }} />
        </div>
      </div>
    </>
  );
}

export function ActionProgress({ action }: { action: ActionPresentation }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      requestAnimationFrame(() => {
        if (before?.isConnected && !before.closest('[inert]')) before.focus();
        else
          document
            .querySelector<HTMLElement>('.sheet-toolbar h1, main h1')
            ?.focus();
      });
    };
  }, []);
  return (
    <div
      className="action-layer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-title"
      tabIndex={-1}
      ref={ref}
      onKeyDown={(e) => {
        if (e.key === 'Tab' || e.key === 'Escape') e.preventDefault();
      }}
    >
      <section
        className="action-progress"
        style={
          { '--action-duration': `${action.duration}ms` } as React.CSSProperties
        }
      >
        <ActionScene
          kind={action.scene}
          appearance={action.after.player?.appearance}
        />
        <h2 id="action-title" role="status">
          {action.label}
        </h2>
        {(action.before.minute !== action.after.minute ||
          weekOf(action.before) !== weekOf(action.after)) && (
          <div className="action-time" aria-label="행동 전후 상태">
            <time>{dayStatus(action.before)}</time>
            <span aria-hidden="true">→</span>
            <time>{dayStatus(action.after)}</time>
          </div>
        )}
        <div className="action-progress-track" aria-hidden="true">
          <span />
        </div>
      </section>
    </div>
  );
}
