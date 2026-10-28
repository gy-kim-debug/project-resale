/** Dialogue tuning is provisional. Age/gender never alter honesty or prices. */
export const DIALOGUE_RULES = {
  truthPercent: 85,
  maxRapport: 2,
  maxMessages: 64,
};
export const DIALOGUE_TOPICS = {
  greet: '안녕하세요. 아직 거래 가능한가요?',
  condition: '사용 상태가 어떤가요?',
  contents: '구성품도 함께 받을 수 있나요?',
  feature: '게시글에 적힌 특징을 더 알려주세요.',
  reason: '판매하시는 이유가 있나요?',
  background: '어떤 분이 사용하시던 물건인가요?',
  detail: '조금 더 자세히 말씀해 주실 수 있나요?',
  thanks: '설명 감사합니다. 참고할게요.',
  eventAccept: '네, 말씀하신 조건을 확인했어요.',
  eventDecline: '확답은 어렵고, 조금 더 살펴볼게요.',
  quickDeal: '조건이 맞으면 바로 구매할게요.',
} as const;
export type DialogueTopic = keyof typeof DIALOGUE_TOPICS;
export const isDialogueTopic = (v: unknown): v is DialogueTopic =>
  typeof v === 'string' && Object.hasOwn(DIALOGUE_TOPICS, v);
