import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { newGame, execute, checkCost } from '../src/domain/engine';
import { AppraisalResult } from '../src/components/AppraisalResult';
const sample = () => {
  const g = newGame(42);
  const item = g.board.shift()!;
  item.acquiredFor = 10000;
  g.inventory = [item];
  g.cash = 1000000;
  g.stats.peakCash = g.cash;
  return { g, item };
};
test('unchecked appraisal cards reveal no hidden price, condition or authenticity', () => {
  const { g, item } = sample();
  item.checked = false;
  item.value = 987654300;
  item.defect = 'HIDDEN';
  assert.equal(
    renderToStaticMarkup(createElement(AppraisalResult, { g, item })),
    '',
  );
});
test('result separates actual value and its purchase delta from changing market price', () => {
  const { g, item } = sample();
  item.checked = true;
  item.value = 8000;
  item.valuationReference = 10000;
  g.marketFactor = 110;
  g.trend = item.kind;
  const html = renderToStaticMarkup(
    createElement(AppraisalResult, { g, item, fee: 300 }),
  );
  assert.ok(html.includes('data-appraisal="value">8,000 원'));
  assert.ok(html.includes('data-appraisal="difference">−2,000 원'));
  assert.ok(html.includes('data-appraisal="market">10,400 원'));
  assert.ok(html.includes('data-appraisal="cost">10,000 원'));
  assert.ok(html.includes('data-appraisal="fee">300 원'));
  assert.ok(html.includes('appraisal-loss'));
});
test('zero and large amounts render exact integer won without inventing an SSS grade or profit payout', () => {
  const { g, item } = sample();
  item.checked = true;
  item.value = 0;
  item.acquiredFor = 0;
  let html = renderToStaticMarkup(createElement(AppraisalResult, { g, item }));
  assert.ok(html.includes('appraisal-even'));
  assert.ok(html.includes('data-appraisal="value">0 원'));
  assert.ok(!html.includes('data-appraisal="fee"'));
  item.value = 900000000000000;
  item.valuationReference = 300000000000000;
  item.acquiredFor = 800000000000000;
  html = renderToStaticMarkup(createElement(AppraisalResult, { g, item }));
  assert.ok(html.includes('900,000,000,000,000 원'));
  assert.ok(html.includes('+100,000,000,000,000 원'));
  assert.ok(!html.includes('SSS'));
  assert.equal(g.cash, 1000000);
});
test('checking still charges the existing fee once with no action, and the result is a read-only view', () => {
  const { g, item } = sample();
  const cost = checkCost(g, item);
  const result = execute(g, { type: 'check', id: item.id });
  assert.equal(result.ok, true);
  assert.equal(result.game.cash, g.cash - cost);
  assert.equal(result.game.weekActions, g.weekActions);
  assert.equal(result.game.minute, g.minute);
  const checked = result.game.inventory[0],
    before = structuredClone(result.game);
  renderToStaticMarkup(
    createElement(AppraisalResult, {
      g: result.game,
      item: checked,
      fee: cost,
    }),
  );
  assert.deepEqual(result.game, before);
  assert.equal(execute(result.game, { type: 'check', id: item.id }).ok, false);
});
