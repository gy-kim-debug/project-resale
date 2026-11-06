import type { Command } from '../domain/game';
import { won } from '../domain/game';
import { DAILY_RULES, stockDefinition } from '../content/daily';
export type DailyCommand = Extract<
  Command,
  { type: 'dailyWork' | 'walk' | 'buyLottery' | 'tradeStock' }
>;
/** Confirmation content only. The in-game dialog controls whether a command runs. */
export function dailyConfirmation(command: DailyCommand, amount?: number) {
  const message =
    command.type === 'dailyWork'
      ? `아르바이트를 할까요?\n보상 ${won(DAILY_RULES.workPay)} · ⚡1`
      : command.type === 'walk'
        ? '산책할까요?\n⚡1'
        : command.type === 'buyLottery'
          ? `이번 주 복권 1장을 구매할까요?\n${won(DAILY_RULES.lotteryCost)} · 자동 번호`
          : `${stockDefinition(command.id)?.name ?? '주식'} ${command.quantity}주를 ${command.side === 'buy' ? '매수' : '매도'}할까요?\n${command.side === 'buy' ? '결제' : '수령'} ${won(amount ?? 0)}`;
  const [title, detail] = message.split('\n');
  return {
    title,
    detail,
    command,
    label:
      command.type === 'buyLottery'
        ? '구매'
        : command.type === 'tradeStock'
          ? command.side === 'buy'
            ? '매수'
            : '매도'
          : '실행',
  };
}
