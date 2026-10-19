/** 화면 연결 검토용 데이터. 확정된 보상·가격·한도·확률이 아닙니다. */
export const previewConfig = { capacity: 4, listingLimit: 2, cash: 50_000 };
export const jobs = [
  {
    id: 'sorting',
    title: '물류 분류 (예시)',
    reward: 8_000,
    duration: '2시간 (예시)',
  },
  {
    id: 'cleaning',
    title: '매장 청소 (예시)',
    reward: 12_000,
    duration: '3시간 (예시)',
  },
];
export const outlets = [
  { id: 'scrap', title: '고물상', categories: ['생활', '가구'], price: 500 },
  {
    id: 'used',
    title: '중고 상점',
    categories: ['디지털', '수집품'],
    price: 3_000,
  },
];
export interface PreviewItem {
  id: string;
  title: string;
  category: string;
  checked: boolean;
  askingPrice: number | null;
}
export interface PreviewInquiry {
  id: string;
  name: string;
  price: number;
  raised: boolean;
}
export const sampleItem: PreviewItem = {
  id: 'sample',
  title: '오래된 라디오 (예시)',
  category: '수집품',
  checked: false,
  askingPrice: null,
};
