import { useId, useLayoutEffect, useRef, useState } from 'react';
import { DAILY_RULES, stockDefinition } from '../../content/daily';
import {
  dailyState,
  sharePrice,
  stockOrderLimit,
  stockOrderQuote,
} from '../../domain/daily';
import { won, type Game } from '../../domain/game';
import type { Act } from '../../app/store';
export function StockOrder({
  g,
  id,
  side,
  act,
  close,
}: {
  g: Game;
  id: string;
  side: 'buy' | 'sell';
  act: Act;
  close: () => void;
}) {
  const title = useId(),
    dialog = useRef<HTMLDialogElement>(null),
    submitting = useRef(false);
  const [review, setReview] = useState<ReturnType<
    typeof stockOrderQuote
  > | null>(null);
  const max = stockOrderLimit(g, id, side);
  const [quantity, setQuantity] = useState(() =>
    Math.min(max, Math.max(1, Math.floor(max * 0.25))),
  );
  const [ratio, setRatio] = useState<number | null>(25);
  const adjust = (value: number) => {
    setQuantity(value);
    setRatio(null);
  };
  const amount = Math.min(quantity, max);
  const stock = dailyState(g).stocks.find((s) => s.id === id)!,
    price = sharePrice(stock);
  const quote = amount > 0 ? stockOrderQuote(g, id, side, amount) : null;
  const [error, setError] = useState('');
  const display = review ?? quote;
  const name = stockDefinition(id)!.name,
    buying = side === 'buy';
  useLayoutEffect(() => {
    const node = dialog.current!;
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    node.showModal();
    return () => {
      node.close();
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  const confirm = async () => {
    if (!review || submitting.current) return;
    if (
      review.price !== price ||
      review.quantity > max ||
      review.cashAfter !== quote?.cashAfter
    ) {
      setReview(null);
      setError('주문 가능 금액이 바뀌었어요. 다시 확인해 주세요.');
      return;
    }
    submitting.current = true;
    close();
    await act({ type: 'tradeStock', id, side, quantity: review.quantity });
  };
  return (
    <dialog
      ref={dialog}
      className="invest-order"
      aria-labelledby={title}
      onKeyDown={(event) => {
        if (event.key === 'Escape') event.stopPropagation();
      }}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <header>
        <h2 id={title}>
          {name} {buying ? '매수' : '매도'}
          {review ? ' 확인' : ''}
        </h2>
        <button type="button" onClick={close} aria-label="주식 주문 닫기">
          닫기
        </button>
      </header>
      <div className="invest-order-body">
        <div className="invest-order-price">
          <span>현재가</span>
          <strong>{won(price)}</strong>
        </div>
        <p className="invest-available">
          {buying ? '보유 현금' : '보유 수량'}{' '}
          <strong>
            {buying
              ? won(g.cash)
              : `${stock.quantity.toLocaleString('ko-KR')}주`}
          </strong>
        </p>
        {!review && (
          <p className="invest-order-cap">
            {buying ? '매수' : '매도'} 가능 {max.toLocaleString('ko-KR')}주
          </p>
        )}
        {!review ? (
          <>
            <div
              className="invest-percent"
              role="group"
              aria-label={buying ? '매수 예산 비율' : '매도 수량 비율'}
            >
              {[25, 50, 75, 100].map((percent) => {
                const value = max
                  ? Math.max(1, Math.floor((max * percent) / 100))
                  : 0;
                return (
                  <button
                    type="button"
                    key={percent}
                    disabled={!max}
                    aria-pressed={max > 0 && ratio === percent}
                    onClick={() => {
                      setQuantity(value);
                      setRatio(percent);
                    }}
                  >
                    {percent === 100
                      ? buying || max < stock.quantity
                        ? '최대'
                        : '전량'
                      : `${percent}%`}
                  </button>
                );
              })}
            </div>
            <div className="invest-stepper">
              <button
                type="button"
                aria-label="1주 줄이기"
                disabled={amount <= 1}
                onClick={() => adjust(amount - 1)}
              >
                −
              </button>
              <output aria-live="polite">
                <strong>{amount.toLocaleString('ko-KR')}</strong> 주
              </output>
              <button
                type="button"
                aria-label="1주 늘리기"
                disabled={amount >= max}
                onClick={() => adjust(amount + 1)}
              >
                +
              </button>
            </div>
            <div
              className="invest-adjust"
              role="group"
              aria-label="수량 빠른 조절"
            >
              {[-100, -10, 10, 100].map((delta) => (
                <button
                  type="button"
                  key={delta}
                  disabled={!max || (delta < 0 ? amount <= 1 : amount >= max)}
                  onClick={() =>
                    adjust(Math.min(max, Math.max(1, amount + delta)))
                  }
                >
                  {delta > 0 ? '+' : ''}
                  {delta}주
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="invest-review-quantity">
            {review.quantity.toLocaleString('ko-KR')}주{' '}
            {buying ? '매수' : '매도'}
          </p>
        )}
        <dl className="invest-ledger">
          <div>
            <dt>주문 금액</dt>
            <dd>{won(display?.gross ?? 0)}</dd>
          </div>
          {!buying && (
            <div>
              <dt>매도 수수료 {DAILY_RULES.sellFeePercent}%</dt>
              <dd>{won(display?.fee ?? 0)}</dd>
            </div>
          )}
          <div className="invest-order-total">
            <dt>{buying ? '결제 금액' : '수령 금액'}</dt>
            <dd>{won(display?.net ?? 0)}</dd>
          </div>
          <div>
            <dt>거래 후 현금</dt>
            <dd>{won(display?.cashAfter ?? g.cash)}</dd>
          </div>
        </dl>
        {!max && (
          <p className="invest-order-error">
            {buying
              ? stock.quantity >= DAILY_RULES.stockLimit
                ? '종목별 보유 한도에 도달했어요.'
                : '1주를 매수할 현금이 부족해요.'
              : stock.quantity
                ? '보유 현금 한도로 매도할 수 없어요.'
                : '매도할 주식이 없어요.'}
          </p>
        )}
        {error && (
          <p className="invest-order-error" role="status">
            {error}
          </p>
        )}
      </div>
      <footer>
        {review && (
          <button type="button" onClick={() => setReview(null)}>
            수량 변경
          </button>
        )}
        <button
          type="button"
          className={`invest-submit invest-${side}`}
          disabled={!quote}
          onClick={() => (review ? void confirm() : setReview(quote))}
        >
          {review ? `${buying ? '매수' : '매도'} 확정` : '주문 확인'}
        </button>
      </footer>
    </dialog>
  );
}
