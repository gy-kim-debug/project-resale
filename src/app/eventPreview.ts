import type { PlayerProfile } from '../content/player';
import type { EventKind } from '../content/story';
import { newGame } from '../domain/engine';
import { enableStory } from '../domain/story';
import { moneyRatio } from '../domain/money';
import { ACTION_TICK, type Game } from '../domain/game';
/** Self-contained sample trade. Never reads or mutates the player's assets or save. */
export function createEventPreview(
  kind: EventKind,
  player?: PlayerProfile,
): Game {
  const g = enableStory(newGame(42, player));
  g.minute = 3 * ACTION_TICK;
  g.weekActions = 3;
  g.cash = 1_000_000;
  g.stats.peakCash = g.cash;
  for (const item of g.board) item.expires = g.minute + 8 * ACTION_TICK;
  const [item, extra] = g.board.filter(
    (i) => i.marketId === 'street' && i.price > 0,
  );
  const scene = {
    kind,
    step: 0,
    target: item.id,
    name: item.seller,
    resume: { type: 'buy' as const, id: item.id },
  };
  g.story!.active = scene;
  switch (kind) {
    case 'missing':
      g.story!.active = {
        ...scene,
        price: Math.max(100, moneyRatio(item.price, 90)),
      };
      break;
    case 'bundle':
      g.story!.active = {
        ...scene,
        extra: extra.id,
        price: moneyRatio(item.price + extra.price, 95),
      };
      break;
    case 'regular':
      g.story!.contacts = [item.seller];
      break;
    case 'model':
    case 'memory':
      break;
    case 'rehaggle': {
      g.board = g.board.filter((i) => i.id !== item.id);
      g.inventory = [{ ...item, acquiredFor: item.price }];
      g.stats.purchases = 1;
      g.sales = [
        {
          id: 'preview-sale',
          itemId: item.id,
          price: item.price,
          created: g.minute,
          expires: g.minute + 8 * ACTION_TICK,
          nextCheck: g.minute + 8 * ACTION_TICK,
        },
      ];
      g.inquiries = [
        {
          id: 'preview-buyer',
          saleId: 'preview-sale',
          name: '구매자',
          price: item.price,
          max: item.price,
          rounds: 0,
        },
      ];
      g.story!.active = {
        kind,
        step: 0,
        target: 'preview-buyer',
        name: '구매자',
        price: Math.max(100, moneyRatio(item.price, 90)),
        resume: { type: 'accept', id: 'preview-buyer' },
      };
      break;
    }
    case 'competitor': {
      g.board = g.board.filter((i) => ![item.id, extra.id].includes(i.id));
      g.inventory = [item, extra].map((i) => ({ ...i, acquiredFor: i.price }));
      g.stats.purchases = 2;
      g.story!.active = {
        kind,
        step: 0,
        target: item.id,
        targets: [item.id, extra.id],
        name: '거래상',
        price: Math.max(
          100,
          moneyRatio(item.value, 70) + moneyRatio(extra.value, 70),
        ),
      };
      break;
    }
    case 'creditor':
      g.story!.active = { kind, step: 0 };
      break;
  }
  return g;
}
