import type { Game, Log } from '../domain/game';

export function isMailboxLog(log: Log): boolean {
  if (log.category !== undefined) return log.category !== 'activity';
  // Older saves have no category. Recognize only known allowed messages.
  return /^(현금 [\d,]+\s*원,\s*채무|시장 변화:|수리 전문가에게 특별 제안이 왔습니다\.|수리 전문가가 소개한 단골의 감사금 |정비 교육을 마쳤습니다\.|특별 제안을 거절했습니다\.|특별 제안이 만료됐습니다\.)/.test(
    log.text,
  );
}
export const mailboxLogs = (game: Game) =>
  game.logs.filter(isMailboxLog).slice(0, 20);
export const unreadCount = (game: Game, readIds: number[]) =>
  mailboxLogs(game).filter((log) => !readIds.includes(log.id)).length;
