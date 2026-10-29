import { DIALOGUE_RULES, isDialogueTopic } from '../content/tradeDialogue';
import {
  isProductCategory,
  PRODUCT_CATEGORIES,
} from '../content/productCategories';
import { isItemCaseId, caseApplies } from '../content/itemCases';
import { isTraderId } from '../content/traders';
import { ITEM_CODEX, isCodexKey } from '../content/collection';
import {
  SPECIAL_LISTINGS,
  isSpecialListingId,
} from '../content/specialListings';
import {
  BUSINESS_LIMIT_PER_TYPE,
  BUSINESSES,
  businessDefinition,
} from '../content/businesses';
import { allMoneyAligned } from '../domain/moneyMigration';
import type { Game, Item } from '../domain/game';
import {
  KIND_TAGS,
  TAG_LABELS,
  FEATURE_TAGS,
  SELLER_TAGS,
  SELLER_PROFILES,
} from '../content/listingTags';
import {
  isMarketId,
  marketDefinition,
  LEGACY_BOARD_LIMIT,
} from '../content/markets';
import { auctionStep } from '../domain/auction';
import { AUCTION_RULES } from '../content/auction';
import { RULES } from '../content/rules';
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const integer = (v: unknown, max = Number.MAX_SAFE_INTEGER): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= max;
const text = (v: unknown): v is string =>
  typeof v === 'string' && v.length <= 2000;
const kind = (v: unknown) => Object.keys(KIND_TAGS).includes(String(v));
const chat = (v: unknown) =>
  v === undefined ||
  (Array.isArray(v) &&
    v.length <= DIALOGUE_RULES.maxMessages &&
    v.every(
      (m) =>
        record(m) &&
        ['player', 'other'].includes(String(m.speaker)) &&
        text(m.text),
    ));
function listing(v: unknown, itemKind: unknown): boolean {
  if (v === undefined) return true;
  if (!record(v) || !Array.isArray(v.tags) || !record(v.facts)) return false;
  const tags = v.tags;
  const facts = v.facts;
  return (
    kind(itemKind) &&
    (tags.length === 2 || tags.length === 3) &&
    new Set(tags).size === tags.length &&
    tags.every(
      (tag) => typeof tag === 'string' && Object.keys(TAG_LABELS).includes(tag),
    ) &&
    tags[0] === KIND_TAGS[itemKind as keyof typeof KIND_TAGS] &&
    FEATURE_TAGS.some((tag) => tag === tags[1]) &&
    (tags.length === 2 || SELLER_TAGS.some((tag) => tag === tags[2])) &&
    ['authentic', 'limited', 'discontinued', 'vintage'].every(
      (key) => typeof facts[key] === 'boolean',
    ) &&
    typeof facts.seller === 'string' &&
    Object.keys(SELLER_PROFILES).includes(facts.seller)
  );
}
function item(v: unknown): v is Item {
  return (
    record(v) &&
    (v.valuationReference === undefined ||
      (integer(v.valuationReference, RULES.maxMoney) &&
        v.valuationReference >= 100 &&
        v.valuationReference % 100 === 0)) &&
    (v.traderId === undefined || isTraderId(v.traderId)) &&
    (v.category === undefined ||
      (isProductCategory(v.category) &&
        PRODUCT_CATEGORIES[v.category].kind === v.kind)) &&
    (v.caseId === undefined ||
      (isItemCaseId(v.caseId) &&
        caseApplies(
          v.caseId,
          v.kind as Item['kind'],
          v.marketId as Item['marketId'],
        ))) &&
    (v.special === undefined ||
      (isSpecialListingId(v.special) &&
        SPECIAL_LISTINGS[v.special].markets.includes(
          (v.marketId ?? 'street') as Item['marketId'] & string,
        ))) &&
    ['id', 'title', 'seller', 'description', 'defect'].every((k) =>
      text(v[k]),
    ) &&
    (v.acquiredFor === undefined || integer(v.acquiredFor, RULES.maxMoney)) &&
    (v.dialogue === undefined ||
      (record(v.dialogue) &&
        Array.isArray(v.dialogue.topics) &&
        v.dialogue.topics.length <= 11 &&
        v.dialogue.topics.every(isDialogueTopic) &&
        new Set(v.dialogue.topics).size === v.dialogue.topics.length &&
        !(
          v.dialogue.topics.includes('eventAccept') &&
          v.dialogue.topics.includes('eventDecline')
        ) &&
        integer(v.dialogue.rapport, DIALOGUE_RULES.maxRapport))) &&
    chat(v.chat) &&
    (v.auction === undefined ||
      (v.marketId === 'auction' &&
        record(v.auction) &&
        integer(v.auction.currentBid, RULES.maxMoney) &&
        integer(v.auction.competitorMax, RULES.maxMoney) &&
        v.auction.competitorMax >=
          Number(v.price) + auctionStep(Number(v.price)) &&
        v.auction.competitorMax <=
          (Number(v.price) * AUCTION_RULES.competitorMaxPercent) / 100 &&
        integer(v.auction.step, RULES.maxMoney) &&
        v.auction.step === auctionStep(Number(v.price)) &&
        (v.auction.competitorMax - Number(v.price)) % v.auction.step === 0 &&
        (v.auction.currentBid === 0 ||
          (v.auction.currentBid - Number(v.price)) % v.auction.step === 0) &&
        integer(v.auction.rounds, 6) &&
        ['open', 'outbid', 'won', 'withdrawn'].includes(
          String(v.auction.status),
        ) &&
        Array.isArray(v.auction.history) &&
        chat(v.auction.history) &&
        (v.auction.status !== 'open' ||
          (v.auction.currentBid === 0 && v.auction.rounds === 0)) &&
        (!['outbid', 'won'].includes(String(v.auction.status)) ||
          (Number(v.auction.currentBid) >= Number(v.price) &&
            Number(v.auction.rounds) > 0)) &&
        (v.auction.status !== 'outbid' ||
          (Number(v.auction.rounds) < 6 &&
            Number(v.auction.currentBid) <= Number(v.auction.competitorMax))) &&
        (v.auction.status !== 'won' ||
          Number(v.auction.currentBid) >= Number(v.auction.competitorMax)))) &&
    (v.marketId !== 'auction' || v.auction !== undefined) &&
    (v.marketId === undefined || isMarketId(v.marketId)) &&
    listing(v.listing, v.kind) &&
    (v.purchaseBargain === undefined ||
      (record(v.purchaseBargain) &&
        integer(v.purchaseBargain.rounds, 6) &&
        integer(v.purchaseBargain.floor, RULES.maxMoney) &&
        v.purchaseBargain.floor > 0 &&
        v.purchaseBargain.floor <= Number(v.price) &&
        integer(v.purchaseBargain.patience, 6) &&
        v.purchaseBargain.patience >= 2 &&
        v.purchaseBargain.rounds <= v.purchaseBargain.patience &&
        typeof v.purchaseBargain.walked === 'boolean' &&
        (v.purchaseBargain.previousOffer === undefined ||
          (integer(v.purchaseBargain.previousOffer, RULES.maxMoney) &&
            v.purchaseBargain.previousOffer > 0 &&
            v.purchaseBargain.previousOffer <= Number(v.price))))) &&
    (v.chatSettled === undefined || typeof v.chatSettled === 'boolean') &&
    kind(v.kind) &&
    (v.marketId === undefined ||
      !!marketDefinition(
        v.marketId as Item['marketId'] & string,
      )?.products.some((p) => p.kind === v.kind)) &&
    ['양호', '사용감', '고장'].includes(String(v.condition)) &&
    ['base', 'value', 'price', 'expires'].every((k) =>
      integer(v[k], RULES.maxMoney),
    ) &&
    ['checked', 'repaired'].every((k) => typeof v[k] === 'boolean') &&
    Array.isArray(v.offers) &&
    v.offers.length <= 3 &&
    v.offers.every((p) => integer(p, RULES.maxMoney)) &&
    ['none', 'accepted', 'rejected'].includes(String(v.negotiation)) &&
    (v.negotiatedPrice === null || integer(v.negotiatedPrice, RULES.maxMoney))
  );
}
/** Validate imported and persisted snapshots before they can reach the engine/UI. */
export function isGame(v: unknown): v is Game {
  if (
    !record(v) ||
    v.version !== 2 ||
    (v.timeMode !== undefined &&
      !['daily-actions', 'weekly-actions'].includes(String(v.timeMode))) ||
    !['playing', 'bankrupt', 'dead', 'cleared'].includes(String(v.status))
  )
    return false;
  if (
    !['cash', 'principal', 'interest'].every((k) =>
      integer(v[k], RULES.maxMoney),
    )
  )
    return false;
  if (
    !['seed', 'serial', 'minute', 'marketDay', 'eventStage', 'lastEvent'].every(
      (k) => integer(v[k]),
    )
  )
    return false;
  if (v.timeMode !== undefined && Number(v.minute) % 480 !== 0) return false;
  if (
    v.timeMode === 'weekly-actions' &&
    (!integer(v.weekActions, v.weeklyRulesVersion === 2 ? 20 : 30) ||
      typeof v.settling !== 'boolean' ||
      !integer(v.interestWeek))
  )
    return false;
  if (v.weeklyRulesVersion !== undefined && v.weeklyRulesVersion !== 2)
    return false;
  if (
    v.principalRepaidThisWeek !== undefined &&
    !integer(v.principalRepaidThisWeek, RULES.maxMoney)
  )
    return false;
  if (
    v.weeklyRulesVersion === 2 &&
    !integer(v.principalRepaidThisWeek, RULES.maxMoney)
  )
    return false;
  if (
    v.businesses !== undefined &&
    (!Array.isArray(v.businesses) ||
      v.businesses.length > BUSINESSES.length * BUSINESS_LIMIT_PER_TYPE ||
      !v.businesses.every(
        (b) =>
          record(b) &&
          typeof b.id === 'string' &&
          !!businessDefinition(b.id) &&
          integer(b.purchasedWeek) &&
          b.purchasedWeek >= 1 &&
          b.purchasedWeek <= Number(v.interestWeek ?? 0) + 1,
      ) ||
      BUSINESSES.some(
        (business) =>
          (v.businesses as { id: string }[]).filter((b) => b.id === business.id)
            .length > BUSINESS_LIMIT_PER_TYPE,
      ))
  )
    return false;
  if (
    v.businessIncomeWeek !== undefined &&
    !integer(v.businessIncomeWeek, Number(v.interestWeek ?? 0) + 1)
  )
    return false;
  if (
    v.businessIncomeAmount !== undefined &&
    !integer(v.businessIncomeAmount, RULES.maxMoney)
  )
    return false;
  if (
    Array.isArray(v.businesses) &&
    v.businesses.length &&
    (v.businessIncomeWeek === undefined || v.businessIncomeAmount === undefined)
  )
    return false;
  if (
    Array.isArray(v.businesses) &&
    v.businesses.length &&
    v.settling === true &&
    v.businessIncomeWeek !== Number(v.interestWeek ?? 0) + 1
  )
    return false;
  if (!integer(v.marketFactor, 200) || !kind(v.trend)) return false;
  if (
    !record(v.stats) ||
    ![
      'sales',
      'purchases',
      'checks',
      'repairs',
      'earned',
      'repaid',
      'peakCash',
    ].every((k) => integer((v.stats as Record<string, unknown>)[k]))
  )
    return false;
  if (
    !Array.isArray(v.inventory) ||
    v.inventory.length > RULES.capacity ||
    !v.inventory.every(item)
  )
    return false;
  if (
    !Array.isArray(v.board) ||
    v.board.length > LEGACY_BOARD_LIMIT ||
    !v.board.every(item)
  )
    return false;
  if (
    v.discoveredItems !== undefined &&
    (!Array.isArray(v.discoveredItems) ||
      v.discoveredItems.length > ITEM_CODEX.length ||
      !v.discoveredItems.every(isCodexKey) ||
      new Set(v.discoveredItems).size !== v.discoveredItems.length)
  )
    return false;
  const ids = new Set(v.inventory.map((i) => i.id));
  if (
    ids.size !== v.inventory.length ||
    new Set(v.board.map((i) => i.id)).size !== v.board.length ||
    v.board.some((i) => ids.has(i.id))
  )
    return false;
  if (
    !Array.isArray(v.sales) ||
    v.sales.length > 8 ||
    !v.sales.every(
      (s) =>
        record(s) &&
        text(s.id) &&
        (s.marketId === undefined || isMarketId(s.marketId)) &&
        text(s.itemId) &&
        ids.has(s.itemId) &&
        integer(s.price, RULES.maxMoney) &&
        s.price > 0 &&
        ['created', 'expires', 'nextCheck'].every((k) => integer(s[k])),
    )
  )
    return false;
  if (
    new Set(v.sales.map((s) => s.id)).size !== v.sales.length ||
    new Set(v.sales.map((s) => s.itemId)).size !== v.sales.length
  )
    return false;
  const sales = new Set(v.sales.map((s) => s.id));
  if (
    !Array.isArray(v.inquiries) ||
    v.inquiries.length > 20 ||
    !v.inquiries.every(
      (q) =>
        record(q) &&
        text(q.id) &&
        text(q.saleId) &&
        sales.has(q.saleId) &&
        text(q.name) &&
        (q.traderId === undefined || isTraderId(q.traderId)) &&
        chat(q.chat) &&
        integer(q.price, RULES.maxMoney) &&
        integer(q.max, RULES.maxMoney) &&
        integer(q.rounds, 2),
    )
  )
    return false;
  if (new Set(v.inquiries.map((q) => q.id)).size !== v.inquiries.length)
    return false;
  if (
    !Array.isArray(v.logs) ||
    v.logs.length > 80 ||
    !v.logs.every(
      (l) =>
        record(l) &&
        integer(l.id) &&
        integer(l.minute) &&
        (l.week === undefined || (integer(l.week) && Number(l.week) > 0)) &&
        text(l.text) &&
        (l.category === undefined ||
          ['start', 'market', 'special', 'activity'].includes(
            String(l.category),
          )),
    )
  )
    return false;
  if (
    v.quotes !== null &&
    (!record(v.quotes) ||
      !text(v.quotes.outlet) ||
      !integer(v.quotes.at) ||
      !record(v.quotes.prices) ||
      !Object.values(v.quotes.prices).every((p) => integer(p, RULES.maxMoney)))
  )
    return false;
  if (
    v.event !== null &&
    (!record(v.event) ||
      !text(v.event.id) ||
      !text(v.event.title) ||
      !text(v.event.text) ||
      !['deal', 'repair'].includes(String(v.event.type)) ||
      !integer(v.event.expires))
  )
    return false;
  if (
    v.interestWeek !== undefined &&
    !integer(
      v.interestWeek,
      Math.floor(
        Number(v.minute) /
          (v.timeMode === 'weekly-actions'
            ? v.weeklyRulesVersion === 2
              ? 9600
              : 14400
            : 10080),
      ),
    )
  )
    return false;
  if (v.status === 'cleared' && Number(v.principal) + Number(v.interest) !== 0)
    return false;
  if (
    v.moneyUnit !== undefined &&
    (v.moneyUnit !== 100 || !allMoneyAligned(v as unknown as Game))
  )
    return false;
  return true;
}
