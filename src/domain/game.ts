/** Serializable game types. KRW uses safe integers; elapsed time uses integer minutes. */
export type Kind = '생활' | '디지털' | '가구' | '수집품';
export type Condition = '양호' | '사용감' | '고장';
export type Status = 'playing' | 'dead' | 'cleared';
export interface ChatMessage {
  speaker: 'player' | 'other';
  text: string;
}
export interface Item {
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
  version: 2;
  seed: number;
  serial: number;
  minute: number;
  status: Status;
  cash: number;
  principal: number;
  interest: number;
  satiety: number;
  health: number;
  fatigue: number;
  hungerRemainder: number;
  fatigueRemainder: number;
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
  | { type: 'meal'; id: string }
  | { type: 'treat' }
  | { type: 'sleep' }
  | { type: 'scavenge' }
  | { type: 'refresh' }
  | { type: 'wait' }
  | { type: 'offer'; id: string; price: number }
  | { type: 'buy'; id: string }
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
  | { type: 'event'; choice: 'yes' | 'no' };
export interface Result {
  game: Game;
  ok: boolean;
  message: string;
}
export const won = (n: number) => `${n.toLocaleString('ko-KR')} 원`;
export const dayOf = (g: Game) => Math.floor(g.minute / 1440) + 1;
export const timeOf = (g: Game) =>
  `${String(Math.floor((g.minute % 1440) / 60)).padStart(2, '0')}:${String(g.minute % 60).padStart(2, '0')}`;
export const isMoney = (n: number) => Number.isSafeInteger(n) && n >= 0;

/** Remaining durations round up for compatible legacy saves. */
export const hoursText = (minutes: number) =>
  `${Math.ceil(Math.max(0, minutes) / 60)}시간`;
