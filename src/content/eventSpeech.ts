import type { EventKind } from './story';
import type { EventQuestion } from './eventScenes';
/** Button labels describe an action; these are the words the protagonist actually says. */
const QUESTIONS: Record<EventKind, Partial<Record<EventQuestion, string>>> = {
  missing: {
    reason: '구성품이 빠진 건 어떤 사정 때문인가요?',
    terms: '빠진 구성품을 감안하면 어떤 조건으로 거래할 수 있을까요?',
  },
  rehaggle: {
    reason: '현장에서 금액을 바꾸고 싶으신 이유가 있나요?',
    terms: '지금 제안하신 조건을 다시 말씀해 주실래요?',
  },
  regular: {
    past: '지난번 거래는 어떠셨어요? 찾으시는 분이 또 있나요?',
    terms: '다음에 어떤 물건을 구하면 연락드리면 될까요?',
  },
  model: {
    proof: '모델을 확인할 수 있는 자료나 근거가 있을까요?',
    terms:
      '확실히 아는 부분과 보증하기 어려운 부분을 구분해서 말씀해 주실래요?',
  },
  memory: {
    past: '이 물건과 함께한 이야기를 조금 더 들려주실래요?',
    reason: '소중한 물건 같은데, 이번에 정리하시려는 이유가 있나요?',
  },
  competitor: {
    reason: '여러 물건을 한꺼번에 사시려는 이유가 있나요?',
    terms: '어떤 물건을 얼마에 가져가시는 건지 다시 확인할게요.',
  },
  bundle: {
    reason: '두 물건을 같이 정리하시게 된 사정이 있나요?',
    terms: '묶음 가격과 포함되는 물건을 다시 확인해도 될까요?',
  },
  creditor: {
    terms: '이번 납부가 정상적으로 반영된 건가요? 더 확인할 조건이 있나요?',
  },
  rush: {
    reason: '얼마나 급한 일정인지 여쭤봐도 될까요?',
    proof: '급한 거래라도 확인할 수 있는 정보는 먼저 보고 싶어요.',
  },
  appointment: {
    reason: '약속 장소가 달라진 이유를 여쭤봐도 될까요?',
    terms: '기다리면 어떻게 거래하게 되나요? 지금 만날 방법도 있을까요?',
  },
  scam: {
    proof: '거래 장소와 계좌 주인을 확인할 근거부터 보여주실래요?',
    terms: '먼저 송금하지 않고 직접 만나서 거래할 수 있나요?',
  },
  inspection: {
    reason: '어떤 부분을 더 확인하고 싶으신가요?',
    terms: '추가로 확인한 뒤에는 원래 약속한 조건으로 거래하는 건가요?',
  },
  reservation: {
    reason: '지금 거래하기 어려우신 사정이 있나요?',
    terms: '예약해 두면 거래 조건은 어떻게 되나요?',
  },
  returnBuyer: {
    past: '그동안 일정은 잘 정리되셨어요?',
    terms: '예약할 때 이야기한 금액과 조건 그대로 거래하시는 거죠?',
  },
  collector: {
    proof: '어떤 정보를 보고 이 물건을 찾으신 건가요?',
    reason: '이 품목을 따로 찾으시는 이유가 있나요?',
  },
  referral: {
    past: '어떤 거래를 통해 소개받으셨는지 여쭤봐도 될까요?',
    terms: '이번 거래의 금액과 조건을 다시 확인할게요.',
  },
  reunion: {
    past: '물건을 보내신 뒤 어떤 생각이 드셨나요?',
    reason: '다시 구하고 싶어지신 이유를 들을 수 있을까요?',
  },
  marketTip: {
    reason: '그 시장의 매물 소식은 어디서 들으신 건가요?',
    proof: '직접 확인하신 정보인지, 전해 들으신 이야기인지 알 수 있을까요?',
  },
};
export function eventQuestionSpeech(
  kind: EventKind,
  question: EventQuestion,
): string {
  const fallback: Record<EventQuestion, string> = {
    reason: '어떤 사정이 있으셨는지 조금 더 말씀해 주실래요?',
    proof: '확인할 수 있는 자료나 근거가 있을까요?',
    terms: '거래 조건을 한 번 더 정리해 주실래요?',
    past: '그때 이야기를 조금 더 들려주실래요?',
  };
  return QUESTIONS[kind][question] ?? fallback[question];
}
export function eventDecisionSpeech(
  kind: EventKind,
  decision: string | undefined,
): string {
  if (decision === 'report')
    return '먼저 돈을 보내지는 않겠습니다. 이 거래는 여기서 끝낼게요.';
  if (decision === 'hold')
    return '잠시 예약해 둘게요. 일정이 정해지면 다시 연락해 주세요.';
  if (decision === 'request')
    return '다음에 같은 종류를 구하면 연락드릴게요. 필요한 분이 있으면 소개해 주세요.';
  if (decision === 'look')
    return '알려주셔서 고마워요. 그 시장에 직접 가서 살펴볼게요.';
  if (decision === 'wait')
    return kind === 'inspection'
      ? '천천히 확인하세요. 기다렸다가 약속한 조건으로 거래할게요.'
      : '괜찮아요. 기다렸다가 만나서 거래할게요.';
  if (decision === 'cancel')
    return kind === 'scam'
      ? '지금 조건으로는 거래하기 어렵겠어요. 이번에는 그만둘게요.'
      : '생각해 봤는데, 이번 거래는 하지 않을게요.';
  if (decision === 'decline')
    return kind === 'marketTip'
      ? '소식은 고맙지만 지금은 다른 일을 먼저 볼게요.'
      : kind === 'competitor'
        ? '제안은 고맙지만 지금은 개별로 판매해 볼게요.'
        : '말씀은 고맙지만 조금 더 가지고 있을게요. 이번에는 거래하지 않겠습니다.';
  if (decision === 'deal') {
    const speech: Partial<Record<EventKind, string>> = {
      missing: '빠진 구성을 감안해서 조정해 주신 금액으로 구매할게요.',
      rehaggle: '네, 지금 제안하신 금액에 맞춰 드릴게요.',
      bundle: '두 물건이 다 필요하겠네요. 말씀하신 묶음 가격으로 함께 살게요.',
      rush: '그 금액이면 지금 바로 거래할게요. 출발 전에 마무리하죠.',
      competitor: '그럼 목록에 있는 물건을 한 번에 넘겨드릴게요.',
      reunion:
        '많이 아쉬우셨겠어요. 말씀하신 조건으로 다시 가져가셔도 괜찮아요.',
      returnBuyer: '아직 가지고 있어요. 예약 때 약속한 금액으로 거래해요.',
      collector:
        '찾으시던 물건이라니 다행이네요. 제안하신 조건으로 거래할게요.',
      referral:
        '소개해 주신 분께도 감사하다고 전해 주세요. 그 조건으로 거래하겠습니다.',
    };
    return speech[kind] ?? '제안하신 금액으로 거래할게요.';
  }
  const speech: Partial<Record<EventKind, string>> = {
    missing: '빠진 구성은 제가 따로 구해 볼게요. 처음 약속한 가격으로 살게요.',
    bundle: '묶음 말고 처음 말씀드렸던 물건만 구매할게요.',
    rush: '서두르기보다는 처음 합의한 조건대로 거래하고 싶어요.',
    appointment: '그럼 서로 가까운 장소에서 지금 만나는 걸로 해요.',
    inspection:
      '추가로 시간을 내기는 어렵겠어요. 지금 약속한 조건으로 거래하면 좋겠습니다.',
    reservation: '오래 기다리기는 어려워서요. 지금 거래할 수 있을까요?',
    scam: '먼저 송금하기는 어렵습니다. 직접 만나서 물건과 대금을 교환해요.',
    memory: '이야기 들려주셔서 고마워요. 말씀하신 조건으로 구매할게요.',
    model: '설명은 잘 들었습니다. 그 조건으로 구매할게요.',
    regular: '우선 이번 물건부터 거래할게요. 다음 일은 나중에 이야기해요.',
  };
  return speech[kind] ?? '알겠습니다. 말씀하신 조건으로 진행할게요.';
}

/** Keep replies in the speaker's voice as well, rather than displaying third-person summaries. */
export function eventQuestionReply(
  kind: EventKind,
  question: EventQuestion,
  variant: 0 | 1 | 2,
): string | undefined {
  if (kind === 'creditor' && question === 'terms')
    return '네, 이번 납부는 정상적으로 반영됐습니다. 다음 정산에서도 남은 원금에 맞춰 의무 원금과 이자를 준비하시면 됩니다.';
  if (kind === 'regular' && question === 'terms')
    return '이번 물건과 같은 종류를 구하시면 연락 주세요. 실제 물건과 조건을 보고 그때 거래 여부를 결정하면 됩니다.';
  if (kind === 'scam') {
    if (question === 'reason')
      return [
        '다른 분들도 계속 연락하고 있어서요. 먼저 보내셔야 예약해 드릴 수 있습니다.',
        '제가 좀 급해서 그렇습니다. 물건은 있으니 입금부터 해 주세요.',
        '지인 계좌라서 그런 거예요. 자세한 이야기는 나중에 할게요.',
      ][variant];
    if (question === 'proof')
      return [
        '거래 장소는 입금 확인이 되면 알려드릴게요.',
        '증빙은 나중에 드릴 테니 먼저 입금해 주세요.',
        '지인이 대신 받는 계좌입니다. 자세한 설명은 나중에 드릴게요.',
      ][variant];
    if (question === 'terms')
      return '지금은 예약금을 먼저 받고 있어요. 현장 거래만 원하시면 예약 없이 직접 오셔야 합니다.';
  }
  return undefined;
}
