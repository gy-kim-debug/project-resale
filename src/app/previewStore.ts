import { create } from 'zustand';
import {
  previewConfig,
  sampleItem,
  type PreviewItem,
  type PreviewInquiry,
} from '../content/preview';

/** 메모리에서만 동작하는 화면 목업. 시간·생존·이자·랜덤 엔진과 분리한다. */
interface PreviewState {
  cash: number;
  items: PreviewItem[];
  acquiredIds: string[];
  selectedItemId: string | null;
  inquiries: PreviewInquiry[];
  inquiryItemId: string | null;
  notice: string;
  seed(): void;
  reset(): void;
  selectItem(id: string | null): void;
  notify(message: string): void;
  receive(id: string, title: string, category: string, price?: number): void;
  check(id: string): void;
  discard(id: string): void;
  post(id: string, price: number): void;
  cancel(id: string): void;
  requestInquiries(id: string): void;
  reject(inquiryId: string): void;
  sell(inquiryId: string): void;
  breakOff(): void;
  sellToOutlet(id: string, price: number): void;
}
const empty = {
  cash: 0,
  items: [] as PreviewItem[],
  acquiredIds: [] as string[],
  selectedItemId: null,
  inquiries: [] as PreviewInquiry[],
  inquiryItemId: null,
  notice: '',
};
export const usePreviewStore = create<PreviewState>((set, get) => ({
  ...empty,
  seed: () =>
    set({
      ...empty,
      cash: previewConfig.cash,
      items: [{ ...sampleItem }],
      notice:
        '테스트용 현금과 물품을 불러왔습니다. 실제 시작 상태와 무관합니다.',
    }),
  reset: () => set({ ...empty }),
  selectItem: (selectedItemId) => set({ selectedItemId }),
  notify: (notice) => set({ notice }),
  receive(id, title, category, price = 0) {
    const s = get();
    if (s.inquiries.length) return;
    if (s.acquiredIds.includes(id))
      return set({ notice: '이미 수령한 예시 매물입니다.' });
    if (s.items.length >= previewConfig.capacity)
      return set({
        notice:
          '보관함이 가득 찼습니다. 먼저 공간을 확보하세요. 한도는 테스트용입니다.',
      });
    if (s.cash < price)
      return set({
        notice:
          '현금이 부족합니다. 내 정보의 화면 검토 도구로 구매 흐름을 확인할 수 있습니다.',
      });
    set({
      cash: s.cash - price,
      items: [
        ...s.items,
        { id, title, category, checked: false, askingPrice: null },
      ],
      acquiredIds: [...s.acquiredIds, id],
      notice:
        '수령 완료 (목업). 보관함에서 별도 가치 확인과 판매 화면을 열 수 있습니다. 시간·상태는 계산하지 않았습니다.',
    });
  },
  check: (id) => {
    if (!get().inquiries.length)
      set({
        items: get().items.map((i) =>
          i.id === id ? { ...i, checked: true } : i,
        ),
        notice:
          '가치 확인 화면 예시입니다. 실제 감정 방식·비용·소요 시간은 미정입니다.',
      });
  },
  discard(id) {
    const s = get();
    if (
      s.inquiries.length ||
      s.items.find((i) => i.id === id)?.askingPrice !== null
    )
      return;
    set({
      items: s.items.filter((i) => i.id !== id),
      selectedItemId: null,
      notice:
        '물품을 버렸습니다 (목업). 버리기는 시간을 소모하지 않습니다. 기타 비용은 미정입니다.',
    });
  },
  post(id, price) {
    const s = get();
    if (s.inquiries.length || !Number.isSafeInteger(price) || price < 0)
      return set({ notice: '가격은 0 이상의 안전한 정수로 입력하세요.' });
    if (!s.items.some((i) => i.id === id && i.askingPrice === null)) return;
    if (
      s.items.filter((i) => i.askingPrice !== null).length >=
      previewConfig.listingLimit
    )
      return set({
        notice: '동시 등록 한도에 도달했습니다. 한도 수치는 테스트용입니다.',
      });
    set({
      items: s.items.map((i) =>
        i.id === id ? { ...i, askingPrice: price } : i,
      ),
      notice:
        '판매 글 등록 (목업). 등록 중 가격 수정은 불가능합니다. 취소 후 재등록할 수 있습니다.',
    });
  },
  cancel(id) {
    if (get().inquiries.length) return;
    set({
      items: get().items.map((i) =>
        i.id === id ? { ...i, askingPrice: null } : i,
      ),
      notice:
        '판매 등록을 취소했습니다. 재등록하거나 매각처로 가져갈 수 있습니다.',
    });
  },
  requestInquiries(id) {
    const s = get();
    const item = s.items.find((i) => i.id === id);
    if (s.inquiries.length || !item || item.askingPrice === null) return;
    set({
      inquiryItemId: id,
      inquiries: [
        {
          id: 'a',
          name: '구매자 A',
          price: Math.floor(item.askingPrice * 0.8),
          raised: false,
        },
        { id: 'b', name: '구매자 B', price: item.askingPrice, raised: false },
      ],
      notice: '',
    });
  },
  reject(id) {
    const s = get();
    const inquiry = s.inquiries.find((i) => i.id === id);
    if (!inquiry) return;
    if (inquiry.raised) return get().breakOff();
    const price =
      s.items.find((i) => i.id === s.inquiryItemId)?.askingPrice ??
      inquiry.price;
    set({
      inquiries: s.inquiries.map((i) =>
        i.id === id ? { ...i, price, raised: true } : i,
      ),
      notice:
        '예시 응답: 구매자가 가격을 올려 다시 제안합니다. 다음 거절에서는 파토 화면을 보여줍니다. 실제 확률·판단 규칙이 아닙니다.',
    });
  },
  sell(id) {
    const s = get();
    const inquiry = s.inquiries.find((i) => i.id === id);
    if (!inquiry || !Number.isSafeInteger(s.cash + inquiry.price)) return;
    set({
      cash: s.cash + inquiry.price,
      items: s.items.filter((i) => i.id !== s.inquiryItemId),
      inquiries: [],
      inquiryItemId: null,
      selectedItemId: null,
      notice:
        '판매 완료 (목업). 한 번의 행동으로 물품과 대금을 교환합니다. 남은 문의의 상세 종료 규칙은 미정이며 이 화면에서는 정리합니다.',
    });
  },
  breakOff() {
    const s = get();
    set({
      items: s.items.map((i) =>
        i.id === s.inquiryItemId ? { ...i, askingPrice: null } : i,
      ),
      inquiries: [],
      inquiryItemId: null,
      notice:
        '네고 파토: 판매 글과 모든 문의를 종료했습니다. 판매하려면 재등록해야 합니다.',
    });
  },
  sellToOutlet(id, price) {
    const s = get();
    const item = s.items.find((i) => i.id === id);
    if (
      s.inquiries.length ||
      !item ||
      item.askingPrice !== null ||
      !Number.isSafeInteger(s.cash + price)
    )
      return;
    set({
      cash: s.cash + price,
      items: s.items.filter((i) => i.id !== id),
      selectedItemId: null,
      notice:
        '매각 완료 (목업). 매각처의 고정 제시 가격으로 판매했습니다. 이동·거래 시간은 미계산입니다.',
    });
  },
}));
