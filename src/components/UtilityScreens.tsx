import { useState } from 'react';
import { useGameStore } from '../app/store';
import { usePreviewStore } from '../app/previewStore';
import { listings } from '../content/listings';
import { previewConfig } from '../content/preview';
import { initialPlayer, formatWon } from '../domain/models';
import { InventoryDetail } from './TradeScreens';

export function UtilityScreens() {
  const state = useGameStore();
  const p = usePreviewStore();
  const [repay, setRepay] = useState('');
  if (state.tab === '보관함')
    return (
      <section className="panel">
        {p.selectedItemId ? (
          <InventoryDetail key={p.selectedItemId} />
        ) : (
          <>
            <h1>보관함</h1>
            <p className="panel-lead">
              보유 물품 {p.items.length} / {previewConfig.capacity} (한도 수치는
              테스트용)
              <br />
              등록 물품도 공간을 차지합니다. 가득 차면 획득할 수 없습니다.
            </p>
            {p.items.length === 0 && (
              <p>
                아직 보유한 물품이 없습니다. 활동에서 무료나눔이나 물건 수집을
                확인하세요.
              </p>
            )}
            {p.items.map((i) => (
              <button
                className="saved"
                key={i.id}
                onClick={() => p.selectItem(i.id)}
              >
                <span>
                  {i.title}
                  <strong>
                    {i.askingPrice !== null
                      ? `판매 등록 중 · ${formatWon(i.askingPrice)}`
                      : i.checked
                        ? '가치 확인됨 (예시)'
                        : '가치 미확인'}
                  </strong>
                </span>
                상세
              </button>
            ))}
            <button
              className="outline-button"
              onClick={() => state.openActivity('물건 수집')}
            >
              물건 수집으로
            </button>
            <div className="section-label">관심 매물</div>
            {listings
              .filter((i) => state.favoriteIds.includes(i.id))
              .map((i) => (
                <button
                  className="saved"
                  key={i.id}
                  onClick={() => {
                    state.openActivity('장터');
                    state.select(i.id);
                  }}
                >
                  <span>
                    {i.title}
                    <strong>{formatWon(i.price)}</strong>
                  </span>
                  상세
                </button>
              ))}
            {!state.favoriteIds.length && (
              <p className="muted">장터에서 관심 매물을 저장할 수 있습니다.</p>
            )}
          </>
        )}
      </section>
    );
  if (state.tab === '내 정보')
    return (
      <section className="panel">
        <h1>내 정보</h1>
        <dl>
          {[
            ['현금 (목업)', formatWon(p.cash)],
            ['날짜·시간 (표시 예시)', '1일 · 09:00'],
            ['포만감 (예시)', String(initialPlayer.hunger)],
            ['체력 (예시)', String(initialPlayer.health)],
            ['피로도 (예시)', String(initialPlayer.fatigue)],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <h2>상태 규칙</h2>
        <p className="panel-lead">
          포만감 0: 포만감이 소모되는 행동만 불가능.
          <br />
          체력 0: 사망, 게임 종료.
          <br />
          피로도 0: 해당 날짜 종료, 다음 날 아침.
          <br />
          수면: 피로도 전부 회복, 체력 유지, 일정량 포만감 감소.
        </p>
        <h2>캐릭터 능력치</h2>
        <p className="muted">
          추후 도입 예정입니다. 능력치 종류·성장 방식은 미정입니다.
        </p>
        <details>
          <summary>화면 검토 도구 (개발용)</summary>
          <p className="muted">
            실제 플레이 기능이 아닙니다. 테스트용 현금·물품을 불러오거나 목업
            상태를 비웁니다. 게임 회차·부활·영구 성장과 무관합니다. 새로고침하면
            목업 진행은 사라집니다. 관심 매물만 기기에 저장됩니다.
          </p>
          <button className="outline-button" onClick={p.seed}>
            거래 확인용 예시 불러오기
          </button>
          <button className="outline-button" onClick={p.reset}>
            목업 초기 상태로 (현금·물품 없음)
          </button>
        </details>
      </section>
    );
  if (state.tab === '상점')
    return (
      <section className="panel">
        <h1>상점</h1>
        <p className="panel-lead">
          상점 판매 품목·가격·구매 효과는 아직 정하지 않았습니다.
        </p>
        <h2>물품 매각</h2>
        <p className="muted">
          고물상·중고 상점은 활동의 매각처에서 방문할 수 있습니다.
        </p>
        <button
          className="outline-button"
          onClick={() => state.openActivity('매각처')}
        >
          매각처 방문으로
        </button>
        <h2>구매 상품</h2>
        <button className="outline-button" disabled>
          상품 목록 · 기획 미정
        </button>
      </section>
    );
  return (
    <section className="panel debt-panel">
      <h1>채무</h1>
      <dl>
        {[
          ['남은 원금', initialPlayer.principal],
          ['발생 이자 (미계산)', 0],
          ['현금 (목업)', p.cash],
        ].map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{formatWon(Number(value))}</dd>
          </div>
        ))}
      </dl>
      <p className="panel-lead">
        초기 목표는 100억 원과 발생한 이자의 상환입니다. 이자율·정산 주기·상환
        순서 등 상세 규칙은 미정입니다.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          p.notify(
            '상환 입력 화면만 연결했습니다. 원금·이자·현금은 변경하지 않았습니다. 상세 규칙 확정이 필요합니다.',
          );
        }}
      >
        <label>
          상환 희망 금액 (화면 예시)
          <input
            className="w-full min-h-11 border p-2"
            inputMode="numeric"
            required
            pattern="[0-9]+"
            value={repay}
            onChange={(e) => setRepay(e.target.value)}
          />
        </label>
        <button className="outline-button" type="submit">
          상환 내용 확인
        </button>
      </form>
    </section>
  );
}
