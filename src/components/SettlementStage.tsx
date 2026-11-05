import type { SettlementReceipt } from '../content/settlementEvents';
import type { PlayerAppearance } from '../content/player';
import { won } from '../domain/game';
import { PixelCharacter } from './PixelCharacter';
export function SettlementStage({
  receipt,
  appearance,
  step,
  replying,
}: {
  receipt: SettlementReceipt;
  appearance: PlayerAppearance;
  step: number;
  replying: boolean;
}) {
  const camera =
    step === 1 ? 'receipt' : replying ? 'close' : step >= 3 ? 'window' : 'room';
  const dawn = ['near', 'halfway', 'business'].includes(receipt.theme);
  return (
    <div
      key={camera}
      className={`story-stage settlement-stage settlement-${receipt.theme}`}
      data-settlement-camera={camera}
      aria-hidden="true"
    >
      <svg viewBox="0 0 240 128" shapeRendering="crispEdges" focusable="false">
        {camera === 'receipt' ? (
          <>
            <rect width="240" height="128" fill="#17202a" />
            <path d="M0 128l61-35 27 35M240 128l-62-35-27 35" fill="#a17b5e" />
            <g className="settlement-receipt">
              <rect
                x="45"
                y="3"
                width="150"
                height="132"
                rx="5"
                fill="#495d68"
              />
              <rect x="50" y="8" width="140" height="120" fill="#122622" />
              <text
                x="120"
                y="26"
                textAnchor="middle"
                fill="#8ee4bf"
                fontSize="10"
              >
                {receipt.week}주차 납부 확인
              </text>
              <path d="M59 35h122M59 88h122" stroke="#35554a" />
              {[
                ['원금', receipt.principalPaid],
                ['이자', receipt.interestPaid],
                ['남은 원금', receipt.remainingPrincipal],
              ].map(([label, amount], n) => (
                <g key={label}>
                  <text x="59" y={49 + n * 18} fill="#a4bdb0" fontSize="7">
                    {label}
                  </text>
                  <text
                    x="181"
                    y={49 + n * 18}
                    textAnchor="end"
                    fill="#e6eee7"
                    fontSize="7"
                  >
                    {won(amount as number)}
                  </text>
                </g>
              ))}
              <text
                x="120"
                y="106"
                textAnchor="middle"
                fill="#8ee4bf"
                fontSize="9"
              >
                납부 완료
              </text>
            </g>
          </>
        ) : (
          <>
            <rect
              width="240"
              height="128"
              fill={dawn ? '#313e40' : '#1b2630'}
            />
            <rect y="99" width="240" height="29" fill="#302f2e" />
            <rect x="17" y="14" width="75" height="44" fill="#50605f" />
            <rect
              x="21"
              y="18"
              width="67"
              height="36"
              fill={dawn ? '#829d97' : '#253b4d'}
            />
            <path d="M54 18v36M21 36h67" stroke="#485956" strokeWidth="3" />
            {receipt.theme === 'rain' && (
              <g className="intro-rain" stroke="#a4c9d0" opacity=".6">
                {[29, 44, 65, 80].map((x) => (
                  <path key={x} d={`M${x} 19l-4 12m1 4l-4 12`} />
                ))}
              </g>
            )}
            <rect x="135" y="79" width="89" height="8" fill="#77634c" />
            <path d="M143 87v28M217 87v28" stroke="#514738" strokeWidth="4" />
            <rect x="167" y="73" width="24" height="4" fill="#b6ae96" />
            <rect x="177" y="69" width="23" height="4" fill="#948b75" />
            <path
              d="M6 0v69h6v12M234 0v40h-7"
              stroke="#465349"
              strokeWidth="4"
              fill="none"
            />
            {camera === 'close' ? (
              <g transform="translate(70 4) scale(4)">
                <PixelCharacter appearance={appearance} scale={1} />
              </g>
            ) : (
              <g className="settlement-actor">
                <g
                  transform={
                    camera === 'window'
                      ? 'translate(58 37) scale(2)'
                      : 'translate(105 37) scale(2)'
                  }
                >
                  <PixelCharacter appearance={appearance} scale={1} />
                </g>
              </g>
            )}
            <g className="settlement-phone">
              <rect
                x={camera === 'window' ? 99 : 146}
                y="72"
                width="8"
                height="14"
                fill="#536f78"
              />
              <rect
                x={camera === 'window' ? 101 : 148}
                y="74"
                width="4"
                height="9"
                fill="#91e0bc"
              />
            </g>
            {dawn && (
              <path d="M21 54l54 74h91L88 54z" fill="#b1ceb9" opacity=".07" />
            )}
          </>
        )}
      </svg>
      <span className="settlement-week">{receipt.week}주차 정산 완료</span>
    </div>
  );
}
