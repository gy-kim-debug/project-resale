import type { Game, Item } from './game';
import { auctionStep } from './auction';
import { isHundredWon, positivePrice, roundMoney } from './money';

const moneyText = (text: string, activeQuote = false) =>
  text.replace(/(\d[\d,]*)\s*원/g, (match, digits: string) => {
    const amount = Number(digits.replaceAll(',', ''));
    return Number.isSafeInteger(amount)
      ? `${(activeQuote ? positivePrice(amount) : roundMoney(amount)).toLocaleString('ko-KR')} 원`
      : match;
  });
/** No draws, clocks or commands; all old snapshots retain assets and negotiated outcomes. */
export function normalizeMoney(original: Game): Game {
  const g = structuredClone(original);
  for (const key of [
    'cash',
    'principal',
    'interest',
    'principalRepaidThisWeek',
  ] as const)
    if (g[key] !== undefined) g[key] = roundMoney(g[key]!);
  for (const key of ['earned', 'repaid', 'peakCash'] as const)
    g.stats[key] = roundMoney(g.stats[key]);
  const normalizeItem = (item: Item, activeQuote = false) => {
    const oldPrice = item.price;
    const auction = item.auction;
    const currentSteps = auction
      ? (auction.currentBid - oldPrice) / auction.step
      : 0;
    const limitSteps = auction
      ? (auction.competitorMax - oldPrice) / auction.step
      : 0;
    item.base = roundMoney(item.base);
    item.value = roundMoney(item.value);
    item.price = positivePrice(item.price);
    if (item.acquiredFor !== undefined)
      item.acquiredFor = roundMoney(item.acquiredFor);
    if (item.negotiatedPrice !== null)
      item.negotiatedPrice = positivePrice(item.negotiatedPrice);
    if (item.purchaseBargain) {
      item.purchaseBargain.floor = Math.min(
        item.price,
        positivePrice(item.purchaseBargain.floor),
      );
      if (item.purchaseBargain.previousOffer !== undefined)
        item.purchaseBargain.previousOffer = Math.min(
          item.price,
          positivePrice(item.purchaseBargain.previousOffer),
        );
    }
    item.offers = [...new Set(item.offers.map(roundMoney))].filter(
      (p) =>
        p > (item.purchaseBargain?.previousOffer ?? 0) &&
        p < (item.negotiatedPrice ?? item.price),
    );
    if (
      !item.offers.length &&
      item.purchaseBargain &&
      item.negotiation !== 'accepted'
    )
      item.chatSettled = true;
    if (auction) {
      const wasUnbid = auction.currentBid === 0;
      auction.step = auctionStep(item.price);
      auction.currentBid = wasUnbid
        ? 0
        : item.price + currentSteps * auction.step;
      auction.competitorMax = item.price + limitSteps * auction.step;
      for (const message of auction.history)
        message.text = moneyText(message.text, activeQuote);
    }
    for (const message of item.chat ?? [])
      message.text = moneyText(message.text, activeQuote);
  };
  for (const item of g.board) normalizeItem(item, true);
  for (const item of g.inventory) normalizeItem(item);
  for (const sale of g.sales) sale.price = positivePrice(sale.price);
  for (const q of g.inquiries) {
    q.price = positivePrice(q.price);
    q.max = positivePrice(q.max);
    for (const message of q.chat ?? [])
      message.text = moneyText(message.text, true);
  }
  if (g.quotes)
    for (const id of Object.keys(g.quotes.prices))
      g.quotes.prices[id] = roundMoney(g.quotes.prices[id]);
  for (const entry of g.logs) entry.text = moneyText(entry.text);
  if (g.event) g.event.text = moneyText(g.event.text);
  if (g.status === 'playing' && g.principal + g.interest === 0) {
    g.status = 'cleared';
    g.inquiries = [];
  }
  g.moneyUnit = 100;
  return g;
}
export function allMoneyAligned(g: Game): boolean {
  const amounts = [
    g.cash,
    g.principal,
    g.interest,
    g.principalRepaidThisWeek ?? 0,
    g.stats.earned,
    g.stats.repaid,
    g.stats.peakCash,
  ];
  for (const item of [...g.board, ...g.inventory]) {
    amounts.push(item.price, item.base, item.value, ...item.offers);
    if (item.acquiredFor !== undefined) amounts.push(item.acquiredFor);
    if (item.negotiatedPrice !== null) amounts.push(item.negotiatedPrice);
    if (item.purchaseBargain)
      amounts.push(
        item.purchaseBargain.floor,
        ...(item.purchaseBargain.previousOffer === undefined
          ? []
          : [item.purchaseBargain.previousOffer]),
      );
    if (item.auction)
      amounts.push(
        item.auction.currentBid,
        item.auction.competitorMax,
        item.auction.step,
      );
  }
  for (const sale of g.sales) amounts.push(sale.price);
  for (const q of g.inquiries) amounts.push(q.price, q.max);
  if (g.quotes) amounts.push(...Object.values(g.quotes.prices));
  return amounts.every(isHundredWon);
}
