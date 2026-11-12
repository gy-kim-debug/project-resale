import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INTRO_BEATS, INTRO_SHOTS } from '../src/content/intro';
import { DEFAULT_PLAYER } from '../src/content/player';
import { IntroStage } from '../src/components/IntroStage';
import { newGame, execute } from '../src/domain/engine';
import { enableStory, storyLines } from '../src/domain/story';
import { isGame } from '../src/storage/validation';
import { parseSave } from '../src/storage/saveRepository';

test('cinematic intro has twelve authored cameras, keeps custom identity, and every beat restores without economic changes', () => {
  const player = {
    nickname: '나래',
    appearance: {
      ...DEFAULT_PLAYER.appearance,
      avatar: 'female' as const,
      clothing: 'coat' as const,
      hair: 'ponytail' as const,
    },
  };
  let g = enableStory(newGame(42, player), true);
  const before = structuredClone(g);
  assert.equal(g.story!.active!.introVersion, 2);
  assert.equal(INTRO_BEATS.length, 12);
  assert.deepEqual(
    INTRO_BEATS.map((b) => b.shot),
    Object.keys(INTRO_SHOTS),
  );
  for (let step = 0; step < INTRO_BEATS.length; step++) {
    assert.ok(isGame(g));
    const line = storyLines(g)[step];
    assert.equal(line.shot, INTRO_BEATS[step].shot);
    assert.ok(line.speaker !== '$player');
    if (INTRO_BEATS[step].speaker === '$player')
      assert.equal(line.speaker, '나래');
    const saved = JSON.parse(
      JSON.stringify({ version: 2, game: g, favoriteIds: [] }),
    );
    assert.deepEqual(parseSave(saved).game, g);
    for (const key of [
      'cash',
      'principal',
      'seed',
      'minute',
      'weekActions',
      'stats',
      'inventory',
      'board',
    ] as const)
      assert.deepEqual(g[key], before[key]);
    if (step < INTRO_BEATS.length - 1)
      g = execute(g, { type: 'storyNext' }).game;
  }
  const ended = execute(g, { type: 'storyChoice', choice: 'continue' });
  assert.ok(ended.ok);
  assert.equal(ended.game.story!.active, null);
  assert.equal(
    execute(ended.game, { type: 'storyChoice', choice: 'continue' }).ok,
    false,
  );
});
test('each camera has a fixed viewBox and renders pixel artwork, with the selected player in character shots', () => {
  for (const shot of Object.keys(INTRO_SHOTS) as (keyof typeof INTRO_SHOTS)[]) {
    const html = renderToStaticMarkup(
      createElement(IntroStage, {
        shot,
        appearance: {
          ...DEFAULT_PLAYER.appearance,
          avatar: 'female',
          clothing: 'dress',
          outfit: 'rose',
          skin: 'deep',
        },
      }),
    );
    assert.ok(html.includes(`data-intro-shot="${shot}"`));
    assert.ok(html.includes('viewBox="0 0 240 128"'));
    assert.ok(html.includes('shape-rendering="crispEdges"'));
    if (['family', 'child', 'wake', 'resolve', 'exit'].includes(shot)) {
      assert.ok(html.includes('data-avatar="female"'));
      assert.ok(html.includes('data-style="b-approved-png"'));
      assert.ok(html.includes('<image '));
    }
    assert.ok(!html.includes('<button'));
  }
});
test('existing intro snapshots retain the seven-line story and completed saves never gain a new intro', () => {
  const g = enableStory(newGame(42));
  g.story!.active = { kind: 'intro', step: 4 };
  assert.equal(storyLines(g).length, 7);
  assert.equal(storyLines(g)[4].text, '전화가 끊긴다.');
  assert.ok(isGame(g));
  assert.deepEqual(parseSave({ version: 2, game: g, favoriteIds: [] }).game, g);
  g.story!.active = null;
  assert.equal(enableStory(g, true).story!.active, null);
  const bad = structuredClone(g);
  bad.story!.active = { kind: 'intro', introVersion: 2, step: 12 };
  assert.equal(isGame(bad), false);
  bad.story!.active = { kind: 'success', introVersion: 2, step: 0 };
  assert.equal(isGame(bad), false);
  bad.story!.active = { kind: 'intro', introVersion: 3 as 2, step: 0 };
  assert.equal(isGame(bad), false);
});
