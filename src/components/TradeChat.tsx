import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../domain/game';
import { useChatReplies } from '../app/chatReplies';

export function TradeChat({
  name,
  messages,
  threadId,
}: {
  name: string;
  messages: ChatMessage[];
  threadId?: string;
}) {
  const reply = useChatReplies((s) =>
    threadId ? s.pending[threadId] : undefined,
  );
  const visible = reply ? reply.messages.slice(0, reply.visible) : messages;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages, reply]);
  return (
    <div
      className="trade-chat"
      role="log"
      aria-label={`${name} 채팅`}
      aria-relevant="additions"
      ref={ref}
    >
      {visible.map((m, index) => (
        <div className={`chat-message chat-${m.speaker}`} key={index}>
          <small>{m.speaker === 'player' ? '나' : name}</small>
          <p>{m.text}</p>
        </div>
      ))}
      {reply && (
        <div
          className="chat-message chat-other chat-typing"
          role="status"
          aria-label={`${name} 입력 중`}
        >
          <small>{name}</small>
          <p aria-hidden="true">
            <i aria-hidden="true" />
            <i aria-hidden="true" />
            <i aria-hidden="true" />
          </p>
        </div>
      )}
    </div>
  );
}
