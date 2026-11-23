import { LottoBalls, LottoResult } from './LottoResult';
import { useDailyConfirmation } from '../app/useDailyConfirmation';
import { ActionConfirmation } from './ActionConfirmation';
import { DAILY_RULES } from '../content/daily';
import { dailyState } from '../domain/daily';
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
  const confirmation = useDailyConfirmation(act);
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
                  confirmation.request(
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
      <ActionConfirmation confirmation={confirmation} />
    </>
  );
}
export function LotteryView({ g, act }: { g: Game; act: Act }) {
  const confirmation = useDailyConfirmation(act);
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
              confirmation.request({ type: 'buyLottery', count: 1 })
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
      <ActionConfirmation confirmation={confirmation} />
    </>
  );
}

export { StocksView } from './stocks/StocksView';
