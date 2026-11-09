import { build } from 'esbuild';
import { writeFile } from 'node:fs/promises';
import process from 'node:process';
await build({
  entryPoints: [
    'src/domain/engine.ts',
    'src/storage/validation.ts',
    'src/storage/saveRepository.ts',
  ],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'work/chat-fixture-code',
  outExtension: { '.js': '.mjs' },
});
const { newGame, execute } =
  await import('../work/chat-fixture-code/domain/engine.mjs');
const { isGame } =
  await import('../work/chat-fixture-code/storage/validation.mjs');
const { parseSave } =
  await import('../work/chat-fixture-code/storage/saveRepository.mjs');
const copy = (value) => JSON.parse(JSON.stringify(value));
const basic = newGame(42);
basic.cash = 5000000;
basic.stats.peakCash = basic.cash;
let pending = copy(basic);
const item = pending.board.find(
  (i) => i.marketId === 'street' && i.stateGrade === 'B',
);
pending.inventory = [{ ...item, acquiredFor: item.price }];
pending.board = pending.board.filter((i) => i.id !== item.id);
pending.sales = [
  {
    id: 'sale-1',
    itemId: item.id,
    marketId: 'street',
    price: 100000,
    created: 0,
    expires: 3840,
    nextCheck: 960,
  },
];
pending.inquiries = [
  {
    id: 'buyer-1',
    saleId: 'sale-1',
    name: '채팅구매자',
    price: 80000,
    max: 90000,
    rounds: 0,
  },
];
pending = parseSave({ version: 2, game: pending, favoriteIds: [] }).game;
let legacy = execute(copy(basic), {
  type: 'dialogue',
  id: basic.board[0].id,
  topic: 'greet',
}).game;
delete legacy.chats;
delete legacy.chatSerial;
const fixtures = { basic, pending, legacy };
for (const [name, game] of Object.entries(fixtures)) {
  if (!isGame(game)) throw Error('Invalid chat fixture: ' + name);
  fixtures[name] = { version: 2, game, favoriteIds: [] };
}
await writeFile('work/chat-fixtures.json', JSON.stringify(fixtures));
process.stdout.write('Chat fixtures ready.\n');
