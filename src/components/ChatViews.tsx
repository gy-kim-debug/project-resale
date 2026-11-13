import { useEffect, useState } from 'react';
import { buyChatId, chatStatusText, type TradeThread } from '../domain/chats';
import { won, type Game } from '../domain/game';
import type { Act } from '../app/store';
import {
  AuctionListingView,
  Button,
  InquiriesView,
  ListingView,
  type Open,
} from './GameViews';
import { ItemArt } from './ItemArt';
import { TradeChat } from './TradeChat';
import { useChatReplies } from '../app/chatReplies';
export function ChatList({ g, open }: { g: Game; open: Open }) {
  const replies = useChatReplies((s) => s.pending);
  const [filter, setFilter] = useState<'active' | 'buy' | 'sell' | 'ended'>(
    'active',
  );
  const threads = [...(g.chats ?? [])]
    .filter((t) =>
      filter === 'ended'
        ? t.status !== 'active'
        : t.status === 'active' && (filter === 'active' || t.side === filter),
    )
    .sort((a, b) => b.updated - a.updated);
  return (
    <>
      <div className="page-heading">
        <h1>채팅</h1>
      </div>
      <div className="chat-filters" role="group" aria-label="채팅 분류">
        {(
          [
            ['active', '진행 중'],
            ['buy', '구매'],
            ['sell', '판매'],
            ['ended', '종료'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {g.inquiries.length > 0 && (
        <p className="chat-pending-notice">
          답변할 구매 문의 {g.inquiries.length}건
          {g.inquiries.length > 1 && (
            <Button onClick={() => open({ kind: '문의' })}>문의 비교</Button>
          )}
        </p>
      )}
      {threads.length ? (
        <ul className="chat-list">
          {threads.map((t) => (
            <li key={t.id}>
              <button
                className={`chat-list-row${t.unread ? ' chat-unread' : ''}`}
                onClick={() => open({ kind: '채팅방', id: t.id })}
                aria-label={`${t.name} · ${t.title} · ${chatStatusText(t.status)}${t.unread ? ' · 안 읽음' : ''}`}
              >
                <ItemArt item={t} />
                <span className="chat-row-body">
                  <strong>
                    {t.name}
                    {t.unread && (
                      <i className="chat-unread-dot" aria-label="안 읽음" />
                    )}
                  </strong>
                  <span>{t.title}</span>
                  <small>
                    {replies[t.id] ? '입력 중…' : t.messages.at(-1)?.text}
                  </small>
                </span>
                <span className="chat-row-status">
                  <b>{t.side === 'buy' ? '구매' : '판매'}</b>
                  <small>{chatStatusText(t.status)}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty">
          <h2>
            {filter === 'ended'
              ? '종료된 채팅이 없어요.'
              : '진행 중인 채팅이 없어요.'}
          </h2>
        </div>
      )}
    </>
  );
}
function ArchivedConversation({ thread }: { thread: TradeThread }) {
  const replying = useChatReplies((s) => !!s.pending[thread.id]);
  return (
    <section className="archived-conversation">
      <div className="chat-room-summary">
        <ItemArt item={thread} />
        <div>
          <h2>{thread.name}</h2>
          <p>{thread.title}</p>
          <strong>{won(thread.price)}</strong>
          <span className="chat-ended-status">
            {replying ? '답변 대기' : chatStatusText(thread.status)}
          </span>
        </div>
      </div>
      <TradeChat
        threadId={thread.id}
        name={thread.name}
        messages={thread.messages}
      />
    </section>
  );
}
export function ChatRoom({
  g,
  id,
  act,
  open,
}: {
  g: Game;
  id: string;
  act: Act;
  open: Open;
}) {
  const thread = g.chats?.find((t) => t.id === id);
  useEffect(() => {
    if (thread?.unread && !g.story?.active && g.status === 'playing')
      void act({ type: 'readChat', id: thread.id });
  }, [act, thread?.id, thread?.unread, g.story?.active, g.status]);
  if (!thread)
    return (
      <div className="empty">
        <h2>채팅을 찾을 수 없어요.</h2>
      </div>
    );
  if (thread.status !== 'active')
    return <ArchivedConversation thread={thread} />;
  if (thread.side === 'buy') {
    const item = g.board.find((i) => buyChatId(i.id) === id);
    if (!item) return <ArchivedConversation thread={thread} />;
    return item.marketId === 'auction' ? (
      <AuctionListingView g={g} item={item} act={act} />
    ) : (
      <ListingView g={g} item={item} act={act} open={open} conversation />
    );
  }
  return <InquiriesView g={g} act={act} onlyId={thread.inquiryId} />;
}
export function PendingInquiryBar({ g, open }: { g: Game; open: Open }) {
  if (!g.inquiries.length) return null;
  const first = g.chats?.find((t) => t.inquiryId === g.inquiries[0].id);
  return (
    <aside className="pending-inquiry-bar">
      <span>답변할 구매 문의 {g.inquiries.length}건</span>
      <Button
        onClick={() =>
          open(
            g.inquiries.length > 1 || !first
              ? { kind: '문의' }
              : { kind: '채팅방', id: first.id },
          )
        }
      >
        문의 확인
      </Button>
    </aside>
  );
}
