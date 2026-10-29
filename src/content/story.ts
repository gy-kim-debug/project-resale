export const EVENT_KINDS = [
  'missing',
  'rehaggle',
  'regular',
  'model',
  'memory',
  'competitor',
  'bundle',
  'creditor',
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];
export type SceneKind = 'intro' | 'success' | 'failure' | EventKind;
export interface StoryLine {
  speaker: string;
  text: string;
  motion: 'phone' | 'listen' | 'look' | 'meet' | 'exchange' | 'leave';
}
export const STORY_TITLES: Record<SceneKind, string> = {
  intro: '첫 정산까지',
  success: '남은 채무 0원',
  failure: '끊어진 거래',
  missing: '빠진 구성품',
  rehaggle: '현장 재흥정',
  regular: '단골의 부탁',
  model: '이름표 확인',
  memory: '추억이 담긴 물건',
  competitor: '경쟁자의 제안',
  bundle: '묶음 정리',
  creditor: '채권자의 방문',
};
export const STORY_RULES = {
  chancePercent: 24,
  cooldownActions: 3,
  historyLimit: 64,
} as const;
