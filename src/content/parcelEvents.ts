import type { EventQuestion } from './eventScenes';
/** Dedicated parcel events; these IDs are never selected for in-person trades. */
export const PARCEL_BUY_EVENTS = ['parcelPacking', 'parcelDispatch'] as const;
export const PARCEL_SELL_EVENTS = ['parcelPhotos', 'parcelAddress'] as const;
export const PARCEL_EVENT_KINDS = [
  ...PARCEL_BUY_EVENTS,
  ...PARCEL_SELL_EVENTS,
] as const;
export type ParcelEventKind = (typeof PARCEL_EVENT_KINDS)[number];
export const isParcelEvent = (kind: string): kind is ParcelEventKind =>
  PARCEL_EVENT_KINDS.some((id) => id === kind);
export const PARCEL_EVENTS = {
  parcelPacking: {
    title: '포장을 다시 해야겠어요',
    variants: [
      [
        '상자에 넣어 보니 빈 공간이 너무 커서 그대로 보내기는 어렵겠어요.',
        '완충재를 더 구해 다시 포장하려고 합니다. 기다려 주시면 {price}로 낮춰 드릴게요.',
      ],
      [
        '포장하던 상자 밑면이 약해졌네요. 새 상자로 바꿔야겠습니다.',
        '물건을 발송하기 전에 다시 포장할 시간이 필요해요. 재포장 뒤 {price}에 보내드려도 될까요?',
      ],
      [
        '택배 접수 전에 확인하니 포장이 흔들립니다. 물건을 더 단단히 고정해야겠어요.',
        '완충재를 보충한 뒤 접수하겠습니다. 추가로 기다리시게 되니 {price}에 맞춰드릴게요.',
      ],
    ],
    questions: ['reason', 'terms'],
    ask: {
      reason: '어떤 포장을 다시 해야 하나요?',
      terms: '재포장 뒤 금액과 접수 조건을 확인할게요.',
    },
    answers: {
      reason:
        '물건 자체를 수리한다는 뜻은 아닙니다. 택배 상자와 완충재를 다시 준비해서 흔들리지 않게 고정하려고 해요.',
      terms:
        '재포장과 접수까지 기다리시면 말씀드린 조정 금액으로 거래하겠습니다. 추가 포장비를 따로 받지는 않아요.',
    },
    decision: {
      wait: '포장을 다시 해 주세요. 기다린 뒤 조정해 주신 금액으로 구매할게요.',
      cancel: '지금은 더 기다리기 어려워요. 발송 전에 거래를 취소할게요.',
    },
    reaction: {
      wait: '재포장을 마치고 접수했습니다. 말씀드린 금액으로 결제도 확인했어요.',
      cancel: '알겠습니다. 접수하지 않고 거래를 마칠게요.',
    },
  },
  parcelDispatch: {
    title: '오늘 택배 마감',
    variants: [
      [
        '가까운 접수처의 오늘 수거가 끝났네요.',
        '다음 수거까지 기다리시면 {price}에 드릴게요. 원래 금액이면 오늘 수거하는 다른 지점으로 가겠습니다.',
      ],
      [
        '방문 수거 기사님이 오늘은 더 오시기 어렵다고 합니다.',
        '다음 수거로 넘기면 {price}에 맞춰드릴게요. 급하시면 원래 금액으로 다른 접수처에 맡기겠습니다.',
      ],
      [
        '접수하려던 지점이 일찍 문을 닫았네요.',
        '다음 접수를 기다리시면 {price}입니다. 원래 약속한 금액으로 오늘 가능한 지점을 찾아가도 됩니다.',
      ],
    ],
    questions: ['reason', 'terms'],
    ask: {
      reason: '오늘 발송이 어려워진 이유가 있나요?',
      terms: '지금 접수와 다음 접수의 조건이 어떻게 다른가요?',
    },
    answers: {
      reason:
        '물건은 준비돼 있는데 가까운 곳의 수거 시간이 끝났어요. 다른 지점에 직접 접수하거나 다음 수거를 기다려야 합니다.',
      terms:
        '다음 접수까지 기다리시면 조정 금액, 다른 지점에 오늘 접수하면 원래 합의한 금액입니다. 배송료를 추가로 요구하지는 않겠습니다.',
    },
    decision: {
      wait: '다음 접수까지 기다릴게요. 낮춰 주신 금액으로 진행해 주세요.',
      continue:
        '오늘 접수 가능한 지점에 맡겨 주세요. 원래 금액으로 구매할게요.',
      cancel: '발송 일정이 맞지 않네요. 이번 거래는 취소할게요.',
    },
    reaction: {
      wait: '다음 접수 일정으로 발송을 마쳤습니다. 조정 금액으로 거래했어요.',
      continue: '다른 지점에서 접수했습니다. 원래 약속한 금액으로 확인했어요.',
      cancel: '알겠습니다. 아직 발송 전이니 거래를 마치겠습니다.',
    },
  },
  parcelPhotos: {
    title: '발송 전 사진 요청',
    variants: [
      [
        '직접 볼 수 없으니 포장 전에 사진을 조금 더 받을 수 있을까요?',
        '사진을 추가로 확인한 뒤에는 원래 금액으로 사겠습니다. 지금 사진만으로 진행한다면 {price}을 제안드려요.',
      ],
      [
        '받을 사람이 따로 있어서 발송 전에 외관과 구성을 다시 보여주고 싶습니다.',
        '사진을 더 준비해 주시면 약속한 금액 그대로예요. 기존 사진으로 바로 결정해야 한다면 {price}에는 살 수 있습니다.',
      ],
      [
        '상자에 넣기 전에 구성품을 한 번 펼쳐서 찍어 주실 수 있나요?',
        '추가 사진을 기다린 뒤 원래 금액으로 거래하거나, 지금 정보만으로 {price}에 결정하겠습니다.',
      ],
    ],
    questions: ['reason', 'terms'],
    ask: {
      reason: '어떤 사진을 더 확인하고 싶으신가요?',
      terms: '사진을 추가하는 경우와 바로 진행하는 경우의 금액을 확인할게요.',
    },
    answers: {
      reason:
        '외관과 함께 보내 주실 구성을 보고 싶어요. 분해하거나 미개봉 포장을 열어 달라는 요청은 아닙니다.',
      terms:
        '추가 사진 준비와 확인을 기다리면 원래 약속한 금액으로, 지금 정보만으로 바로 발송하면 제가 제시한 금액으로 거래하겠습니다.',
    },
    decision: {
      wait: '포장 전에 사진을 더 준비해서 보내드릴게요. 확인하신 뒤 원래 금액으로 거래해요.',
      deal: '지금 게시한 사진을 기준으로 결정해 주세요. 제안하신 금액으로 발송할게요.',
      cancel: '이번에는 조건이 맞지 않네요. 발송 전에 거래를 마칠게요.',
    },
    reaction: {
      wait: '추가 사진 확인했습니다. 원래 금액으로 결제했으니 포장해서 보내주세요.',
      deal: '지금 정보로 결정하겠습니다. 말씀드린 조정 금액으로 결제했어요.',
      cancel: '알겠습니다. 발송하지 않으셔도 됩니다.',
    },
  },
  parcelAddress: {
    title: '수령지 변경 요청',
    variants: [
      [
        '발송 전에 말씀드려요. 받을 곳이 바뀌어서 수령 정보를 수정하고 싶습니다.',
        '기존 운송장 대신 새 정보로 다시 접수해 주실 수 있나요? 금액은 약속한 그대로입니다.',
      ],
      [
        '제가 전달한 수령 정보에 빠진 내용이 있었네요.',
        '잘못 배달되지 않게 운송장을 고쳐서 다시 접수해 주세요. 다시 준비하시는 걸 기다리겠습니다.',
      ],
      [
        '처음 알려드린 곳에서 택배를 받기 어려워졌습니다.',
        '발송 전에 수령지와 운송장을 다시 확인하고 싶어요. 거래 금액을 바꾸려는 건 아닙니다.',
      ],
    ],
    questions: ['reason', 'terms'],
    ask: {
      reason: '발송 정보를 다시 확인해야 하는 사정이 있나요?',
      terms: '운송장 수정 후에도 금액은 원래 약속대로인가요?',
    },
    answers: {
      reason:
        '처음 전달한 정보로 보내시면 수령에 문제가 생길 수 있어서요. 발송 전에 기존 운송장을 쓰지 않고 새 정보로 다시 접수해 주셨으면 합니다.',
      terms:
        '네, 금액은 원래 약속대로입니다. 운송장을 새로 준비하고 재접수하는 시간을 기다리겠습니다. 기존 정보로 그대로 보내 달라는 뜻은 아닙니다.',
    },
    decision: {
      wait: '기존 운송장은 사용하지 않고, 수정한 정보를 확인해서 다시 접수할게요.',
      cancel: '지금은 다시 접수하기 어렵겠어요. 발송 전에 거래를 취소할게요.',
    },
    reaction: {
      wait: '수령 정보 확인했습니다. 약속한 금액으로 결제했어요. 수정한 운송장으로 보내주세요.',
      cancel: '알겠습니다. 기존 정보로 발송하지 마시고 거래를 마쳐 주세요.',
    },
  },
} as const satisfies Record<
  ParcelEventKind,
  {
    title: string;
    variants: readonly (readonly [string, string])[];
    questions: readonly EventQuestion[];
    ask: Partial<Record<EventQuestion, string>>;
    answers: Partial<Record<EventQuestion, string>>;
    decision: Partial<Record<'wait' | 'continue' | 'deal' | 'cancel', string>>;
    reaction: Partial<Record<'wait' | 'continue' | 'deal' | 'cancel', string>>;
  }
>;
