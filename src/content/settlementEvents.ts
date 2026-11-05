import type { StoryLine } from './story';
import { won } from '../domain/game';
export const SETTLEMENT_EVENTS = {
  first: {
    title: '첫 번째 납부',
    opening: '반지하의 작은 방. 송금 완료 화면을 오래 바라본다.',
    me: '……정말로 한 주를 넘겼다.',
    other: '첫 납부는 확인했습니다. 이제부터가 시작입니다.',
  },
  tight: {
    title: '남겨둔 잔액',
    opening: '송금을 마친 휴대전화에 얼마 남지 않은 잔액이 떠 있다.',
    me: '이번 주는 냈지만…… 다음 주가 문제네.',
    other: '이번 납부는 확인했습니다. 다음 기한도 달라지지 않습니다.',
  },
  business: {
    title: '일하는 동안에도',
    opening: '사업 수입과 상환 내역이 나란히 적힌 장부를 펼친다.',
    me: '내가 거래하는 동안에도 조금씩 들어오고 있었구나.',
    other: '이번 주 납부는 확인했습니다. 수입이 생겨도 약정은 계속됩니다.',
  },
  halfway: {
    title: '절반을 지나',
    opening: '처음 적어둔 채무와 지금의 잔액을 번갈아 본다.',
    me: '반 이상 갚았어. 처음엔 상상도 못 했는데.',
    other: '원금을 절반 이상 갚으셨군요. 남은 약정은 그대로입니다.',
  },
  near: {
    title: '끝이 보이는 숫자',
    opening: '늘 길게만 보이던 채무 숫자가 조금 다르게 느껴진다.',
    me: '이제는…… 끝이 보이는 것 같아.',
    other: '남은 원금도 끝까지 납부하셔야 합니다. 이번 주는 확인됐습니다.',
  },
  rain: {
    title: '빗소리 속의 송금',
    opening: '창밖으로 빗방울이 흐른다. 송금 완료 진동이 짧게 울린다.',
    me: '비는 여전한데, 빚은 조금 줄었네.',
    other: '입금 확인했습니다. 다음 주 명세도 확인해 두세요.',
  },
  envelope: {
    title: '접어둔 명세서',
    opening: '이번 주 명세서를 접어 책상 한쪽에 놓는다.',
    me: '언젠가는 이 종이도 전부 치울 수 있겠지.',
    other: '이번 주 납부 처리는 끝났습니다. 다음 기한에 다시 연락드리겠습니다.',
  },
  quiet: {
    title: '잠깐의 고요',
    opening: '송금 버튼을 누른 뒤, 방 안에는 잠깐 고요가 내려앉는다.',
    me: '오늘은 이 숫자 생각을 조금만 덜 해도 되겠지.',
    other: '납부 확인했습니다. 이번 주 연체는 없습니다.',
  },
} as const;
export type SettlementEventId = keyof typeof SETTLEMENT_EVENTS;
export interface SettlementReceipt {
  week: number;
  principalPaid: number;
  interestPaid: number;
  remainingPrincipal: number;
  cash: number;
  businessIncome: number;
  nextPrincipal: number;
  nextInterest: number;
  theme: SettlementEventId;
}
export function settlementLines(
  receipt: SettlementReceipt,
  me: string,
  reply?: 'ask' | 'end',
): StoryLine[] {
  const line = (
    speaker: string,
    text: string,
    motion: StoryLine['motion'] = 'look',
  ): StoryLine => ({ speaker, text, motion });
  if (reply === 'ask')
    return [
      line(me, '다음 주에는 얼마를 준비해야 하죠?', 'listen'),
      line(
        '채권자',
        `현재 원금 기준으로 의무 원금 ${won(receipt.nextPrincipal)}, 이자 ${won(receipt.nextInterest)}입니다. 원금을 더 갚으면 이자는 달라집니다.`,
        'phone',
      ),
      line(me, '알겠습니다. 이번에도 기한 전에 준비할게요.', 'look'),
    ];
  if (reply === 'end')
    return [
      line(me, '확인했습니다. 오늘 연락은 여기까지 할게요.', 'listen'),
      line('채권자', '네. 다음 납부 기한에 다시 연락드리겠습니다.', 'phone'),
      line('', '전화를 내려놓는다. 다음 한 주를 준비할 시간이다.', 'look'),
    ];
  const event = SETTLEMENT_EVENTS[receipt.theme];
  return [
    line('', event.opening),
    line(
      '채권자',
      `${receipt.week}주차 납부를 확인했습니다. 이번 주 원금 ${won(receipt.principalPaid)}, 정산 이자 ${won(receipt.interestPaid)}입니다.`,
      'phone',
    ),
    line(me, event.me, 'look'),
    line(
      '채권자',
      `${event.other} 남은 원금은 ${won(receipt.remainingPrincipal)}입니다.`,
      'listen',
    ),
  ];
}
