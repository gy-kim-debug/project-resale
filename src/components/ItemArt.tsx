import type { Item } from '../domain/game';
import { itemArt } from '../content/itemArt';

export function ItemArt({
  item,
  large = false,
}: {
  item: Pick<Item, 'title' | 'kind'>;
  large?: boolean;
}) {
  return (
    <span
      className={large ? 'item-art item-art-large' : 'item-art'}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 32 32"
        width="64"
        height="64"
        shapeRendering="crispEdges"
        focusable="false"
      >
        {itemArt(item.title, item.kind).map(
          ([x, y, width, height, fill], i) => (
            <rect
              key={i}
              x={x}
              y={y}
              width={width}
              height={height}
              fill={fill}
            />
          ),
        )}
      </svg>
    </span>
  );
}
