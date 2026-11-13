import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { execute, newGame } from '../src/domain/engine';
import {
  clearChatReplies,
  presentChatReply,
  replyThreadId,
  useChatReplies,
} from '../src/app/chatReplies';
import type { ChatMessage, Command, Game } from '../src/domain/game';
const before = newGame(42);
const item = before.board.find((i) => i.marketId === 'street')!;
const command: Command = { type: 'dialogue', id: item.id, topic: 'greet' };
const result = execute(before, command);
assert.equal(result.ok, true);
const id = replyThreadId(command)!;
afterEach(clearChatReplies);
test('reply playback shows player first, reveals each answer and never changes game or RNG', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const saved = structuredClone(result.game);
  presentChatReply(before, result.game, command);
  const reply = useChatReplies.getState().pending[id];
  assert.ok(reply);
  assert.equal(reply.messages[reply.visible - 1].speaker, 'player');
  assert.equal(reply.messages[reply.visible].speaker, 'other');
  t.mock.timers.tick(600);
  assert.equal(useChatReplies.getState().pending[id].visible, reply.visible);
  for (let i = 0; i < 5; i++) t.mock.timers.tick(1100);
  assert.equal(useChatReplies.getState().pending[id], undefined);
  assert.deepEqual(result.game, saved);
});
test('independent threads continue offscreen; reset cancels all pending timers', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  presentChatReply(before, result.game, command);
  const other = before.board.find(
    (i) => i.marketId === 'street' && i.id !== item.id,
  )!;
  const c: Command = { type: 'dialogue', id: other.id, topic: 'greet' };
  const after = execute(before, c).game;
  presentChatReply(before, after, c);
  assert.equal(Object.keys(useChatReplies.getState().pending).length, 2);
  clearChatReplies();
  t.mock.timers.tick(10000);
  assert.deepEqual(useChatReplies.getState().pending, {});
});
test('existing transcripts and commands without a new reply never replay', () => {
  presentChatReply(result.game, result.game, command);
  presentChatReply(before, result.game, { type: 'startChat', id: item.id });
  assert.deepEqual(useChatReplies.getState().pending, {});
});
test('capped transcripts still reveal the new turn and split consecutive replies', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const messages: ChatMessage[] = [
    ...Array.from({ length: 125 }, () => ({
      speaker: 'other' as const,
      text: '이전 대화',
    })),
    { speaker: 'player', text: '구성품은요?' },
    { speaker: 'other', text: '상자가 있어요.' },
    { speaker: 'other', text: '케이블도 드릴게요.' },
  ];
  const after = structuredClone(result.game) as Game;
  after.chats!.find((thread) => thread.id === id)!.messages = messages;
  presentChatReply(before, after, command);
  assert.equal(useChatReplies.getState().pending[id].visible, 126);
  t.mock.timers.tick(1000);
  assert.equal(useChatReplies.getState().pending[id].visible, 127);
  t.mock.timers.tick(1000);
  assert.equal(useChatReplies.getState().pending[id], undefined);
});
