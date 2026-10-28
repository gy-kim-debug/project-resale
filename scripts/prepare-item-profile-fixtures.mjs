import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('work', { recursive: true });
await build({
  entryPoints: [
    'src/domain/engine.ts',
    'src/content/itemProfiles.ts',
    'src/content/listingTags.ts',
  ],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'work/profile-ui',
});
const { newGame } = await import('../work/profile-ui/domain/engine.js');
const { ITEM_PROFILES } =
  await import('../work/profile-ui/content/itemProfiles.js');
const { KIND_TAGS } = await import('../work/profile-ui/content/listingTags.js');
const markets = {
  생활: 'street',
  디지털: 'computers',
  가구: 'street',
  수집품: 'street',
  악기: 'instruments',
  자동차: 'cars',
  부동산: 'property',
};
const cases = [];
for (const [kind, marketId] of Object.entries(markets)) {
  const game = newGame(17);
  const item = game.board.shift();
  const profile = ITEM_PROFILES[kind];
  Object.assign(item, {
    kind,
    marketId,
    base: 100000,
    value: profile.brokenValuePercent * 1000,
    condition: '고장',
    checked: false,
    repaired: false,
    acquiredFor: 10000,
    title: `확인용 ${kind}`,
    defect: profile.brokenDescription,
  });
  delete item.special;
  delete item.auction;
  item.listing = {
    tags: [KIND_TAGS[kind], 'authentic', 'negotiable'],
    facts: {
      authentic: true,
      limited: false,
      discontinued: false,
      vintage: false,
      seller: 'negotiable',
    },
  };
  game.inventory = [item];
  game.seed = 1000;
  game.marketFactor = 100;
  game.trend = kind;
  cases.push({
    kind,
    checkFee: profile.checkPercent * 1000,
    repairFee: profile.repairPercent * 1000,
    value: item.value,
    defect: item.defect,
    repairedDescription: profile.repairedDescription,
    save: { version: 2, game, favoriteIds: [] },
  });
}
const fake = globalThis.structuredClone(cases.find((c) => c.kind === '수집품'));
fake.save.game.inventory[0].listing.facts.authentic = false;
fake.save.game.inventory[0].base = 5000;
fake.save.game.inventory[0].value = 1500;
fake.checkFee = 100;
fake.repairFee = 800;
fake.value = 1500;
fake.fake = true;
fake.save.game.inventory[0].defect = '가품. 비정상 요소가 확인됐습니다.';
fake.defect = fake.save.game.inventory[0].defect;
cases.push(fake);
await writeFile('work/item-profile-ui.json', JSON.stringify(cases));
