import { useEffect, useRef } from 'react';
import { useGameStore } from '../app/store';
import { categories, listings } from '../content/listings';
import { formatWon } from '../domain/models';
import { Icon, type IconName } from './Icon';
import { PurchaseControls } from './TradeScreens';
import { usePreviewStore } from '../app/previewStore';
const itemIcons: Record<string, IconName> = {
  radio: 'radio',
  keyboard: 'keyboard',
  box: 'box',
  chair: 'chair',
  camera: 'camera',
};
export function MarketScreen() {
  const state = useGameStore();
  const cash = usePreviewStore((s) => s.cash);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousId = useRef<string | null>(null);
  useEffect(() => {
    if (state.selectedId) heading.current?.focus();
    else if (previousId.current)
      document.getElementById(`listing-${previousId.current}`)?.focus();
    previousId.current = state.selectedId;
  }, [state.selectedId]);
  const item = listings.find((item) => item.id === state.selectedId);
  return (
    <section className="market-screen">
      <div className="market-return">
        <button onClick={() => state.openActivity(null)}>
          <Icon name="back" size={17} /> 활동으로
        </button>
        <span className="mono">
          DAY 01 <span>·</span> 현금 {formatWon(cash)}
        </span>
      </div>
      <div className="market-window">
        <header className="market-header">
          <div className="market-logo">
            <Icon name="market" size={23} />
            <strong>골목장터</strong>
          </div>
          <span className="neighborhood">
            우리 동네 <span aria-hidden="true">⌄</span>
          </span>
        </header>
        {item ? (
          <div className="detail">
            <button className="back" onClick={() => state.select(null)}>
              <Icon name="back" size={17} /> 매물 목록
            </button>
            <div className={`detail-art art-${item.category}`}>
              <Icon name={itemIcons[item.id]} size={90} />
              <span>판매자 설명 기반 예시 매물</span>
            </div>
            <div className="detail-body">
              <div className="item-meta">
                {item.category} · {item.condition}
              </div>
              <h1 ref={heading} tabIndex={-1}>
                {item.title}
              </h1>
              <strong className="detail-price">
                {item.price === 0 ? '무료 나눔' : formatWon(item.price)}
              </strong>
              <p className="seller">
                <span className="seller-avatar">{item.seller.slice(0, 1)}</span>
                <span>
                  {item.seller}
                  <small>동네 판매자</small>
                </span>
              </p>
              <p className="item-description">{item.description}</p>
              <aside className="clue">
                <Icon name="alert" size={18} />
                <div>
                  <b>가격만 보고 결정하지 마세요.</b>
                  <p>{item.clue}</p>
                  <small>실제 가치와 숨겨진 결함은 아직 알 수 없습니다.</small>
                </div>
              </aside>
              <button
                className={`favorite-button ${state.favoriteIds.includes(item.id) ? 'is-saved' : ''}`}
                disabled={!state.ready}
                onClick={() => state.toggleFavorite(item.id)}
              >
                <Icon name="heart" size={19} />
                {state.favoriteIds.includes(item.id)
                  ? '관심 매물에서 해제'
                  : '관심 매물로 저장'}
              </button>
              <PurchaseControls key={item.id} item={item} />
              <p className="detail-footnote">
                고정 예시 매물입니다. 거래는 메모리에만 적용하며 시간·생존은
                계산하지 않습니다.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="market-welcome">
              <span className="market-kicker">
                가까운 곳에서 찾는 다음 기회
              </span>
              <h1>오늘의 동네 매물</h1>
              <p>물건의 가치는, 보는 사람에 따라 다르니까.</p>
              <span className="welcome-mark" aria-hidden="true">
                <Icon name="market" size={68} />
              </span>
            </div>
            <div className="categories" aria-label="매물 카테고리">
              {categories.map((category) => (
                <button
                  key={category}
                  aria-pressed={state.category === category}
                  onClick={() => state.setCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>
            <div className="list-meta">
              <span>
                {state.category === '전체'
                  ? '새로 둘러볼 매물'
                  : state.category}{' '}
                <b>
                  {
                    listings.filter(
                      (item) =>
                        state.category === '전체' ||
                        item.category === state.category,
                    ).length
                  }
                </b>
              </span>
              <span>예시 매물</span>
            </div>
            <div className="listing-list">
              {listings
                .filter(
                  (item) =>
                    state.category === '전체' ||
                    item.category === state.category,
                )
                .map((item) => (
                  <button
                    id={`listing-${item.id}`}
                    className="listing"
                    key={item.id}
                    onClick={() => state.select(item.id)}
                  >
                    <span className={`item-art art-${item.category}`}>
                      <Icon name={itemIcons[item.id]} size={42} />
                    </span>
                    <span className="item-info">
                      <span className="item-title">{item.title}</span>
                      <span className="item-meta">
                        {item.category} · {item.condition}
                      </span>
                      <strong>
                        {item.price === 0 ? '무료 나눔' : formatWon(item.price)}
                      </strong>
                      {item.tag && (
                        <span
                          className={`tag ${item.price === 0 ? 'tag-free' : ''}`}
                        >
                          {item.tag}
                        </span>
                      )}
                    </span>
                    {state.favoriteIds.includes(item.id) && (
                      <span className="listing-heart" aria-label="관심 매물">
                        <Icon name="heart" size={15} />
                      </span>
                    )}
                  </button>
                ))}
            </div>
            <div className="market-end">
              <span>골목 끝에도 기회는 있다.</span>
              <small>지금은 고정된 예시 매물을 탐색할 수 있어요.</small>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
