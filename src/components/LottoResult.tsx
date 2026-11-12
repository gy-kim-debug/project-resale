import type { LotteryResult } from '../domain/daily';
import { won } from '../domain/game';
export function LottoBalls({
  numbers,
  revealed = numbers.length,
  matches = [],
}: {
  numbers: number[];
  revealed?: number;
  matches?: number[];
}) {
  return (
    <div className="lotto-balls">
      {numbers.map((n, i) => (
        <span
          key={i}
          className={`lotto-ball ball-${Math.ceil(n / 10)}${i >= revealed ? ' ball-hidden' : ' ball-revealed'}${i < revealed && matches.includes(n) ? ' ball-match' : ''}`}
          aria-label={
            i < revealed
              ? `${n}번${matches.includes(n) ? ' 일치' : ''}`
              : '미공개 번호'
          }
        >
          {i < revealed ? n : '?'}
        </span>
      ))}
    </div>
  );
}
export function LottoResult({
  result,
  step = 8,
}: {
  result: LotteryResult;
  step?: number;
}) {
  const revealed = Math.max(0, Math.min(6, step));
  return (
    <section
      className="lotto-result"
      aria-label={`${result.week}주차 복권 결과`}
    >
      <div className="lotto-number-row">
        <span>내 번호</span>
        <LottoBalls
          numbers={result.numbers!}
          matches={result.winning!.slice(0, revealed)}
        />
      </div>
      <div className="lotto-number-row">
        <span>당첨 번호</span>
        <LottoBalls
          numbers={result.winning!}
          revealed={revealed}
          matches={result.numbers}
        />
      </div>
      <p className="lotto-match-count">
        {revealed < 6 ? `${revealed} / 6개 번호 공개` : '기본 번호 공개 완료'}
        {' · '}
        {
          result
            .winning!.slice(0, revealed)
            .filter((n) => result.numbers!.includes(n)).length
        }
        개 일치
      </p>
      <div className="lotto-bonus">
        <span>보너스</span>
        <LottoBalls
          numbers={[result.bonus!]}
          revealed={step >= 7 ? 1 : 0}
          matches={result.numbers}
        />
        <strong
          className="lotto-verdict"
          style={{ visibility: step >= 8 ? 'visible' : 'hidden' }}
        >
          {result.ranks[0]
            ? `${result.ranks[0]}등 · ${won(result.payout)}`
            : '낙첨'}
        </strong>
      </div>
    </section>
  );
}
