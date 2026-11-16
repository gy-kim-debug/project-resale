import {
  deliveryMethods,
  deliveryName,
  listingDelivery,
  selectedDelivery,
} from '../domain/delivery';
import type { Item } from '../domain/game';
import type { Act } from '../app/store';
export function DeliveryBadge({ item }: { item: Item }) {
  return (
    <span className="delivery-badge">
      {deliveryName(listingDelivery(item))}
    </span>
  );
}
export function DeliveryControls({
  item,
  act,
  disabled = false,
}: {
  item: Item;
  act: Act;
  disabled?: boolean;
}) {
  const selected = selectedDelivery(item);
  return (
    <div className="delivery-controls" role="group" aria-label="거래 방식 선택">
      {deliveryMethods(listingDelivery(item)).map((method) => (
        <button
          type="button"
          key={method}
          aria-pressed={selected === method}
          disabled={
            disabled || !!item.delivery?.inspected || selected === method
          }
          onClick={() => act({ type: 'chooseDelivery', id: item.id, method })}
        >
          {deliveryName(method)}
          {selected === method ? ' ✓' : ''}
        </button>
      ))}
    </div>
  );
}
