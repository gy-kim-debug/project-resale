import { MONEY_UNIT, roundMoney } from './money';
import { isMoney, won, type Item, type Inquiry } from './game';
import {
  bargainingMarket,
  canPurchaseOffer,
  nextPurchaseOffers,
  purchaseApproach,
  purchaseProfile,
} from './purchaseBargaining';
import { SALE_BARGAINING } from '../content/bargaining';

function counterText(item: Item, price: number, favorable: boolean) {
  if (!favorable) return `${won(price)}까지는 맞춰드릴게요. 어떠세요?`;
  if (item.marketId === 'computers')
    return `그 정도 가격이면 조율해 볼 수 있겠네요. ${won(price)}은 어떠세요?`;
  if (item.marketId === 'instruments')
    return `조금씩 맞춰 주시니 저도 양보할게요. ${won(price)}에 어떠세요?`;
  if (item.marketId === 'cars')
    return `그렇게 조건을 올려 주시면 저도 맞추겠습니다. ${won(price)}에 정리하죠.`;
  return `몇 차례 조율했으니 저도 한발 양보하겠습니다. ${won(price)}은 어떠세요?`;
}
/** Pure item transition. RNG is supplied by the game, and rejected calls cannot commit it. */
export function purchaseReply(
  original: Item,
  price: number,
  random: () => number,
  buyingLevel = 0,
): { item: Item; message: string } {
  if (!canPurchaseOffer(original) || !original.offers.includes(price))
    throw Error('선택할 수 없는 구매 제안입니다.');
  const item = structuredClone(original);
  const profile = purchaseProfile(item, buyingLevel);
  const market = bargainingMarket(item.marketId);
  const state = (item.purchaseBargain ??= {
    rounds: 0,
    floor: Math.max(
      MONEY_UNIT,
      roundMoney(
        item.price *
          (profile.floorMin + random() * (profile.floorMax - profile.floorMin)),
      ),
    ),
    patience:
      profile.patienceMin +
      Math.floor(random() * (profile.patienceMax - profile.patienceMin + 1)),
    walked: false,
  });
  const current = item.negotiatedPrice ?? item.price;
  state.rounds++;
  const approach = purchaseApproach(item, price, state.rounds);
  item.chat ??= [
    { speaker: 'other', text: `판매 가격은 ${won(item.price)}입니다.` },
  ];
  item.chat.push({
    speaker: 'player',
    text: `${won(price)}에 거래할 수 있을까요?`,
  });
  let message: string;
  const lowball =
    item.listing?.facts.seller !== 'firm' &&
    price < item.price * market.lowballRatio;
  if (price >= state.floor) {
    item.negotiation = 'accepted';
    item.negotiatedPrice = price;
    item.offers = [];
    message = `좋아요. ${won(price)}에 거래해요.`;
  } else if (
    (lowball && random() < market.lowballWalkChance) ||
    (state.rounds >= state.patience && random() < 0.3)
  ) {
    state.walked = true;
    item.negotiation = 'rejected';
    item.negotiatedPrice = null;
    item.offers = [];
    item.chatSettled = true;
    message = lowball
      ? '제시하신 가격은 차이가 너무 크네요. 이번 거래는 하지 않겠습니다.'
      : '가격이 안 맞네요. 이번 거래는 여기까지 할게요.';
  } else {
    const firm = item.listing?.facts.seller === 'firm';
    const holdChance = firm
      ? 1
      : Math.max(0, profile.holdChance - approach.holdReduction);
    const concession =
      random() < holdChance
        ? 0
        : Math.max(
            MONEY_UNIT,
            roundMoney(
              (current - price) *
                (profile.concessionMin +
                  random() * (profile.concessionMax - profile.concessionMin)) *
                approach.concessionScale,
            ),
          );
    const counter = Math.max(
      state.floor,
      Math.min(current, current - concession),
    );
    item.negotiation = 'rejected';
    item.negotiatedPrice = counter;
    item.offers =
      state.rounds < state.patience ? nextPurchaseOffers(counter, price) : [];
    const final = !item.offers.length;
    item.chatSettled = final;
    message = final
      ? `${won(counter)}가 마지막 가격입니다. 더는 어렵겠어요.`
      : counter === current
        ? `그 가격은 어렵네요. ${won(counter)}는 받아야 해요.`
        : counterText(item, counter, approach.favorable);
  }
  state.previousOffer = price;
  item.chat.push({ speaker: 'other', text: message });
  return { item, message };
}

/** Shared buyer reply for counteroffers and rejection; never touches listings or assets. */
export function saleReply(
  original: Inquiry,
  asking: number,
  proposed: number | null,
  random: () => number,
): { inquiry: Inquiry | null; message: string } {
  const q = structuredClone(original);
  if (proposed !== null) {
    if (!isMoney(proposed)) throw Error('100원 단위 금액을 입력하세요.');
    proposed = roundMoney(proposed);
  }
  const counter = proposed !== null;
  if (
    proposed !== null &&
    (!isMoney(proposed) || proposed <= q.price || proposed > asking)
  )
    throw Error(
      '구매자 제안보다 높고 등록 가격 이하인 정수 금액을 입력하세요.',
    );
  if (counter && q.rounds >= SALE_BARGAINING.maxRounds)
    throw Error('더 이상 가격을 제안할 수 없습니다.');
  q.chat ??= [
    { speaker: 'other', text: `${won(q.price)}에 거래할 수 있을까요?` },
  ];
  q.chat.push({
    speaker: 'player',
    text: counter
      ? `${won(proposed!)}에 판매하고 싶습니다.`
      : '그 가격에는 어렵습니다.',
  });
  if (counter) q.rounds++;
  if (counter && proposed! <= q.max) {
    q.price = proposed!;
    q.chat.push({
      speaker: 'other',
      text: `좋아요. ${won(q.price)}에 거래해요.`,
    });
    return {
      inquiry: q,
      message: `구매자가 ${won(q.price)} 제안을 수락했습니다.`,
    };
  }
  if (
    (!counter && q.rounds >= SALE_BARGAINING.maxRounds) ||
    q.price >= q.max ||
    random() < SALE_BARGAINING.walkChance
  )
    return {
      inquiry: null,
      message: '구매자가 거래를 파토냈습니다. 판매 글은 유지됩니다.',
    };
  if (!counter) q.rounds++;
  q.price = Math.min(
    q.max,
    Math.max(
      q.price + MONEY_UNIT,
      roundMoney(counter ? (q.price + q.max) / 2 : q.price * 1.12),
    ),
  );
  q.chat.push({
    speaker: 'other',
    text: counter
      ? `그 가격은 어렵습니다. ${won(q.price)}은 어떠세요?`
      : `그러면 ${won(q.price)}은 어떠세요?`,
  });
  return {
    inquiry: q,
    message: `구매자가 ${won(q.price)}으로 다시 제안했습니다.`,
  };
}
