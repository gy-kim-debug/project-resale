import { useEffect, useRef, useState } from 'react';
import type { ActionPresentation } from '../app/actionPresentation';
import { dayOf, timeOf } from '../domain/game';

/** Presentation only: elapsed game time was already resolved by the pure engine. */
export function ActionClock({ action }: { action: ActionPresentation }) {
  const [minute, setMinute] = useState(action.before.minute);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / action.duration);
      setMinute(
        Math.floor(
          (action.before.minute +
            (action.after.minute - action.before.minute) * progress) /
            60,
        ) * 60,
      );
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [action]);
  const clock = { ...action.before, minute };
  return (
    <>
      <span className="status-day">{dayOf(clock)}일째</span>{' '}
      <strong className="status-clock">{timeOf(clock)}</strong>
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
        <h2 id="action-title" role="status">
          {action.label}
        </h2>
        {action.before.minute !== action.after.minute && (
          <div className="action-time" aria-label="행동 전후 시간">
            <time>
              {dayOf(action.before)}일째 {timeOf(action.before)}
            </time>
            <span aria-hidden="true">→</span>
            <time>
              {dayOf(action.after)}일째 {timeOf(action.after)}
            </time>
          </div>
        )}
        <div className="action-progress-track" aria-hidden="true">
          <span />
        </div>
      </section>
    </div>
  );
}
