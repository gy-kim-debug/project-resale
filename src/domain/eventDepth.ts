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
export function deepLines(g: Game): StoryLine[] | null {
  const s = g.story!.active!;
  if (s.variant === undefined || !isEventKind(s.kind)) return null;
  const kind = s.kind;
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
        kind === 'reunion'
          ? '다시 만나게 될 줄은 몰랐네요. 이번에는 오래 가지고 있겠습니다.'
          : '대금 보내 드렸습니다. 물건 잘 쓰겠습니다.',
      cancelled: '알겠습니다. 이번 거래는 여기까지 하죠.',
      declined: '조건이 맞지 않을 수도 있죠. 다음에 기회가 있으면 뵙겠습니다.',
      reported:
        '대화를 정리하고 신고 내용을 남겼다. 돈을 먼저 보내지는 않았다.',
      promised:
        kind === 'reservation'
          ? '잠깐만 기다려 주세요. 일정이 되면 다시 연락드리겠습니다.'
          : '소개받은 분께 연락해 두겠습니다. 물건이 남아 있으면 다시 이야기해요.',
      discovered:
        '알려 준 시장에서 새 매물을 확인했다. 좋은 거래인지는 직접 판단해야 한다.',
    };
    return [
      line(
        s.outcome === 'reported' || s.outcome === 'discovered' ? '' : name,
        text[s.outcome],
        'exchange',
      ),
      line(
        me,
        s.outcome === 'promised'
          ? '다른 거래도 살펴보면서 연락을 기다려 보자.'
          : '……다음 일을 보자.',
        'leave',
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
        kind === 'memory' || kind === 'reunion'
          ? '생활이 달라지면 자주 쓰던 물건도 한동안 손이 안 가더라고요. 막상 보내고 나니 생각이 났습니다.'
          : '이전 거래에서 약속을 지켜 주셨다는 이야기를 들었습니다. 이번에도 서로 조건을 확인하고 결정하면 좋겠어요.',
    };
    return [
      line(me, QUESTION_LABELS[s.branch], 'look'),
      line(name, answers[s.branch], 'listen'),
    ];
  }
  const [first, second] = EVENT_VARIANTS[kind][s.variant];
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
    line(name, format(first)),
    line(
      name,
      kind === 'model' && s.explained
        ? '품목명과 외관은 등록된 설명대로예요. 내부 상태와 실제 가치는 구매한 뒤 확인하셔야 합니다.'
        : format(second),
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
        { ...buy, label: '현장에서만 결제하고 거래' },
        { id: 'report', label: '신고하고 거래 종료' },
        cancel,
      ];
      break;
    case 'reservation':
      choices = [
        { id: 'hold', label: '잠시 예약해 두기' },
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
