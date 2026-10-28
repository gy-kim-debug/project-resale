import { format } from 'prettier';
import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('work', { recursive: true });
await build({
  entryPoints: [
    'src/content/markets.ts',
    'src/content/productCategories.ts',
    'src/content/itemCases.ts',
  ],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'work/catalog-export',
  outExtension: { '.js': '.mjs' },
});
const { MARKETS } = await import('../work/catalog-export/markets.mjs');
const { PRODUCT_CATEGORIES } =
  await import('../work/catalog-export/productCategories.mjs');
const { ITEM_CASES } = await import('../work/catalog-export/itemCases.mjs');
const won = (n) => `${n.toLocaleString('ko-KR')} 원`;
const rows = [
  '# 시장별 품목·가격표',
  '',
  '콘텐츠 기준 데이터에서 생성한 문서입니다. 수정 후 `node scripts/export-market-catalog.mjs`로 갱신합니다. 가격은 실제 가치가 아닌 판매 게시글의 기본 범위이며, 상태·진위·시장 동향에 따라 개별 물건의 가치가 달라집니다.',
  '',
  '## 시장 범위',
  '',
  '| 시장 | 품목 수 | 최저 | 최고 |',
  '| --- | ---: | ---: | ---: |',
];
for (const m of MARKETS)
  rows.push(
    `| ${m.name} | ${m.products.length} | ${won(m.min)} | ${won(m.max)} |`,
  );
for (const m of MARKETS) {
  rows.push(
    '',
    `## ${m.name}`,
    '',
    '| 세부 카테고리 | 품목 | 최저 게시 가격 | 최고 게시 가격 |',
    '| --- | --- | ---: | ---: |',
  );
  for (const p of m.products)
    rows.push(
      `| ${PRODUCT_CATEGORIES[p.category].label} | ${p.title} | ${won(p.min)} | ${won(p.max)} |`,
    );
}
rows.push(
  '',
  '## 매물 케이스 설정',
  '',
  '같은 품목에서도 케이스가 다릅니다. 일반 매물과 적용 가능한 케이스를 가중 추첨하며, 미개봉/자료 동봉 등의 표기는 무결점·진품 보증이 아닙니다. 기존 물품은 재평가하지 않습니다.',
  '',
  '| 케이스 | 가치 배율 | 게시가 배율 | 품질 롤 이동 | 출현 가중치 |',
  '| --- | ---: | ---: | ---: | ---: |',
);
for (const rule of Object.values(ITEM_CASES))
  rows.push(
    `| ${rule.label} | ${rule.valuePercent}% | ${rule.askPercent}% | ${rule.qualityShift} | ${rule.weight} |`,
  );
await writeFile(
  'docs/design/markets/PRODUCT_CATALOG.md',
  await format(rows.join('\n') + '\n', { parser: 'markdown' }),
);
