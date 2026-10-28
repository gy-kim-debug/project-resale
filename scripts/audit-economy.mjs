import { build } from 'esbuild';
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

const sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], {
  encoding: 'utf8',
}).trim();
const fingerprint = createHash('sha256');
for (const entry of (
  await readdir('src', { recursive: true, withFileTypes: true })
)
  .filter((e) => e.isFile())
  .sort((a, b) =>
    join(a.parentPath, a.name).localeCompare(join(b.parentPath, b.name)),
  )) {
  const path = join(entry.parentPath, entry.name);
  fingerprint
    .update(path)
    .update('\0')
    .update(await readFile(path))
    .update('\0');
}
const sourceSnapshotHash = fingerprint.digest('hex');
// Analysis only. Runs the production engine; never writes a player's save or changes rules.
await mkdir('work', { recursive: true });
await build({
  entryPoints: [
    'src/domain/engine.ts',
    'src/domain/debt.ts',
    'src/domain/game.ts',
    'src/domain/purchaseBargaining.ts',
    'src/domain/auction.ts',
    'src/domain/instantSale.ts',
    'src/domain/money.ts',
    'src/content/markets.ts',
    'src/content/businesses.ts',
    'src/content/itemProfiles.ts',
    'src/content/rules.ts',
  ],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outdir: 'work/economy-audit',
});
const { newGame, execute, marketValue, checkCost, repairCost, listingLimit } =
  await import('../work/economy-audit/domain/engine.js');
const {
  paymentWeek,
  mandatoryPrincipal,
  interestAmount,
  interestPending,
  settlementAmount,
  weeklyRateText,
} = await import('../work/economy-audit/domain/debt.js');
const { moneyRatio } = await import('../work/economy-audit/domain/money.js');
const { actionsLeft } = await import('../work/economy-audit/domain/game.js');
const { canPurchaseOffer } =
  await import('../work/economy-audit/domain/purchaseBargaining.js');
const { auctionBidOptions } =
  await import('../work/economy-audit/domain/auction.js');
const { instantSalePrice } =
  await import('../work/economy-audit/domain/instantSale.js');
const { MARKETS } = await import('../work/economy-audit/content/markets.js');
const { BUSINESSES, BUSINESS_LIMIT_PER_TYPE } =
  await import('../work/economy-audit/content/businesses.js');
const { RULES, JOBS } = await import('../work/economy-audit/content/rules.js');
const { ITEM_PROFILES } =
  await import('../work/economy-audit/content/itemProfiles.js');
const seeds = Number(process.env.AUDIT_SEEDS ?? 100);
if (!Number.isSafeInteger(seeds) || seeds < 1 || seeds > 1000)
  throw Error('AUDIT_SEEDS must be 1..1000');
const out = process.env.AUDIT_OUTPUT ?? 'work/economy-audit-results';
await mkdir(out, { recursive: true });
const quantile = (values, p) => {
  const a = [...values].sort((x, y) => x - y);
  return a.length ? a[Math.floor((a.length - 1) * p)] : null;
};
const round = (n) => Math.round(n * 10000) / 10000;
// A minimum-payment trajectory with enough external cash, not a claim that the player can fund it.
let debt = newGame(1);
debt.cash = RULES.maxMoney;
debt.stats.peakCash = debt.cash;
const debtCurve = [];
while (debt.status === 'playing' && paymentWeek(debt) <= 30) {
  const week = paymentWeek(debt),
    principal = mandatoryPrincipal(debt),
    interest = interestAmount(debt);
  debtCurve.push({
    week,
    principalBefore: debt.principal,
    rate: weeklyRateText(week),
    requiredPrincipal: principal,
    interest,
    total: principal + interest,
  });
  for (const command of [
    { type: 'startSettlement' },
    ...(principal ? [{ type: 'repay', amount: principal }] : []),
    ...(debt.principal > principal ? [{ type: 'payInterest' }] : []),
  ]) {
    if (debt.status !== 'playing') break;
    const r = execute(debt, command);
    if (!r.ok) throw Error(r.message);
    debt = r.game;
  }
}
const horizon = debtCurve.length;
const businesses = BUSINESSES.map((b) => ({
  ...b,
  weeklyPercent: (b.income / b.cost) * 100,
  breakEvenWeeks: Math.ceil(b.cost / b.income),
  maximumReceiptsByForcedClear: b.income * horizon,
  netCashByForcedClear: b.income * horizon - b.cost,
}));
const population = Object.fromEntries(MARKETS.map((m) => [m.id, []]));
// Hidden values are used only for descriptive population statistics, never by the buying policy.
for (let seed = 1; seed <= 500; seed++) {
  const sample = newGame(seed);
  for (const item of sample.board) {
    if (!item.price) continue;
    population[item.marketId].push({
      kind: item.kind,
      condition: item.condition,
      ratio: marketValue(sample, item) / item.price,
      instantNet: instantSalePrice(item) - item.price - checkCost(sample, item),
    });
  }
}
let strategies = [
  { id: 'work', name: '창고 분류만', jobOnly: true },
  { id: 'serial', name: '보수적 순차 판매', fraction: 0.6, parallel: false },
  {
    id: 'parallel',
    name: '성장형 병렬 판매',
    fraction: 0.9,
    parallel: true,
    counter: true,
  },
  { id: 'instant', name: '흥정 후 즉시 판매', fraction: 0.8, instant: true },
  {
    id: 'business',
    name: '보수적 판매 + 소액 사업',
    fraction: 0.6,
    parallel: false,
    business: true,
  },
];
const requested = process.env.AUDIT_STRATEGIES?.split(',');
if (requested?.includes('parallel-jobs'))
  strategies.push({
    id: 'parallel-jobs',
    name: '병렬 판매 + 대기 중 아르바이트',
    fraction: 0.9,
    parallel: true,
    counter: true,
    workWhileWaiting: true,
  });
for (const id of ['parallel-80', 'parallel-80-jobs']) {
  if (requested?.includes(id))
    strategies.push({
      id,
      name:
        id === 'parallel-80'
          ? '80% 등록 병렬 판매'
          : '80% 등록 병렬 판매 + 대기 중 아르바이트',
      fraction: 0.9,
      parallel: true,
      counter: true,
      askPercent: 80,
      workWhileWaiting: id.endsWith('-jobs'),
    });
}
if (requested) {
  if (requested.some((id) => !strategies.some((policy) => policy.id === id)))
    throw Error('Unknown audit strategy');
  strategies = strategies.filter((policy) => requested.includes(policy.id));
}
const runs = [],
  weeks = [],
  trades = [];
function choose(g, policy) {
  if (interestPending(g))
    return mandatoryPrincipal(g) > 0
      ? { type: 'repay', amount: mandatoryPrincipal(g) }
      : { type: 'payInterest' };
  if (actionsLeft(g) === 0) {
    if (g.inquiries.length) return { type: 'break', id: g.inquiries[0].id };
    return { type: 'startSettlement' };
  }
  if (g.inquiries.length) {
    const q = [...g.inquiries].sort((a, b) => b.price - a.price)[0],
      sale = g.sales.find((s) => s.id === q.saleId);
    if (policy.counter && q.rounds === 0 && sale.price - q.price >= 200)
      return {
        type: 'counter',
        id: q.id,
        price: Math.round((q.price + sale.price) / 200) * 100,
      };
    return { type: 'accept', id: q.id };
  }
  if (g.cash >= g.principal + g.interest)
    return { type: 'repay', amount: g.principal };
  if (policy.jobOnly) return { type: 'job', id: 'warehouse' };
  // Buy businesses only from cash beyond three bills; the purchase itself is free.
  if (
    policy.business &&
    (g.businesses ?? []).length < BUSINESS_LIMIT_PER_TYPE &&
    g.cash > settlementAmount(g) * 3 + BUSINESSES[0].cost
  )
    return { type: 'buyBusiness', id: 'stand' };
  const loose = g.inventory.find(
    (i) => !g.sales.some((s) => s.itemId === i.id),
  );
  if (loose) {
    if (!loose.checked) {
      if (g.cash >= checkCost(g, loose)) return { type: 'check', id: loose.id };
      return { type: 'job', id: 'warehouse' };
    }
    if (
      !loose.repaired &&
      loose.condition !== '양호' &&
      g.cash >= repairCost(loose) &&
      repairCost(loose) <= Math.max(marketValue(g, loose) * 0.2, 1000)
    )
      return { type: 'repair', id: loose.id };
    if (policy.instant || actionsLeft(g) <= 2)
      return { type: 'outletSell', id: loose.id };
    return {
      type: 'post',
      id: loose.id,
      price: Math.max(
        100,
        moneyRatio(marketValue(g, loose), policy.askPercent ?? 100),
      ),
    };
  }
  if (
    g.sales.length &&
    (!policy.parallel ||
      g.sales.length >= listingLimit(g) ||
      actionsLeft(g) < 3)
  )
    return policy.workWhileWaiting
      ? { type: 'job', id: 'warehouse' }
      : { type: 'wait' };
  if (actionsLeft(g) < (policy.instant ? 2 : 4))
    return { type: 'job', id: 'warehouse' };
  const budget = g.cash * policy.fraction;
  // Public asking price, claim tags, chat state and visible auction status only.
  const choices = g.board
    .filter(
      (i) =>
        i.price <= budget &&
        !i.purchaseBargain?.walked &&
        (!i.auction || i.auction.status !== 'withdrawn') &&
        !i.listing?.tags.includes('replica'),
    )
    .sort((a, b) => b.price - a.price);
  const item = choices[0];
  if (item) {
    if (item.auction && item.auction.status !== 'won') {
      const bid = auctionBidOptions(item).find((n) => n <= budget);
      return bid
        ? { type: 'bid', id: item.id, amount: bid }
        : { type: 'withdrawAuction', id: item.id };
    }
    if (
      item.price > 0 &&
      item.negotiation !== 'accepted' &&
      canPurchaseOffer(item)
    )
      return { type: 'offer', id: item.id, price: item.offers[0] };
    return { type: 'buy', id: item.id };
  }
  return g.cash < MARKETS[0].min * 2
    ? { type: 'job', id: 'warehouse' }
    : { type: 'refresh', marketId: 'street' };
}
for (const policy of strategies) {
  for (let seed = 1; seed <= seeds; seed++) {
    let g = newGame(seed),
      commands = 0,
      row = null;
    const costs = new Map(),
      milestones = {};
    while (g.status === 'playing' && commands < 6000) {
      if (!row)
        row = {
          strategy: policy.id,
          seed,
          week: paymentWeek(g),
          startCash: g.cash,
          purchases: 0,
          sales: 0,
          actions: 0,
          expiredListings: 0,
          purchaseSpend: 0,
          saleReceipts: 0,
          jobIncome: 0,
          careFees: 0,
          businessSpend: 0,
          businessIncome: 0,
          otherCash: 0,
          principalPaid: 0,
          interestPaid: 0,
        };
      const command = choose(g, policy),
        before = g,
        result = execute(g, command);
      if (!result.ok)
        throw Error(
          `${policy.id}/${seed}/${JSON.stringify(command)}: ${result.message}`,
        );
      g = result.game;
      commands++;
      row.actions +=
        Math.max(0, (g.minute - before.minute) / 480) *
        (command.type === 'payInterest' ? 0 : 1);
      let explained = 0;
      if (command.type === 'buy') {
        const item = g.inventory.find((i) => i.id === command.id),
          paid = before.cash - g.cash;
        row.purchases++;
        row.purchaseSpend += paid;
        explained -= paid;
        costs.set(item.id, {
          strategy: policy.id,
          seed,
          market: item.marketId ?? 'street',
          purchase: paid,
          fees: 0,
          listedAt: null,
          matchedInquiryWait: null,
          saleWait: null,
        });
        milestones[item.marketId ?? 'street'] ??= paymentWeek(before);
      }
      if (command.type === 'post')
        costs.get(command.id).listedAt = g.sales.find(
          (s) => s.itemId === command.id,
        ).created;
      if (!before.inquiries.length && g.inquiries.length) {
        const matched = g.sales.find((s) => s.id === g.inquiries[0].saleId);
        const record = costs.get(matched.itemId);
        record.matchedInquiryWait = (g.minute - matched.created) / 480;
      }
      row.expiredListings += before.sales.filter(
        (s) =>
          !g.sales.some((next) => next.id === s.id) &&
          g.inventory.some((item) => item.id === s.itemId) &&
          command.type !== 'cancel',
      ).length;
      if (['check', 'repair'].includes(command.type)) {
        const fee = before.cash - g.cash;
        row.careFees += fee;
        explained -= fee;
        costs.get(command.id).fees += fee;
      }
      if (['accept', 'outletSell'].includes(command.type)) {
        const id =
          command.type === 'accept'
            ? before.sales.find(
                (s) =>
                  s.id ===
                  before.inquiries.find((q) => q.id === command.id).saleId,
              ).itemId
            : command.id;
        const receipt = g.cash - before.cash,
          record = costs.get(id);
        if (record.listedAt !== null)
          record.saleWait = (g.minute - record.listedAt) / 480;
        row.sales++;
        row.saleReceipts += receipt;
        explained += receipt;
        trades.push({
          ...record,
          receipt,
          profit: receipt - record.purchase - record.fees,
        });
        costs.delete(id);
      }
      if (command.type === 'job') {
        const pay = JOBS.find((j) => j.id === command.id).reward;
        row.jobIncome += pay;
        explained += pay;
      }
      if (command.type === 'buyBusiness') {
        const cost = BUSINESSES.find((b) => b.id === command.id).cost;
        row.businessSpend += cost;
        explained -= cost;
      }
      if (command.type === 'startSettlement') {
        const income = g.cash - before.cash;
        row.businessIncome += income;
        explained += income;
      }
      if (command.type === 'repay') {
        const paid = before.principal - g.principal;
        row.principalPaid += paid;
        explained -= paid;
      }
      if (command.type === 'payInterest') {
        const paid = before.cash - g.cash;
        row.interestPaid += paid;
        explained -= paid;
      }
      row.otherCash += g.cash - before.cash - explained;
      if (g.interestWeek !== before.interestWeek || g.status !== 'playing') {
        const accounted =
          row.startCash +
          row.saleReceipts +
          row.jobIncome +
          row.businessIncome +
          row.otherCash -
          row.purchaseSpend -
          row.careFees -
          row.businessSpend -
          row.principalPaid -
          row.interestPaid;
        if (accounted !== g.cash) throw Error('cash flow does not reconcile');
        weeks.push({
          ...row,
          endCash: g.cash,
          result: g.status === 'playing' ? 'paid' : g.status,
          inventoryCost: [...costs.values()].reduce(
            (n, c) => n + c.purchase + c.fees,
            0,
          ),
          dueAtEnd: g.status === 'bankrupt' ? settlementAmount(g) : 0,
          inventoryLiquidation: g.inventory.reduce(
            (n, i) => n + instantSalePrice(i),
            0,
          ),
        });
        row = null;
      }
    }
    if (g.status === 'playing') throw Error('policy command cap reached');
    runs.push({
      strategy: policy.id,
      seed,
      status: g.status,
      lastWeek: paymentWeek(g),
      cash: g.cash,
      principal: g.principal,
      commands,
      realizedProfit: trades
        .filter((t) => t.strategy === policy.id && t.seed === seed)
        .reduce((n, t) => n + t.profit, 0),
      milestones,
    });
  }
  process.stdout.write(`${policy.id}: ${seeds} runs completed\n`);
}
const summary = {
  sourceCommit,
  sourceSnapshotHash,
  seedsPerStrategy: seeds,
  populationSeeds: 500,
  rules: { ...RULES, actionsPerWeek: 20 },
  debtCurve,
  businesses,
  allBusinessCost: BUSINESSES.reduce(
    (n, b) => n + b.cost * BUSINESS_LIMIT_PER_TYPE,
    0,
  ),
  allBusinessIncome: BUSINESSES.reduce(
    (n, b) => n + b.income * BUSINESS_LIMIT_PER_TYPE,
    0,
  ),
  itemProfiles: ITEM_PROFILES,
  populationByKind: Object.keys(ITEM_PROFILES).map((kind) => {
    const rows = Object.values(population)
      .flat()
      .filter((item) => item.kind === kind);
    return {
      kind,
      samples: rows.length,
      brokenShare: rows.length
        ? round(
            rows.filter((item) => item.condition === '고장').length /
              rows.length,
          )
        : null,
      medianValueToAsk: quantile(
        rows.map((item) => item.ratio),
        0.5,
      ),
    };
  }),
  realizedTradesByMarket: MARKETS.map((m) => {
    const rows = trades.filter((t) => t.market === m.id);
    return {
      market: m.id,
      trades: rows.length,
      medianPurchase: quantile(
        rows.map((t) => t.purchase),
        0.5,
      ),
      medianProfit: quantile(
        rows.map((t) => t.profit),
        0.5,
      ),
      lossShare: rows.length
        ? round(rows.filter((t) => t.profit < 0).length / rows.length)
        : null,
    };
  }),
  population: MARKETS.map((m) => {
    const p = population[m.id];
    return {
      market: m.id,
      name: m.name,
      min: m.min,
      max: m.max,
      samples: p.length,
      medianMarketToAsking: round(
        quantile(
          p.map((x) => x.ratio),
          0.5,
        ),
      ),
      instantProfitableShare: round(
        p.filter((x) => x.instantNet > 0).length / p.length,
      ),
    };
  }),
  strategies: strategies.map((p) => {
    const r = runs.filter((x) => x.strategy === p.id),
      t = trades.filter((x) => x.strategy === p.id);
    return {
      ...p,
      runs: r.length,
      medianMatchedInquiryWait: quantile(
        t
          .filter((x) => x.matchedInquiryWait !== null)
          .map((x) => x.matchedInquiryWait),
        0.5,
      ),
      expiredListings: weeks
        .filter((w) => w.strategy === p.id)
        .reduce((n, w) => n + w.expiredListings, 0),
      cleared: r.filter((x) => x.status === 'cleared').length,
      bankrupt: r.filter((x) => x.status === 'bankrupt').length,
      medianBankruptWeek: quantile(
        r.filter((x) => x.status === 'bankrupt').map((x) => x.lastWeek),
        0.5,
      ),
      medianClearWeek: quantile(
        r.filter((x) => x.status === 'cleared').map((x) => x.lastWeek),
        0.5,
      ),
      lastWeekP10: quantile(
        r.map((x) => x.lastWeek),
        0.1,
      ),
      lastWeekMedian: quantile(
        r.map((x) => x.lastWeek),
        0.5,
      ),
      lastWeekP90: quantile(
        r.map((x) => x.lastWeek),
        0.9,
      ),
      medianRealizedTradeProfit: quantile(
        t.map((x) => x.profit),
        0.5,
      ),
      lossShare: t.length
        ? round(t.filter((x) => x.profit < 0).length / t.length)
        : null,
      marketEntry: MARKETS.map((m) => ({
        market: m.id,
        runs: r.filter((x) => x.milestones[m.id] !== undefined).length,
        medianWeek: quantile(
          r
            .filter((x) => x.milestones[m.id] !== undefined)
            .map((x) => x.milestones[m.id]),
          0.5,
        ),
      })),
    };
  }),
};
const csv = (rows) => {
  const keys = Object.keys(rows[0]);
  return (
    keys.join(',') +
    '\n' +
    rows
      .map((row) => keys.map((k) => JSON.stringify(row[k] ?? '')).join(','))
      .join('\n') +
    '\n'
  );
};
await writeFile(`${out}/summary.json`, JSON.stringify(summary, null, 2) + '\n');
await writeFile(`${out}/weeks.csv`, csv(weeks));
await writeFile(`${out}/runs.json`, JSON.stringify(runs, null, 2) + '\n');
await writeFile(`${out}/trades.csv`, csv(trades));
process.stdout.write(
  JSON.stringify(
    summary.strategies.map(({ id, cleared, bankrupt, lastWeekMedian }) => ({
      id,
      cleared,
      bankrupt,
      lastWeekMedian,
    })),
  ) + '\n',
);
