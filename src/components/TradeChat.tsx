import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../domain/game';

export function TradeChat({
  name,
  messages,
}: {
  name: string;
  messages: ChatMessage[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [messages]);
  return (
    <div
      className="trade-chat"
      role="log"
      aria-label={`${name} 채팅`}
      aria-relevant="additions"
      ref={ref}
    >
      {messages.map((m, index) => (
        <div className={`chat-message chat-${m.speaker}`} key={index}>
          <small>{m.speaker === 'player' ? '나' : name}</small>
          <p>{m.text}</p>
        </div>
      ))}
    </div>
  );
}
