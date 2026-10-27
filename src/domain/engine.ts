import { ABILITIES } from '../content/abilities';
import { abilityLevel } from './abilities';
import {
  BUSINESS_LIMIT_PER_TYPE,
  businessDefinition,
} from '../content/businesses';
import { businessCount, pendingBusinessIncome } from './business';
import {
  SPECIAL_RULES,
  SPECIAL_LISTINGS,
  type SpecialListingId,
} from '../content/specialListings';
import { applySpecialListing, specialAsking } from './specialListings';
import { MONEY_UNIT, roundMoney, moneyRatio, isHundredWon } from './money';
import type { Command, Game, Item, Result, Kind, MarketId } from './game';
import { dayOf, isMoney, won, ACTION_TICK, actionsLeft, weekOf } from './game';
import { instantSalePrice } from './instantSale';
import { openingPurchaseOffers } from './purchaseBargaining';
import { purchaseReply, saleReply } from './bargaining';
import {
  createListingInfo,
  listingAskPrice,
  listingValuePercent,
  listingFindings,
  integrityLabel,
} from './listingTags';
import {
  MARKETS,
  marketOf,
  marketDefinition,
  isActiveMarketId,
  type MarketProduct,
} from '../content/markets';
import { createAuction, auctionBidOptions, placeAuctionBid } from './auction';
import { TAG_RULES } from '../content/listingTags';
import { toWeeklyActions } from './time';
import {
  interestPending,
  interestAmount,
  paymentWeek,
  mandatoryPrincipal,
  settlementAmount,
} from './debt';
import { CATEGORY_PRICING, MARKET_PRICING } from '../content/market';
import { CATALOG, JOBS, RULES, TIERS, TIER_TITLES } from '../content/rules';

function roll(g: Game) {
  g.seed = (Math.imul(1664525, g.seed) + 1013904223) >>> 0;
  return g.seed / 4294967296;
}
function id(g: Game) {
  return `i${++g.serial}`;
}
export const level = abilityLevel;
export function listingLimit(g: Game) {
  return Math.min(8, 3 + level(g, 'sales'));
}
export function tier(g: Game) {
  return TIERS.reduce(
    (best, t, i) => (g.stats.peakCash >= t.threshold ? i : best),
    0,
  );
}
export function marketValue(g: Game, item: Item) {
  return moneyRatio(
    item.value,
    g.marketFactor + (item.kind === g.trend ? 20 : 0),
  );
}
export function checkCost(g: Game, item: Item) {
  return Math.max(
    MONEY_UNIT,
    moneyRatio(item.base, 100 - level(g, 'checks') * 5, 10000),
  );
}
export function repairCost(item: Item) {
  return Math.max(300, moneyRatio(item.base, 12));
}
export function log(g: Game, text: string) {
  g.logs.unshift({ id: ++g.serial, minute: g.minute, week: weekOf(g), text });
  g.logs = g.logs.slice(0, 80);
}
function money(g: Game, amount: number) {
  if (
    !isHundredWon(Math.abs(amount)) ||
    !Number.isSafeInteger(g.cash + amount) ||
    g.cash + amount < 0 ||
    g.cash + amount > RULES.maxMoney
  )
    throw Error('금액 범위를 벗어났습니다.');
  g.cash += amount;
  g.stats.peakCash = Math.max(g.stats.peakCash, g.cash);
  if (amount > 0) g.stats.earned += amount;
}
function makeItem(
  g: Game,
  base: number,
  free = false,
  marketListing = true,
  marketItem?: { marketId: MarketId; product: MarketProduct; asking: number },
): Item {
  const templateIndex = Math.floor(roll(g) * CATALOG.length);
  const template = marketItem?.product ?? CATALOG[templateIndex];
  const tierIndex = TIERS.reduce(
    (best, t, i) => (base >= t.base ? i : best),
    0,
  );
  const categoryBase = marketItem
    ? roundMoney(base)
    : moneyRatio(base, CATEGORY_PRICING[template.kind].valuePercent);
  const quality = roll(g);
  const rarity = roll(g);
  const condition =
    quality < 0.18 ? '고장' : quality < 0.55 ? '사용감' : '양호';
  const listing = marketListing
    ? createListingInfo(
        template.kind,
        () => roll(g),
        free || marketItem?.marketId === 'auction',
      )
    : undefined;
  const rarityPercent = listing
    ? Math.floor(
        (listingValuePercent(listing) *
          (rarity > 0.97 ? 400 : rarity > 0.86 ? 150 : 100)) /
          100,
      )
    : rarity < 0.1
      ? 8
      : rarity > 0.97
        ? 400
        : rarity > 0.86
          ? 150
          : 100;
  const actualBase = Math.max(100, moneyRatio(categoryBase, rarityPercent));
  let price = free
    ? 0
    : Math.max(
        MARKET_PRICING.priceStep,
        Math.floor(
          (categoryBase *
            (MARKET_PRICING.askMinPercent +
              roll(g) *
                (MARKET_PRICING.askMaxPercent -
                  MARKET_PRICING.askMinPercent))) /
            100 /
            MARKET_PRICING.priceStep,
        ) * MARKET_PRICING.priceStep,
      );
  price = listingAskPrice(marketItem?.asking ?? price, listing);
  if (marketItem)
    price = Math.max(marketDefinition(marketItem.marketId).min, price);
  const item: Item = {
    listing,
    ...(marketItem ? { marketId: marketItem.marketId } : {}),
    id: id(g),
    title: marketItem?.product.title ?? TIER_TITLES[tierIndex][templateIndex],
    kind: template.kind,
    base: actualBase,
    value: moneyRatio(
      actualBase,
      condition === '고장' ? 18 : condition === '사용감' ? 75 : 100,
    ),
    condition,
    defect: (listing ? !listing.facts.authentic : rarityPercent < 10)
      ? `${integrityLabel(template.kind, false)}. 비정상 요소가 확인됐습니다.`
      : condition === '고장'
        ? '작동 불량·부품 손상이 있습니다.'
        : condition === '사용감'
          ? '마모와 작은 흠집이 있습니다.'
          : rarityPercent > 100
            ? '희귀한 구성·보존 가치가 확인됐습니다.'
            : '특별한 결함은 발견되지 않았습니다.',
    checked: false,
    repaired: false,
    price,
    seller: ['이웃', '정리중', '오래된상자', '급처해요'][
      Math.floor(roll(g) * 4)
    ],
    description: template.description,
    expires:
      g.minute +
      ACTION_TICK *
        (listing && ['urgent', 'moving'].includes(listing.facts.seller)
          ? TAG_RULES.shortLifetimeActions
          : TAG_RULES.normalLifetimeActions),
    offers: openingPurchaseOffers(price, marketItem?.marketId),
    negotiation: 'none',
    negotiatedPrice: null,
  };
  if (marketItem?.marketId === 'auction') {
    item.auction = createAuction(item.price, () => roll(g));
    item.offers = [];
  }
  return item;
}
function board(g: Game, selected?: MarketId) {
  const list: Item[] = selected
    ? g.board.filter((item) => marketOf(item) !== selected)
    : [];
  for (const market of MARKETS.filter((m) => !selected || m.id === selected)) {
    const marketStart = list.length;
    for (let n = 0; n < 8; n++) {
      const product =
        market.products[Math.floor(roll(g) * market.products.length)];
      // Keep an entry listing at each band's lower edge, then sample its full range.
      const asking =
        n === 0
          ? market.min
          : market.min +
            Math.floor(roll(g) * ((market.max - market.min) / 1000 + 1)) * 1000;
      list.push(
        makeItem(g, moneyRatio(asking, 100, 55), false, true, {
          marketId: market.id,
          product,
          asking,
        }),
      );
    }
    if (market.id !== 'auction' && roll(g) < SPECIAL_RULES.chance) {
      const kinds = (
        Object.keys(SPECIAL_LISTINGS) as SpecialListingId[]
      ).filter((id) => SPECIAL_LISTINGS[id].markets.includes(market.id));
      const special = kinds[Math.floor(roll(g) * kinds.length)];
      const candidates = list
        .slice(marketStart)
        .filter(
          (item) =>
            special === 'collector' ||
            specialAsking(item, special, market.min) < item.price,
        );
      if (candidates.length) {
        const chosen = candidates[Math.floor(roll(g) * candidates.length)];
        list[list.findIndex((i) => i.id === chosen.id)] = applySpecialListing(
          chosen,
          special,
          market.min,
        );
      }
    }
  }
  if ((!selected || selected === 'street') && roll(g) < 0.5) {
    const free = makeItem(
      g,
      MARKET_PRICING.giveawayMin +
        Math.floor(
          roll(g) * (MARKET_PRICING.giveawayMax - MARKET_PRICING.giveawayMin),
        ),
      true,
    );
    free.marketId = 'street';
    list.push(free);
  }
  g.board = list;
}
function daily(g: Game) {
  if (g.marketDay !== dayOf(g)) {
    g.marketDay = dayOf(g);
    g.marketFactor = 85 + Math.floor(roll(g) * 31);
    g.trend = ['생활', '디지털', '가구', '수집품'][
      Math.floor(roll(g) * 4)
    ] as Kind;
    log(g, `시장 변화: ${g.trend} 수요가 높습니다.`);
  }
}
function endDay(g: Game, before: number) {
  g.minute = (Math.floor(before / 1440) + 1) * 1440;
  daily(g);
  board(g);
}
function expire(g: Game) {
  const protectedIds = new Set(g.inquiries.map((q) => q.saleId));
  const expired = g.sales.filter(
    (s) => s.expires <= g.minute && !protectedIds.has(s.id),
  );
  for (const s of expired)
    log(
      g,
      `${g.inventory.find((i) => i.id === s.itemId)?.title ?? '물품'} 판매 글이 만료됐습니다.`,
    );
  g.sales = g.sales.filter((s) => !expired.some((e) => e.id === s.id));
  g.board = g.board.filter((i) => i.expires > g.minute);
  if (g.quotes && g.minute - g.quotes.at >= ACTION_TICK * 2) g.quotes = null;
  if (g.event && g.event.expires <= g.minute) {
    log(g, '특별 제안이 만료됐습니다.');
    g.event = null;
  }
}
function inquiries(g: Game) {
  if (g.inquiries.length || g.status !== 'playing') return;
  for (const sale of g.sales) {
    if (sale.nextCheck > g.minute) continue;
    sale.nextCheck = g.minute + ACTION_TICK;
    const item = g.inventory.find((i) => i.id === sale.itemId);
    if (!item) continue;
    const value = marketValue(g, item);
    const ratio = sale.price / value;
    if (roll(g) > (ratio <= 1.1 ? 0.85 : ratio <= 1.6 ? 0.5 : 0.2)) continue;
    for (let n = 0; n < 2; n++) {
      const max = Math.max(
        MONEY_UNIT,
        roundMoney(value * (0.9 + roll(g) * 0.3)),
      );
      const full = sale.price <= max && roll(g) < 0.5;
      const price = full
        ? sale.price
        : Math.min(
            sale.price,
            Math.max(
              1,
              roundMoney(Math.min(max, sale.price) * (0.75 + roll(g) * 0.2)),
            ),
          );
      g.inquiries.push({
        id: id(g),
        saleId: sale.id,
        name: n ? '동네 구매자 B' : '동네 구매자 A',
        price,
        max,
        rounds: 0,
      });
    }
    log(g, `${item.title}에 구매 문의 ${g.inquiries.length}건이 왔습니다.`);
    return;
  }
}
function event(g: Game) {
  if (g.event || g.minute - g.lastEvent < ACTION_TICK || g.status !== 'playing')
    return;
  if (g.stats.sales >= 3 && g.eventStage === 0) {
    g.eventStage = 1;
    g.event = {
      id: id(g),
      type: 'repair',
      title: '수리 전문가의 연락',
      text: `작은 거래들을 지켜봤다며 정비 교육을 제안합니다. ${won(5000)}.`,
      expires: g.minute + 2880,
    };
    g.lastEvent = g.minute;
    log(g, '수리 전문가에게 특별 제안이 왔습니다.');
  } else if (g.eventStage === 2) {
    if (g.minute - g.lastEvent < 1440) return;
    g.eventStage = 3;
    money(g, 10_000);
    log(g, `수리 전문가가 소개한 단골의 감사금 ${won(10000)}을 받았습니다.`);
    g.lastEvent = g.minute;
  } else if (roll(g) < 0.15) {
    g.event = {
      id: id(g),
      type: 'deal',
      title: '이사 정리 일손 제안',
      text: `급히 일손을 구하는 이웃입니다. 보상 ${won(15000)}.`,
      expires: g.minute + 1440,
    };
    g.lastEvent = g.minute;
    log(g, '이웃에게 시간 제한이 있는 제안이 왔습니다.');
  }
}
/** Each major action spends the weekly budget; settlement never starts implicitly. */
function advance(g: Game, actions: number, generate = true) {
  if (actions > actionsLeft(g))
    throw Error('이번 주 행동을 모두 사용했습니다. 정산을 진행하세요.');
  g.weekActions = (g.weekActions ?? 0) + actions;
  const before = g.minute;
  g.minute += actions * ACTION_TICK;
  if (dayOf(g) > Math.floor(before / 1440) + 1) endDay(g, before);
  else daily(g);
  expire(g);
  settleWeekly(g);
  if (interestPending(g) || g.status !== 'playing') return;
  if (generate && actionsLeft(g) > 0) inquiries(g);
  event(g);
}
function settleWeekly(g: Game) {
  if (
    g.status === 'playing' &&
    interestPending(g) &&
    g.cash < settlementAmount(g)
  ) {
    g.status = 'bankrupt';
    g.inquiries = [];
    log(
      g,
      `${paymentWeek(g)}주차 의무 원금·이자 ${won(settlementAmount(g))} 미납. 게임 종료.`,
    );
  }
  return g.status === 'bankrupt';
}
function finishSale(g: Game, saleId: string) {
  g.sales = g.sales.filter((s) => s.id !== saleId);
  g.inquiries = g.inquiries.filter((q) => q.saleId !== saleId);
}
function endInquiry(g: Game, inquiryId: string) {
  g.inquiries = g.inquiries.filter((q) => q.id !== inquiryId);
}
function owned(g: Game, itemId: string) {
  const i = g.inventory.find((i) => i.id === itemId);
  if (!i) throw Error('보유하지 않은 물품입니다.');
  return i;
}
function unlisted(g: Game, itemId: string) {
  if (g.sales.some((s) => s.itemId === itemId))
    throw Error('장터 판매 등록 중인 물품입니다.');
}
function affordable(g: Game, cost: number) {
  if (!isMoney(cost) || g.cash < cost) throw Error('현금이 부족합니다.');
}
function room(g: Game) {
  if (g.inventory.length >= RULES.capacity)
    throw Error('보관함이 가득 찼습니다.');
}
function preItem(g: Game, itemId: string) {
  const i = g.board.find((i) => i.id === itemId && i.expires > g.minute);
  if (!i) throw Error('판매가 끝난 매물입니다.');
  return i;
}

export function newGame(seed = 1): Game {
  const g: Game = {
    version: 2,
    moneyUnit: 100,
    businesses: [],
    businessIncomeWeek: 0,
    businessIncomeAmount: 0,
    timeMode: 'weekly-actions',
    weekActions: 0,
    weeklyRulesVersion: 2,
    principalRepaidThisWeek: 0,
    settling: false,
    seed: seed >>> 0,
    serial: 0,
    minute: 0,
    status: 'playing',
    cash: RULES.startingCash,
    principal: RULES.debt,
    interest: 0,
    interestWeek: 0,
    marketDay: 1,
    marketFactor: 100,
    trend: '생활',
    inventory: [],
    board: [],
    sales: [],
    inquiries: [],
    quotes: null,
    stats: {
      sales: 0,
      purchases: 0,
      checks: 0,
      repairs: 0,
      earned: 0,
      repaid: 0,
      peakCash: RULES.startingCash,
    },
    logs: [],
    event: null,
    eventStage: 0,
    lastEvent: 0,
  };
  board(g);
  log(g, `현금 ${won(RULES.startingCash)}, 채무 100억 원.`);
  return g;
}
export function execute(original: Game, command: Command): Result {
  // Copy first; any rejected/invalid command leaves all state and RNG unchanged.
  const g = structuredClone(toWeeklyActions(original));
  try {
    if (g.status !== 'playing') throw Error('종료된 게임입니다.');
    if (
      !interestPending(g) &&
      g.inquiries.length &&
      !['accept', 'reject', 'break', 'counter'].includes(command.type)
    )
      throw Error('구매 문의 응답이 필요합니다.');
    if (interestPending(g) && !['repay', 'payInterest'].includes(command.type))
      throw Error('주간 이자 납부가 필요합니다.');
    const beforeLevels = ABILITIES.map((ability) => level(g, ability.stat));
    let message = '';
    switch (command.type) {
      case 'buyBusiness': {
        const business = businessDefinition(command.id);
        if (!business) throw Error('없는 사업입니다.');
        if (businessCount(g, business.id) >= BUSINESS_LIMIT_PER_TYPE)
          throw Error(
            `이 사업은 최대 ${BUSINESS_LIMIT_PER_TYPE}개까지 보유할 수 있습니다.`,
          );
        affordable(g, business.cost);
        money(g, -business.cost);
        g.businesses!.push({ id: business.id, purchasedWeek: paymentWeek(g) });
        message = `${business.name} 구매. 주간 수입 ${won(business.income)}.`;
        log(g, message);
        advance(g, 1);
        break;
      }
      case 'job': {
        const j = JOBS.find((j) => j.id === command.id);
        if (!j) throw Error('없는 일입니다.');
        money(g, j.reward);
        message = `${j.title} 완료. ${won(j.reward)}을 받았습니다.`;
        log(g, message);
        advance(g, j.actions);
        break;
      }
      case 'scavenge': {
        room(g);
        const found = makeItem(
          g,
          roll(g) < MARKET_PRICING.scavengeCommonChance
            ? MARKET_PRICING.scavengeMin +
                Math.floor(
                  roll(g) *
                    (MARKET_PRICING.scavengeMax - MARKET_PRICING.scavengeMin),
                )
            : MARKET_PRICING.scavengeRare,
          true,
          false,
        );
        delete found.listing;
        found.title =
          found.value < 1000
            ? `수집한 ${found.kind === '수집품' ? '낡은 소품' : '생활 잡화'}`
            : found.title;
        found.acquiredFor = 0;
        g.inventory.push(found);
        message = `${found.title} 발견.`;
        log(g, message);
        advance(g, 1);
        break;
      }
      case 'refresh': {
        const target = command.marketId ?? 'street';
        if (!isActiveMarketId(target)) throw Error('없는 시장입니다.');
        const beforeDay = dayOf(g);
        advance(g, 1);
        if (beforeDay === dayOf(g)) board(g, target);
        message = `${marketDefinition(target).name}에서 새 매물을 찾았습니다.`;
        log(g, message);
        break;
      }
      case 'wait':
        advance(g, 1);
        message = '기다리기를 마쳤습니다.';
        log(g, message);
        break;
      case 'bid': {
        const item = preItem(g, command.id);
        if (
          item.marketId !== 'auction' ||
          !auctionBidOptions(item).includes(command.amount)
        )
          throw Error('선택할 수 없는 입찰 금액입니다.');
        affordable(g, command.amount);
        message = placeAuctionBid(item, command.amount);
        log(g, `${item.title}: ${message}`);
        break;
      }
      case 'withdrawAuction': {
        const item = preItem(g, command.id);
        if (
          item.marketId !== 'auction' ||
          !item.auction ||
          item.auction.status === 'withdrawn'
        )
          throw Error('진행 중인 경매가 없습니다.');
        item.auction.status = 'withdrawn';
        item.auction.history.push({
          speaker: 'player',
          text: '이번 경매는 포기하겠습니다.',
        });
        message = '경매를 포기했습니다.';
        log(g, message);
        break;
      }
      case 'offer': {
        const originalItem = preItem(g, command.id);
        const reply = purchaseReply(
          originalItem,
          command.price,
          () => roll(g),
          level(g, 'purchases'),
        );
        g.board = g.board.map((item) =>
          item.id === originalItem.id ? reply.item : item,
        );
        message = reply.message;
        log(g, `${originalItem.seller}: ${message}`);
        break;
      }
      case 'closeChat': {
        const i = preItem(g, command.id);
        if (!i.chat || i.chatSettled) throw Error('진행 중인 흥정이 없습니다.');
        i.chat.push({ speaker: 'player', text: '이번 거래는 하지 않을게요.' });
        i.chatSettled = true;
        message = '흥정을 마쳤습니다.';
        log(g, message);
        break;
      }
      case 'buy': {
        const item = preItem(g, command.id);
        if (item.purchaseBargain?.walked)
          throw Error('판매자가 거래를 종료했습니다.');
        room(g);
        if (item.marketId === 'auction' && item.auction?.status !== 'won')
          throw Error('낙찰 후 결제할 수 있습니다.');
        const cost =
          item.marketId === 'auction'
            ? item.auction!.currentBid
            : (item.negotiatedPrice ?? item.price);
        affordable(g, cost);
        money(g, -cost);
        const received = {
          ...item,
          acquiredFor: cost,
          chat: item.chat ? [...item.chat] : undefined,
        };
        if (received.chat && !received.chatSettled) {
          received.chat.push({
            speaker: 'player',
            text: `${won(cost)}에 거래할게요.`,
          });
          received.chatSettled = true;
        }
        g.inventory.push(received);
        g.board = g.board.filter((i) => i.id !== item.id);
        g.stats.purchases++;
        message = `${item.title} ${cost === 0 ? '나눔 수령' : '구매'} 완료.`;
        log(g, message);
        advance(g, 1);
        break;
      }
      case 'check': {
        const i = owned(g, command.id);
        if (i.checked) throw Error('이미 확인한 물품입니다.');
        const cost = checkCost(g, i);
        affordable(g, cost);
        money(g, -cost);
        i.checked = true;
        g.stats.checks++;
        message = `가치 확인: ${i.title}, 실제 가치 ${won(i.value)}. ${i.defect}${i.listing ? ` ${listingFindings(i).join(' · ')}.` : ''}`;
        log(g, message);
        break;
      }
      case 'repair': {
        const i = owned(g, command.id);
        unlisted(g, i.id);
        if (!i.checked) throw Error('미확인 물품입니다.');
        if (i.repaired || i.condition === '양호')
          throw Error('수리할 수 없는 물품입니다.');
        const cost = repairCost(i);
        affordable(g, cost);
        money(g, -cost);
        i.repaired = true;
        const success =
          roll(g) < Math.min(0.95, 0.7 + level(g, 'repairs') * 0.05);
        g.stats.repairs++;
        if (success) {
          i.condition = '양호';
          i.value = i.base;
          i.defect = '수리 완료. 정상 작동합니다.';
        }
        message = success
          ? `수리 성공. 실제 가치 ${won(i.value)}.`
          : `수리 실패. ${won(cost)} 사용.`;
        log(g, message);
        break;
      }
      case 'discard': {
        const i = owned(g, command.id);
        unlisted(g, i.id);
        g.inventory = g.inventory.filter((x) => x.id !== i.id);
        message = `${i.title}을 버렸습니다.`;
        log(g, message);
        break;
      }
      case 'post': {
        const item = owned(g, command.id);
        unlisted(g, command.id);
        const price = isMoney(command.price) ? roundMoney(command.price) : NaN;
        if (!isMoney(price) || price < MONEY_UNIT || price > RULES.maxMoney)
          throw Error('판매 가격은 100원 이상 1,000조 원 이하여야 합니다.');
        if (g.sales.length >= listingLimit(g))
          throw Error('동시 판매 등록 한도에 도달했습니다.');
        const sale = {
          marketId: marketOf(item),
          id: id(g),
          itemId: command.id,
          price,
          created: g.minute + ACTION_TICK,
          expires: g.minute + ACTION_TICK + 2880,
          nextCheck: g.minute + ACTION_TICK * 2,
        };
        g.sales.push(sale);
        message = `판매 글 등록: ${won(price)}.`;
        log(g, message);
        advance(g, 1);
        break;
      }
      case 'cancel': {
        const s = g.sales.find((s) => s.itemId === command.id);
        if (!s) throw Error('판매 글이 없습니다.');
        finishSale(g, s.id);
        message = '판매 등록을 취소했습니다.';
        log(g, message);
        advance(g, 1);
        break;
      }
      case 'accept': {
        const q = g.inquiries.find((q) => q.id === command.id);
        if (!q) throw Error('종료된 문의입니다.');
        const sale = g.sales.find((s) => s.id === q.saleId);
        if (!sale) throw Error('판매 글이 없습니다.');
        const i = owned(g, sale.itemId);
        money(g, q.price);
        g.inventory = g.inventory.filter((i) => i.id !== sale.itemId);
        finishSale(g, sale.id);
        g.stats.sales++;
        message = `${i.title} 판매 완료. ${won(q.price)}을 받았습니다. 물품·대금 교환을 한 번에 마쳤습니다.`;
        log(g, message);
        advance(g, 1, false);
        break;
      }
      case 'counter':
      case 'reject': {
        const q = g.inquiries.find((q) => q.id === command.id);
        if (!q) throw Error('종료된 문의입니다.');
        const sale = g.sales.find((s) => s.id === q.saleId);
        if (!sale) throw Error('판매 글이 없습니다.');
        const reply = saleReply(
          q,
          sale.price,
          command.type === 'counter' ? command.price : null,
          () => roll(g),
        );
        if (reply.inquiry)
          g.inquiries = g.inquiries.map((inquiry) =>
            inquiry.id === q.id ? reply.inquiry! : inquiry,
          );
        else endInquiry(g, q.id);
        message = reply.message;
        log(g, message);
        break;
      }
      case 'break': {
        const q = g.inquiries.find((q) => q.id === command.id);
        if (!q) throw Error('종료된 문의입니다.');
        endInquiry(g, q.id);
        message = '구매자와의 거래를 파토냈습니다. 판매 글은 유지됩니다.';
        log(g, message);
        break;
      }
      case 'visit': {
        // Legacy command compatibility: all former outlets now use one rule.
        if (
          ![
            'instant',
            'scrap',
            'used',
            'collector',
            'music',
            'carDealer',
            'propertyBroker',
            'aircraftBroker',
          ].includes(command.id)
        )
          throw Error('없는 판매 경로입니다.');
        g.quotes = {
          outlet: command.id,
          at: g.minute,
          prices: Object.fromEntries(
            g.inventory.map((i) => [i.id, instantSalePrice(i)]),
          ),
        };
        message = '즉시 판매';
        break;
      }
      case 'outletSell': {
        const i = owned(g, command.id);
        unlisted(g, i.id);
        // Old persisted quotes cannot override the unified rate or sell stale value.
        const price = instantSalePrice(i);
        if (price < 1) throw Error('판매 가능한 금액이 없습니다.');
        money(g, price);
        g.inventory = g.inventory.filter((i) => i.id !== command.id);
        if (g.quotes) delete g.quotes.prices[i.id];
        g.stats.sales++;
        message = `${i.title}을 ${won(price)}에 즉시 판매했습니다.`;
        log(g, message);
        advance(g, 1);
        break;
      }
      case 'repay': {
        const amount = isMoney(command.amount)
          ? roundMoney(command.amount)
          : NaN;
        if (!isMoney(amount) || amount < MONEY_UNIT || amount > g.principal)
          throw Error('남은 원금 이내의 100원 단위 금액을 입력하세요.');
        affordable(g, amount);
        const due = interestPending(g);
        money(g, -amount);
        g.principal -= amount;
        g.principalRepaidThisWeek = Math.min(
          RULES.maxMoney,
          (g.principalRepaidThisWeek ?? 0) + amount,
        );
        g.stats.repaid += amount;
        message = `원금 ${won(amount)} 상환했습니다.`;
        log(g, message);
        if (g.principal + g.interest === 0) {
          g.status = 'cleared';
          g.inquiries = [];
          message = '채무 전액 상환. 게임 클리어!';
          log(g, message);
        }
        if (!due) advance(g, 1);
        else settleWeekly(g);
        break;
      }
      case 'startSettlement': {
        if (g.settling) throw Error('이미 정산 중입니다.');
        const income = Math.min(
          pendingBusinessIncome(g),
          RULES.maxMoney - g.cash,
        );
        if ((g.businessIncomeWeek ?? 0) < paymentWeek(g)) {
          if (income > 0) money(g, income);
          g.businessIncomeWeek = paymentWeek(g);
          g.businessIncomeAmount = income;
        }
        g.settling = true;
        message = `${income > 0 ? `사업 수입 ${won(income)} 수령. ` : ''}${paymentWeek(g)}주차 정산을 시작합니다.`;
        log(g, message);
        break;
      }
      case 'payInterest': {
        const due = interestPending(g);
        if (due && mandatoryPrincipal(g) > 0)
          throw Error('이번 주 의무 원금을 먼저 납부하세요.');
        if (!due && g.interest === 0) throw Error('납부할 이자가 없습니다.');
        const amount = due ? interestAmount(g) : g.interest;
        affordable(g, amount);
        money(g, -amount);
        g.interest = 0;
        if (due) {
          const remaining = actionsLeft(g);
          g.minute += remaining * ACTION_TICK;
          g.interestWeek = paymentWeek(g);
          g.weekActions = 0;
          g.principalRepaidThisWeek = 0;
          g.settling = false;
          g.inquiries = [];
          expire(g);
          daily(g);
          board(g);
        }
        g.stats.repaid += amount;
        message = `이자 ${won(amount)} 납부했습니다.${due ? ` ${paymentWeek(g)}주차 시작.` : ''}`;
        log(g, message);
        if (g.principal === 0) {
          g.status = 'cleared';
          g.inquiries = [];
          message = '채무 전액 상환. 게임 클리어!';
        }
        break;
      }
      case 'event': {
        if (!g.event || g.event.expires <= g.minute)
          throw Error('유효한 제안이 없습니다.');
        const e = g.event;
        if (command.choice === 'no') {
          g.event = null;
          message = '특별 제안을 거절했습니다.';
          log(g, message);
          break;
        }
        if (e.type === 'repair') {
          affordable(g, 5000);
          money(g, -5000);
          g.stats.repairs += 4;
          g.eventStage = 2;
          g.lastEvent = g.minute;
          message =
            '정비 교육을 마쳤습니다. 수리 경험 +4. 전문가가 다음 연락을 약속했습니다.';
        } else {
          money(g, 15000);
          message = `이사 정리를 도와 ${won(15000)}을 받았습니다.`;
        }
        g.event = null;
        log(g, message);
        advance(g, 1);
        break;
      }
      default:
        throw Error('지원하지 않는 행동입니다.');
    }
    const upgrades = ABILITIES.filter(
      (ability, index) => level(g, ability.stat) > beforeLevels[index],
    ).map((ability) => `${ability.name} Lv.${level(g, ability.stat)}`);
    if (upgrades.length) {
      const notice = upgrades.join(' · ');
      message += ` ${notice}`;
      if (g.logs[0]) g.logs[0].text += ` ${notice}`;
    }
    const missed = settleWeekly(g);
    if (missed)
      message =
        '주간 의무 원금 또는 이자를 납부하지 못해 게임이 종료되었습니다.';
    return { game: g, ok: true, message };
  } catch (e) {
    return {
      game: original,
      ok: false,
      message: e instanceof Error ? e.message : '행동을 실행할 수 없습니다.',
    };
  }
}
