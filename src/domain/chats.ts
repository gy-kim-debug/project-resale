import type {
  ChatMessage,
  Command,
  Game,
  Inquiry,
  Item,
  Kind,
  MarketId,
} from './game';
import { won, weekOf } from './game';
import { isHundredWon } from './money';
import { RULES } from '../content/rules';
import { KIND_TAGS } from '../content/listingTags';
import { isMarketId } from '../content/markets';
export const CHAT_LIMIT = 200;
export const CHAT_MESSAGE_LIMIT = 128;
export type ChatStatus = 'active' | 'completed' | 'cancelled' | 'expired';
export interface TradeThread {
  id: string;
  side: 'buy' | 'sell';
  itemId: string;
  inquiryId?: string;
  saleId?: string;
  title: string;
  kind: Kind;
  marketId?: MarketId;
  name: string;
  traderId?: string;
  price: number;
  messages: ChatMessage[];
  status: ChatStatus;
  unread: boolean;
  updated: number;
  week: number;
}
export const buyChatId = (itemId: string) => `buy:${itemId}`;
export const sellChatId = (inquiryId: string) => `sell:${inquiryId}`;
export const sellerChatClosed = (i: Item) =>
  !!i.chatClosed ||
  !!i.purchaseBargain?.walked ||
  i.chat?.at(-1)?.text === '이번 거래는 하지 않을게요.';
export const chatStatusText = (status: ChatStatus) =>
  ({
    active: '진행 중',
    completed: '거래 완료',
    cancelled: '거래 종료',
    expired: '기간 종료',
  })[status];
export const unreadChats = (g: Game) =>
  (g.chats ?? []).filter((t) => t.unread).length;
type ThreadData = Omit<TradeThread, 'updated' | 'unread' | 'week'>;
function put(g: Game, data: ThreadData) {
  const threads = (g.chats ??= []);
  const old = threads.find((t) => t.id === data.id);
  const messages = structuredClone(data.messages.slice(-CHAT_MESSAGE_LIMIT));
  const content = { ...data, messages };
  delete (content as Partial<TradeThread>).updated;
  delete (content as Partial<TradeThread>).unread;
  delete (content as Partial<TradeThread>).week;
  if (old) {
    const previous: Partial<TradeThread> = { ...old };
    delete previous.updated;
    delete previous.unread;
    delete previous.week;
    if (JSON.stringify(previous) === JSON.stringify(content)) return;
  }
  g.chatSerial =
    (g.chatSerial ?? Math.max(0, ...threads.map((t) => t.updated))) + 1;
  const thread: TradeThread = {
    ...content,
    updated: g.chatSerial,
    unread: true,
    week: weekOf(g),
  };
  if (old) threads[threads.indexOf(old)] = thread;
  else threads.push(thread);
}
function buyData(i: Item, status: ChatStatus): ThreadData | null {
  const messages =
    i.chat ??
    (i.auction?.history.some((m) => m.speaker === 'player')
      ? i.auction.history
      : undefined);
  if (!messages?.length) return null;
  return {
    id: buyChatId(i.id),
    side: 'buy',
    itemId: i.id,
    title: i.title,
    kind: i.kind,
    ...(i.marketId ? { marketId: i.marketId } : {}),
    name: i.seller,
    ...(i.traderId ? { traderId: i.traderId } : {}),
    price:
      i.acquiredFor ?? (i.auction?.currentBid || i.negotiatedPrice || i.price),
    messages,
    status,
  };
}
function saleData(
  g: Game,
  q: Inquiry,
  status: ChatStatus,
  messages?: ChatMessage[],
): ThreadData | null {
  const sale = g.sales.find((s) => s.id === q.saleId),
    item = g.inventory.find((i) => i.id === sale?.itemId);
  if (!sale || !item) return null;
  return {
    id: sellChatId(q.id),
    side: 'sell',
    itemId: item.id,
    inquiryId: q.id,
    saleId: sale.id,
    title: item.title,
    kind: item.kind,
    ...((sale.marketId ?? item.marketId)
      ? { marketId: sale.marketId ?? item.marketId }
      : {}),
    name: q.name,
    ...(q.traderId ? { traderId: q.traderId } : {}),
    price: q.price,
    messages: messages ??
      q.chat ?? [
        { speaker: 'other', text: `${won(q.price)}에 거래할 수 있을까요?` },
      ],
    status,
  };
}
export function archiveInquiry(
  g: Game,
  q: Inquiry,
  status: ChatStatus,
  messages: ChatMessage[],
) {
  const data = saleData(g, q, status, messages);
  if (data) put(g, data);
}
/** Snapshot only public conversations; no hidden item values or bargaining limits enter the archive. */
export function syncTradeChats(g: Game, before?: Game, command?: Command) {
  const oldItems = new Map(
    (before ? [...before.board, ...before.inventory] : []).map((i) => [
      i.id,
      i,
    ]),
  );
  const items = new Map([
    ...oldItems,
    ...g.board.map((i) => [i.id, i] as const),
    ...g.inventory.map((i) => [i.id, i] as const),
  ]);
  for (const item of items.values()) {
    const existing = g.chats?.find((t) => t.id === buyChatId(item.id));
    const owned = g.inventory.some((i) => i.id === item.id),
      live = g.board.find((i) => i.id === item.id);
    let status: ChatStatus = owned
      ? 'completed'
      : live && live.expires > g.minute
        ? sellerChatClosed(live) || live.auction?.status === 'withdrawn'
          ? 'cancelled'
          : 'active'
        : existing?.status === 'completed'
          ? 'completed'
          : 'expired';
    if (existing && existing.status !== 'active' && !owned && !live)
      status = existing.status;
    const data = buyData(item, status);
    if (data) put(g, data);
  }
  for (const q of g.inquiries) {
    const data = saleData(g, q, 'active');
    if (data) put(g, data);
  }
  for (const q of before?.inquiries ?? []) {
    if (
      g.inquiries.some((i) => i.id === q.id) ||
      g.chats?.some((t) => t.id === sellChatId(q.id) && t.status !== 'active')
    )
      continue;
    const sold = command?.type === 'accept' && command.id === q.id;
    const data = saleData(
      before!,
      q,
      sold
        ? 'completed'
        : g.sales.some((s) => s.id === q.saleId)
          ? 'cancelled'
          : 'expired',
    );
    if (data) put(g, data);
  }
  for (const t of g.chats ?? []) {
    if (t.status !== 'active') continue;
    if (
      t.side === 'buy' &&
      !g.board.some((i) => i.id === t.itemId && i.expires > g.minute)
    )
      put(g, {
        ...t,
        status: g.inventory.some((i) => i.id === t.itemId)
          ? 'completed'
          : 'expired',
      });
    if (t.side === 'sell' && !g.inquiries.some((q) => q.id === t.inquiryId))
      put(g, { ...t, status: 'expired' });
  }
  if (g.chats && g.chats.length > CHAT_LIMIT) {
    const keep = [...g.chats]
      .sort(
        (a, b) =>
          Number(b.status === 'active') - Number(a.status === 'active') ||
          b.updated - a.updated,
      )
      .slice(0, CHAT_LIMIT);
    g.chats = keep;
  }
}
const record = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const text = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= 2000;
export function validChatArchive(chats: unknown, serial: unknown): boolean {
  if (chats === undefined) return serial === undefined;
  if (
    !Array.isArray(chats) ||
    chats.length > CHAT_LIMIT ||
    !Number.isSafeInteger(serial) ||
    Number(serial) < 0 ||
    new Set(chats.filter(record).map((t) => t.id)).size !== chats.length
  )
    return false;
  return chats.every(
    (t) =>
      record(t) &&
      ['buy', 'sell'].includes(String(t.side)) &&
      text(t.id) &&
      text(t.itemId) &&
      t.id ===
        (t.side === 'buy'
          ? buyChatId(t.itemId)
          : sellChatId(String(t.inquiryId))) &&
      text(t.title) &&
      Object.hasOwn(KIND_TAGS, String(t.kind)) &&
      (t.marketId === undefined || isMarketId(t.marketId)) &&
      text(t.name) &&
      (t.traderId === undefined || text(t.traderId)) &&
      (t.side === 'buy'
        ? t.inquiryId === undefined && t.saleId === undefined
        : text(t.inquiryId) && text(t.saleId)) &&
      typeof t.price === 'number' &&
      isHundredWon(t.price) &&
      t.price <= RULES.maxMoney &&
      ['active', 'completed', 'cancelled', 'expired'].includes(
        String(t.status),
      ) &&
      typeof t.unread === 'boolean' &&
      Number.isSafeInteger(t.updated) &&
      Number(t.updated) > 0 &&
      Number(t.updated) <= Number(serial) &&
      Number.isSafeInteger(t.week) &&
      Number(t.week) >= 1 &&
      Array.isArray(t.messages) &&
      t.messages.length > 0 &&
      t.messages.length <= CHAT_MESSAGE_LIMIT &&
      t.messages.every(
        (m) =>
          record(m) &&
          ['player', 'other'].includes(String(m.speaker)) &&
          text(m.text),
      ),
  );
}
