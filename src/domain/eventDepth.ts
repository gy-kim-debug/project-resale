import {
  selectedDelivery,
  physicalDelivery,
  type DeliveryMethod,
} from './delivery';
import {
  eventQuestionSpeech,
  eventDecisionSpeech,
  eventQuestionReply,
} from '../content/eventSpeech';
import { EVENT_KINDS, type EventKind, type StoryLine } from '../content/story';
import {
  EVENT_VARIANTS,
  EVENT_REASON_DETAILS,
  QUESTIONS_FOR,
  QUESTION_LABELS,
  type EventQuestion,
} from '../content/eventScenes';
import { traderById } from '../content/traders';
import { marketDefinition } from '../content/markets';
import { ACTION_TICK, won, type Game, type Item, type Kind } from './game';
import type { StoryScene } from './story';
export type SceneOutcome =
  | 'purchased'
  | 'sold'
  | 'cancelled'
  | 'declined'
  | 'reported'
  | 'promised'
  | 'discovered';
export interface StoryFollowup {
  id: string;
  kind: 'referral' | 'reunion' | 'returnBuyer';
  dueAt: number;
  expiresAt: number;
  name: string;
  itemKind: Kind;
  target?: string;
  price?: number;
  variant: 0 | 1 | 2;
}
export const isEventKind = (v: unknown): v is EventKind =>
  typeof v === 'string' && EVENT_KINDS.includes(v as EventKind);
export function sceneItem(g: Game, s: StoryScene): Item | undefined {
  const direct = [...g.board, ...g.inventory].find((i) => i.id === s.target);
  if (direct) return direct;
  const q = g.inquiries.find((q) => q.id === s.target);
  const sale = g.sales.find((x) => x.id === q?.saleId);
  return g.inventory.find((i) => i.id === sale?.itemId);
}
/** Public delivery context only; no hidden item data enters event dialogue. */
export function sceneDelivery(
  g: Game,
  s: StoryScene,
): DeliveryMethod | undefined {
  if (s.tradeMethod) return s.tradeMethod;
  const item = sceneItem(g, s);
  if (s.resume?.type === 'buy' && item) return selectedDelivery(item);
  const q = g.inquiries.find((q) => q.id === s.target);
  const sale = g.sales.find((sale) => sale.id === q?.saleId);
  const method =
    q?.delivery ??
    sale?.delivery ??
    (item ? physicalDelivery(item) : undefined);
  return method === 'both' ? undefined : method;
}
export function deepLines(g: Game): StoryLine[] | null {
  const s = g.story!.active!;
  if (s.variant === undefined || !isEventKind(s.kind)) return null;
  const kind = s.kind;
  const parcel = sceneDelivery(g, s) === 'parcel';
  const name = s.name ?? (kind === 'creditor' ? '채권 담당자' : '거래 상대');
  const me = g.player?.nickname ?? '주인공';
  const line = (
    speaker: string,
    text: string,
    motion: StoryLine['motion'] = 'meet',
  ): StoryLine => ({ speaker, text, motion });
  if (s.outcome) {
    const text: Record<SceneOutcome, string> = {
      purchased:
        s.decision === 'wait'
          ? '시간 내 주셔서 감사합니다. 다음에 필요한 물건이 있으면 서로 연락하죠.'
          : '물건과 대금을 확인했습니다. 거래 감사합니다.',
      sold:
        kind === 'rehaggle' && s.decision === 'continue'
          ? '알겠습니다. 처음 합의한 금액으로 거래하죠. 물건 잘 쓰겠습니다.'
          : kind === 'inspection' && s.decision === 'wait'
            ? '기다려 주셔서 감사합니다. 확인했으니 약속한 금액으로 거래하겠습니다.'
            : kind === 'reunion'
              ? '다시 만나게 될 줄은 몰랐네요. 이번에는 오래 가지고 있겠습니다.'
              : '대금 보내 드렸습니다. 물건 잘 쓰겠습니다.',
      cancelled: '알겠습니다. 이번 거래는 여기까지 하죠.',
      declined: '조건이 맞지 않을 수도 있죠. 다음에 기회가 있으면 뵙겠습니다.',
      reported: '수상한 요구에 대한 신고를 남기고 대화를 끝냈다.',
      promised:
        kind === 'creditor'
          ? '네, 이번 납부는 처리됐습니다. 다음 정산 기한에 다시 연락하겠습니다.'
          : kind === 'reservation'
            ? '일정이 정해지면 다시 연락드릴게요. 그때 물건이 남아 있으면 이야기해요.'
            : '필요한 분이 있으면 소개해 드릴게요. 다음에 같은 종류를 구하시면 연락 주세요.',
      discovered:
        '알려 준 시장에서 새 매물을 확인했다. 좋은 거래인지는 직접 판단해야 한다.',
    };
    return [
      line(
        me,
        kind === 'creditor'
          ? '납부 내역 확인했습니다. 다음 정산 때 연락드릴게요.'
          : parcel && kind === 'scam' && s.decision === 'continue'
            ? '예약금은 보내지 않겠습니다. 원래 합의한 택배 조건으로만 거래할게요.'
            : eventDecisionSpeech(kind, s.decision),
        'look',
      ),
      line(
        s.outcome === 'reported' || s.outcome === 'discovered' ? '' : name,
        parcel && s.outcome === 'purchased'
          ? '결제 확인했습니다. 약속한 물건은 택배로 전달하겠습니다.'
          : text[s.outcome],
        'exchange',
      ),
    ];
  }
  const item = sceneItem(g, s);
  const title = item?.title ?? '물건';
  if (s.branch) {
    const answers: Record<EventQuestion, string> = {
      reason: EVENT_REASON_DETAILS[kind][s.variant],
      proof:
        g.inventory.some((i) => i.id === item?.id) && item?.checked
          ? '직접 확인한 물건 정보와 제 제안을 비교해 주세요. 제 사정이 시세를 바꾸는 건 아닙니다.'
          : kind === 'scam'
            ? '계좌 주인이 다른 이유와 거래 장소를 다시 묻자, 송금부터 하라는 말만 돌아왔다.'
            : '제가 가진 설명과 외관 정보는 말씀드릴 수 있어요. 내부 상태와 실제 가치는 구매한 뒤 확인하셔야 합니다.',
      terms: ['appointment', 'inspection'].includes(kind)
        ? '기다리는 시간까지 내 주실지, 지금 가능한 조건대로 끝낼지 정해 주세요. 기다려도 약속한 물건과 금액은 그대로입니다.'
        : kind === 'reservation'
          ? '다른 문의를 잠깐 미뤄 주시면 다시 연락할게요. 먼저 입금할 돈은 없지만, 그동안 판매 기회를 놓칠 수는 있습니다.'
          : kind === 'marketTip'
            ? `${marketDefinition(s.marketId ?? 'street').name} 쪽입니다. 직접 찾아보는 시간은 필요하고 좋은 물건이라는 보장은 없어요.`
            : s.price
              ? `제안한 금액은 ${won(s.price)}입니다. 대화하는 동안 조건을 몰래 바꾸지는 않겠습니다.`
              : '지금 이야기한 조건에서 결정하시면 됩니다. 부담되시면 거래하지 않으셔도 돼요.',
      past:
        kind === 'memory'
          ? '자주 쓰던 물건이라 함께한 기억이 많아요. 정리하기로 했지만 아쉬운 마음이 드네요.'
          : kind === 'reunion'
            ? '생활이 달라지면 자주 쓰던 물건도 한동안 손이 안 가더라고요. 막상 보내고 나니 생각이 났습니다.'
            : '이전 거래에서 약속을 지켜 주셨다는 이야기를 들었습니다. 이번에도 서로 조건을 확인하고 결정하면 좋겠어요.',
    };
    return [
      line(
        me,
        parcel && kind === 'rehaggle' && s.branch === 'reason'
          ? '합의한 금액을 다시 바꾸고 싶으신 이유가 있나요?'
          : parcel && kind === 'scam' && s.branch === 'terms'
            ? '예약금 없이 원래 택배 조건으로 거래할 수 있나요?'
            : eventQuestionSpeech(kind, s.branch),
        'look',
      ),
      line(
        name,
        s.branch === 'terms' && kind === 'bundle'
          ? `${title}과 ${g.board.find((i) => i.id === s.extra)?.title ?? '함께 제안한 물건'}, 두 개 합쳐 ${won(s.price!)}입니다. 원래 물건만 사셔도 됩니다.`
          : s.branch === 'terms' && kind === 'competitor'
            ? `${(s.targets ?? [s.target!]).map((id) => g.inventory.find((i) => i.id === id)?.title ?? '제안한 물건').join(', ')}을 합쳐 ${won(s.price!)}입니다. 목록 밖의 물건은 포함하지 않습니다.`
            : parcel && kind === 'scam' && s.branch === 'terms'
              ? '예약금 없이 원래 합의한 택배 거래로 진행해도 됩니다.'
              : kind === 'model' && item?.kind === '부동산'
                ? '주소와 면적 등 제가 가진 자료는 보여드릴 수 있습니다. 권리 관계나 설비 상태까지 보증하는 건 아닙니다.'
                : (eventQuestionReply(kind, s.branch, s.variant) ??
                  answers[s.branch]),
        'listen',
      ),
    ];
  }
  let [first, second] = EVENT_VARIANTS[kind][s.variant];
  if (kind === 'model' && item?.kind === '부동산') {
    first = '계약 전에 주소와 면적, 안내한 조건을 다시 확인하고 싶습니다.';
    second =
      '제가 가진 자료는 설명드릴 수 있어요. 권리 관계와 실제 상태는 별도로 확인하셔야 합니다.';
  }
  if (
    kind === 'memory' &&
    s.variant === 2 &&
    ['자동차', '부동산'].includes(item?.kind ?? '')
  ) {
    first =
      item?.kind === '자동차'
        ? '자주 타던 차인데 요즘은 주차장에만 세워 두었네요.'
        : '한동안 비워 둔 곳인데 다시 둘러보니 생각이 많아지네요.';
    second = '아쉽지만 이제 정리하려고 합니다. 좋은 분께 넘어갔으면 해요.';
  }
  if (kind === 'missing' && item?.caseId === 'unopened')
    first = '미개봉 본품과 별도로 드리려던 외부 구성품 하나가 보이지 않네요.';
  const format = (text: string) =>
    text.replaceAll(
      '{price}',
      s.price === undefined ? '약속한 금액' : won(s.price),
    );
  const lines = [
    line(
      '',
      `${title === '물건' ? '' : `${title}. `}${kind === 'creditor' ? '정산 뒤 연락이 왔다.' : s.resume?.type === 'accept' ? '구매자와 마지막 조건을 확인한다.' : s.resume ? '거래를 마무리하려는 순간, 상대가 말을 꺼낸다.' : '새 연락이 도착했다.'}`,
      'look',
    ),
    line(
      name,
      format(
        parcel && kind === 'rehaggle' && s.variant === 0
          ? '설치를 생각해 보니 제가 쓸 공간과 맞지 않을까 고민됩니다.'
          : first,
      ),
    ),
    line(
      kind === 'scam' ? '' : name,
      kind === 'model' && s.explained && item?.kind === '부동산'
        ? '주소와 면적 등 안내한 자료는 다시 말씀드릴 수 있습니다. 별도의 권리 확인을 대신하는 설명은 아닙니다.'
        : kind === 'model' && s.explained
          ? '품목명과 외관은 등록된 설명대로예요. 내부 상태와 실제 가치는 구매한 뒤 확인하셔야 합니다.'
          : format(
              parcel && kind === 'rehaggle' && s.variant === 1
                ? '마무리 직전에 죄송하지만 {price}에 맞춰 주실 수 있을까요?'
                : second,
            ),
      'listen',
    ),
  ];
  const style = traderById(s.traderId)?.style;
  if (style === 'firm')
    lines.push(line(name, '조건을 정하고 나면 오래 끌고 싶지는 않습니다.'));
  else if (style === 'quick')
    lines.push(line(name, '조건만 맞으면 깔끔하게 끝내죠.'));
  else if (style === 'patient')
    lines.push(line(name, '궁금한 점이 있으면 먼저 묻고 결정하셔도 됩니다.'));
  return lines;
}
export function depthChoices(
  g: Game,
): { id: string; label: string; actions?: number }[] | null {
  const s = g.story!.active!;
  if (s.variant === undefined || !isEventKind(s.kind)) return null;
  if (s.outcome) return [{ id: 'continue', label: '계속하기' }];
  const questions = QUESTIONS_FOR[s.kind]
    .filter((q) => !s.asked?.includes(q))
    .map((q) => ({ id: `ask:${q}`, label: QUESTION_LABELS[q] }));
  const buy = { id: 'continue', label: '약속대로 거래', actions: 1 };
  const cancel = { id: 'cancel', label: '거래 취소' };
  let choices: { id: string; label: string; actions?: number }[] | null = null;
  switch (s.kind) {
    case 'rush':
      choices = [
        { id: 'deal', label: `${won(s.price!)}에 바로 구매`, actions: 1 },
        buy,
        cancel,
      ];
      break;
    case 'appointment':
    case 'inspection':
      choices = [
        {
          id: 'wait',
          label:
            s.kind === 'appointment'
              ? '기다린 뒤 구매'
              : '추가 확인을 기다린 뒤 판매',
          actions: 2,
        },
        {
          ...buy,
          label:
            s.kind === 'appointment'
              ? '가까운 장소에서 바로 구매'
              : '지금 약속한 조건으로 판매',
        },
        cancel,
      ];
      break;
    case 'scam':
      choices = [
        {
          ...buy,
          label:
            sceneDelivery(g, s) === 'parcel'
              ? '예약금 없이 원래 조건으로 구매'
              : '선입금 없이 현장에서 거래',
        },
        { id: 'report', label: '신고하고 거래 종료' },
        cancel,
      ];
      break;
    case 'reservation':
      choices = [
        { id: 'hold', label: '물건이 남으면 재연락 받기' },
        { ...buy, label: '지금 거래하기' },
        cancel,
      ];
      break;
    case 'collector':
    case 'referral':
    case 'reunion':
    case 'returnBuyer':
      choices = [
        { id: 'deal', label: `${won(s.price!)}에 판매`, actions: 1 },
        { id: 'decline', label: '제안 거절' },
      ];
      break;
    case 'marketTip':
      choices = [
        {
          id: 'look',
          label: `${marketDefinition(s.marketId ?? 'street').name} 매물 찾아보기`,
          actions: 1,
        },
        { id: 'decline', label: '지금은 보러 가지 않기' },
      ];
      break;
  }
  return choices ? [...questions, ...choices] : questions;
}
/** Enrichment is optional for backwards-compatible, already-open legacy scenes. */
export function finishWithReaction(
  g: Game,
  s: StoryScene,
  outcome: SceneOutcome,
  decision: string,
): Game {
  if (s.variant === undefined || g.status !== 'playing') return g;
  g.story!.active = {
    kind: s.kind,
    step: 0,
    variant: s.variant,
    name: s.name,
    outcome,
    decision,
    ...(sceneDelivery(g, s) ? { tradeMethod: sceneDelivery(g, s) } : {}),
  };
  g.story!.lastAt = g.minute;
  return g;
}
export function queueFollowup(
  g: Game,
  kind: StoryFollowup['kind'],
  name: string,
  itemKind: Kind,
  target?: string,
  price?: number,
) {
  const state = g.story!;
  state.pending ??= [];
  const id = `${kind}:${target ?? itemKind}:${name}`;
  if (state.pending.some((p) => p.id === id)) return;
  state.pending.push({
    id,
    kind,
    name,
    itemKind,
    target,
    price,
    variant: ((state.history.length + g.serial) % 3) as 0 | 1 | 2,
    dueAt: g.minute + 3 * ACTION_TICK,
    expiresAt: g.minute + 10 * ACTION_TICK,
  });
  state.pending = state.pending.slice(-8);
}
export const PURCHASE_EVENTS: EventKind[] = [
  'missing',
  'model',
  'memory',
  'regular',
  'bundle',
  'rush',
  'appointment',
  'scam',
];
export const INQUIRY_EVENTS: EventKind[] = [
  'rehaggle',
  'inspection',
  'reservation',
];
export const PRIVATE_SALE_EVENTS: EventKind[] = [
  'competitor',
  'collector',
  'referral',
  'reunion',
  'returnBuyer',
];
