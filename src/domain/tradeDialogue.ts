import {
  DIALOGUE_RULES,
  DIALOGUE_TOPICS,
  type DialogueTopic,
} from '../content/tradeDialogue';
import { displayTrader } from '../content/traders';
import { SPECIAL_LISTINGS } from '../content/specialListings';
import { itemCase } from '../content/itemCases';
import { TAG_LABELS } from '../content/listingTags';
import type { ChatMessage, Item } from './game';

function hash(key: string) {
  let n = 2166136261;
  for (const c of key) n = Math.imul(n ^ c.charCodeAt(0), 16777619);
  return n >>> 0;
}
const profile = (i: Item) => displayTrader(i.traderId, i.id, i.seller);
const active = (i: Item) =>
  !i.chatSettled && !i.purchaseBargain?.walked && i.marketId !== 'auction';
/** Stable claims: revisiting/reloading never rerolls truth or consumes the economic RNG. */
function conditionClaim(i: Item) {
  const candid =
    hash(`${i.id}:${i.traderId}:condition`) % 100 < DIALOGUE_RULES.truthPercent;
  if (i.special === 'unverified')
    return '작동 여부는 확인하지 못했습니다. 정상 작동을 보증하지 않는 조건이에요.';
  if (i.caseId === 'unopened')
    return '포장은 열지 않았어요. 내부 작동까지 확인한 건 아닙니다.';
  if (i.caseId === 'untested' || i.caseId === 'stored')
    return '최근에는 확인을 못 했어요. 보관 기간이 있어서 상태를 확답하기는 어렵습니다.';
  if (!candid)
    return '제가 보기에는 괜찮은 편이에요. 세부 상태까지 확인한 것은 아닙니다.';
  if (i.condition === '고장')
    return i.kind === '부동산'
      ? '손봐야 할 설비가 있습니다. 완전한 상태라고 보기는 어려워요.'
      : '정상 사용이 어려운 부분이 있어요. 수리를 고려하셔야 합니다.';
  if (i.condition === '사용감')
    return '사용 흔적은 있어요. 새것 같은 상태는 아닙니다.';
  return '제가 사용하면서 큰 불편은 없었어요. 모든 부분을 보증하는 건 어렵습니다.';
}
function featureClaim(i: Item) {
  const tag = i.listing?.tags.find((t) =>
    ['limited', 'authentic', 'replica', 'discontinued', 'vintage'].includes(t),
  );
  if (!tag) return '별도 감정 자료는 없어요. 제가 아는 범위에서 설명드릴게요.';
  if (tag === 'limited')
    return '한정판으로 알고 구했어요. 별도로 감정을 받은 것은 아니라서 확답은 어렵습니다.';
  if (tag === 'replica')
    return '레플리카로 알고 내놓은 물건이에요. 정품 보증은 하지 않습니다.';
  if (tag === 'authentic')
    return i.kind === '부동산'
      ? '게시글은 제가 가진 자료를 기준으로 적었습니다. 권리 확인은 별도로 해주세요.'
      : '정품으로 알고 구입했어요. 전문 감정 결과가 있는 건 아닙니다.';
  return `${TAG_LABELS[tag]}으로 알고 보관했어요. 별도 확인 자료는 없습니다.`;
}
function voice(i: Item, text: string, topic: DialogueTopic) {
  const t = profile(i);
  // Identity-specific phrasing is independent of demographic stereotypes.
  const variant = hash(`${t.id}:${t.age}:${t.gender}:${topic}`) % 3;
  const prefixes =
    t.style === 'quick'
      ? ['짧게 말씀드리면, ', '', '네, ']
      : t.style === 'patient'
        ? ['확인한 범위에서 말씀드리면, ', '천천히 보셔도 됩니다. ', '네, ']
        : t.style === 'firm'
          ? ['네. ', '', '말씀드리면, ']
          : ['네, ', '', '말씀드릴게요. '];
  return prefixes[variant] + text;
}
export function dialogueOpening(i: Item): ChatMessage[] {
  return [
    {
      speaker: 'other',
      text: voice(
        i,
        i.price === 0
          ? '나눔 문의 주세요.'
          : '상품 문의 있으시면 말씀해 주세요.',
        'greet',
      ),
    },
  ];
}
export function sellerEvent(i: Item): string {
  const t = profile(i);
  if (t.style === 'firm')
    return '한 가지 확인할게요. 가격은 고정인데 괜찮으실까요?';
  if (t.style === 'quick' || i.listing?.facts.seller === 'urgent')
    return '다른 문의도 있어서요. 조건이 맞으면 바로 결정하실 수 있을까요?';
  if (i.caseId === 'unopened')
    return '포장을 열어 확인해 드리기는 어려워요. 미개봉 상태 그대로 받으시는 조건은 괜찮으세요?';
  if (
    ['untested', 'stored', 'bare'].includes(i.caseId ?? '') ||
    i.condition === '고장'
  )
    return '말씀드린 범위 외에는 보증하기 어려워요. 그 점을 감안해서 결정해 주실 수 있을까요?';
  if (i.listing?.tags.includes('limited'))
    return '소장하던 물건이라서요. 설명드린 내용 확인하시고 신중하게 결정해 주실 수 있을까요?';
  return '설명드린 조건은 괜찮으신가요? 더 궁금한 점이 있으면 물어보세요.';
}
export function dialogueChoices(
  i: Item,
): { id: DialogueTopic; text: string }[] {
  if (!active(i)) return [];
  const done = i.dialogue?.topics ?? [];
  if (
    (done.includes('condition') || done.includes('reason')) &&
    !done.some((t) => t === 'eventAccept' || t === 'eventDecline')
  ) {
    return (['eventAccept', 'eventDecline'] as const).map((id) => ({
      id,
      text: DIALOGUE_TOPICS[id],
    }));
  }
  const options: DialogueTopic[] = [
    'greet',
    'condition',
    'contents',
    'feature',
    'reason',
    'background',
  ];
  if (done.some((t) => ['condition', 'contents', 'feature'].includes(t)))
    options.push('detail');
  if (done.length) options.push('thanks');
  if (i.price > 0 && i.negotiation !== 'accepted') options.push('quickDeal');
  return options
    .filter((id) => !done.includes(id))
    .map((id) => ({ id, text: dialogueChoiceText(i, id) }));
}
function dialogueChoiceText(i: Item, topic: DialogueTopic): string {
  if (topic === 'condition') {
    if (i.kind === '자동차') return '차량 상태와 정비 이력을 알려주세요.';
    if (i.kind === '부동산') return '설비와 내부 상태가 어떤가요?';
    if (i.caseId === 'unopened') return '정말 미개봉인가요? 작동도 확인했나요?';
  }
  if (topic === 'contents' && i.kind === '자동차')
    return '차량 자료도 함께 받을 수 있나요?';
  if (topic === 'contents' && i.kind === '부동산')
    return '확인할 수 있는 자료가 있나요?';
  if (topic === 'feature' && i.listing?.tags.includes('limited'))
    return '한정판이라는 근거가 있나요?';
  return DIALOGUE_TOPICS[topic];
}
export function dialogueReply(original: Item, topic: DialogueTopic): Item {
  if (!dialogueChoices(original).some((c) => c.id === topic))
    throw Error('선택할 수 없는 대화입니다.');
  const i = structuredClone(original);
  const t = profile(i);
  const state = (i.dialogue ??= { topics: [], rapport: 0 });
  let text: string;
  switch (topic) {
    case 'greet':
      text =
        t.style === 'quick'
          ? '거래 가능해요. 조건 맞으면 빠르게 진행하죠.'
          : t.style === 'firm'
            ? '거래 가능합니다. 게시한 가격으로만 판매해요.'
            : t.style === 'patient'
              ? '아직 있어요. 궁금한 점 충분히 물어보세요.'
              : '네, 아직 거래 가능합니다. 편하게 물어보세요.';
      break;
    case 'condition':
      text =
        conditionClaim(i) +
        (i.caseId && i.caseId !== 'normal'
          ? ` ${itemCase(i.caseId).description}`
          : '');
      break;
    case 'contents':
      text =
        i.caseId === 'bare'
          ? '본품만 드려요. 별도 부속품은 없습니다.'
          : ['fullset', 'accessories'].includes(i.caseId ?? '')
            ? itemCase(i.caseId).description
            : ['자동차', '부동산'].includes(i.kind)
              ? '현재 가지고 있는 자료 범위에서 전달하겠습니다. 완비 여부는 별도 확인이 필요해요.'
              : '글에 없는 추가 구성품은 약속드리기 어려워요.';
      break;
    case 'feature':
      text = featureClaim(i);
      break;
    case 'reason':
      text = i.special
        ? SPECIAL_LISTINGS[i.special].description
        : i.listing?.facts.seller === 'moving'
          ? '이사 일정 때문에 정리하고 있어요.'
          : i.listing?.facts.seller === 'urgent'
            ? '빨리 정리해야 해서 올렸어요. 조건이 맞으면 바로 거래하고 싶습니다.'
            : i.caseId === 'stock'
              ? '매장에 남은 재고를 정리하고 있습니다.'
              : i.caseId === 'oldmodel'
                ? '새 모델로 바꾸면서 내놓았어요.'
                : '보유한 물건을 정리하는 중이에요. 꼭 급하게 팔아야 하는 건 아닙니다.';
      break;
    case 'background':
      text =
        `${t.age}세이고 성별은 ${t.gender === '비공개' ? '공개하지 않고 있어요' : `${t.gender}입니다`}. ` +
        (i.caseId === 'stock' || i.caseId === 'display'
          ? '매장에서 관리하던 물건입니다.'
          : i.caseId === 'unopened'
            ? '사용하지 않고 보관했던 물건이에요.'
            : '사용 이력은 제가 알고 있는 범위에서 말씀드릴 수 있어요.');
      break;
    case 'detail':
      text =
        t.style === 'quick'
          ? '추가로 확인한 내용은 없어요. 적어둔 조건으로 결정해 주세요.'
          : `${i.caseId && i.caseId !== 'normal' ? itemCase(i.caseId).description : '별도 검사나 감정은 받지 않았어요.'} 말씀드린 내용 외에는 확답하기 어렵습니다.`;
      break;
    case 'thanks':
      text =
        t.style === 'patient' || t.style === 'flexible'
          ? '꼼꼼히 봐주셔서 감사합니다. 가격도 서로 맞춰볼 수 있으면 좋겠네요.'
          : t.style === 'firm'
            ? '감사합니다. 가격은 게시한 금액 그대로입니다.'
            : '네, 천천히 결정해 주세요.';
      break;
    case 'eventAccept':
      text =
        t.style === 'firm'
          ? '감사합니다. 게시한 가격으로 결정하시면 됩니다.'
          : '확인해 주셔서 감사합니다. 그 조건으로 계속 이야기해 봐요.';
      break;
    case 'eventDecline':
      text =
        t.style === 'quick'
          ? '알겠습니다. 확정 전에는 물건을 잡아두지는 않을게요.'
          : '괜찮습니다. 충분히 살펴보고 결정해 주세요.';
      break;
    case 'quickDeal':
      text =
        t.style === 'quick'
          ? '좋아요. 바로 진행하시면 가격도 조금 조율해 볼게요.'
          : t.style === 'firm'
            ? '바로 거래하셔도 가격 할인은 어렵습니다.'
            : t.style === 'patient'
              ? '서두르기보다 조건을 먼저 확인하고 결정해 주세요.'
              : '좋아요. 가격 제안 주시면 보고 답하겠습니다.';
      break;
  }
  // One-time rapport; never changes an already-established floor or hidden item value.
  if (
    (topic === 'thanks' && ['patient', 'flexible'].includes(t.style)) ||
    (topic === 'quickDeal' && t.style === 'quick') ||
    topic === 'greet' ||
    topic === 'eventAccept'
  )
    state.rapport = Math.min(DIALOGUE_RULES.maxRapport, state.rapport + 1);
  state.topics.push(topic);
  i.chat ??= dialogueOpening(i);
  i.chat.push(
    { speaker: 'player', text: dialogueChoiceText(i, topic) },
    { speaker: 'other', text: voice(i, text, topic) },
  );
  if (
    (topic === 'condition' || topic === 'reason') &&
    !state.topics.some((t) => t === 'eventAccept' || t === 'eventDecline') &&
    !state.topics.slice(0, -1).some((t) => t === 'condition' || t === 'reason')
  ) {
    i.chat.push({ speaker: 'other', text: sellerEvent(i) });
  }
  return i;
}
