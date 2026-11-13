import { create } from 'zustand';
import { buyChatId, sellChatId } from '../domain/chats';
import type { ChatMessage, Command, Game } from '../domain/game';

interface Reply {
  messages: ChatMessage[];
  visible: number;
}
export const useChatReplies = create<{ pending: Record<string, Reply> }>(
  () => ({
    pending: {},
  }),
);
const timers = new Map<string, ReturnType<typeof setTimeout>>();
export function replyThreadId(command: Command): string | undefined {
  switch (command.type) {
    case 'dialogue':
    case 'offer':
    case 'closeChat':
    case 'buy':
      return buyChatId(command.id);
    case 'counter':
    case 'reject':
    case 'break':
    case 'accept':
      return sellChatId(command.id);
  }
}
export function clearChatReplies() {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  useChatReplies.setState({ pending: {} });
}
/** Presentation only: the engine result is committed/saved once, without timers. */
export function presentChatReply(before: Game, after: Game, command: Command) {
  if (!['dialogue', 'offer', 'counter', 'reject'].includes(command.type))
    return;
  const threadId = replyThreadId(command);
  if (!threadId) return;
  const id: string = threadId;
  const messages = after.chats?.find((thread) => thread.id === id)?.messages;
  const old = before.chats?.find((thread) => thread.id === id)?.messages;
  if (!messages || JSON.stringify(messages) === JSON.stringify(old)) return;
  let visible = messages.length;
  while (visible > 0 && messages[visible - 1].speaker === 'other') visible--;
  if (!visible || visible === messages.length) return;
  let reply = { messages, visible };
  useChatReplies.setState((s) => ({ pending: { ...s.pending, [id]: reply } }));
  function schedule() {
    const next = reply.messages[reply.visible];
    const delay = 650 + Math.min(350, next.text.length * 10);
    timers.set(
      id,
      setTimeout(() => {
        reply = { ...reply, visible: reply.visible + 1 };
        if (reply.visible < reply.messages.length) {
          useChatReplies.setState((s) => ({
            pending: { ...s.pending, [id]: { ...reply } },
          }));
          schedule();
        } else {
          timers.delete(id);
          useChatReplies.setState((s) => {
            const pending = { ...s.pending };
            delete pending[id];
            return { pending };
          });
        }
      }, delay),
    );
  }
  schedule();
}
