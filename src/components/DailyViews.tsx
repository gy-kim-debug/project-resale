import { useState } from 'react';
import {
  DAILY_RULES,
  STOCKS,
  stockDefinition,
  WALK_EVENTS,
} from '../content/daily';
import { dailyState, sharePrice, stockFee } from '../domain/daily';
import { actionsLeft, weekOf, won, type Game } from '../domain/game';
import { Button, type Open } from './GameViews';
import type { Act } from '../app/store';
import { Icon, type IconName } from './Icon';

const dailyCards = [
  { title: '복권', icon: 'ticket', text: '이번 주의 작은 기대' },
  { title: '주식', icon: 'chart', text: '주간 시세와 보유 종목' },
  { title: '아르바이트', icon: 'wallet', text: '20,000 원', cost: true },
  { title: '산책', icon: 'walk', text: '잠깐 바람 쐬기', cost: true },
] as const;
export function DailyTabView({ g, open }: { g: Game; open: Open }) {
  const d = dailyState(g);
  return (
    <>
      <div className="page-heading">
        <h1>일상</h1>
      </div>
      <div className="daily-overview">
        <span>{weekOf(g)}주차</span>
        <span>
          복권 {d.tickets.count}/{DAILY_RULES.lotteryLimit}장
        </span>
      </div>
      <div className="daily-grid">
        {dailyCards.map((c) => (
          <button
            className="daily-card"
            key={c.title}
            onClick={() => open({ kind: c.title })}
          >
            <span className={`daily-symbol daily-symbol-${c.icon}`}>
              <Icon name={c.icon as IconName} size={27} />
            </span>
            <strong>
              {c.title}
              {'cost' in c && (
                <span className="action-cost" aria-label="행동 1회">
                  <Icon name="activity" size={16} />
                </span>
              )}
            </strong>
            <small>{c.text}</small>
            <span className="daily-arrow" aria-hidden="true">
              ↗
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
export function LotteryView({ g, act }: { g: Game; act: Act }) {
  const d = dailyState(g),
    left = DAILY_RULES.lotteryLimit - d.tickets.count;
  return (
    <>
      <section className="card lottery-ticket">
        <span className="eyebrow">{weekOf(g)}주차 복권</span>
        <Icon name="ticket" size={42} />
        <h2>한 장의 기대</h2>
        <strong className="daily-big-number">
          {d.tickets.count}
          <small> / {DAILY_RULES.lotteryLimit}장</small>
        </strong>
        <p>장당 {won(DAILY_RULES.lotteryCost)}</p>
        <p>이번 주 정산 후 추첨</p>
      </section>
      <div className="daily-orders">
        {[1, 3, 5]
          .filter((n) => n <= left)
          .map((count) => (
            <Button
              key={count}
              disabled={g.cash < count * DAILY_RULES.lotteryCost}
              onClick={() => act({ type: 'buyLottery', count })}
            >
              {count}장 구매 · {won(count * DAILY_RULES.lotteryCost)}
            </Button>
          ))}
      </div>
      {!left && <p className="daily-empty">이번 주 복권을 모두 구매했어요.</p>}
      {!!d.draws.length && (
        <section className="card">
          <h2>지난 추첨</h2>
          {[...d.draws].reverse().map((draw) => (
            <div className="draw-result" key={draw.week}>
              <strong>
                {draw.week}주차 · {won(draw.payout)}
              </strong>
              <div className="lottery-ranks">
                {draw.ranks.map((r, i) => (
                  <span className={r ? 'rank-won' : ''} key={i}>
                    {r ? `${r}등` : '낙첨'}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
function PriceChart({
  history,
  name,
}: {
  history: { week: number; price: number }[];
  name: string;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const values = history.map((p) => p.price),
    min = Math.min(...values),
    max = Math.max(...values);
  const span = Math.max(1000, max - min),
    low = min - span * 0.12;
  const x = (i: number) => 15 + (i * 290) / Math.max(1, history.length - 1);
  const y = (price: number) => 112 - ((price - low) / (span * 1.24)) * 96;
  const active = history.find((p) => p.week === selected) ?? history.at(-1)!;
  return (
    <div className="stock-chart">
      <p aria-live="polite">
        {active.week}주차 <strong>{won(active.price)}</strong>
      </p>
      <svg
        viewBox="0 0 320 140"
        role="img"
        aria-label={`${name} 최근 ${history.length}주 가격 그래프`}
      >
        {[20, 64, 112].map((v) => (
          <path key={v} d={`M15 ${v}H305`} className="chart-guide" />
        ))}
        <polyline
          points={history.map((p, i) => `${x(i)},${y(p.price)}`).join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        {history.map((p, i) => (
          <circle
            key={p.week}
            cx={x(i)}
            cy={y(p.price)}
            r={p.week === active.week ? 4 : 2}
            fill="currentColor"
          />
        ))}
        <text x="15" y="136">
          {history[0].week}주
        </text>
        <text x="305" y="136" textAnchor="end">
          {history.at(-1)!.week}주
        </text>
      </svg>
      <details>
        <summary>주별 가격 보기</summary>
        <div className="price-history">
          {history.map((p) => (
            <button
              key={p.week}
              aria-pressed={p.week === active.week}
              onClick={() => setSelected(p.week)}
            >
              {p.week}주 · {won(p.price)}
            </button>
          ))}
        </div>
      </details>
    </div>
  );
}
export function StocksView({ g, act }: { g: Game; act: Act }) {
  const [id, setId] = useState<string>(STOCKS[0].id),
    [side, setSide] = useState<'buy' | 'sell'>('buy'),
    [quantity, setQuantity] = useState(1);
  const d = dailyState(g),
    stock = d.stocks.find((s) => s.id === id)!,
    definition = stockDefinition(id)!,
    price = sharePrice(stock);
  const previous = stock.history.at(-2)?.price ?? price;
  const change = ((price - previous) / previous) * 100,
    value = stock.quantity * price,
    profit = value - stock.cost;
  const max =
    side === 'buy'
      ? Math.min(
          DAILY_RULES.stockLimit - stock.quantity,
          Math.floor(g.cash / price),
        )
      : stock.quantity;
  const choices = [
    ...new Set([1, 5, 10, max].filter((n) => n > 0 && n <= max)),
  ];
  const amount = Math.min(quantity, max),
    gross = amount * price,
    fee = side === 'sell' ? stockFee(gross) : 0;
  return (
    <>
      <div className="stock-tabs" role="group" aria-label="종목 선택">
        {STOCKS.map((s) => (
          <button
            key={s.id}
            aria-pressed={s.id === id}
            onClick={() => {
              setId(s.id);
              setQuantity(1);
            }}
          >
            {s.name}
          </button>
        ))}
      </div>
      <section className="card stock-summary">
        <span className="eyebrow">
          {definition.sector} · {d.quoteWeek}주차
        </span>
        <h2>{definition.name}</h2>
        <strong className="daily-big-number">{won(price)}</strong>
        <p className={change >= 0 ? 'stock-up' : 'stock-down'}>
          {change > 0 ? '+' : ''}
          {change.toFixed(1)}% <span>지난주 대비</span>
        </p>
        <PriceChart key={id} history={stock.history} name={definition.name} />
      </section>
      <section className="card">
        <h2>
          내 보유 주식 <small>{stock.quantity.toLocaleString('ko-KR')}주</small>
        </h2>
        <dl className="daily-ledger">
          <div>
            <dt>매입 금액</dt>
            <dd>{won(stock.cost)}</dd>
          </div>
          <div>
            <dt>평가 금액</dt>
            <dd>{won(value)}</dd>
          </div>
          <div>
            <dt>평가 손익</dt>
            <dd className={profit >= 0 ? 'stock-up' : 'stock-down'}>
              {profit > 0 ? '+' : profit < 0 ? '−' : ''}
              {won(Math.abs(profit))}
            </dd>
          </div>
        </dl>
      </section>
      <section className="card">
        <div className="order-sides" role="group" aria-label="주문 종류">
          {(['buy', 'sell'] as const).map((s) => (
            <button
              key={s}
              aria-pressed={side === s}
              onClick={() => {
                setSide(s);
                setQuantity(1);
              }}
            >
              {s === 'buy' ? '매수' : '매도'}
            </button>
          ))}
        </div>
        <div className="quantity-choices" role="group" aria-label="주식 수량">
          {choices.map((n) => (
            <button
              key={n}
              aria-pressed={amount === n}
              onClick={() => setQuantity(n)}
            >
              {n === max && n > 10
                ? `최대 ${n.toLocaleString('ko-KR')}주`
                : `${n}주`}
            </button>
          ))}
        </div>
        <dl className="daily-ledger">
          <div>
            <dt>주문 수량</dt>
            <dd>{amount}주</dd>
          </div>
          {side === 'sell' && (
            <div>
              <dt>매도 수수료 1%</dt>
              <dd>{won(fee)}</dd>
            </div>
          )}
          <div>
            <dt>{side === 'buy' ? '결제' : '수령'} 금액</dt>
            <dd>{won(gross - fee)}</dd>
          </div>
        </dl>
        <Button
          primary
          disabled={!amount}
          onClick={() =>
            act({ type: 'tradeStock', id, side, quantity: amount })
          }
        >
          {amount}주 {side === 'buy' ? '매수하기' : '매도하기'}
        </Button>
        {!max && (
          <p className="daily-empty">
            {side === 'buy'
              ? '매수할 현금이 부족해요.'
              : '보유한 주식이 없어요.'}
          </p>
        )}
      </section>
    </>
  );
}
export function WorkView({ g, act }: { g: Game; act: Act }) {
  return (
    <section className="card daily-action-detail">
      <span className="daily-symbol">
        <Icon name="wallet" size={32} />
      </span>
      <h2>동네 가게 일손 돕기</h2>
      <strong className="daily-big-number">{won(DAILY_RULES.workPay)}</strong>
      <Button
        primary
        actionCost={1}
        disabled={!actionsLeft(g)}
        onClick={() => act({ type: 'dailyWork' })}
      >
        일하러 가기
      </Button>
    </section>
  );
}
export function WalkView({ g, act }: { g: Game; act: Act }) {
  const last = dailyState(g).lastWalk;
  return (
    <>
      <section className="card daily-action-detail">
        <span className="daily-symbol">
          <Icon name="walk" size={32} />
        </span>
        <h2>동네 한 바퀴</h2>
        <Button
          primary
          actionCost={1}
          disabled={!actionsLeft(g)}
          onClick={() => act({ type: 'walk' })}
        >
          산책하기
        </Button>
      </section>
      {last && (
        <section className="card">
          <h2>{WALK_EVENTS[last].name}</h2>
          <p>{WALK_EVENTS[last].text}</p>
        </section>
      )}
    </>
  );
}
