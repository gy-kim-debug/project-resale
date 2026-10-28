import type { Kind, MarketId } from '../domain/game';
import { MARKETS } from './markets';
import { CATALOG, TIER_TITLES, TIERS } from './rules';
import { CATEGORY_PRICING, MARKET_PRICING } from './market';
import { moneyRatio, roundMoney } from '../domain/money';

export interface CodexEntry {
  key: string;
  title: string;
  kind: Kind;
  markets: MarketId[];
  min: number;
  max: number;
  features: string[];
  legacy: boolean;
}
export const codexKey = (item: { title: string; kind: Kind }) =>
  `${item.kind}/${item.title}`;
const KIND_FEATURES: Record<Kind, string> = {
  생활: '수요가 꾸준한 생활용품',
  디지털: '작동 상태와 부품 구성이 중요',
  가구: '외관과 구조 손상에 따라 가치 차이',
  수집품: '진위·희소성·보존 상태에 민감',
  악기: '연주 상태와 부품 보존이 중요',
  자동차: '서류와 주요 부품 정비 상태가 중요',
  부동산: '권리 관계와 설비 하자 확인 필요',
  항공기: '서류와 정비 이력이 중요',
};
function features(title: string, kind: Kind) {
  const checks: [RegExp, string][] = [
    [/스마트폰|폴더블|태블릿/, '배터리·화면·충전 단자'],
    [/노트북|PC|데스크톱|서버|워크스테이션/, '구성 부품·발열·저장 장치'],
    [/모니터|TV|프로젝터/, '화면 패널·밝기·입력 단자'],
    [/카메라|렌즈|촬영/, '렌즈 상태·센서·촬영 기능'],
    [/게임기/, '컨트롤러·구동 기능·구성품'],
    [/헤드폰|오디오|라디오|레코드/, '음질·접점·출력 상태'],
    [/기타|색소폰|피아노|바이올린|드럼/, '음정·부품·연주 상태'],
    [/시계|피규어|소장|미술|작품|드로잉/, '진위·출처·보존 상태'],
    [/조명|전구/, '점등·전원·외관'],
    [/의자|소파|스툴|수납|가구/, '프레임·표면·결합부'],
    [/키보드/, '키 입력·스위치·연결 단자'],
  ];
  const detail = checks.find(([pattern]) => pattern.test(title))?.[1];
  return detail ? [KIND_FEATURES[kind], detail] : [KIND_FEATURES[kind]];
}
function createCodex(): CodexEntry[] {
  const entries = new Map<string, CodexEntry>();
  function add(
    title: string,
    kind: Kind,
    min: number,
    max: number,
    market?: MarketId,
    legacy = false,
  ) {
    const key = codexKey({ title, kind });
    const existing = entries.get(key);
    if (existing) {
      if (legacy && !existing.legacy) return;
      existing.legacy &&= legacy;
      existing.min = Math.min(existing.min, min);
      existing.max = Math.max(existing.max, max);
      if (market && !existing.markets.includes(market))
        existing.markets.push(market);
    } else
      entries.set(key, {
        key,
        title,
        kind,
        markets: market ? [market] : [],
        min,
        max,
        features: features(title, kind),
        legacy,
      });
  }
  for (const market of MARKETS)
    for (const product of market.products)
      add(product.title, product.kind, market.min, market.max, market.id);
  for (const [tierIndex, titles] of TIER_TITLES.entries())
    titles.forEach((title, index) => {
      const kind = CATALOG[index].kind;
      const base = moneyRatio(
        TIERS[tierIndex].base,
        CATEGORY_PRICING[kind].valuePercent,
      );
      const low = Math.max(
        MARKET_PRICING.priceStep,
        roundMoney((base * MARKET_PRICING.askMinPercent) / 100),
      );
      add(
        title,
        kind,
        low,
        Math.max(low, roundMoney((base * MARKET_PRICING.askMaxPercent) / 100)),
        undefined,
        tierIndex > 0,
      );
    });
  return [...entries.values()];
}
export const ITEM_CODEX = createCodex();
export const isCodexKey = (key: unknown): key is string =>
  typeof key === 'string' && ITEM_CODEX.some((entry) => entry.key === key);
