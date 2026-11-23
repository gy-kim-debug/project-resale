import { useRef, useState } from 'react';
import { DAILY_RULES, STOCKS, stockDefinition } from '../../content/daily';
import { dailyState, sharePrice, stockOrderLimit } from '../../domain/daily';
import { won, type Game } from '../../domain/game';
import { roundMoney } from '../../domain/money';
import type { Act } from '../../app/store';
import { StockChart } from './StockChart';
import { StockOrder } from './StockOrder';
const signed = (amount: number) =>
  `${amount > 0 ? '+' : amount < 0 ? '−' : ''}${won(Math.abs(amount))}`;
export function StocksView({ g, act }: { g: Game; act: Act }) {
  const marketRef = useRef<HTMLDivElement>(null),
    detailRef = useRef<HTMLElement>(null);
  const stocks = dailyState(g).stocks;
  const [id, setId] = useState<string>(STOCKS[0].id),
    [filter, setFilter] = useState<'all' | 'owned'>('all');
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [order, setOrder] = useState<{
    id: string;
    side: 'buy' | 'sell';
  } | null>(null);
  const resolvedId =
    filter === 'owned' && !stocks.find((s) => s.id === id)?.quantity
      ? (stocks.find((s) => s.quantity > 0)?.id ?? id)
      : id;
  const selected = stocks.find((s) => s.id === resolvedId)!,
    definition = stockDefinition(resolvedId)!,
    price = sharePrice(selected);
  const total = stocks.reduce((sum, s) => sum + sharePrice(s) * s.quantity, 0),
    cost = stocks.reduce((sum, s) => sum + s.cost, 0);
  const totalProfit = total - cost,
    value = price * selected.quantity,
    profit = value - selected.cost;
  const previous = selected.history.at(-2)?.price ?? price,
    change = ((price - previous) / previous) * 100;
  const visible = stocks.filter((s) => filter === 'all' || s.quantity > 0);
  const hasDetail = filter === 'all' || visible.length > 0;
  return (
    <div className="invest-screen">
      <section className="invest-overview" aria-label="내 주식 자산">
        <span>내 주식 평가액</span>
        <strong>{won(total)}</strong>
        <div>
          <span
            className={
              totalProfit > 0 ? 'stock-up' : totalProfit < 0 ? 'stock-down' : ''
            }
          >
            {signed(totalProfit)}
            {cost > 0 &&
              ` (${totalProfit > 0 ? '+' : ''}${((totalProfit / cost) * 100).toFixed(1)}%)`}
          </span>
          <span>현금 {won(g.cash)}</span>
        </div>
      </section>
      <div className="invest-filters" role="group" aria-label="주식 보기">
        <button
          type="button"
          aria-pressed={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          전체 테마
        </button>
        <button
          type="button"
          aria-pressed={filter === 'owned'}
          onClick={() => {
            setFilter('owned');
            const first = stocks.find((s) => s.quantity > 0);
            if (first && !selected.quantity) setId(first.id);
          }}
        >
          내 투자 {stocks.filter((s) => s.quantity > 0).length}
        </button>
      </div>
      <div
        ref={marketRef}
        className="invest-market"
        role="group"
        aria-label="투자 테마"
      >
        {visible.map((s) => {
          const current = sharePrice(s),
            prev = s.history.at(-2)?.price ?? current,
            pct = ((current - prev) / prev) * 100;
          return (
            <button
              type="button"
              key={s.id}
              className="invest-theme"
              aria-pressed={s.id === resolvedId}
              onClick={() => {
                setId(s.id);
                detailRef.current?.scrollIntoView({ block: 'start' });
              }}
            >
              <span>
                <strong>{stockDefinition(s.id)!.name}</strong>
                <small>
                  {s.quantity
                    ? `${s.quantity.toLocaleString('ko-KR')}주 보유`
                    : '미보유'}
                </small>
              </span>
              <span>
                <strong>{won(current)}</strong>
                <small
                  className={pct > 0 ? 'stock-up' : pct < 0 ? 'stock-down' : ''}
                >
                  {pct > 0 ? '+' : ''}
                  {pct.toFixed(1)}%
                </small>
              </span>
            </button>
          );
        })}
      </div>
      {!hasDetail ? (
        <div className="invest-empty">
          <p>보유한 주식이 없어요.</p>
          <button type="button" onClick={() => setFilter('all')}>
            테마 보기
          </button>
        </div>
      ) : (
        <>
          <section
            className="invest-detail"
            ref={detailRef}
            aria-label={`${definition.name} 상세`}
          >
            <button
              type="button"
              className="invest-market-jump"
              onClick={() =>
                marketRef.current?.scrollIntoView({ block: 'start' })
              }
            >
              테마 목록
            </button>
            <div className="invest-detail-heading">
              <h2>{definition.name}</h2>
              <span className="invest-risk">
                {definition.volatility === 1
                  ? '낮은 변동'
                  : definition.volatility === 2
                    ? '중간 변동'
                    : '큰 변동'}
              </span>
            </div>
            <div className="invest-price">
              <strong>{won(price)}</strong>
              <span
                className={
                  change > 0 ? 'stock-up' : change < 0 ? 'stock-down' : ''
                }
              >
                {change > 0 ? '+' : ''}
                {change.toFixed(1)}%<small>직전 대비</small>
              </span>
            </div>
            <StockChart
              key={resolvedId}
              history={selected.history}
              name={definition.name}
              average={
                selected.quantity
                  ? roundMoney(selected.cost / selected.quantity)
                  : undefined
              }
            />
          </section>
          <section
            className="invest-position"
            aria-label={`${definition.name} 보유 현황`}
          >
            <h3>
              내 보유 <span>{selected.quantity.toLocaleString('ko-KR')}주</span>
            </h3>
            <dl className="invest-ledger">
              <div>
                <dt>평균 매입가</dt>
                <dd>
                  {selected.quantity
                    ? won(roundMoney(selected.cost / selected.quantity))
                    : '—'}
                </dd>
              </div>
              <div>
                <dt>매입 금액</dt>
                <dd>{won(selected.cost)}</dd>
              </div>
              <div>
                <dt>평가 금액</dt>
                <dd>{won(value)}</dd>
              </div>
              <div>
                <dt>평가 손익</dt>
                <dd
                  className={
                    profit > 0 ? 'stock-up' : profit < 0 ? 'stock-down' : ''
                  }
                >
                  {signed(profit)}
                </dd>
              </div>
            </dl>
          </section>
          <section className="invest-history" aria-label="주식 거래 기록">
            <h3>최근 거래</h3>
            {(dailyState(g).stockOrders ?? []).length ? (
              <>
                <ul>
                  {(dailyState(g).stockOrders ?? [])
                    .slice(0, historyExpanded ? 20 : 3)
                    .map((record, index) => (
                      <li key={`${record.tick}:${index}`}>
                        <span>
                          <strong>
                            {stockDefinition(record.stockId)!.name}{' '}
                            <b
                              className={
                                record.side === 'buy'
                                  ? 'stock-up'
                                  : 'stock-down'
                              }
                            >
                              {record.side === 'buy' ? '매수' : '매도'}
                            </b>
                          </strong>
                          <small>
                            {record.week}주차 ·{' '}
                            {record.quantity.toLocaleString('ko-KR')}주 · 주당{' '}
                            {won(record.price)}
                          </small>
                        </span>
                        <span>
                          <strong>{won(record.total)}</strong>
                          {record.side === 'sell' && (
                            <small
                              className={
                                record.profit > 0
                                  ? 'stock-up'
                                  : record.profit < 0
                                    ? 'stock-down'
                                    : ''
                              }
                            >
                              손익 {signed(record.profit)}
                            </small>
                          )}
                        </span>
                      </li>
                    ))}
                </ul>
                {(dailyState(g).stockOrders ?? []).length > 3 && (
                  <button
                    type="button"
                    onClick={() => setHistoryExpanded(!historyExpanded)}
                  >
                    {historyExpanded ? '접기' : '거래 기록 더 보기'}
                  </button>
                )}
              </>
            ) : (
              <p className="invest-history-empty">거래 기록 없음</p>
            )}
          </section>
          <div className="invest-dock">
            <span>
              {definition.name} · {won(price)}
            </span>
            <div>
              <button
                type="button"
                className="invest-buy"
                disabled={!stockOrderLimit(g, resolvedId, 'buy')}
                onClick={() => setOrder({ id: resolvedId, side: 'buy' })}
              >
                매수
              </button>
              <button
                type="button"
                className="invest-sell"
                disabled={!stockOrderLimit(g, resolvedId, 'sell')}
                onClick={() => setOrder({ id: resolvedId, side: 'sell' })}
              >
                매도
                {selected.quantity > 0 &&
                  ` · ${selected.quantity.toLocaleString('ko-KR')}주`}
              </button>
            </div>
            {selected.quantity >= DAILY_RULES.stockLimit && (
              <small>
                보유 한도 {DAILY_RULES.stockLimit.toLocaleString('ko-KR')}주
              </small>
            )}
          </div>
        </>
      )}
      {order && (
        <StockOrder
          key={`${order.id}:${order.side}`}
          g={g}
          id={order.id}
          side={order.side}
          act={act}
          close={() => setOrder(null)}
        />
      )}
    </div>
  );
}
