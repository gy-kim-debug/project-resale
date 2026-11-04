import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import {
  AVATARS,
  CLOTHING,
  HAIRSTYLES,
  OUTFITS,
  SKINS,
  type PlayerProfile,
} from '../src/content/player';
import { isPlayer } from '../src/domain/player';
import { newGame } from '../src/domain/engine';
import { parseSave } from '../src/storage/saveRepository';
import { PixelCharacter } from '../src/components/PixelCharacter';
const sprite = (player: PlayerProfile) =>
  renderToStaticMarkup(
    createElement(PixelCharacter, { appearance: player.appearance }),
  );
const base: PlayerProfile = {
  nickname: '아바타',
  appearance: { hair: 'short', outfit: 'mint', skin: 'tan' },
};
test('all 900 avatar, hair, garment, color and skin combinations are valid and render distinct choice features', () => {
  let count = 0;
  for (const avatar of Object.keys(AVATARS) as (keyof typeof AVATARS)[])
    for (const hair of Object.keys(HAIRSTYLES) as (keyof typeof HAIRSTYLES)[])
      for (const clothing of Object.keys(CLOTHING) as (keyof typeof CLOTHING)[])
        for (const outfit of Object.keys(OUTFITS) as (keyof typeof OUTFITS)[])
          for (const skin of Object.keys(SKINS) as (keyof typeof SKINS)[]) {
            const p: PlayerProfile = {
              nickname: '아바타',
              appearance: { avatar, hair, clothing, outfit, skin },
            };
            assert.equal(isPlayer(p), true);
            const svg = sprite(p);
            assert.ok(svg.includes(`data-avatar="${avatar}"`));
            assert.ok(svg.includes(`data-clothing="${clothing}"`));
            assert.ok(svg.includes(OUTFITS[outfit].main));
            assert.ok(svg.includes(SKINS[skin].main));
            count++;
          }
  assert.equal(count, 900);
});
test('avatar profiles round-trip independently without changing market RNG, prices or funds', () => {
  const economic = newGame(17);
  for (const avatar of ['female', 'male'] as const)
    for (const clothing of Object.keys(CLOTHING) as (keyof typeof CLOTHING)[]) {
      const p: PlayerProfile = {
        nickname: '새모습',
        appearance: {
          avatar,
          clothing,
          hair: 'ponytail',
          outfit: 'cream',
          skin: 'deep',
        },
      };
      const original = structuredClone(p),
        g = newGame(17, p);
      assert.deepEqual(
        parseSave({ version: 2, game: g, favoriteIds: [] }).game.player,
        p,
      );
      assert.deepEqual(g.board, economic.board);
      assert.equal(g.seed, economic.seed);
      assert.equal(g.cash, economic.cash);
      g.player!.appearance.clothing = 'tshirt';
      assert.deepEqual(p, original);
    }
});
test('legacy profiles remain unchanged and render the original male jacket fallback; invalid optional fields are rejected', () => {
  assert.equal(isPlayer(base), true);
  const original = structuredClone(base);
  const g = parseSave({
    version: 2,
    game: newGame(1, base),
    favoriteIds: [],
  }).game;
  assert.deepEqual(g.player, original);
  assert.equal(g.player!.appearance.avatar, undefined);
  assert.equal(g.player!.appearance.clothing, undefined);
  assert.equal(
    sprite(base),
    sprite({
      ...base,
      appearance: { ...base.appearance, avatar: 'male', clothing: 'jacket' },
    }),
  );
  for (const [key, value] of [
    ['avatar', 'unknown'],
    ['avatar', null],
    ['avatar', '__proto__'],
    ['clothing', 'unknown'],
    ['clothing', 3],
    ['hair', 'unknown'],
    ['outfit', 'unknown'],
    ['skin', 'unknown'],
  ])
    assert.equal(
      isPlayer({
        ...base,
        appearance: { ...base.appearance, [key as string]: value },
      }),
      false,
    );
});
test('body types and each garment produce different actual pixels, while trader sprites ignore player customization', () => {
  const geometry = (p: PlayerProfile) =>
    sprite(p).replace(/ data-[a-z]+="[^"]*"/g, '');
  assert.notEqual(
    geometry({ ...base, appearance: { ...base.appearance, avatar: 'female' } }),
    geometry({ ...base, appearance: { ...base.appearance, avatar: 'male' } }),
  );
  assert.equal(
    new Set(
      (Object.keys(CLOTHING) as (keyof typeof CLOTHING)[]).map((clothing) =>
        geometry({ ...base, appearance: { ...base.appearance, clothing } }),
      ),
    ).size,
    5,
  );
  const npc = (appearance: PlayerProfile['appearance']) =>
    renderToStaticMarkup(
      createElement(PixelCharacter, { variant: 'trader', appearance }),
    );
  assert.equal(
    npc(base.appearance),
    npc({
      avatar: 'female',
      clothing: 'dress',
      hair: 'bob',
      outfit: 'rose',
      skin: 'deep',
    }),
  );
});
