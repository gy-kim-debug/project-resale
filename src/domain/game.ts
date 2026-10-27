import type { SpecialListingId } from '../content/specialListings';
import type { BusinessId } from '../content/businesses';
import { roundMoney } from './money';
/** Serializable game types. KRW uses safe integers; the legacy minute field stores discrete action ticks. */
export type Kind =
  | '생활'
  | '디지털'
  | '가구'
  | '수집품'
  | '악기'
  | '자동차'
  | '부동산'
  | '항공기';
export type MarketId =
  | 'street'
  | 'computers'
  | 'instruments'
  | 'cars'
  | 'property'
  | 'aircraft'
  | 'auction';
export type Condition = '양호' | '사용감' | '고장';
export type Status = 'playing' | 'bankrupt' | 'dead' | 'cleared';
export interface ChatMessage {
  speaker: 'player' | 'other';
  text: string;
}
export type ListingTag =
  | 'household'
  | 'digital'
  | 'furniture'
  | 'collectible'
  | 'instrument'
  | 'vehicle'
  | 'property'
  | 'aircraft'
  | 'limited'
  | 'discontinued'
  | 'vintage'
  | 'authentic'
  | 'replica'
  | 'urgent'
  | 'moving'
  | 'firm'
  | 'negotiable';
export type SellerTrait =
  'ordinary' | 'urgent' | 'moving' | 'firm' | 'negotiable';
export interface ListingInfo {
  tags: ListingTag[];
  facts: {
    authentic: boolean;
    limited: boolean;
    discontinued: boolean;
    vintage: boolean;
    seller: SellerTrait;
  };
}
export interface Auction {
  currentBid: number;
  competitorMax: number;
  step: number;
  rounds: number;
  status: 'open' | 'outbid' | 'won' | 'withdrawn';
  history: ChatMessage[];
}
export interface Item {
  special?: SpecialListingId;
  auction?: Auction;
  marketId?: MarketId;
  listing?: ListingInfo;
  purchaseBargain?: {
    previousOffer?: number;
    rounds: number;
    floor: number;
    patience: number;
    walked: boolean;
  };
  acquiredFor?: number;
  chat?: ChatMessage[];
  chatSettled?: boolean;
  id: string;
  title: string;
  kind: Kind;
  base: number;
  value: number;
  condition: Condition;
  defect: string;
  checked: boolean;
  repaired: boolean;
  price: number;
  seller: string;
  description: string;
  expires: number;
  offers: number[];
  negotiation: 'none' | 'accepted' | 'rejected';
  negotiatedPrice: number | null;
}
export interface Sale {
  marketId?: MarketId;
  id: string;
  itemId: string;
  price: number;
  created: number;
  expires: number;
  nextCheck: number;
}
export interface Inquiry {
  chat?: ChatMessage[];
  id: string;
  saleId: string;
  name: string;
  price: number;
  max: number;
  rounds: number;
}
export interface Log {
  week?: number;
  id: number;
  minute: number;
  text: string;
}
export interface Event {
  id: string;
  type: 'deal' | 'repair';
  title: string;
  text: string;
  expires: number;
}
export interface Game {
  businesses?: { id: BusinessId; purchasedWeek: number }[];
  businessIncomeWeek?: number;
  businessIncomeAmount?: number;
  version: 2;
  moneyUnit?: 100;
  timeMode?: 'daily-actions' | 'weekly-actions';
  weekActions?: number;
  weeklyRulesVersion?: 2;
  principalRepaidThisWeek?: number;
  settling?: boolean;
  seed: number;
  serial: number;
  minute: number;
  status: Status;
  cash: number;
  principal: number;
  interest: number;
  interestWeek?: number;
  marketDay: number;
  marketFactor: number;
  trend: Kind;
  inventory: Item[];
  board: Item[];
  sales: Sale[];
  inquiries: Inquiry[];
  quotes: { outlet: string; at: number; prices: Record<string, number> } | null;
  stats: {
    sales: number;
    purchases: number;
    checks: number;
    repairs: number;
    earned: number;
    repaid: number;
    peakCash: number;
  };
  logs: Log[];
  event: Event | null;
  eventStage: number;
  lastEvent: number;
}
export type Command =
  | { type: 'job'; id: string }
  | { type: 'buyBusiness'; id: string }
  | { type: 'scavenge' }
  | { type: 'refresh'; marketId?: MarketId }
  | { type: 'wait' }
  | { type: 'offer'; id: string; price: number }
  | { type: 'buy'; id: string }
  | { type: 'bid'; id: string; amount: number }
  | { type: 'withdrawAuction'; id: string }
  | { type: 'closeChat'; id: string }
  | { type: 'check'; id: string }
  | { type: 'repair'; id: string }
  | { type: 'discard'; id: string }
  | { type: 'post'; id: string; price: number }
  | { type: 'cancel'; id: string }
  | { type: 'accept'; id: string }
  | { type: 'reject'; id: string }
  | { type: 'counter'; id: string; price: number }
  | { type: 'break'; id: string }
  | { type: 'visit'; id: string }
  | { type: 'outletSell'; id: string }
  | { type: 'repay'; amount: number }
  | { type: 'payInterest' }
  | { type: 'startSettlement' }
  | { type: 'event'; choice: 'yes' | 'no' };
export interface Result {
  game: Game;
  ok: boolean;
  message: string;
}
export const won = (n: number) => `${roundMoney(n).toLocaleString('ko-KR')} 원`;
export const dayOf = (g: Game) => Math.floor(g.minute / 1440) + 1;
export const ACTIONS_PER_DAY = 3;
export const ACTION_TICK = 480;
export const ACTIONS_PER_WEEK = 20;
export const weekOf = (g: Game) => (g.interestWeek ?? 0) + 1;
export const actionsLeft = (g: Game) => ACTIONS_PER_WEEK - (g.weekActions ?? 0);
export const dayStatus = (g: Game) =>
  `${weekOf(g)}주차 · 남은 행동 ${actionsLeft(g)}/${ACTIONS_PER_WEEK}`;
export const isMoney = (n: number) => Number.isSafeInteger(n) && n >= 0;

/** Deadlines are measured in remaining actions, never calendar days. */
export const durationText = (ticks: number) =>
  `행동 ${Math.ceil(Math.max(0, ticks) / ACTION_TICK)}회`;
