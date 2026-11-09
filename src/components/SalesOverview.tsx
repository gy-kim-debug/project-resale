import { sellChatId } from '../domain/chats';
import { listingLimit } from '../domain/engine';
import { durationText, won, type Game } from '../domain/game';
import { marketDefinition, marketOf } from '../content/markets';
import type { Open } from './GameViews';
import { ItemArt } from './ItemArt';

export function SalesOverview({ g, open }: { g: Game; open: Open }) {
  const listings = g.sales.flatMap((sale) => {
    const item = g.inventory.find((i) => i.id === sale.itemId);
    return item
      ? [
          {
            sale,
            item,
            inquiries: g.inquiries.filter((q) => q.saleId === sale.id),
          },
        ]
      : [];
  });
  const total = listings.reduce((sum, { sale }) => sum + sale.price, 0);
  return (
    <section className="sales-overview" aria-labelledby="sales-overview-title">
      <header className="sales-overview-heading">
        <h2 id="sales-overview-title">판매 현황</h2>
        <span
          aria-label={`판매 등록 ${listings.length}개, 최대 ${listingLimit(g)}개`}
        >
          {listings.length}/{listingLimit(g)}
        </span>
      </header>
      {listings.length ? (
        <>
          <dl className="sales-overview-summary">
            <div>
              <dt>등록 금액 합계</dt>
              <dd>{won(total)}</dd>
            </div>
            <div>
              <dt>받은 문의</dt>
              <dd>{g.inquiries.length}건</dd>
            </div>
          </dl>
          <ul className="sales-overview-list">
            {listings.map(({ sale, item, inquiries }) => {
              const expired =
                sale.expires <= g.minute && inquiries.length === 0;
              return (
                <li key={sale.id}>
                  <button
                    className="sale-overview-row"
                    aria-label={`${item.title} 판매 상세`}
                    onClick={() =>
                      open(
                        inquiries.length
                          ? { kind: '채팅방', id: sellChatId(inquiries[0].id) }
                          : { kind: '물품', id: item.id },
                      )
                    }
                  >
                    <ItemArt item={item} />
                    <span className="sale-overview-body">
                      <strong>{item.title}</strong>
                      <small>
                        {marketDefinition(sale.marketId ?? marketOf(item)).name}
                      </small>
                      <span className="sale-overview-price">
                        {won(sale.price)}
                      </span>
                      <small>
                        {expired
                          ? '등록 기간 종료'
                          : `만료까지 ${durationText(sale.expires - g.minute)}`}
                      </small>
                    </span>
                    <span className="sale-overview-side">
                      <span
                        className={`sale-status${inquiries.length ? ' has-inquiry' : ''}`}
                      >
                        {expired
                          ? '만료'
                          : inquiries.length
                            ? `문의 ${inquiries.length}건`
                            : '판매 중'}
                      </span>
                      <span className="sale-overview-arrow" aria-hidden="true">
                        ›
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <p className="sales-overview-empty">판매 중인 물건이 없어요.</p>
      )}
    </section>
  );
}
