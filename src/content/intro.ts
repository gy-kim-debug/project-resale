import type { StoryLine } from './story';
export const INTRO_SHOTS = {
  window: '반지하의 아침',
  family: '십여 년 전',
  door: '낯선 방문자',
  departure: '떠나는 사람들',
  child: '남겨진 아이',
  contract: '내 이름',
  wake: '눈을 뜨다',
  debt: '상환 기한',
  balance: '남은 돈',
  listing: '새로운 알림',
  resolve: '작은 가능성',
  exit: '문밖으로',
} as const;
export type IntroShot = keyof typeof INTRO_SHOTS;
export const INTRO_BEATS: readonly (StoryLine & { shot: IntroShot })[] = [
  {
    shot: 'window',
    speaker: '$player',
    text: '……또 같은 꿈이다.',
    motion: 'look',
  },
  {
    shot: 'family',
    speaker: '',
    text: '십여 년 전, 부모님은 보증을 잘못 섰다. 그날부터 모든 것이 달라졌다.',
    motion: 'look',
  },
  {
    shot: 'door',
    speaker: '',
    text: '집에는 낯선 사람들이 찾아왔다. 문 두드리는 소리는 밤에도 멈추지 않았다.',
    motion: 'listen',
  },
  {
    shot: 'departure',
    speaker: '',
    text: '어느 날, 부모님은 아직 어렸던 나를 두고 사라졌다.',
    motion: 'leave',
  },
  {
    shot: 'child',
    speaker: '',
    text: '남겨진 건 나와, 끝없이 따라붙는 빚 독촉뿐이었다.',
    motion: 'look',
  },
  {
    shot: 'contract',
    speaker: '',
    text: '성인이 되면 벗어날 수 있을 줄 알았다. 하지만 벗어나려고 내 이름을 적은 서류가, 결국 나를 묶었다.',
    motion: 'look',
  },
  { shot: 'wake', speaker: '$player', text: '……아침인가.', motion: 'look' },
  {
    shot: 'debt',
    speaker: '채권자',
    text: '남은 채무 10,000,000,000원. 이번 주 상환 기한을 잊지 마세요. 초기 유예 기간이 끝나면 납부액은 늘어납니다.',
    motion: 'phone',
  },
  {
    shot: 'balance',
    speaker: '$player',
    text: '남은 돈은 500,000원. 이 돈으로…… 얼마나 버틸 수 있을까.',
    motion: 'look',
  },
  {
    shot: 'listing',
    speaker: '중고거래 알림',
    text: '「이사 때문에 급하게 정리합니다.」',
    motion: 'phone',
  },
  {
    shot: 'resolve',
    speaker: '$player',
    text: '……이거, 조금 더 받을 수 있겠는데.',
    motion: 'look',
  },
  {
    shot: 'exit',
    speaker: '',
    text: '낡은 문을 열었다. 작은 거래부터, 다시 시작이다.',
    motion: 'leave',
  },
];
