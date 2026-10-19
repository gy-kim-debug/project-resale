import type { Category, Listing } from '../domain/models';
export const categories: Category[] = ['전체', '디지털', '생활', '수집품', '가구'];
export const listings: Listing[] = [
  { id: 'radio', title: '창고에서 찾은 오래된 라디오', category: '수집품', price: 15000, symbol: '▣', condition: '작동 미확인', seller: '골목수집가', description: '할아버지 창고 정리 중 발견했어요. 전원은 넣어보지 않았습니다. 외관은 사진 대신 직접 확인해 주세요.', clue: '모델명과 작동 상태를 확인하면 판단에 도움이 됩니다.', tag: '확인 필요' },
  { id: 'keyboard', title: '기계식 키보드 정리합니다', category: '디지털', price: 25000, symbol: '⌨', condition: '사용감 있음', seller: '책상정리중', description: '새 키보드를 사서 정리합니다. 일부 키캡에 사용감이 있어요.', clue: '모든 키가 입력되는지 확인이 필요합니다.' },
  { id: 'box', title: '이사 정리 · 생활용품 한 상자', category: '생활', price: 0, symbol: '◇', condition: '구성 미확인', seller: '내일이사', description: '오늘 가져가실 분께 무료로 드려요. 컵과 작은 생활용품이 섞여 있습니다.', clue: '무료여도 운반과 보관에 드는 시간은 고려해야 합니다.', tag: '무료 나눔' },
  { id: 'chair', title: '원목 의자, 직접 가져가실 분', category: '가구', price: 10000, symbol: '▤', condition: '수리 필요', seller: '작은방', description: '다리 한쪽이 조금 흔들립니다. 수리해서 쓰실 분을 찾아요.', clue: '접합부 상태에 따라 수리가 어려울 수 있습니다.' },
  { id: 'camera', title: '필름 카메라 본체', category: '수집품', price: 45000, symbol: '◎', condition: '작동 미확인', seller: '필름한롤', description: '오랫동안 보관한 카메라입니다. 필름과 배터리는 없습니다.', clue: '셔터와 렌즈 상태를 확인할 필요가 있습니다.', tag: '확인 필요' },
];
