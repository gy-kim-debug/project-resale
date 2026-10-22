import type { Game } from '../domain/game';

export const mailboxLogs = (game: Game) => game.logs.slice(0, 20);
export const unreadCount = (game: Game, readIds: number[]) =>
  mailboxLogs(game).filter((log) => !readIds.includes(log.id)).length;
