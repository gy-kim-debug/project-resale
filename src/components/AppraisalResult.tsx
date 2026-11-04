import { useEffect, useRef } from 'react';
import type { Game, Item } from '../domain/game';
import { won } from '../domain/game';
import { acquisitionCost } from '../domain/inventory';
import { marketValue } from '../domain/engine';
import { conditionLabel } from '../domain/itemProfiles';
import { listingFindings } from '../domain/listingTags';
import { ItemArt } from './ItemArt';
/** Only appraised, owned information is revealed. This card never changes game state. */
export function AppraisalResult({
  g,
  item,
  fresh = false,
  fee,
}: {
  g: Game;
  item: Item;
  fresh?: boolean;
  fee?: number;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!fresh || !item.checked) return;
    const frame = requestAnimationFrame(() => {
      ref.current?.scrollIntoView({
        block: 'start',
        behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
      });
      ref.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [fresh, item.checked]);
  if (!item.checked) return null;
  const cost = acquisitionCost(item),
    difference = item.value - cost;
  const tone = difference > 0 ? 'gain' : difference < 0 ? 'loss' : 'even';
  return (
    <section
      ref={ref}
      tabIndex={-1}
      className={`appraisal-result appraisal-${tone}${fresh ? ' appraisal-fresh' : ''}`}
      aria-label="가치 확인 결과"
      aria-live="polite"
    >
      <header className="appraisal-heading">
        <ItemArt item={item} />
        <div>
          <p>가치 확인 결과</p>
          <h3>{item.title}</h3>
        </div>
      </header>
      <div className="appraisal-value">
        <span>실제 가치</span>
        <strong data-appraisal="value">{won(item.value)}</strong>
      </div>
      <p className="appraisal-difference">
        <span>매입가 대비 가치</span>
        <strong data-appraisal="difference">
          {difference > 0 ? '+' : difference < 0 ? '−' : ''}
          {won(Math.abs(difference))}
        </strong>
      </p>
      <dl className="appraisal-prices">
        <div>
          <dt>매입가</dt>
          <dd data-appraisal="cost">{won(cost)}</dd>
        </div>
        <div>
          <dt>현재 시세</dt>
          <dd data-appraisal="market">{won(marketValue(g, item))}</dd>
        </div>
        {fee !== undefined && (
          <div>
            <dt>확인 비용</dt>
            <dd data-appraisal="fee">{won(fee)}</dd>
          </div>
        )}
      </dl>
      <div className="appraisal-findings">
        <span
          className={`appraisal-condition${item.condition === '고장' ? ' appraisal-warning' : ''}`}
        >
          {conditionLabel(item.kind, item.condition)}
        </span>
        {listingFindings(item).map((text) => (
          <span
            key={text}
            className={
              item.listing && !item.listing.facts.authentic
                ? 'appraisal-warning'
                : ''
            }
          >
            {text}
          </span>
        ))}
      </div>
      <p className="appraisal-defect">{item.defect}</p>
    </section>
  );
}
