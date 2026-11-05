export const EVENT_KINDS = [
  'missing',
  'rehaggle',
  'regular',
  'model',
  'memory',
  'competitor',
  'bundle',
  'creditor',
  'rush',
  'appointment',
  'scam',
  'inspection',
  'reservation',
  'returnBuyer',
  'collector',
  'referral',
  'reunion',
  'marketTip',
] as const;
export type EventKind = (typeof EVENT_KINDS)[number];
export type SceneKind =
  'intro' | 'success' | 'failure' | 'weekly' | 'lottery' | 'stroll' | EventKind;
export interface StoryLine {
  shot?: import('./intro').IntroShot;
  speaker: string;
  text: string;
  motion: 'phone' | 'listen' | 'look' | 'meet' | 'exchange' | 'leave';
}
export const STORY_TITLES: Record<SceneKind, string> = {
  intro: '첫 정산까지',
  weekly: '이번 주의 상환',
  lottery: '이번 주 복권',
  stroll: '산책길에서',
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
  rush: '출발 직전의 거래',
  appointment: '엇갈린 약속',
  scam: '수상한 선입금 요구',
  inspection: '구매자의 추가 확인',
  reservation: '예약 문의',
  returnBuyer: '예약자의 재연락',
  collector: '수집가의 지명 구매',
  referral: '소개받은 거래',
  reunion: '예전 주인의 연락',
  marketTip: '뜻밖의 매물 정보',
};
export const STORY_RULES = {
  chancePercent: 24,
  cooldownActions: 3,
  historyLimit: 64,
} as const;
