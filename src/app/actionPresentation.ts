import type { Command, Game } from '../domain/game';
import { JOBS } from '../content/rules';

export const ACTION_DURATION_MS = 750;
export const HIGHLIGHT_DURATION_MS = 1400;
export type ChangeKey = 'minute' | 'cash' | 'debt';
export type Changes = Partial<Record<ChangeKey, number>>;
export type ActionSceneKind =
  | 'gift'
  | 'buy'
  | 'sell'
  | 'search'
  | 'work'
  | 'inspect'
  | 'repair'
  | 'listing'
  | 'finance'
  | 'walk';
export function actionScene(command: Command, before?: Game): ActionSceneKind {
  switch (command.type) {
    case 'buy':
      return before?.board.find((item) => item.id === command.id)?.price === 0
        ? 'gift'
        : 'buy';
    case 'accept':
    case 'outletSell':
      return 'sell';
    case 'scavenge':
      return 'search';
    case 'job':
      return 'work';
    case 'check':
      return 'inspect';
    case 'repair':
      return 'repair';
    case 'post':
    case 'cancel':
      return 'listing';
    case 'repay':
    case 'payInterest':
    case 'buyBusiness':
      return 'finance';
    default:
      return 'walk';
  }
}
export interface ActionPresentation {
  scene: ActionSceneKind;
  id: number;
  label: string;
  before: Game;
  after: Game;
  duration: number;
}
export function changesBetween(before: Game, after: Game): Changes {
  const changes: Changes = {};
  for (const key of ['minute', 'cash'] as const) {
    if (after[key] !== before[key]) changes[key] = after[key] - before[key];
  }
  const debt =
    after.principal + after.interest - before.principal - before.interest;
  if (debt) changes.debt = debt;
  return changes;
}
export function actionLabel(command: Command): string {
  if (command.type === 'job')
    return `${JOBS.find((j) => j.id === command.id)?.title ?? '일'} 중…`;
  const labels: Record<Exclude<Command['type'], 'job'>, string> = {
    storyNext: '대화 중…',
    storyChoice: '거래하는 중…',
    buyBusiness: '사업을 구매하는 중…',
    scavenge: '물건을 찾는 중…',
    refresh: '새 매물을 찾는 중…',
    wait: '기다리는 중…',
    dialogue: '대화하는 중…',
    offer: '가격을 제안하는 중…',
    buy: '물품을 받는 중…',
    bid: '입찰하는 중…',
    withdrawAuction: '경매를 마무리하는 중…',
    closeChat: '흥정을 마무리하는 중…',
    check: '가치를 확인하는 중…',
    repair: '수리하는 중…',
    discard: '물품을 정리하는 중…',
    post: '판매 글을 올리는 중…',
    cancel: '판매 글을 내리는 중…',
    accept: '거래하는 중…',
    reject: '답변하는 중…',
    counter: '판매 가격을 제안하는 중…',
    break: '거래를 마무리하는 중…',
    visit: '판매 목록을 확인하는 중…',
    outletSell: '판매하는 중…',
    repay: '상환하는 중…',
    payInterest: '정산을 마치는 중…',
    startSettlement: '이번 주를 정산하는 중…',
    event: '제안에 답하는 중…',
  };
  return labels[command.type];
}
