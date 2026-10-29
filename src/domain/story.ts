import {
  EVENT_KINDS,
  STORY_RULES,
  type SceneKind,
  type StoryLine,
  type EventKind,
} from '../content/story';
import { ACTION_TICK, won, type Game, type Command } from './game';
import { moneyRatio } from './money';
import { RULES } from '../content/rules';
export interface StoryScene {
  kind: SceneKind;
  step: number;
  explained?: boolean;
  target?: string;
  targets?: string[];
  extra?: string;
  price?: number;
  name?: string;
  resume?: { type: 'buy' | 'accept'; id: string };
}
export interface StoryState {
  active: StoryScene | null;
  history: string[];
  lastAt: number;
  contacts: string[];
  requests: string[];
  endingDone: boolean;
}
export function enableStory(game: Game, intro = false): Game {
  const g = structuredClone(game);
  g.story ??= {
    active: intro ? { kind: 'intro', step: 0 } : null,
    history: [],
    lastAt: Math.max(0, g.minute - STORY_RULES.cooldownActions * ACTION_TICK),
    contacts: [],
    requests: [],
    endingDone: g.status !== 'playing',
  };
  return g;
}
function hash(text: string) {
  let n = 2166136261;
  for (const c of text) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}
export function storyLines(g: Game): StoryLine[] {
  const s = g.story!.active!;
  const line = (
    speaker: string,
    text: string,
    motion: StoryLine['motion'] = 'meet',
  ): StoryLine => ({ speaker, text, motion });
  const me = g.player?.nickname ?? '주인공';
  const other = s.name ?? '판매자';
  switch (s.kind) {
    case 'intro':
      return [
        line('', '작은 방. 휴대폰이 울린다.', 'phone'),
        line('채권 담당자', '남은 원금 100억 원. 확인하셨죠?', 'listen'),
        line(me, '……네.', 'listen'),
        line(
          '채권 담당자',
          '첫 정산은 이번 주입니다. 이자와 의무 상환금을 준비하세요.',
          'listen',
        ),
        line('', '전화가 끊긴다.', 'look'),
        line(me, '남은 돈은 50만 원.', 'look'),
        line(me, '……일단 팔 만한 것부터 찾아보자.', 'leave'),
      ];
    case 'success':
      return [
        line('채권 담당자', '마지막 상환까지 확인했습니다.', 'phone'),
        line('채권 담당자', '남은 채무는 없습니다.', 'listen'),
        line('', '전화를 내려놓는다. 방 안이 조용하다.', 'look'),
        line(me, '……끝났다.', 'leave'),
      ];
    case 'failure':
      return [
        line('채권 담당자', '이번 주 상환금을 확인하지 못했습니다.', 'phone'),
        line(me, '조금만 더 시간을……', 'listen'),
        line('채권 담당자', '약속한 기한은 지났습니다.', 'listen'),
        line('', '통화가 끝난 화면을 한동안 바라본다.', 'look'),
      ];
    case 'missing':
      return [
        line(other, '잠깐만요. 글에 적었던 구성품 하나가 빠졌네요.'),
        line(
          other,
          `그대로 가져가시거나, ${won(s.price!)}으로 낮춰 드릴 수 있어요.`,
          'look',
        ),
      ];
    case 'rehaggle':
      return [
        line(
          s.name ?? '구매자',
          '실물은 잘 봤습니다. 그런데 가격을 조금만 더 낮춰 주시면 안 될까요?',
        ),
        line(
          s.name ?? '구매자',
          `${won(s.price!)}이면 지금 가져갈게요.`,
          'look',
        ),
      ];
    case 'regular':
      return [
        line(
          other,
          s.resume
            ? '전에 거래했던 분이네요. 이번에도 오셨군요.'
            : '지난번 거래했던 사람입니다. 잠깐 괜찮으세요?',
        ),
        line(
          other,
          '다음에도 이런 종류를 구하시면 제게 먼저 말씀해 주세요. 괜찮은 가격이면 살게요.',
        ),
      ];
    case 'model':
      return [
        line(other, '아, 사진에서 모델 이름표가 잘 안 보였죠?'),
        line(
          other,
          s.explained
            ? '품목명과 외관은 등록된 설명대로예요. 내부 상태와 실제 가치는 구매한 뒤 확인하셔야 합니다.'
            : '등록한 품목명은 맞아요. 다만 내부 상태까지 보증하는 건 아닙니다. 더 듣고 결정하셔도 돼요.',
          'look',
        ),
      ];
    case 'memory':
      return [
        line(other, '이 물건, 꽤 오래 가지고 있었어요.'),
        line(
          other,
          '처음 샀던 날은 아직도 기억나네요. 이제 정리하려고요.',
          'look',
        ),
        line(me, '……그랬군요.'),
      ];
    case 'competitor':
      return [
        line(
          s.name ?? '거래상',
          s.name === '단골 거래자'
            ? '말씀드렸던 종류의 물건이네요.'
            : (s.targets?.length ?? 1) > 1
              ? '가지고 계신 물건들을 한꺼번에 사고 싶습니다.'
              : '아직도 그 물건 갖고 계시네요.',
        ),
        line(
          s.name ?? '거래상',
          `${(s.targets?.length ?? 1) > 1 ? '전부 합쳐 ' : ''}${won(s.price!)}에 가져가죠. 바로 거래하시겠어요?`,
          'look',
        ),
      ];
    case 'bundle':
      return [
        line(
          other,
          '지인이 정리하는 물건도 하나 있어요. 같이 거래할 수 있습니다.',
        ),
        line(other, `두 개 합쳐 ${won(s.price!)}. 같이 가져가실래요?`, 'look'),
      ];
    case 'creditor':
      return [
        line('채권 담당자', '이번 정산은 확인했습니다.'),
        line('채권 담당자', '다음 정산도 잊지 마세요.', 'leave'),
      ];
  }
}
export interface StoryChoice {
  id: 'continue' | 'deal' | 'decline' | 'cancel' | 'request' | 'explain';
  label: string;
  actions?: number;
}
export function storyChoices(g: Game): StoryChoice[] {
  const s = g.story!.active!;
  switch (s.kind) {
    case 'missing':
      return [
        { id: 'continue', label: '약속한 가격으로 구매', actions: 1 },
        { id: 'deal', label: `${won(s.price!)}에 구매`, actions: 1 },
        { id: 'cancel', label: '거래 취소' },
      ];
    case 'rehaggle':
      return [
        { id: 'deal', label: `${won(s.price!)}에 판매`, actions: 1 },
        { id: 'continue', label: '기존 약속대로 판매', actions: 1 },
        { id: 'cancel', label: '거래 취소' },
      ];
    case 'regular':
      if (!s.resume)
        return [
          { id: 'request', label: '다음에 구하면 연락하기' },
          { id: 'decline', label: '약속하지 않기' },
        ];
      return [
        { id: 'request', label: '부탁을 받고 구매', actions: 1 },
        { id: 'continue', label: '이번 물건만 구매', actions: 1 },
        { id: 'cancel', label: '거래 취소' },
      ];
    case 'model':
      return [
        ...(s.explained
          ? []
          : [{ id: 'explain' as const, label: '모델 설명 더 듣기' }]),
        { id: 'continue', label: '구매 진행', actions: 1 },
        { id: 'cancel', label: '거래 취소' },
      ];
    case 'bundle':
      return [
        { id: 'deal', label: `두 개 ${won(s.price!)}에 구매`, actions: 1 },
        { id: 'continue', label: '원래 물건만 구매', actions: 1 },
        { id: 'cancel', label: '거래 취소' },
      ];
    case 'competitor':
      return [
        { id: 'deal', label: `${won(s.price!)}에 판매`, actions: 1 },
        { id: 'decline', label: '계속 보관하기' },
      ];
    case 'memory':
      return [
        { id: 'continue', label: '이야기를 듣고 구매', actions: 1 },
        { id: 'cancel', label: '거래 취소' },
      ];
    default:
      return [
        {
          id: 'continue',
          label:
            s.kind === 'intro'
              ? '시작하기'
              : s.kind === 'success' || s.kind === 'failure'
                ? '결과 보기'
                : '대화 마치기',
        },
      ];
  }
}
/** Separate stable roll; dialogue and economic RNG cannot reroll each other. */
export function beforeTrade(g: Game, c: Command): StoryScene | null {
  const st = g.story;
  if (
    !st ||
    st.active ||
    g.minute - st.lastAt < STORY_RULES.cooldownActions * ACTION_TICK
  )
    return null;
  const signature = `${g.seed}:${c.type}:${'id' in c ? c.id : ''}:${g.minute}`;
  if (hash(signature) % 100 >= STORY_RULES.chancePercent) return null;
  if (c.type === 'accept') {
    const q = g.inquiries.find((x) => x.id === c.id);
    if (!q) return null;
    return {
      kind: 'rehaggle',
      step: 0,
      target: q.id,
      name: q.name,
      price: Math.max(100, moneyRatio(q.price, 90)),
      resume: { type: 'accept', id: q.id },
    };
  }
  if (c.type !== 'buy') return null;
  const i = g.board.find((x) => x.id === c.id);
  if (
    !i ||
    i.price === 0 ||
    i.marketId === 'auction' ||
    i.purchaseBargain?.walked
  )
    return null;
  const kinds: EventKind[] = ['model', 'memory'];
  if (i.kind !== '부동산') kinds.push('missing');
  const extra = g.board.find(
    (x) =>
      x.id !== i.id &&
      x.price > 0 &&
      !x.purchaseBargain?.walked &&
      x.marketId === i.marketId &&
      x.marketId !== 'auction',
  );
  if (extra && g.inventory.length + 2 <= RULES.capacity) kinds.push('bundle');
  if (st.contacts.includes(i.seller)) kinds.push('regular');
  const unseen = kinds.filter((k) => !st.history.includes(k));
  const pool = unseen.length ? unseen : kinds;
  const kind = pool[hash(signature + ':kind') % pool.length];
  const price =
    kind === 'bundle'
      ? moneyRatio(
          (i.negotiatedPrice ?? i.price) +
            (extra!.negotiatedPrice ?? extra!.price),
          95,
        )
      : Math.max(100, moneyRatio(i.negotiatedPrice ?? i.price, 90));
  return {
    kind,
    step: 0,
    target: i.id,
    name: i.seller,
    price,
    ...(kind === 'bundle' ? { extra: extra!.id } : {}),
    resume: { type: 'buy', id: i.id },
  };
}
export function afterAction(g: Game, c: Command, before: Game) {
  const st = g.story;
  if (!st || st.active) return;
  if (g.status !== 'playing' && !st.endingDone) {
    st.active = {
      kind: g.status === 'cleared' ? 'success' : 'failure',
      step: 0,
    };
    return;
  }
  if (c.type === 'buy') {
    const i = g.inventory.find((x) => x.id === c.id);
    if (i) st.contacts = [...new Set([...st.contacts, i.seller])].slice(-100);
  }
  if (
    g.status !== 'playing' ||
    g.inquiries.length ||
    g.settling ||
    g.minute - st.lastAt < STORY_RULES.cooldownActions * ACTION_TICK
  )
    return;
  if (
    c.type === 'payInterest' &&
    (g.interestWeek ?? 0) > (before.interestWeek ?? 0) &&
    !st.history.includes('creditor')
  ) {
    st.active = { kind: 'creditor', step: 0 };
    return;
  }
  if (
    !['wait', 'refresh', 'job', 'scavenge'].includes(c.type) ||
    g.minute === before.minute
  )
    return;
  const item = g.inventory.find(
    (x) => x.value >= 100 && !g.sales.some((s) => s.itemId === x.id),
  );
  if (!item || (g.weekActions ?? 0) >= 20) return;
  if (
    st.contacts.includes(item.seller) &&
    !st.requests.includes(item.kind) &&
    hash(`${g.seed}:${g.minute}:regular`) % 100 < 18
  ) {
    st.active = {
      kind: 'regular',
      step: 0,
      target: item.id,
      name: item.seller,
    };
    return;
  }
  const requested = st.requests.includes(item.kind);
  const chance = requested ? 35 : 12;
  if (hash(`${g.seed}:${g.minute}:competitor`) % 100 >= chance) return;
  st.active = {
    kind: 'competitor',
    step: 0,
    target: item.id,
    targets: g.inventory
      .filter((i) => i.value >= 100 && !g.sales.some((s) => s.itemId === i.id))
      .map((i) => i.id),
    price: Math.max(
      100,
      g.inventory
        .filter(
          (i) => i.value >= 100 && !g.sales.some((s) => s.itemId === i.id),
        )
        .reduce(
          (sum, i) =>
            Math.min(
              RULES.maxMoney,
              sum + moneyRatio(i.value, st.requests.includes(i.kind) ? 85 : 70),
            ),
          0,
        ),
    ),
    name: requested ? '단골 거래자' : '거래상',
  };
}
export const isSceneKind = (v: unknown): v is SceneKind =>
  typeof v === 'string' &&
  ['intro', 'success', 'failure', ...EVENT_KINDS].includes(v);
