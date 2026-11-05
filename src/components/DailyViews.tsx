import { LottoBalls, LottoResult } from './LottoResult';
import { confirmDailyAction } from '../app/dailyActions';
import { useState } from 'react';
import { DAILY_RULES, STOCKS, stockDefinition } from '../content/daily';
import { dailyState, sharePrice, stockFee } from '../domain/daily';
import { actionsLeft, weekOf, won, type Game } from '../domain/game';
import { Button, type Open } from './GameViews';
import type { Act } from '../app/store';
import { Icon, type IconName } from './Icon';

export function DailyTabView({
  g,
  open,
  act,
}: {
  g: Game;
  open: Open;
  act: Act;
}) {
  const d = dailyState(g),
    bought = d.tickets.count > 0;
  const rows = [
    {
      title: '복권',
      icon: 'ticket',
      text: bought
        ? '구매 완료 · 추첨 대기'
        : `${won(DAILY_RULES.lotteryCost)} · 주당 1장`,
      cost: false,
    },
    {
      title: '주식',
      icon: 'chart',
      text: '반도체 · 바이오 · 2차전지',
      cost: false,
    },
    {
      title: '아르바이트',
      icon: 'wallet',
      text: won(DAILY_RULES.workPay),
      cost: true,
    },
    { title: '산책', icon: 'walk', text: '동네 한 바퀴', cost: true },
  ] as const;
  return (
    <>
      <div className="page-heading">
        <h1>일상</h1>
      </div>
      <div className="daily-overview">
        <span>{weekOf(g)}주차</span>
        <span>복권 {bought ? '구매 완료' : '미구매'}</span>
      </div>
      <ul className="daily-list">
        {rows.map((row) => (
          <li key={row.title}>
            <button
              className="daily-row"
              disabled={
                (row.cost && !actionsLeft(g)) ||
                (row.title === '복권' &&
                  !bought &&
                  g.cash < DAILY_RULES.lotteryCost)
              }
              onClick={() => {
                if (row.title === '주식') open({ kind: '주식' });
                else if (row.title === '복권' && bought) open({ kind: '복권' });
                else
                  void confirmDailyAction(
                    act,
                    row.title === '복권'
                      ? { type: 'buyLottery', count: 1 }
                      : {
                          type:
                            row.title === '아르바이트' ? 'dailyWork' : 'walk',
                        },
                  );
              }}
            >
              <span className={`daily-symbol daily-symbol-${row.icon}`}>
                <Icon name={row.icon as IconName} size={24} />
              </span>
              <span className="daily-row-text">
                <strong>
                  {row.title}
                  {row.cost && (
                    <span className="action-cost" aria-label="행동 1회">
                      <Icon name="activity" size={16} />
                    </span>
                  )}
                </strong>
                <small>{row.text}</small>
              </span>
              <span className="daily-row-end" aria-hidden="true">
                {row.title === '주식' || (row.title === '복권' && bought)
                  ? '›'
                  : row.title === '복권'
                    ? '구매'
                    : '실행'}
              </span>
            </button>
            {row.title === '복권' && d.draws.length > 0 && (
              <button
                className="daily-history-link"
                onClick={() => open({ kind: '복권' })}
              >
                지난 추첨 보기
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
export function LotteryView({ g, act }: { g: Game; act: Act }) {
  const d = dailyState(g),
    bought = d.tickets.count > 0;
  return (
    <>
      <section className="card lottery-ticket">
        <span className="eyebrow">{weekOf(g)}주차 복권</span>
        <h2>{bought ? '내 복권' : '자동 번호 복권'}</h2>
        {d.tickets.numbers ? (
          <LottoBalls numbers={d.tickets.numbers} />
        ) : (
          <p>
            {bought
              ? `기존 복권 ${d.tickets.count}장 · 추첨 대기`
              : '1~45 중 번호 6개'}
          </p>
        )}
        <p>
          {bought
            ? '이번 주 정산 후 추첨'
            : `1장 ${won(DAILY_RULES.lotteryCost)}`}
        </p>
        {!bought && (
          <Button
            disabled={g.cash < DAILY_RULES.lotteryCost}
            onClick={() =>
              confirmDailyAction(act, { type: 'buyLottery', count: 1 })
            }
          >
            복권 구매 · {won(DAILY_RULES.lotteryCost)}
          </Button>
        )}
      </section>
      {!!d.draws.length && (
        <section className="card">
          <h2>지난 추첨</h2>
          {[...d.draws].reverse().map((draw) => (
            <div className="draw-result" key={draw.week}>
              <strong>{draw.week}주차 추첨</strong>
              {draw.numbers ? (
                <LottoResult result={draw} />
              ) : (
                <div className="lottery-ranks">
                  {draw.ranks.map((r, i) => (
                    <span className={r ? 'rank-won' : ''} key={i}>
                      {r ? `${r}등` : '낙첨'}
                    </span>
                  ))}
                  <p>당첨금 {won(draw.payout)}</p>
                </div>
              )}
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
            confirmDailyAction(
              act,
              { type: 'tradeStock', id, side, quantity: amount },
              gross - fee,
            )
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
