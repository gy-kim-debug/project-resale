import type { Auction, Item } from './game';
import { won } from './game';
import { RULES } from '../content/rules';
import { AUCTION_RULES } from '../content/auction';

export function auctionStep(startingPrice: number): number {
  return Math.max(
    AUCTION_RULES.moneyStep,
    Math.ceil(
      (startingPrice * AUCTION_RULES.stepRatePercent) /
        100 /
        AUCTION_RULES.moneyStep,
    ) * AUCTION_RULES.moneyStep,
  );
}
export function createAuction(
  startingPrice: number,
  random: () => number,
): Auction {
  const step = auctionStep(startingPrice);
  const limit =
    (startingPrice *
      (AUCTION_RULES.competitorMinPercent +
        random() *
          (AUCTION_RULES.competitorMaxPercent -
            AUCTION_RULES.competitorMinPercent))) /
    100;
  const competitorMax =
    startingPrice +
    Math.max(1, Math.floor((limit - startingPrice) / step)) * step;
  return {
    currentBid: 0,
    competitorMax,
    step,
    rounds: 0,
    status: 'open',
    history: [
      { speaker: 'other', text: `시작가는 ${won(startingPrice)}입니다.` },
    ],
  };
}
export function auctionBidOptions(item: Item): number[] {
  const a = item.auction;
  if (
    !a ||
    !['open', 'outbid'].includes(a.status) ||
    a.rounds >= AUCTION_RULES.maxRounds
  )
    return [];
  const minimum = a.currentBid === 0 ? item.price : a.currentBid + a.step;
  return [minimum, minimum + a.step, minimum + a.step * 2].filter(
    (amount) => Number.isSafeInteger(amount) && amount <= RULES.maxMoney,
  );
}
/** Called only after validating the offered option and available cash. No clocks or RNG. */
export function placeAuctionBid(item: Item, amount: number): string {
  const a = item.auction!;
  a.rounds++;
  a.history.push({ speaker: 'player', text: `${won(amount)} 입찰합니다.` });
  let message: string;
  if (amount >= a.competitorMax) {
    a.currentBid = amount;
    a.status = 'won';
    message = `${won(amount)}에 낙찰됐습니다.`;
  } else {
    a.currentBid = Math.min(a.competitorMax, amount + a.step);
    a.status = 'outbid';
    message = `경쟁자가 ${won(a.currentBid)}에 응찰했습니다.`;
  }
  a.history.push({ speaker: 'other', text: message });
  return message;
}
