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
    v.length <= 16 &&
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
    ['id', 'title', 'seller', 'description', 'defect'].every((k) =>
      text(v[k]),
    ) &&
    (v.acquiredFor === undefined || integer(v.acquiredFor, RULES.maxMoney)) &&
    chat(v.chat) &&
    (v.marketId === undefined || isMarketId(v.marketId)) &&
    listing(v.listing, v.kind) &&
    (v.purchaseBargain === undefined ||
      (record(v.purchaseBargain) &&
        integer(v.purchaseBargain.rounds, 6) &&
        integer(v.purchaseBargain.floor, RULES.maxMoney) &&
        v.purchaseBargain.floor > 0 &&
        v.purchaseBargain.floor <= Number(v.price) &&
        integer(v.purchaseBargain.patience, 6) &&
        v.purchaseBargain.patience >= 4 &&
        v.purchaseBargain.rounds <= v.purchaseBargain.patience &&
        typeof v.purchaseBargain.walked === 'boolean')) &&
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
    (v.timeMode !== undefined && v.timeMode !== 'daily-actions') ||
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
  if (v.timeMode === 'daily-actions' && Number(v.minute) % 480 !== 0)
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
      (l) => record(l) && integer(l.id) && integer(l.minute) && text(l.text),
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
    !integer(v.interestWeek, Math.floor(Number(v.minute) / 10080))
  )
    return false;
  if (v.status === 'cleared' && Number(v.principal) + Number(v.interest) !== 0)
    return false;
  return true;
}
