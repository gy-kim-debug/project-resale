import type { PlayerAppearance } from '../content/player';
import type { LotteryResult } from '../domain/daily';
import { lotteryShots } from '../domain/lotteryPresentation';
import { won } from '../domain/game';
import { PixelCharacter } from './PixelCharacter';

export function LotteryStage({
  result,
  step,
  appearance,
}: {
  result: LotteryResult;
  step: number;
  appearance: PlayerAppearance;
}) {
  const shots = lotteryShots(result);
  const shot = shots[Math.min(step, shots.length - 1)];
  const { camera, revealed } = shot;
  const rank = result.ranks[0];
  const close = ['ticket', 'check'].includes(camera);
  const room = ['room', 'after'].includes(camera);
  const outcome = ['verdict', 'receipt'].includes(camera);
  const current =
    camera === 'bonus' ? result.bonus : result.winning?.[revealed - 1];
  const matches =
    result.winning
      ?.slice(0, revealed)
      .filter((n) => result.numbers?.includes(n)).length ?? 0;
  return (
    <div
      className={`story-stage daily-stage lottery-stage lottery-camera-${camera}${shot.verdict && rank ? ' lottery-celebration' : ''}`}
      data-lottery-camera={camera}
      aria-hidden="true"
    >
      <svg viewBox="0 0 240 128" shapeRendering="crispEdges" focusable="false">
        <rect width="240" height="128" fill="#14212c" />
        {room ? (
          <>
            <rect x="13" y="13" width="65" height="48" fill="#526572" />
            <rect x="17" y="17" width="57" height="40" fill="#182e45" />
            <rect x="57" y="23" width="7" height="7" fill="#e5d7a2" />
            <path d="M45 17v40M17 39h57" stroke="#526572" strokeWidth="3" />
            <rect y="102" width="240" height="26" fill="#3e3b38" />
            <rect x="137" y="35" width="85" height="54" fill="#60757d" />
            <rect x="142" y="40" width="75" height="44" fill="#244858" />
            <circle cx="180" cy="59" r="12" fill="#92b8b4" />
            <text
              x="180"
              y="78"
              textAnchor="middle"
              fill="#efdc96"
              fontSize="6"
            >
              {camera === 'after' ? '추첨 종료' : '잠시 후 추첨'}
            </text>
            <path
              d="M133 91h94v7h-94M145 98v23M215 98v23"
              fill="#8a7154"
              stroke="#8a7154"
              strokeWidth="3"
            />
            <g transform="translate(87 39) scale(2)">
              <PixelCharacter appearance={appearance} scale={1} />
            </g>
            <rect x="119" y="77" width="14" height="19" fill="#e9ddbd" />
          </>
        ) : close ? (
          <>
            <path d="M0 128L44 67h152l44 61" fill="#766049" />
            <g className="lottery-ticket-close">
              <rect x="44" y="9" width="152" height="108" fill="#eadfbe" />
              <path
                d="M49 38h142M49 94h142"
                stroke="#bcad8c"
                strokeDasharray="3 3"
              />
              <text
                x="120"
                y="24"
                textAnchor="middle"
                fill="#354f4e"
                fontSize="10"
              >
                {result.week}주차 · 자동 복권
              </text>
              <text
                x="120"
                y="34"
                textAnchor="middle"
                fill="#6e7563"
                fontSize="6"
              >
                나의 여섯 번호
              </text>
              {result.numbers?.map((n, i) => (
                <g key={n}>
                  <circle
                    cx={65 + i * 22}
                    cy="56"
                    r="9"
                    fill={
                      camera === 'check' && result.winning?.includes(n)
                        ? '#54997b'
                        : '#d0c5a5'
                    }
                  />
                  <text
                    x={65 + i * 22}
                    y="59"
                    textAnchor="middle"
                    fill="#203b3c"
                    fontSize="8"
                  >
                    {n}
                  </text>
                  {camera === 'check' && result.winning?.includes(n) && (
                    <path
                      d={`M${60 + i * 22} 72l3 3 7-8`}
                      fill="none"
                      stroke="#398267"
                      strokeWidth="2"
                    />
                  )}
                </g>
              ))}
              <text
                x="120"
                y="88"
                textAnchor="middle"
                fill="#3c6655"
                fontSize="8"
              >
                {camera === 'check'
                  ? `기본 번호 ${matches}개 일치`
                  : '추첨을 기다리는 한 장의 기대'}
              </text>
              {Array.from({ length: 27 }, (_, i) => (
                <rect
                  key={i}
                  x={63 + i * 4}
                  y="101"
                  width={i % 3 === 0 ? 2 : 1}
                  height="8"
                  fill="#5d6656"
                />
              ))}
            </g>
          </>
        ) : outcome ? (
          <>
            <rect
              x="45"
              y="13"
              width="150"
              height="102"
              fill={rank ? '#294e49' : '#293b48'}
              stroke={rank ? '#bdaf69' : '#62727e'}
              strokeWidth="2"
            />
            <text
              x="120"
              y="32"
              textAnchor="middle"
              fill="#b2c8c4"
              fontSize="8"
            >
              {result.week}주차{' '}
              {camera === 'receipt' ? '수령 내역' : '추첨 결과'}
            </text>
            <text
              x="120"
              y="59"
              textAnchor="middle"
              fill={rank ? '#f1d78c' : '#bdc8ce'}
              fontSize="20"
            >
              {rank ? `${rank}등 당첨!` : '다음 기회에'}
            </text>
            <text
              x="120"
              y="79"
              textAnchor="middle"
              fill="#d4eee1"
              fontSize="11"
            >
              {won(result.payout)}
            </text>
            <text
              x="120"
              y="100"
              textAnchor="middle"
              fill="#9bb8ae"
              fontSize="7"
            >
              {camera === 'receipt'
                ? rank
                  ? '입금 확인 · 기록 보관 완료'
                  : '추첨 기록 보관 완료'
                : `기본 번호 ${matches}개 일치`}
            </text>
            {rank > 0 && (
              <g className="lottery-confetti">
                {Array.from({ length: 18 }, (_, i) => (
                  <rect
                    key={i}
                    x={10 + ((i * 37) % 220)}
                    y={6 + ((i * 19) % 110)}
                    width="3"
                    height="5"
                    fill={['#e1c276', '#8aceb0', '#9ebcdd'][i % 3]}
                  />
                ))}
              </g>
            )}
          </>
        ) : (
          <>
            <path
              d="M0 0l65 100h35L40 0M240 0l-65 100h-35L200 0"
              fill="#7bbaaa"
              opacity=".08"
            />
            <rect y="105" width="240" height="23" fill="#30434b" />
            <rect x="25" y="13" width="190" height="13" fill="#304d59" />
            <text
              x="120"
              y="22"
              textAnchor="middle"
              fill="#d4e4dc"
              fontSize="7"
            >
              {result.week}주차 추첨 ·{' '}
              {camera === 'bonus'
                ? '보너스'
                : revealed
                  ? `${revealed} / 6`
                  : '추첨 준비'}
            </text>
            <rect x="76" y="89" width="88" height="18" fill="#637a7d" />
            <circle
              cx="120"
              cy="61"
              r="30"
              fill="#172e3c"
              stroke="#8daeb1"
              strokeWidth="3"
            />
            <g
              className={
                camera === 'mix' || camera === 'studio'
                  ? 'lotto-machine-spinning'
                  : ''
              }
              style={{ transformOrigin: '120px 61px' }}
            >
              {[
                [0, -18],
                [-15, -8],
                [15, -5],
                [-10, 13],
                [10, 16],
                [1, 1],
              ].map(([x, y], i) => (
                <circle
                  key={i}
                  cx={120 + x}
                  cy={61 + y}
                  r="5"
                  fill={
                    [
                      '#ddbf6a',
                      '#82b5d2',
                      '#cd8c95',
                      '#acb2ba',
                      '#8cbe9c',
                      '#e2d5a8',
                    ][i]
                  }
                />
              ))}
            </g>
            <path
              d="M120 91v9h32"
              fill="none"
              stroke="#a0b8af"
              strokeWidth="4"
            />
            {['ball', 'bonus'].includes(camera) && (
              <g key={step} className="lottery-drawn-ball">
                <circle
                  cx="191"
                  cy="64"
                  r="20"
                  fill={camera === 'bonus' ? '#b5a0da' : '#e6cf89'}
                />
                <text
                  x="191"
                  y="70"
                  textAnchor="middle"
                  fill="#243443"
                  fontSize="18"
                >
                  {current}
                </text>
                <text
                  x="191"
                  y="94"
                  textAnchor="middle"
                  fill="#c9e7da"
                  fontSize="7"
                >
                  {result.numbers?.includes(current!)
                    ? '내 번호와 일치!'
                    : camera === 'bonus'
                      ? '보너스 번호'
                      : '당첨 번호'}
                </text>
              </g>
            )}
            <g transform="translate(26 45) scale(1.7)">
              <PixelCharacter scale={1} appearance={appearance} />
            </g>
          </>
        )}
      </svg>
      <span className="lottery-shot-label">{shot.label}</span>
    </div>
  );
}
