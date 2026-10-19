import { useState } from 'react';
import { useGameStore } from '../app/store';
import { usePreviewStore } from '../app/previewStore';
import { outlets, previewConfig } from '../content/preview';
import { formatWon, type Listing } from '../domain/models';

export function PurchaseControls({ item }: { item: Listing }) {
  const s = usePreviewStore();
  const [step, setStep] = useState<
    'menu' | 'inspect' | 'negotiate' | 'confirm'
  >('menu');
  const [offer, setOffer] = useState<number | null>(null);
  const price = offer ?? item.price;
  const received = s.acquiredIds.includes(item.id);
  return (
    <section aria-label="구매 절차">
      <h2>구매 절차</h2>
      <p className="detail-footnote">화면 검토용 목업</p>
      {step === 'menu' && (
        <>
          <button
            className="disabled-action"
            onClick={() => setStep('inspect')}
          >
            구매 전 확인
          </button>
          {item.price > 0 && (
            <button
              className="disabled-action"
              onClick={() => setStep('negotiate')}
            >
              가격 협상
            </button>
          )}
          <button
            className="disabled-action"
            disabled={received}
            onClick={() => {
              setOffer(null);
              setStep('confirm');
            }}
          >
            {received
              ? '수령 완료'
              : item.price === 0
                ? '무료 수령 확인'
                : '제시 가격으로 구매 확인'}
          </button>
        </>
      )}
      {step === 'inspect' && (
        <>
          <p>
            구매 전 확인 가능한 결함과 구매 후에만 드러나는 결함이 있습니다.
            실제 가치는 표시하지 않습니다. 확인 시 소모 자원은 경우에 따라
            다르며 세부 조건이 미정이라 실행은 보류합니다.
          </p>
          <button className="disabled-action" disabled>
            확인 실행 · 조건 미정
          </button>
        </>
      )}
      {step === 'negotiate' && (
        <>
          <p>
            가격을 선택해서 제안합니다. 아래 금액과 판매자 응답은 화면용
            예시입니다.
          </p>
          {[Math.floor(item.price * 0.8), Math.floor(item.price * 0.9)].map(
            (p) => (
              <button
                className="disabled-action"
                key={p}
                onClick={() => {
                  setOffer(p);
                  setStep('confirm');
                }}
              >
                {formatWon(p)} 제안
              </button>
            ),
          )}
        </>
      )}
      {step === 'confirm' && (
        <>
          <p>
            {offer !== null
              ? '예시: 판매자가 제안에 동의한 상황입니다.'
              : '거래 내용을 확인하세요.'}
            <br />
            {item.title} · {formatWon(price)}
            <br />한 번의 행동으로 지불·수령합니다. 운반비 없음. 시간·소모는
            미계산입니다.
          </p>
          <button
            className="disabled-action"
            disabled={
              received ||
              s.cash < price ||
              s.items.length >= previewConfig.capacity
            }
            onClick={() => s.receive(item.id, item.title, item.category, price)}
          >
            지불·수령 확정 (목업)
          </button>
          {s.cash < price && (
            <p>
              현금이 부족합니다. 내 정보의 화면 검토 도구에서 테스트용 현금을
              불러올 수 있습니다.
            </p>
          )}
          {s.items.length >= previewConfig.capacity && (
            <p>보관함이 가득 찼습니다. 먼저 공간을 확보하세요.</p>
          )}
        </>
      )}
      {step !== 'menu' && (
        <button className="disabled-action" onClick={() => setStep('menu')}>
          거래 선택으로 돌아가기
        </button>
      )}
    </section>
  );
}

export function InventoryDetail() {
  const s = usePreviewStore();
  const [price, setPrice] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const item = s.items.find((i) => i.id === s.selectedItemId);
  if (!item) return null;
  return (
    <>
      <button className="activity-back" onClick={() => s.selectItem(null)}>
        ← 보관 목록
      </button>
      <h1>{item.title}</h1>
      <p className="panel-lead">
        {item.category} ·{' '}
        {item.askingPrice !== null
          ? '장터 등록 중 (보관 공간 점유)'
          : '보관 중'}
      </p>
      <dl>
        <div>
          <dt>실제 가치</dt>
          <dd>{item.checked ? '1,000원 (확인 결과 예시)' : '미확인'}</dd>
        </div>
        <div>
          <dt>상태 · 결함</dt>
          <dd>{item.checked ? '사용감 있음 (예시)' : '미확인'}</dd>
        </div>
      </dl>
      {!item.checked && (
        <button className="outline-button" onClick={() => s.check(item.id)}>
          별도 가치 확인 화면 (목업)
        </button>
      )}
      <p className="muted">
        구매만으로 실제 가치를 알 수 없습니다. 확인의 구체 방식·비용·시간은
        미정입니다.
      </p>
      {item.askingPrice === null ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (/^\d+$/.test(price)) s.post(item.id, Number(price));
          }}
        >
          <h2>장터 판매 등록</h2>
          <label>
            원하는 판매 가격 (원)
            <input
              className="w-full min-h-11 border p-2"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              pattern="[0-9]+"
              aria-describedby="price-rule"
            />
          </label>
          <p id="price-rule" className="muted">
            0 이상의 정수. 등록 중 가격 수정 금지. 동시 등록 한도는 테스트용{' '}
            {previewConfig.listingLimit}개입니다.
          </p>
          <button className="outline-button" type="submit">
            판매 글 등록 (목업)
          </button>
        </form>
      ) : (
        <>
          <p>등록 가격: {formatWon(item.askingPrice)} · 만료 기간 미정</p>
          <button
            className="outline-button"
            onClick={() => s.requestInquiries(item.id)}
          >
            구매 문의 상황 불러오기 (테스트 도구)
          </button>
          <button className="outline-button" onClick={() => s.cancel(item.id)}>
            판매 등록 취소
          </button>
        </>
      )}
      <button
        className="outline-button"
        onClick={() => useGameStore.getState().openActivity('매각처')}
      >
        고물상·상점으로
      </button>
      <button
        className="outline-button"
        disabled={item.askingPrice !== null}
        onClick={() => setConfirmDiscard(true)}
      >
        물품 버리기
      </button>
      <p className="muted">
        등록 중 폐기 규칙은 미정입니다. 이 목업에서는 먼저 등록을 취소해야
        버리기 화면을 열 수 있습니다.
      </p>
      {confirmDiscard && (
        <div>
          <p>
            목업에서는 보관 목록에서 제거합니다. 시간은 소모하지 않습니다. 복구
            여부·기타 비용은 미정입니다.
          </p>
          <button className="outline-button" onClick={() => s.discard(item.id)}>
            버리기 확인 (목업)
          </button>
          <button
            className="outline-button"
            onClick={() => setConfirmDiscard(false)}
          >
            계속 보관
          </button>
        </div>
      )}
    </>
  );
}
export function InquiriesScreen() {
  const s = usePreviewStore();
  const item = s.items.find((i) => i.id === s.inquiryItemId);
  return (
    <section className="panel">
      <h1>구매 문의</h1>
      <p className="panel-lead">
        {item?.title} · 등록 가격 {formatWon(item?.askingPrice ?? 0)}
        <br />
        문의에 답변해야 다음 행동을 진행할 수 있습니다. 다른 메뉴는 응답 후
        열립니다.
      </p>
      {s.inquiries.map((q) => (
        <section className="action-row" key={q.id}>
          <div>
            <h2>{q.name}</h2>
            <p>
              제안 {formatWon(q.price)}
              {q.raised && ' · 다시 제안'}
            </p>
            <button className="outline-button" onClick={() => s.sell(q.id)}>
              수락 · 한 번에 판매 (목업)
            </button>
            <button className="outline-button" onClick={() => s.reject(q.id)}>
              거절
            </button>
          </div>
        </section>
      ))}
      <button className="outline-button" onClick={s.breakOff}>
        거래 파토 · 판매 글과 모든 문의 종료
      </button>
      <p className="muted rule-note">
        가격 역제안은 없습니다. 거절 후 상향 제안·구매자 이탈은 고정된
        예시입니다. 네고 시간·확률·문의 만료는 미정입니다.
      </p>
    </section>
  );
}
export function OutletsScreen() {
  const s = usePreviewStore();
  const [visited, setVisited] = useState<string | null>(null);
  const [offerId, setOfferId] = useState<string | null>(null);
  const outlet = outlets.find((o) => o.id === visited);
  const item = s.items.find((i) => i.id === offerId);
  return (
    <section className="panel">
      <button
        className="activity-back"
        onClick={() => useGameStore.getState().openActivity(null)}
      >
        ← 활동으로
      </button>
      <h1>매각처</h1>
      <p className="panel-lead">
        매각처마다 취급 품목과 가격이 다릅니다. 방문에는 시간이 듭니다. 가격은
        방문 후에만 표시합니다. 여기서는 이동 시간과 가격 산정을 계산하지
        않습니다.
      </p>
      {!outlet ? (
        outlets.map((o) => (
          <button
            className="saved"
            key={o.id}
            onClick={() => {
              setVisited(o.id);
              setOfferId(null);
            }}
          >
            <span>
              {o.title}
              <strong>취급 품목 예시: {o.categories.join(' · ')}</strong>
            </span>
            방문 (목업)
          </button>
        ))
      ) : (
        <>
          <h2>{outlet.title} · 방문한 상황</h2>
          {!s.items.length && <p>보관 중인 물품이 없습니다.</p>}
          {s.items.map((i) => (
            <button
              className="saved"
              key={i.id}
              disabled={
                i.askingPrice !== null ||
                !outlet.categories.includes(i.category)
              }
              onClick={() => setOfferId(i.id)}
            >
              <span>
                {i.title}
                <strong>
                  {i.askingPrice !== null
                    ? '장터 등록 취소 필요'
                    : !outlet.categories.includes(i.category)
                      ? '취급하지 않는 품목 (예시)'
                      : `제시 가격 ${formatWon(outlet.price)} (예시)`}
                </strong>
              </span>
            </button>
          ))}
          {item && item.askingPrice === null && (
            <div>
              <p>
                {item.title}을 {formatWon(outlet.price)}에 판매할까요? 네고는
                불가능합니다.
              </p>
              <button
                className="outline-button"
                onClick={() => {
                  s.sellToOutlet(item.id, outlet.price);
                  setOfferId(null);
                }}
              >
                제시 가격으로 매각 (목업)
              </button>
              <button
                className="outline-button"
                onClick={() => setOfferId(null)}
              >
                판매하지 않기
              </button>
            </div>
          )}
          <button
            className="outline-button"
            onClick={() => {
              setVisited(null);
              setOfferId(null);
            }}
          >
            다른 매각처 선택
          </button>
        </>
      )}
    </section>
  );
}
