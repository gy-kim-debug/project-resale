import { useChatReplies } from '../app/chatReplies';
import { marketDefinition, marketOf } from '../content/markets';
import { sellChatId } from '../domain/chats';
import { durationText, won, type Game } from '../domain/game';
import type { Open } from './GameViews';
import { ItemArt } from './ItemArt';
import { ItemComparison } from './ItemComparison';
import { TraderProfile } from './TraderProfile';

export function InquiryComparison({
  g,
  open,
  saleId,
}: {
  g: Game;
  open: Open;
  saleId?: string;
}) {
  const replies = useChatReplies((s) => s.pending);
  const groups = g.sales.flatMap((sale) => {
    const item = g.inventory.find((i) => i.id === sale.itemId);
    const inquiries = g.inquiries
      .filter((q) => q.saleId === sale.id)
      .sort((a, b) => b.price - a.price);
    return item && inquiries.length && (!saleId || sale.id === saleId)
      ? [{ sale, item, inquiries }]
      : [];
  });
  if (!groups.length) return <p>남은 문의가 없습니다.</p>;
  return (
    <div className="inquiry-comparison">
      {groups.map(({ sale, item, inquiries }) => (
        <section
          className="inquiry-group"
          key={sale.id}
          aria-label={`${item.title} 문의 비교`}
        >
          <header className="inquiry-product">
            <ItemArt item={item} />
            <div>
              <h2>{item.title}</h2>
              <small>
                {marketDefinition(sale.marketId ?? marketOf(item)).name}
              </small>
              <p>등록가 {won(sale.price)}</p>
              <small>만료까지 {durationText(sale.expires - g.minute)}</small>
            </div>
          </header>
          <ItemComparison g={g} item={item} />
          <ul className="inquiry-offers">
            {inquiries.map((q) => {
              const threadId = sellChatId(q.id);
              const replying = !!replies[threadId];
              return (
                <li className="inquiry-offer card" key={q.id}>
                  <TraderProfile
                    traderId={q.traderId}
                    entityId={q.id}
                    name={q.name}
                    role="구매자"
                  />
                  <div className="inquiry-offer-price">
                    <span>제안 금액</span>
                    <strong>{replying ? '답변 대기' : won(q.price)}</strong>
                  </div>
                  <button
                    className="action-button primary"
                    onClick={() => open({ kind: '채팅방', id: threadId })}
                    aria-label={`${q.name} 채팅 이어가기`}
                  >
                    채팅 이어가기
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
