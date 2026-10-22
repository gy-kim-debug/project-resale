import type { Command, Game, Item, Result, Kind } from './game';
import { dayOf, isMoney, won, ACTION_TICK } from './game';
import { toDailyActions } from './time';
import { interestPending, interestAmount, paymentWeek } from './debt';
import {
  CATALOG,
  JOBS,
  OUTLETS,
  RULES,
  TIERS,
  TIER_TITLES,
} from '../content/rules';

function roll(g: Game) {
  g.seed = (Math.imul(1664525, g.seed) + 1013904223) >>> 0;
  return g.seed / 4294967296;
}
function id(g: Game) {
  return `i${++g.serial}`;
}
export function level(g: Game, stat: 'sales' | 'checks' | 'repairs') {
  return Math.min(10, Math.floor(g.stats[stat] / (stat === 'sales' ? 5 : 4)));
}
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
  return Math.max(
    1,
    Math.floor(
      (item.value * (g.marketFactor + (item.kind === g.trend ? 20 : 0))) / 100,
    ),
  );
}
export function checkCost(g: Game, item: Item) {
  return Math.max(
    50,
    Math.floor(((item.base / 100) * (100 - level(g, 'checks') * 5)) / 100),
  );
}
export function repairCost(item: Item) {
  return Math.max(300, Math.floor((item.base * 12) / 100));
}
export function log(g: Game, text: string) {
  g.logs.unshift({ id: ++g.serial, minute: g.minute, text });
  g.logs = g.logs.slice(0, 80);
}
function money(g: Game, amount: number) {
  if (
    !Number.isSafeInteger(g.cash + amount) ||
    g.cash + amount < 0 ||
    g.cash + amount > RULES.maxMoney
  )
    throw Error('금액 범위를 벗어났습니다.');
  g.cash += amount;
  g.stats.peakCash = Math.max(g.stats.peakCash, g.cash);
  if (amount > 0) g.stats.earned += amount;
}
function makeItem(g: Game, base: number, free = false): Item {
  const templateIndex = Math.floor(roll(g) * CATALOG.length);
  const template = CATALOG[templateIndex];
  const tierIndex = TIERS.reduce(
    (best, t, i) => (base >= t.base ? i : best),
    0,
  );
  const quality = roll(g);
  const rarity = roll(g);
  const condition =
    quality < 0.18 ? '고장' : quality < 0.55 ? '사용감' : '양호';
  const multiplier =
    rarity < 0.1 ? 0.08 : rarity > 0.97 ? 4 : rarity > 0.86 ? 1.5 : 1;
  const actualBase = Math.max(100, Math.floor(base * multiplier));
  const price = free
    ? 0
    : Math.max(100, Math.floor((base * (0.42 + roll(g) * 0.48)) / 100) * 100);
  return {
    id: id(g),
    title: TIER_TITLES[tierIndex][templateIndex],
    kind: template.kind,
    base: actualBase,
    value: Math.floor(
      actualBase *
        (condition === '고장' ? 0.18 : condition === '사용감' ? 0.75 : 1),
    ),
    condition,
    defect:
      multiplier < 0.1
        ? '가품 또는 비정상 부품이 확인됐습니다.'
        : condition === '고장'
          ? '작동 불량·부품 손상이 있습니다.'
          : condition === '사용감'
            ? '마모와 작은 흠집이 있습니다.'
            : multiplier > 1
              ? '희귀한 구성·보존 가치가 확인됐습니다.'
              : '특별한 결함은 발견되지 않았습니다.',
    checked: false,
    repaired: false,
    price,
    seller: ['이웃', '정리중', '오래된상자', '급처해요'][
      Math.floor(roll(g) * 4)
    ],
    description: template.description,
    expires: g.minute + 1440,
    offers: [Math.floor(price * 0.7), Math.floor(price * 0.85)],
    negotiation: 'none',
    negotiatedPrice: null,
  };
}
function board(g: Game) {
  const current = tier(g);
  const liquid = TIERS.reduce(
    (best, t, i) => (g.cash >= t.threshold ? i : best),
    0,
  );
  const list: Item[] = [];
  for (let i = 0; i < 8; i++)
    list.push(
      makeItem(
        g,
        TIERS[
          i === 0
            ? 0
            : i === 1
              ? Math.max(0, liquid - 1)
              : i > 5
                ? current
                : liquid
        ].base,
      ),
    );
  // Appearance is independent of cash; it can legitimately be absent.
  if (roll(g) < 0.5)
    list.push(makeItem(g, 1000 + Math.floor(roll(g) * 4000), true));
  g.board = list;
}
function daily(g: Game) {
  if (g.marketDay !== dayOf(g)) {
    g.marketDay = dayOf(g);
    g.marketFactor = 85 + Math.floor(roll(g) * 31);
    g.trend = ['생활', '디지털', '가구', '수집품'][
      Math.floor(roll(g) * 4)
    ] as Kind;
    log(g, `시장 변화: 오늘은 ${g.trend} 수요가 높습니다.`);
  }
}
function endDay(g: Game, before: number) {
  g.minute = (Math.floor(before / 1440) + 1) * 1440;
  daily(g);
  log(g, '오늘의 행동을 모두 마쳤습니다.');
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
      const max = Math.max(1, Math.floor(value * (0.9 + roll(g) * 0.3)));
      const full = sale.price <= max && roll(g) < 0.5;
      const price = full
        ? sale.price
        : Math.min(
            sale.price,
            Math.max(
              1,
              Math.floor(Math.min(max, sale.price) * (0.75 + roll(g) * 0.2)),
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
      text: '작은 거래들을 지켜봤다며 정비 교육을 제안합니다. 5,000원 · 행동 1회.',
      expires: g.minute + 2880,
    };
    g.lastEvent = g.minute;
    log(g, '수리 전문가에게 특별 제안이 왔습니다.');
  } else if (g.eventStage === 2) {
    if (g.minute - g.lastEvent < 1440) return;
    g.eventStage = 3;
    money(g, 10_000);
    log(g, '수리 전문가가 소개한 단골의 감사금 10,000원을 받았습니다.');
    g.lastEvent = g.minute;
  } else if (roll(g) < 0.15) {
    g.event = {
      id: id(g),
      type: 'deal',
      title: '이사 정리 일손 제안',
      text: '급히 일손을 구하는 이웃입니다. 보상 15,000원 · 행동 1회.',
      expires: g.minute + 1440,
    };
    g.lastEvent = g.minute;
    log(g, '이웃에게 시간 제한이 있는 제안이 왔습니다.');
  }
}
/** Each major action spends one of three daily actions. No offline progression. */
function advance(g: Game, actions: number, generate = true) {
  const before = g.minute;
  g.minute += actions * ACTION_TICK;
  if (dayOf(g) > Math.floor(before / 1440) + 1) endDay(g, before);
  else daily(g);
  expire(g);
  settleWeekly(g);
  if (interestPending(g) || g.status !== 'playing') return;
  if (generate) inquiries(g);
  event(g);
}
function settleWeekly(g: Game) {
  if (
    g.status === 'playing' &&
    interestPending(g) &&
    g.cash < interestAmount(g)
  ) {
    g.status = 'bankrupt';
    g.inquiries = [];
    log(
      g,
      `${paymentWeek(g)}주차 이자 ${won(interestAmount(g))} 미납. 게임 종료.`,
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
    timeMode: 'daily-actions',
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
  const g = structuredClone(toDailyActions(original));
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
    let message = '';
    switch (command.type) {
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
          roll(g) < 0.97 ? 200 + Math.floor(roll(g) * 1800) : 8000,
          true,
        );
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
      case 'refresh':
        advance(g, 1);
        board(g);
        message = '새 매물을 찾았습니다.';
        log(g, message);
        break;
      case 'wait':
        advance(g, 1);
        message = '기다리기를 마쳤습니다.';
        log(g, message);
        break;
      case 'offer': {
        const i = preItem(g, command.id);
        if (
          i.price === 0 ||
          i.negotiation !== 'none' ||
          !i.offers.includes(command.price)
        )
          throw Error('선택할 수 없는 구매 제안입니다.');
        const accepted =
          roll(g) < (command.price >= i.price * 0.85 ? 0.8 : 0.4);
        i.negotiation = accepted ? 'accepted' : 'rejected';
        i.negotiatedPrice = accepted ? command.price : null;
        message = accepted
          ? `판매자가 ${won(command.price)} 제안에 동의했습니다.`
          : '판매자가 네고를 거절했습니다.';
        log(g, message);
        i.chat = [
          { speaker: 'other', text: `판매 가격은 ${won(i.price)}입니다.` },
          {
            speaker: 'player',
            text: `${won(command.price)}에 거래할 수 있을까요?`,
          },
          {
            speaker: 'other',
            text: accepted
              ? `좋아요. ${won(command.price)}에 거래해요.`
              : `그 가격은 어렵습니다. ${won(i.price)}에 판매합니다.`,
          },
        ];
        i.chatSettled = false;
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
        room(g);
        const cost = item.negotiatedPrice ?? item.price;
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
        message = `가치 확인: ${i.title}, 실제 가치 ${won(i.value)}. ${i.defect}`;
        log(g, message);
        advance(g, 1);
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
        advance(g, 1);
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
        owned(g, command.id);
        unlisted(g, command.id);
        if (
          !isMoney(command.price) ||
          command.price < 1 ||
          command.price > RULES.maxMoney
        )
          throw Error(
            '판매 가격은 1원 이상 1,000조 원 이하의 정수여야 합니다.',
          );
        if (g.sales.length >= listingLimit(g))
          throw Error('동시 판매 등록 한도에 도달했습니다.');
        const sale = {
          id: id(g),
          itemId: command.id,
          price: command.price,
          created: g.minute + ACTION_TICK,
          expires: g.minute + ACTION_TICK + 2880,
          nextCheck: g.minute + ACTION_TICK * 2,
        };
        g.sales.push(sale);
        message = `판매 글 등록: ${won(command.price)}.`;
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
      case 'counter': {
        const q = g.inquiries.find((q) => q.id === command.id);
        if (!q) throw Error('종료된 문의입니다.');
        const sale = g.sales.find((s) => s.id === q.saleId);
        if (!sale) throw Error('판매 글이 없습니다.');
        if (
          !isMoney(command.price) ||
          command.price <= q.price ||
          command.price > sale.price
        )
          throw Error(
            '구매자 제안보다 높고 등록 가격 이하인 정수 금액을 입력하세요.',
          );
        if (q.rounds >= 2) throw Error('더 이상 가격을 제안할 수 없습니다.');
        q.chat ??= [
          { speaker: 'other', text: `${won(q.price)}에 거래할 수 있을까요?` },
        ];
        q.chat.push({
          speaker: 'player',
          text: `${won(command.price)}에 판매하고 싶습니다.`,
        });
        q.rounds++;
        if (command.price <= q.max) {
          q.price = command.price;
          q.chat.push({
            speaker: 'other',
            text: `좋아요. ${won(q.price)}에 거래해요.`,
          });
          message = `구매자가 ${won(q.price)} 제안을 수락했습니다.`;
        } else if (q.price >= q.max || roll(g) < 0.3) {
          endInquiry(g, q.id);
          message = '구매자가 거래를 파토냈습니다. 판매 글은 유지됩니다.';
        } else {
          q.price = Math.min(
            q.max,
            Math.max(q.price + 1, Math.floor((q.price + q.max) / 2)),
          );
          q.chat.push({
            speaker: 'other',
            text: `그 가격은 어렵습니다. ${won(q.price)}은 어떠세요?`,
          });
          message = `구매자가 ${won(q.price)}으로 다시 제안했습니다.`;
        }
        log(g, message);
        break;
      }
      case 'reject': {
        const q = g.inquiries.find((q) => q.id === command.id);
        if (!q) throw Error('종료된 문의입니다.');
        q.chat ??= [
          { speaker: 'other', text: `${won(q.price)}에 거래할 수 있을까요?` },
        ];
        q.chat.push({ speaker: 'player', text: '그 가격에는 어렵습니다.' });
        if (q.rounds >= 2 || q.price >= q.max || roll(g) < 0.3) {
          endInquiry(g, q.id);
          message = '구매자가 거래를 파토냈습니다. 판매 글은 유지됩니다.';
        } else {
          q.rounds++;
          q.price = Math.min(
            q.max,
            Math.max(q.price + 1, Math.floor(q.price * 1.12)),
          );
          q.chat.push({
            speaker: 'other',
            text: `그러면 ${won(q.price)}은 어떠세요?`,
          });
          message = `구매자가 ${won(q.price)}으로 다시 제안했습니다.`;
        }
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
        const outlet = OUTLETS.find((o) => o.id === command.id);
        if (!outlet) throw Error('없는 매각처입니다.');
        const prices: Record<string, number> = {};
        for (const i of g.inventory)
          if (outlet.kinds.includes(i.kind))
            prices[i.id] = Math.max(
              1,
              Math.floor((marketValue(g, i) * outlet.percent) / 100),
            );
        g.quotes = { outlet: outlet.id, at: g.minute, prices };
        message = `${outlet.title} 방문.`;
        break;
      }
      case 'outletSell': {
        const i = owned(g, command.id);
        unlisted(g, i.id);
        const quote = g.quotes;
        if (
          !quote ||
          g.minute - quote.at >= ACTION_TICK * 2 ||
          !quote.prices[i.id]
        )
          throw Error('유효한 매각 견적이 없습니다.');
        const price = quote.prices[i.id];
        money(g, price);
        g.inventory = g.inventory.filter((i) => i.id !== command.id);
        delete quote.prices[i.id];
        g.stats.sales++;
        message = `${i.title}을 제시 가격 ${won(price)}에 매각했습니다.`;
        log(g, message);
        advance(g, 1);
        break;
      }
      case 'repay': {
        const amount = command.amount;
        if (!isMoney(amount) || amount < 1 || amount > g.principal)
          throw Error('남은 원금 이내의 정수 금액을 입력하세요.');
        affordable(g, amount);
        const due = interestPending(g);
        money(g, -amount);
        g.principal -= amount;
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
      case 'payInterest': {
        const due = interestPending(g);
        if (!due && g.interest === 0) throw Error('납부할 이자가 없습니다.');
        const amount = due ? interestAmount(g) : g.interest;
        affordable(g, amount);
        money(g, -amount);
        g.interest = 0;
        if (due) g.interestWeek = paymentWeek(g);
        g.stats.repaid += amount;
        message = `이자 ${won(amount)} 납부했습니다.`;
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
          message = '이사 정리를 도와 15,000원을 받았습니다.';
        }
        g.event = null;
        log(g, message);
        advance(g, 1);
        break;
      }
      default:
        throw Error('지원하지 않는 행동입니다.');
    }
    const missed = settleWeekly(g);
    if (missed) message = '주간 이자를 납부하지 못해 게임이 종료되었습니다.';
    return { game: g, ok: true, message };
  } catch (e) {
    return {
      game: original,
      ok: false,
      message: e instanceof Error ? e.message : '행동을 실행할 수 없습니다.',
    };
  }
}
