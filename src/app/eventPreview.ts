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
  variant: 0 | 1 | 2 = 0,
): Game {
  const g = enableStory(newGame(42, player));
  g.minute = 3 * ACTION_TICK;
  g.weekActions = 3;
  g.cash = 1_000_000;
  g.stats.peakCash = g.cash;
  for (const item of g.board) item.expires = g.minute + 8 * ACTION_TICK;
  const sample = g.board.filter((i) => i.marketId === 'street' && i.price > 0);
  const item =
    kind === 'collector'
      ? (sample.find((i) => i.kind === '수집품') ??
        g.board.find((i) => i.kind === '수집품') ??
        sample[0])
      : sample[0];
  const extra = sample.find((i) => i.id !== item.id)!;
  const scene = {
    kind,
    step: 0,
    target: item.id,
    name: item.seller,
    resume: { type: 'buy' as const, id: item.id },
  };
  g.story!.active = scene;
  switch (kind) {
    case 'parcelPacking':
    case 'parcelDispatch':
      item.delivery = { available: 'parcel', selected: 'parcel' };
      g.story!.active = {
        ...scene,
        tradeMethod: 'parcel',
        price: Math.max(100, moneyRatio(item.price, 95)),
      };
      break;
    case 'rush':
    case 'missing':
      g.story!.active = {
        ...scene,
        price: Math.max(100, moneyRatio(item.price, kind === 'rush' ? 95 : 90)),
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
    case 'appointment':
    case 'scam':
      break;
    case 'parcelPhotos':
    case 'parcelAddress':
    case 'inspection':
    case 'reservation':
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
      const parcel = kind === 'parcelPhotos' || kind === 'parcelAddress';
      if (parcel) g.sales[0].delivery = 'parcel';
      g.inquiries = [
        {
          ...(parcel ? { delivery: 'parcel' as const } : {}),
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
        ...(parcel ? { tradeMethod: 'parcel' as const } : {}),
        step: 0,
        target: 'preview-buyer',
        name: '구매자',
        price:
          kind === 'rehaggle' || kind === 'parcelPhotos'
            ? Math.max(
                100,
                moneyRatio(item.price, kind === 'parcelPhotos' ? 95 : 90),
              )
            : item.price,
        resume: { type: 'accept', id: 'preview-buyer' },
      };
      break;
    }
    case 'collector':
    case 'referral':
    case 'reunion':
    case 'returnBuyer':
    case 'competitor': {
      g.board = g.board.filter((i) => ![item.id, extra.id].includes(i.id));
      g.inventory = [item, extra].map((i) => ({ ...i, acquiredFor: i.price }));
      g.stats.purchases = 2;
      if (kind === 'collector') {
        g.inventory[0].checked = true;
        g.stats.checks = 1;
      }
      g.story!.active = {
        kind,
        step: 0,
        target: item.id,
        ...(kind === 'competitor' ? { targets: [item.id, extra.id] } : {}),
        name:
          kind === 'collector'
            ? '수집가'
            : kind === 'referral'
              ? '소개받은 구매자'
              : kind === 'reunion'
                ? item.seller
                : kind === 'returnBuyer'
                  ? '예약 구매자'
                  : '거래상',
        price: Math.max(
          100,
          moneyRatio(
            item.value,
            kind === 'collector' ? 90 : kind === 'competitor' ? 70 : 85,
          ) + (kind === 'competitor' ? moneyRatio(extra.value, 70) : 0),
        ),
      };
      break;
    }
    case 'marketTip':
      g.story!.active = {
        kind,
        step: 0,
        marketId: 'computers',
        name: '거래 지인',
      };
      break;
    case 'creditor':
      g.story!.active = { kind, step: 0 };
      break;
  }
  g.story!.active!.variant = variant;
  return g;
}
