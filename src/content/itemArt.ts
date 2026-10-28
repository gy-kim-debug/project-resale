import type { Kind } from '../domain/game';
import { TIER_TITLES } from './rules';

/** Item art is derived only from the public title, never value, rarity or defects. */
export type Pixel = readonly [
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
];
type Motif =
  | 'lamp'
  | 'keyboard'
  | 'chair'
  | 'radio'
  | 'camera'
  | 'vase'
  | 'stool'
  | 'lens'
  | 'figure'
  | 'pot'
  | 'headphones'
  | 'cabinet'
  | 'record'
  | 'pen'
  | 'stereo'
  | 'laptop'
  | 'sofa'
  | 'watch'
  | 'book'
  | 'mixer'
  | 'art'
  | 'gear'
  | 'watches'
  | 'furniture'
  | 'gallery'
  | 'junk'
  | 'trinket'
  | 'instrument'
  | 'car'
  | 'house'
  | 'plane'
  | 'gem'
  | 'phone'
  | 'tablet'
  | 'monitor'
  | 'desktop'
  | 'console'
  | 'handheld'
  | 'projector';
const motifs: Motif[][] = [
  ['lamp', 'keyboard', 'chair', 'radio', 'camera', 'vase'],
  ['lamp', 'keyboard', 'stool', 'radio', 'lens', 'figure'],
  ['pot', 'headphones', 'cabinet', 'record', 'camera', 'pen'],
  ['stereo', 'laptop', 'sofa', 'watch', 'lens', 'book'],
  ['lamp', 'mixer', 'chair', 'watch', 'camera', 'art'],
  ['vase', 'gear', 'cabinet', 'watches', 'camera', 'art'],
  ['vase', 'gear', 'furniture', 'watches', 'camera', 'gallery'],
  ['vase', 'gear', 'furniture', 'watches', 'camera', 'gallery'],
];
const namedArt = new Map<string, { motif: Motif; tier: number }>();
TIER_TITLES.forEach((titles, tier) =>
  titles.forEach((title, index) =>
    namedArt.set(title, { motif: motifs[tier][index], tier }),
  ),
);
for (const title of ['게이밍 노트북', '크리에이터 노트북'])
  namedArt.set(title, { motif: 'laptop', tier: 2 });
for (const title of [
  '조립 데스크톱',
  '미니 PC',
  '사무용 워크스테이션',
  '소형 서버',
])
  namedArt.set(title, { motif: 'desktop', tier: 2 });
for (const title of ['플래그십 스마트폰', '폴더블 스마트폰'])
  namedArt.set(title, { motif: 'phone', tier: 2 });
namedArt.set('태블릿 PC', { motif: 'tablet', tier: 2 });
for (const title of ['고해상도 모니터', '대형 OLED TV'])
  namedArt.set(title, { motif: 'monitor', tier: 2 });
for (const title of ['미러리스 카메라', '액션 카메라'])
  namedArt.set(title, { motif: 'camera', tier: 2 });
namedArt.set('콘솔 게임기', { motif: 'console', tier: 2 });
namedArt.set('휴대용 게임기', { motif: 'handheld', tier: 2 });
namedArt.set('노이즈캔슬링 헤드폰', { motif: 'headphones', tier: 2 });
namedArt.set('프리미엄 오디오', { motif: 'stereo', tier: 2 });
namedArt.set('빔프로젝터', { motif: 'projector', tier: 2 });
namedArt.set('근현대 회화', { motif: 'art', tier: 6 });
namedArt.set('희귀 도자기', { motif: 'vase', tier: 6 });
namedArt.set('고급 기계식 시계', { motif: 'watch', tier: 6 });
namedArt.set('앤티크 조각상', { motif: 'figure', tier: 6 });
namedArt.set('천연 다이아몬드', { motif: 'gem', tier: 6 });
namedArt.set('희귀 보석 목걸이', { motif: 'gem', tier: 6 });
namedArt.set('입문용 카메라', { motif: 'camera', tier: 0 });
namedArt.set('수집한 생활 잡화', { motif: 'junk', tier: 0 });
namedArt.set('수집한 낡은 소품', { motif: 'trinket', tier: 0 });
export function itemArt(title: string, kind: Kind): Pixel[] {
  const spec = namedArt.get(title) ?? {
    motif:
      kind === '악기'
        ? 'instrument'
        : kind === '자동차'
          ? 'car'
          : kind === '부동산'
            ? 'house'
            : kind === '항공기'
              ? 'plane'
              : kind === '가구'
                ? 'chair'
                : kind === '디지털'
                  ? 'gear'
                  : kind === '수집품'
                    ? 'trinket'
                    : 'junk',
    tier: 0,
  };
  return draw(spec.motif, spec.tier);
}
export const illustratedTitles = () => [...namedArt.keys()];
function draw(motif: Motif, tier: number): Pixel[] {
  const pixels: Pixel[] = [];
  const ink = '#202a29',
    dark = '#424b46',
    paper = '#e5d8b4',
    light = '#fff0c9',
    wood = '#aa7851',
    woodLight = '#d4a574',
    woodDark = '#714c3b',
    blue = '#7c9a9a',
    glass = '#b7d7c4',
    red = '#b76950';
  const colors = [
    '#adba89',
    '#8caeb0',
    '#c7a77c',
    '#97ada4',
    '#c0a16b',
    '#ba9c73',
    '#ab9877',
    '#d7bb78',
  ];
  const main = colors[tier],
    trim = tier > 3 ? '#e4c488' : '#a9bb9d';
  const r = (x: number, y: number, w: number, h: number, c: string) => {
    pixels.push([x, y, w, h, c]);
  };
  const outline = (x: number, y: number, w: number, h: number, c: string) => {
    r(x, y, w, h, ink);
    r(x + 1, y + 1, w - 2, h - 2, c);
  };
  const knobs = (x: number, y: number, count: number) => {
    for (let n = 0; n < count; n++) {
      r(x + n * 4, y, 2, 2, paper);
      r(x + n * 4, y + 1, 1, 1, woodDark);
    }
  };
  r(5, 29, 22, 1, '#00000035');
  switch (motif) {
    case 'phone':
      outline(9, 2, 14, 26, dark);
      r(11, 5, 10, 18, blue);
      r(12, 6, 8, 7, glass);
      r(12, 15, 3, 3, main);
      r(17, 15, 3, 3, paper);
      r(14, 3, 4, 1, ink);
      r(15, 25, 2, 1, paper);
      break;
    case 'tablet':
      outline(5, 3, 22, 25, dark);
      r(7, 5, 18, 20, blue);
      r(8, 6, 16, 9, glass);
      r(9, 18, 5, 5, main);
      r(17, 18, 5, 5, paper);
      r(15, 26, 2, 1, paper);
      break;
    case 'monitor':
      outline(2, 5, 28, 19, dark);
      r(4, 7, 24, 14, blue);
      r(5, 8, 14, 8, glass);
      r(17, 14, 10, 6, main);
      r(14, 24, 4, 3, ink);
      r(9, 27, 14, 2, dark);
      break;
    case 'desktop':
      outline(2, 8, 19, 15, dark);
      r(4, 10, 15, 10, blue);
      r(5, 11, 9, 5, glass);
      r(10, 23, 3, 3, ink);
      r(6, 26, 11, 2, dark);
      outline(22, 4, 8, 24, dark);
      r(24, 7, 4, 2, paper);
      r(24, 12, 4, 1, blue);
      r(24, 17, 4, 6, ink);
      r(25, 18, 2, 2, main);
      break;
    case 'console':
      outline(4, 3, 11, 25, paper);
      r(6, 5, 2, 20, blue);
      r(11, 6, 2, 18, dark);
      outline(16, 17, 14, 9, dark);
      r(18, 16, 10, 3, dark);
      r(18, 20, 5, 1, paper);
      r(20, 18, 1, 5, paper);
      r(26, 19, 2, 2, red);
      r(24, 22, 2, 2, blue);
      break;
    case 'handheld':
      outline(2, 10, 28, 15, dark);
      r(8, 12, 16, 11, blue);
      r(9, 13, 14, 6, glass);
      r(3, 12, 4, 11, main);
      r(25, 12, 4, 11, red);
      r(4, 16, 2, 1, ink);
      r(5, 15, 1, 3, ink);
      r(26, 15, 2, 2, paper);
      r(26, 20, 2, 2, ink);
      break;
    case 'projector':
      outline(3, 12, 26, 14, paper);
      r(5, 10, 22, 3, dark);
      r(5, 15, 10, 7, main);
      for (let x = 6; x < 15; x += 3) r(x, 16, 1, 5, dark);
      outline(18, 14, 9, 9, ink);
      r(20, 16, 5, 5, blue);
      r(21, 17, 2, 2, glass);
      r(5, 26, 3, 2, ink);
      r(25, 26, 3, 2, ink);
      break;
    case 'lamp':
      r(14, 4, 4, 2, ink);
      r(11, 6, 10, 2, ink);
      r(9, 8, 14, 2, ink);
      r(7, 10, 18, 3, ink);
      r(9, 9, 14, 3, main);
      r(11, 7, 10, 2, trim);
      r(8, 12, 16, 2, paper);
      r(10, 14, 12, 2, '#cfa96c');
      r(15, 15, 3, 10, ink);
      r(16, 15, 1, 10, trim);
      r(11, 25, 11, 2, ink);
      r(8, 27, 17, 2, ink);
      r(10, 26, 13, 2, main);
      r(11, 27, 9, 1, paper);
      break;
    case 'keyboard':
      outline(3, 10, 26, 15, dark);
      r(5, 11, 22, 1, blue);
      r(5, 23, 22, 1, '#596c63');
      for (let y = 13; y <= 19; y += 3)
        for (let x = 5; x <= 25; x += 3) {
          r(x, y, 2, 2, main);
          r(x, y, 2, 1, paper);
        }
      r(10, 22, 12, 1, main);
      r(22, 19, 5, 2, red);
      r(15, 7, 1, 3, ink);
      r(15, 6, 7, 1, ink);
      break;
    case 'chair':
      outline(8, 4, 16, 14, woodDark);
      r(10, 6, 12, 9, wood);
      r(11, 6, 2, 9, woodLight);
      r(17, 6, 2, 9, woodLight);
      r(7, 17, 18, 5, ink);
      r(8, 18, 16, 3, woodLight);
      r(8, 22, 3, 7, ink);
      r(9, 22, 1, 6, wood);
      r(21, 22, 3, 7, ink);
      r(21, 22, 1, 6, wood);
      r(10, 25, 12, 1, woodDark);
      break;
    case 'stool':
      r(6, 12, 20, 2, ink);
      r(4, 14, 24, 5, ink);
      r(6, 13, 20, 4, woodLight);
      r(6, 16, 20, 2, wood);
      r(7, 19, 3, 10, woodDark);
      r(23, 19, 3, 10, woodDark);
      r(10, 19, 2, 5, wood);
      r(20, 19, 2, 5, wood);
      r(9, 25, 15, 1, wood);
      break;
    case 'radio':
      outline(5, 9, 23, 18, woodDark);
      r(7, 11, 19, 1, woodLight);
      r(7, 12, 11, 12, dark);
      for (let x = 8; x < 18; x += 2) r(x, 13, 1, 10, wood);
      outline(20, 12, 5, 4, main);
      knobs(20, 19, 2);
      r(7, 27, 3, 2, ink);
      r(23, 27, 3, 2, ink);
      r(8, 8, 1, 2, ink);
      r(9, 7, 2, 1, blue);
      r(11, 6, 2, 1, blue);
      r(13, 5, 2, 1, blue);
      r(15, 4, 2, 1, paper);
      break;
    case 'camera':
      r(5, 10, 23, 15, ink);
      r(7, 8, 7, 3, ink);
      r(8, 9, 5, 2, dark);
      r(6, 11, 21, 3, main);
      r(6, 14, 21, 9, dark);
      r(7, 15, 4, 7, ink);
      r(24, 14, 3, 9, ink);
      r(13, 13, 10, 11, ink);
      r(11, 15, 14, 7, ink);
      r(14, 14, 8, 9, blue);
      r(13, 16, 10, 5, blue);
      r(15, 16, 6, 5, ink);
      r(16, 16, 3, 2, glass);
      r(18, 19, 2, 1, '#597f86');
      r(23, 11, 3, 2, light);
      r(14, 10, 5, 2, paper);
      if (tier >= 4) {
        r(2, 16, 3, 9, woodDark);
        r(3, 17, 1, 7, woodLight);
        r(27, 25, 2, 3, woodDark);
      }
      break;
    case 'lens':
      r(9, 7, 15, 2, ink);
      r(6, 10, 19, 15, ink);
      r(5, 13, 22, 9, ink);
      r(8, 9, 15, 1, dark);
      r(7, 12, 18, 11, dark);
      r(8, 14, 16, 7, blue);
      r(10, 12, 12, 11, blue);
      r(11, 14, 10, 7, ink);
      r(13, 13, 6, 9, ink);
      r(12, 15, 4, 2, glass);
      r(17, 19, 3, 1, '#6a9296');
      r(24, 14, 1, 7, paper);
      r(7, 25, 18, 2, ink);
      break;
    case 'vase':
      r(12, 4, 8, 2, ink);
      r(13, 6, 6, 6, ink);
      r(11, 12, 10, 2, ink);
      r(8, 14, 16, 3, ink);
      r(7, 17, 18, 6, ink);
      r(9, 23, 14, 3, ink);
      r(11, 26, 10, 2, ink);
      r(14, 6, 4, 6, main);
      r(12, 13, 8, 2, main);
      r(9, 15, 14, 8, main);
      r(10, 23, 12, 2, main);
      r(11, 16, 2, 6, paper);
      r(10, 19, 12, 2, trim);
      r(15, 17, 2, 2, woodDark);
      r(14, 21, 4, 1, woodDark);
      if (tier >= 5) {
        r(5, 11, 3, 6, wood);
        r(24, 11, 3, 6, wood);
        r(5, 10, 5, 2, wood);
        r(22, 10, 5, 2, wood);
        r(10, 27, 12, 2, woodDark);
      }
      break;
    case 'figure':
      r(11, 3, 10, 2, ink);
      r(9, 5, 14, 10, ink);
      r(11, 4, 10, 9, main);
      r(10, 8, 12, 5, main);
      r(12, 9, 2, 2, ink);
      r(18, 9, 2, 2, ink);
      r(14, 12, 4, 1, red);
      r(9, 15, 14, 9, ink);
      r(6, 16, 3, 7, ink);
      r(23, 16, 3, 7, ink);
      r(10, 16, 12, 7, blue);
      r(12, 17, 2, 3, paper);
      r(11, 24, 4, 4, ink);
      r(17, 24, 4, 4, ink);
      r(8, 28, 16, 1, trim);
      break;
    case 'pot':
      r(10, 6, 12, 2, ink);
      r(14, 4, 4, 2, ink);
      r(8, 8, 16, 3, ink);
      r(9, 9, 14, 1, paper);
      outline(7, 11, 18, 14, blue);
      r(4, 13, 3, 5, ink);
      r(25, 13, 3, 5, ink);
      r(3, 13, 3, 2, trim);
      r(26, 13, 3, 2, trim);
      r(9, 13, 2, 9, glass);
      r(11, 22, 11, 1, dark);
      r(8, 25, 16, 2, ink);
      break;
    case 'headphones':
      r(10, 4, 12, 3, ink);
      r(7, 7, 4, 4, ink);
      r(21, 7, 4, 4, ink);
      r(5, 11, 4, 12, ink);
      r(23, 11, 4, 12, ink);
      r(10, 5, 12, 2, main);
      r(8, 8, 2, 4, main);
      r(22, 8, 2, 4, main);
      outline(4, 17, 8, 10, dark);
      outline(20, 17, 8, 10, dark);
      r(7, 18, 3, 7, blue);
      r(21, 18, 3, 7, blue);
      r(5, 20, 1, 4, paper);
      r(26, 20, 1, 4, paper);
      break;
    case 'cabinet':
      outline(5, 4, 22, 23, wood);
      r(7, 6, 18, 2, woodLight);
      r(15, 9, 1, 15, woodDark);
      r(7, 10, 7, 7, woodLight);
      r(17, 10, 8, 7, woodLight);
      r(7, 19, 7, 5, woodDark);
      r(17, 19, 8, 5, woodDark);
      r(12, 12, 1, 3, paper);
      r(18, 12, 1, 3, paper);
      r(7, 27, 3, 2, ink);
      r(22, 27, 3, 2, ink);
      break;
    case 'record':
      outline(3, 8, 18, 20, main);
      r(5, 10, 14, 16, woodDark);
      r(6, 11, 12, 2, paper);
      r(7, 16, 9, 5, blue);
      r(16, 7, 7, 2, ink);
      r(13, 9, 13, 3, ink);
      r(12, 12, 15, 10, ink);
      r(14, 22, 11, 3, ink);
      r(17, 25, 5, 1, ink);
      r(15, 11, 9, 1, dark);
      r(13, 14, 1, 6, dark);
      r(17, 14, 6, 6, red);
      r(19, 16, 2, 2, paper);
      r(24, 13, 1, 7, dark);
      break;
    case 'pen':
      outline(4, 21, 24, 7, woodDark);
      r(6, 23, 20, 2, paper);
      for (let n = 0; n < 13; n++) {
        r(8 + n, 19 - n, 3, 3, ink);
        r(9 + n, 19 - n, 1, 2, main);
      }
      r(20, 5, 4, 4, trim);
      r(21, 5, 2, 1, light);
      r(7, 21, 3, 2, ink);
      r(6, 23, 2, 1, woodDark);
      break;
    case 'stereo':
      outline(2, 8, 8, 19, woodDark);
      outline(22, 8, 8, 19, woodDark);
      outline(10, 13, 12, 13, dark);
      r(4, 11, 4, 4, ink);
      r(4, 18, 4, 6, ink);
      r(23, 11, 5, 4, ink);
      r(23, 18, 5, 6, ink);
      r(5, 20, 2, 2, blue);
      r(25, 20, 2, 2, blue);
      r(12, 15, 8, 3, main);
      knobs(12, 21, 2);
      break;
    case 'laptop':
      outline(5, 5, 22, 17, dark);
      r(7, 7, 18, 12, blue);
      r(8, 8, 7, 3, glass);
      r(9, 12, 13, 1, '#a8bfc0');
      r(9, 15, 8, 1, paper);
      r(4, 22, 24, 3, ink);
      r(2, 25, 28, 3, ink);
      r(5, 23, 22, 3, main);
      r(11, 26, 10, 1, paper);
      break;
    case 'sofa':
      outline(6, 10, 20, 10, main);
      r(8, 12, 7, 7, trim);
      r(17, 12, 7, 7, trim);
      outline(3, 17, 26, 10, main);
      r(6, 20, 20, 4, trim);
      r(15, 20, 1, 4, dark);
      r(4, 18, 3, 6, dark);
      r(25, 18, 3, 6, dark);
      r(6, 27, 3, 2, woodDark);
      r(23, 27, 3, 2, woodDark);
      break;
    case 'watch':
      r(12, 2, 8, 8, ink);
      r(13, 3, 6, 6, woodDark);
      r(12, 23, 8, 7, ink);
      r(13, 24, 6, 5, woodDark);
      r(9, 10, 14, 14, ink);
      r(7, 13, 18, 8, ink);
      r(10, 11, 12, 12, trim);
      r(9, 14, 14, 6, trim);
      r(11, 13, 10, 8, paper);
      r(13, 12, 6, 10, paper);
      r(15, 14, 1, 5, ink);
      r(15, 18, 4, 1, ink);
      r(24, 15, 2, 3, wood);
      r(13, 4, 6, 1, woodLight);
      break;
    case 'book':
      outline(7, 4, 19, 24, woodDark);
      r(8, 5, 3, 21, red);
      r(12, 5, 12, 20, main);
      r(12, 25, 12, 2, paper);
      r(14, 9, 8, 1, trim);
      r(14, 11, 8, 1, trim);
      r(16, 15, 4, 4, woodDark);
      r(14, 22, 8, 1, paper);
      r(25, 6, 1, 19, woodLight);
      break;
    case 'mixer':
      outline(3, 8, 26, 19, dark);
      r(5, 10, 22, 3, blue);
      for (let x = 6; x < 27; x += 4) {
        r(x, 15, 1, 8, ink);
        r(x - 1, 17 + (x % 3), 3, 2, main);
        r(x - 1, 24, 3, 1, paper);
      }
      r(5, 11, 5, 1, glass);
      r(19, 11, 6, 1, red);
      r(8, 5, 1, 3, ink);
      r(22, 5, 1, 3, ink);
      break;
    case 'art':
      outline(5, 4, 22, 24, woodDark);
      r(6, 5, 20, 22, trim);
      r(8, 7, 16, 18, paper);
      r(9, 8, 14, 16, blue);
      r(11, 10, 3, 3, light);
      r(14, 19, 8, 5, main);
      r(16, 16, 4, 3, main);
      r(17, 14, 2, 2, main);
      r(9, 22, 8, 2, woodDark);
      break;
    case 'gear':
      outline(3, 6, 12, 21, dark);
      r(5, 8, 8, 4, blue);
      knobs(5, 15, 2);
      r(5, 21, 7, 3, ink);
      outline(17, 10, 12, 17, woodDark);
      r(19, 12, 8, 4, main);
      r(19, 18, 8, 1, paper);
      r(19, 21, 3, 3, blue);
      r(24, 21, 3, 3, dark);
      r(8, 3, 1, 3, ink);
      r(23, 6, 1, 4, ink);
      break;
    case 'watches':
      outline(2, 7, 28, 21, woodDark);
      r(4, 9, 24, 16, main);
      for (let x = 5; x < 27; x += 8) {
        r(x + 1, 10, 4, 14, ink);
        r(x + 2, 10, 2, 14, woodLight);
        r(x, 14, 6, 6, ink);
        r(x + 1, 15, 4, 4, paper);
        r(x + 3, 15, 1, 3, ink);
      }
      r(4, 25, 24, 1, trim);
      break;
    case 'furniture':
      outline(3, 4, 14, 22, woodDark);
      r(5, 6, 10, 7, wood);
      r(5, 15, 10, 8, wood);
      r(11, 9, 2, 2, trim);
      r(11, 18, 2, 2, trim);
      outline(19, 12, 10, 10, wood);
      r(18, 22, 12, 4, woodLight);
      r(19, 26, 2, 3, ink);
      r(27, 26, 2, 3, ink);
      r(5, 26, 2, 3, ink);
      r(13, 26, 2, 3, ink);
      break;
    case 'gallery':
      outline(2, 6, 14, 19, woodDark);
      r(3, 7, 12, 17, trim);
      r(5, 9, 8, 13, blue);
      r(7, 11, 3, 3, paper);
      r(6, 19, 6, 3, main);
      outline(17, 3, 13, 23, woodDark);
      r(18, 4, 11, 21, trim);
      r(20, 6, 7, 17, paper);
      r(22, 10, 3, 6, red);
      r(21, 17, 5, 3, wood);
      r(4, 26, 24, 2, woodDark);
      break;
    case 'gem':
      r(9, 6, 14, 3, glass);
      r(5, 9, 22, 5, blue);
      r(8, 14, 16, 4, glass);
      r(11, 18, 10, 4, blue);
      r(14, 22, 4, 5, glass);
      r(14, 8, 4, 14, light);
      r(6, 12, 20, 2, paper);
      r(23, 3, 2, 5, light);
      r(21, 5, 6, 1, light);
      break;
    case 'instrument':
      r(14, 2, 4, 17, wood);
      r(13, 2, 6, 3, trim);
      outline(8, 16, 16, 12, wood);
      r(10, 14, 12, 9, woodLight);
      r(15, 5, 2, 19, paper);
      r(12, 23, 8, 2, ink);
      r(13, 18, 6, 4, dark);
      break;
    case 'car':
      outline(3, 16, 27, 9, main);
      r(8, 10, 15, 7, main);
      r(10, 11, 10, 5, glass);
      r(16, 11, 1, 5, ink);
      r(6, 23, 6, 5, ink);
      r(22, 23, 6, 5, ink);
      r(3, 18, 3, 3, light);
      r(27, 18, 3, 3, red);
      break;
    case 'house':
      r(5, 12, 23, 16, paper);
      r(9, 7, 15, 5, wood);
      r(13, 3, 7, 4, woodDark);
      r(3, 12, 27, 3, woodDark);
      r(8, 17, 5, 5, glass);
      r(21, 17, 5, 5, glass);
      r(15, 19, 5, 9, dark);
      break;
    case 'plane':
      r(14, 2, 4, 26, paper);
      r(12, 7, 8, 8, paper);
      r(3, 14, 26, 5, paper);
      r(7, 11, 18, 4, paper);
      r(9, 24, 14, 3, main);
      r(15, 5, 2, 4, blue);
      r(8, 18, 3, 4, dark);
      r(22, 18, 3, 4, dark);
      break;
    case 'junk':
      outline(4, 17, 17, 11, woodDark);
      r(5, 18, 15, 3, wood);
      r(7, 16, 2, 11, woodLight);
      r(12, 16, 2, 11, woodLight);
      r(17, 16, 2, 11, woodLight);
      r(20, 11, 8, 15, ink);
      r(22, 9, 4, 3, ink);
      r(21, 13, 6, 12, blue);
      r(22, 14, 2, 9, glass);
      r(22, 9, 4, 2, trim);
      r(8, 12, 6, 5, dark);
      r(9, 11, 4, 1, paper);
      break;
    case 'trinket':
      outline(5, 17, 15, 11, woodDark);
      r(6, 18, 13, 3, woodLight);
      r(7, 21, 11, 6, wood);
      r(12, 20, 2, 3, trim);
      r(21, 9, 6, 18, ink);
      r(22, 10, 4, 15, main);
      r(20, 7, 8, 5, ink);
      r(21, 8, 6, 3, trim);
      r(23, 14, 2, 2, paper);
      r(22, 20, 4, 2, woodDark);
      break;
  }
  return pixels;
}
