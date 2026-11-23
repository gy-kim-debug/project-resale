import { useRef, useState } from 'react';
import type { DailyState } from '../../domain/daily';
import { won } from '../../domain/game';
type Point = DailyState['stocks'][number]['history'][number];
export function StockChart({
  history,
  name,
  average,
}: {
  history: Point[];
  name: string;
  average?: number;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const dragging = useRef(false);
  const last = history.length - 1;
  const active = Math.min(selected ?? last, last),
    point = history[active];
  const prices = history.map((p) => p.price),
    low = Math.min(...prices),
    high = Math.max(...prices);
  const span = Math.max(100, high - low),
    min = low - span * 0.15,
    max = high + span * 0.15;
  const x = (i: number) => 18 + (i * 284) / Math.max(1, last),
    y = (price: number) => 122 - ((price - min) / (max - min)) * 100;
  const period = (i: number) =>
    i === last ? '현재' : i === last - 1 ? '직전' : `${last - i}회 전`;
  const select = (event: React.PointerEvent<SVGSVGElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const local = ((event.clientX - rect.left) / rect.width) * 320;
    setSelected(
      Math.max(
        0,
        Math.min(last, Math.round(((local - 18) / 284) * Math.max(1, last))),
      ),
    );
  };
  return (
    <div className="invest-chart">
      <div className="invest-chart-readout" aria-live="polite">
        <span>
          {point.week}주차 · {period(active)}
        </span>
        <strong>{won(point.price)}</strong>
      </div>
      {average !== undefined && average >= min && average <= max && (
        <span className="invest-average-label">평균 매입가 {won(average)}</span>
      )}
      <svg
        viewBox="0 0 320 154"
        role="img"
        aria-label={`${name} 최근 ${history.length}개 시세 그래프`}
        style={{ touchAction: 'pan-y' }}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          select(e);
        }}
        onPointerMove={(e) => {
          if (dragging.current) select(e);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
      >
        {[24, 73, 122].map((v) => (
          <path key={v} d={`M18 ${v}H302`} className="chart-guide" />
        ))}
        {average !== undefined && average >= min && average <= max && (
          <path d={`M18 ${y(average)}H302`} className="invest-average" />
        )}
        <polyline
          points={history.map((p, i) => `${x(i)},${y(p.price)}`).join(' ')}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        />
        <path d={`M${x(active)} 20V126`} className="invest-cursor" />
        <circle cx={x(active)} cy={y(point.price)} r="5" fill="currentColor" />
        <text x="18" y="148">
          {period(0)}
        </text>
        {last > 0 && (
          <text x="302" y="148" textAnchor="end">
            현재
          </text>
        )}
      </svg>
      <div className="invest-chart-controls">
        <button
          type="button"
          disabled={active === 0}
          onClick={() => setSelected(active - 1)}
          aria-label="이전 가격"
        >
          이전
        </button>
        <span>
          최저 {won(low)} · 최고 {won(high)}
        </span>
        <button
          type="button"
          disabled={active === last}
          onClick={() => setSelected(active + 1)}
          aria-label="다음 가격"
        >
          다음
        </button>
        <button
          type="button"
          disabled={active === last}
          onClick={() => setSelected(null)}
          aria-label="현재 가격으로 돌아가기"
        >
          현재
        </button>
      </div>
    </div>
  );
}
