import type { Game, Item } from '../domain/game';
import { won } from '../domain/game';
import { compareItem } from '../domain/inventory';

export function ItemComparison({
  g,
  item,
  compact = false,
}: {
  g: Game;
  item: Item;
  compact?: boolean;
}) {
  const { cost, value, difference } = compareItem(g, item);
  const signed =
    difference === null
      ? '미확인'
      : `${difference > 0 ? '+' : difference < 0 ? '−' : ''}${won(Math.abs(difference))}`;
  return (
    <span
      className={`item-comparison${compact ? ' comparison-compact' : ''}`}
      aria-label="매입가와 현재 가치 비교"
    >
      <span className="comparison-row">
        <span className="comparison-label">매입가</span>
        <b data-field="cost">{won(cost)}</b>
      </span>
      <span className="comparison-row">
        <span className="comparison-label">현재 가치</span>
        <b data-field="value">{value === null ? '미확인' : won(value)}</b>
      </span>
      <span className="comparison-row">
        <span className="comparison-label">매입가 대비</span>
        <b
          data-field="difference"
          className={
            difference === null || difference === 0
              ? ''
              : difference > 0
                ? 'comparison-gain'
                : 'comparison-loss'
          }
        >
          {signed}
        </b>
      </span>
    </span>
  );
}
