import test from 'node:test';
import assert from 'node:assert/strict';
import {
  listingPresets,
  repaymentPresets,
  selectableAmounts,
} from '../src/app/amountChoices';

test('selectable amounts reject unknown/out-of-range values, round to 100 won and remove duplicates', () => {
  const choices = selectableAmounts(
    [
      { label: 'unknown', amount: null },
      { label: 'low', amount: 0 },
      { label: 'one', amount: 149 },
      { label: 'same', amount: 100 },
      { label: 'two', amount: 150 },
      { label: 'high', amount: 10000 },
      { label: 'bad', amount: Infinity },
    ],
    100,
    500,
  );
  assert.deepEqual(choices, [
    { label: 'one', amount: 100 },
    { label: 'two', amount: 200 },
  ]);
});
test('repayment choices remain affordable and include remaining mandatory principal and full available amount', () => {
  for (const available of [100, 500, 500000, 10000000000]) {
    const choices = selectableAmounts(
      repaymentPresets(available, 100),
      100,
      available,
    );
    assert.ok(choices.some((c) => c.amount === available));
    assert.ok(choices.some((c) => c.amount === 100));
    assert.ok(
      choices.every((c) => c.amount % 100 === 0 && c.amount <= available),
    );
  }
  assert.deepEqual(selectableAmounts(repaymentPresets(0, 50000), 100, 0), []);
  assert.ok(
    !repaymentPresets(10000, 50000).some((p) => p.label === '남은 의무 원금'),
  );
});
test('appraised listing choices include current value while unknown paid items use only purchase cost', () => {
  const known = selectableAmounts(
    listingPresets(100000, 50000, 10000),
    100,
    1e15,
  );
  assert.ok(known.some((c) => c.label === '현재 가치' && c.amount === 100000));
  assert.ok(known.some((c) => c.label === '매입가' && c.amount === 50000));
  const unknown = listingPresets(null, 50000, 10000);
  assert.ok(!unknown.some((c) => c.label.includes('현재 가치')));
  assert.ok(unknown.some((c) => c.amount === 50000));
});
test('unappraised free/scavenged items and known zero-value items always have valid listing choices without hidden value', () => {
  assert.deepEqual(
    selectableAmounts(listingPresets(null, 0, 10000), 100, 1e15).map(
      (c) => c.amount,
    ),
    [5000, 10000, 20000, 50000, 100000],
  );
  assert.deepEqual(selectableAmounts(listingPresets(0, 0, 10000), 100, 1e15), [
    { label: '최소 가격', amount: 100 },
  ]);
});
test('large listing candidates stay exact and obey the existing monetary ceiling', () => {
  const max = 1000000000000000;
  const choices = selectableAmounts(listingPresets(max, max, 10000), 100, max);
  assert.ok(choices.some((c) => c.amount === max));
  assert.ok(
    choices.every(
      (c) =>
        Number.isSafeInteger(c.amount) &&
        c.amount <= max &&
        c.amount % 100 === 0,
    ),
  );
});
