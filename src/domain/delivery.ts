import { DELIVERY_LINES } from '../content/chatTemplates';
import { chatWording } from './chatWording';
import {
  COLLECTION_ONLY_TITLES,
  ONSITE_RULES,
  PARCEL_CATEGORIES,
} from '../content/delivery';
import { FIRM_BARGAINING } from '../content/bargaining';
import type { ChatMessage, Item } from './game';
import { won } from './game';
import { moneyRatio } from './money';
import { traderStyle } from './traders';
import { isFirmSeller } from './purchaseBargaining';
import { sellerChatClosed } from './chats';
import { dialogueOpening } from './tradeDialogue';
export type DeliveryMethod = 'meet' | 'parcel';
export type DeliveryAvailability = DeliveryMethod | 'both';
export interface DeliveryState {
  available: DeliveryAvailability;
  selected?: DeliveryMethod;
  inspected?: boolean;
  offered?: boolean;
}
export const deliveryName = (method: DeliveryAvailability) =>
  ({ meet: '직거래', parcel: '택배거래', both: '직거래 · 택배거래' })[method];
export function canParcel(item: Pick<Item, 'kind' | 'category' | 'title'>) {
  if (['부동산', '자동차', '가구'].includes(item.kind)) return false;
  if (item.category && !PARCEL_CATEGORIES[item.category]) return false;
  return !COLLECTION_ONLY_TITLES.some((title) => item.title.includes(title));
}
export const physicalDelivery = (item: Item): DeliveryAvailability =>
  canParcel(item) ? 'both' : 'meet';
export const deliveryMethods = (
  available: DeliveryAvailability,
): DeliveryMethod[] =>
  available === 'both' ? ['meet', 'parcel'] : [available];
export function listingDelivery(item: Item): DeliveryAvailability {
  if (!canParcel(item)) return 'meet';
  if (item.delivery) return item.delivery.available;
  // Stable identity preference: no economic RNG, no reroll on reload or refresh.
  let hash = 0;
  for (const char of `${item.id}:${item.traderId ?? item.seller}`)
    hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return (['meet', 'parcel', 'both', 'both'] as const)[hash % 4];
}
export const selectedDelivery = (item: Item) =>
  item.delivery?.selected ??
  (listingDelivery(item) === 'both'
    ? undefined
    : (listingDelivery(item) as DeliveryMethod));
export function deliveryStateValid(
  value: unknown,
  item: Pick<Item, 'kind' | 'category' | 'title'>,
): boolean {
  if (value === undefined) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const s = value as Record<string, unknown>;
  if (
    typeof s.available !== 'string' ||
    !['meet', 'parcel', 'both'].includes(s.available)
  )
    return false;
  if (!canParcel(item) && s.available !== 'meet') return false;
  if (
    s.selected !== undefined &&
    !deliveryMethods(s.available as DeliveryAvailability).includes(
      s.selected as DeliveryMethod,
    )
  )
    return false;
  if (s.inspected !== undefined && typeof s.inspected !== 'boolean')
    return false;
  if (s.offered !== undefined && typeof s.offered !== 'boolean') return false;
  return (
    (!s.inspected || s.selected === 'meet') &&
    (!s.offered || s.inspected === true)
  );
}
function editable(item: Item) {
  if (sellerChatClosed(item) || item.acquiredFor !== undefined)
    throw Error('종료된 거래입니다.');
  if (item.marketId === 'auction' && item.auction?.status !== 'won')
    throw Error('낙찰 후 거래 방식을 정할 수 있습니다.');
}
function append(item: Item, player: string, other: string) {
  item.chat ??= item.auction
    ? structuredClone(item.auction.history)
    : dialogueOpening(item);
  item.chat.push(
    { speaker: 'player', text: player },
    { speaker: 'other', text: other },
  );
}
export function chooseDelivery(original: Item, method: DeliveryMethod): Item {
  editable(original);
  const item = structuredClone(original);
  const available = listingDelivery(item);
  if (!deliveryMethods(available).includes(method))
    throw Error('선택할 수 없는 거래 방식입니다.');
  if (item.delivery?.inspected || item.delivery?.selected === method)
    throw Error('이미 정한 거래 방식입니다.');
  item.delivery = { available, selected: method };
  item.chatSettled = false;
  const parcel = method === 'parcel';
  const style = traderStyle(item);
  append(
    item,
    parcel ? '택배로 받을 수 있을까요?' : '직접 만나서 거래하고 싶어요.',
    parcel
      ? style === 'quick'
        ? '네. 입금 확인하면 잘 포장해서 보내드릴게요.'
        : chatWording(item, 'parcel', DELIVERY_LINES.parcel)
      : item.kind === '부동산'
        ? '현장에서 함께 둘러보고 계약 조건을 확인하시죠.'
        : style === 'patient'
          ? '좋습니다. 만나서 상태를 보시고 결정하세요.'
          : chatWording(item, 'meet', DELIVERY_LINES.meet),
  );
  return item;
}
/** Only visible condition. Never discloses price, authenticity, hidden defects or appraisal. */
export function onsiteFinding(item: Item): string {
  if (item.caseId === 'unopened')
    return '봉인이 유지되어 있습니다. 포장 안쪽 상태는 확인하지 못했습니다.';
  if (item.kind === '부동산')
    return item.condition === '고장'
      ? '현장 설비에 손봐야 할 부분이 눈에 띕니다. 권리 관계는 별도 확인이 필요합니다.'
      : '현장의 마감과 설비를 둘러봤습니다. 권리 관계는 별도 확인이 필요합니다.';
  if (item.kind === '자동차')
    return item.condition === '고장'
      ? '기본 작동을 살펴보니 이상이 보입니다. 정밀 진단까지 마친 것은 아닙니다.'
      : item.condition === '사용감'
        ? '차체와 실내에 사용 흔적이 보입니다. 정밀 진단까지 마친 것은 아닙니다.'
        : '외관은 깨끗해 보입니다. 정밀 진단까지 마친 것은 아닙니다.';
  return item.condition === '고장'
    ? '기본 작동을 확인하니 정상적으로 쓰기 어려운 부분이 보입니다.'
    : item.condition === '사용감'
      ? '표면에 마모와 사용 흔적이 눈에 띕니다.'
      : '눈에 띄는 큰 외관 손상은 없습니다.';
}
export function inspectOnsite(original: Item): Item {
  editable(original);
  if (selectedDelivery(original) !== 'meet' || original.delivery?.inspected)
    throw Error('현장에서 확인할 수 없습니다.');
  const item = structuredClone(original);
  item.delivery = {
    available: listingDelivery(item),
    selected: 'meet',
    inspected: true,
  };
  item.chatSettled = false;
  append(
    item,
    item.kind === '부동산'
      ? '현장을 한번 둘러볼게요.'
      : '거래 전에 물건을 직접 살펴볼게요.',
    `${onsiteFinding(item)} ${item.caseId === 'unopened' ? '포장은 열지 않고 거래하고 싶어요.' : chatWording(item, 'inspect', DELIVERY_LINES.inspect)}`,
  );
  return item;
}
export function onsiteOffers(item: Item): number[] {
  if (
    !item.delivery?.inspected ||
    item.delivery.offered ||
    sellerChatClosed(item) ||
    item.marketId === 'auction' ||
    item.price === 0
  )
    return [];
  const current = item.negotiatedPrice ?? item.price;
  return [
    ...new Set(ONSITE_RULES.offers.map((p) => moneyRatio(current, p))),
  ].filter((p) => p > 0 && p < current);
}
export function onsiteOffer(
  original: Item,
  price: number,
  random: () => number,
): Item {
  if (!onsiteOffers(original).includes(price))
    throw Error('선택할 수 없는 현장 제안입니다.');
  const item = structuredClone(original);
  item.delivery!.offered = true;
  const firm = isFirmSeller(item),
    style = traderStyle(item);
  const accept = firm
    ? FIRM_BARGAINING.acceptChance
    : style === 'flexible'
      ? ONSITE_RULES.flexibleAccept
      : style === 'quick'
        ? ONSITE_RULES.quickAccept
        : ONSITE_RULES.ordinaryAccept;
  const walk = firm ? FIRM_BARGAINING.walkChance : ONSITE_RULES.ordinaryWalk;
  const draw = random();
  let answer: string;
  if (draw < accept) {
    item.negotiatedPrice = price;
    item.negotiation = 'accepted';
    answer = chatWording(
      item,
      'onsite:accepted',
      DELIVERY_LINES.accepted,
    ).replace('{price}', won(price));
  } else if (draw < accept + walk) {
    item.chatClosed = true;
    item.chatSettled = true;
    answer = chatWording(item, 'onsite:walked', DELIVERY_LINES.walked);
  } else
    answer = chatWording(item, 'onsite:held', DELIVERY_LINES.held).replace(
      '{price}',
      won(item.negotiatedPrice ?? item.price),
    );
  item.offers = [];
  append(
    item,
    `직접 상태를 봤는데, ${won(price)}에 마무리할 수 있을까요?`,
    answer,
  );
  return item;
}
export function deliveryTranscript(method: DeliveryMethod): ChatMessage {
  return {
    speaker: 'player',
    text: `${deliveryName(method)}로 거래하겠습니다.`,
  };
}
