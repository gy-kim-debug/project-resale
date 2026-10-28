import type { Kind } from '../domain/game';
const category = (label: string, kind: Kind, feature: string) => ({
  label,
  kind,
  feature,
});
/** UI subcategories share the existing economic Kind profiles. */
export const PRODUCT_CATEGORIES = {
  lighting: category('조명·인테리어', '생활', '전원·마감·구성품'),
  kitchen: category('주방·생활가전', '생활', '위생·작동·소모품'),
  furniture: category('가구·수납', '가구', '프레임·결합부·표면'),
  dailyDigital: category('생활 디지털', '디지털', '배터리·연결·기본 기능'),
  hobby: category('취미·수집', '수집품', '구성품·보존·진위'),
  outdoor: category('캠핑·레저', '생활', '부속품·원단·사용 흔적'),
  sport: category('운동·스포츠', '생활', '마모·균형·부속품'),
  books: category('도서·문구', '생활', '낙장·필기·보관 상태'),
  computers: category('PC·워크스테이션', '디지털', 'CPU·그래픽·발열·저장 장치'),
  mobile: category('스마트폰·태블릿', '디지털', '화면·배터리·충전 단자'),
  imaging: category('카메라·영상', '디지털', '렌즈·센서·촬영 기능'),
  audio: category('오디오·음향', '디지털', '출력·잡음·접점'),
  gaming: category('게임·VR', '디지털', '컨트롤러·구동·구성품'),
  displays: category('화면·전문장비', '디지털', '패널·입출력·전원'),
  guitars: category('기타·베이스', '악기', '넥·프렛·픽업·튜닝'),
  keys: category('건반·신시사이저', '악기', '건반·페달·음원·출력'),
  strings: category('현악기', '악기', '브리지·활·목재·음정'),
  winds: category('관악기', '악기', '키·패드·관체·누설'),
  percussion: category('타악기', '악기', '헤드·쉘·하드웨어'),
  studio: category('스튜디오 장비', '악기', '입출력·채널·녹음 기능'),
  compactCars: category('경차·소형차', '자동차', '엔진·주행·차체·서류'),
  familyCars: category('세단·패밀리카', '자동차', '정비 이력·차체·실내'),
  suvs: category('SUV·레저차', '자동차', '구동계·하체·주행 이력'),
  imports: category('수입·스포츠카', '자동차', '부품·정비·출처'),
  ecoCars: category('전기·하이브리드', '자동차', '구동 배터리·충전·전장'),
  commercial: category('승합·상용차', '자동차', '적재·주행·업무 사용 흔적'),
  apartments: category('아파트·오피스텔', '부동산', '권리·설비·마감·위치'),
  houses: category('주택·빌라', '부동산', '구조·누수·권리 관계'),
  shops: category('상가·업무시설', '부동산', '권리·설비·용도'),
  land: category('토지·창고', '부동산', '경계·용도·접근성·권리'),
  buildings: category('건물·복합시설', '부동산', '권리·공용 설비·노후도'),
  fineArt: category('회화·미술', '수집품', '출처·서명·보존·진위'),
  watches: category('명품 시계', '수집품', '무브먼트·시리얼·진위'),
  jewelry: category('보석·주얼리', '수집품', '감별·세팅·보증 자료'),
  antiques: category('골동·도자기', '수집품', '연대·수복·보존·출처'),
  rareCollections: category('희귀 컬렉션', '수집품', '완전성·희소성·진위'),
} as const;
export type ProductCategory = keyof typeof PRODUCT_CATEGORIES;
export const isProductCategory = (value: unknown): value is ProductCategory =>
  typeof value === 'string' && Object.hasOwn(PRODUCT_CATEGORIES, value);
export const categoryLabel = (value: ProductCategory | Kind) =>
  isProductCategory(value) ? PRODUCT_CATEGORIES[value].label : value;
