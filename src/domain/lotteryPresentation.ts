import type { LotteryResult } from './daily';
import type { StoryLine } from '../content/story';
import { won } from './game';

export type LotteryCamera =
  | 'room'
  | 'ticket'
  | 'studio'
  | 'mix'
  | 'ball'
  | 'bonus'
  | 'check'
  | 'verdict'
  | 'receipt'
  | 'after';
export interface LotteryShot {
  camera: LotteryCamera;
  label: string;
  revealed: number;
  bonus: boolean;
  verdict: boolean;
  line: StoryLine;
}
/** Presentation reads the settled result only; it never draws or credits cash. */
export function lotteryShots(
  result: LotteryResult,
  me = '주인공',
): LotteryShot[] {
  const numbers = result.numbers ?? [];
  const winning = result.winning ?? [];
  const matches = winning.filter((n) => numbers.includes(n)).length;
  const rank = result.ranks[0];
  const bonusMatch = numbers.includes(result.bonus!);
  const shots: LotteryShot[] = [];
  function add(
    camera: LotteryCamera,
    label: string,
    text: string,
    revealed = 0,
    bonus = false,
    verdict = false,
    speaker = '추첨 방송',
  ) {
    shots.push({
      camera,
      label,
      revealed,
      bonus,
      verdict,
      line: { speaker, text, motion: camera === 'receipt' ? 'phone' : 'look' },
    });
  }
  add(
    'room',
    '추첨을 기다리는 밤',
    '정산을 마치고 방으로 돌아왔다. 잠깐, 오늘이 복권 추첨일이었지.',
    0,
    false,
    false,
    me,
  );
  add(
    'ticket',
    '접힌 복권을 펼치다',
    `${result.week}주차 복권. 주머니에서 꺼내 접힌 모서리를 펴고, 자동으로 받은 여섯 번호를 다시 읽는다.`,
    0,
    false,
    false,
    me,
  );
  add(
    'studio',
    '추첨 방송 시작',
    `${result.week}주차 추첨을 시작합니다. 당첨 번호 여섯 개와 보너스 번호 한 개를 차례로 공개합니다.`,
  );
  add(
    'mix',
    '추첨 공 혼합',
    '투명한 추첨기 안에서 공들이 뒤섞입니다. 첫 번째 공이 배출구를 향해 올라옵니다.',
  );
  winning.forEach((n, i) => {
    const count = winning
      .slice(0, i + 1)
      .filter((v) => numbers.includes(v)).length;
    const reaction = numbers.includes(n)
      ? `내 복권에도 있다. ${count}개째 일치!`
      : count
        ? `내 번호에는 없다. 지금까지 ${count}개 일치.`
        : '복권을 훑어봤지만, 아직 일치하는 번호는 없다.';
    add(
      'ball',
      `${i + 1}번째 공 공개`,
      `${i + 1}번째 당첨 번호는… ${n}번입니다! ${reaction}${i === 5 ? ' 여섯 개의 기본 번호가 모두 나왔다.' : ''}`,
      i + 1,
    );
  });
  add(
    'mix',
    '마지막 공을 기다리며',
    matches === 5
      ? '다섯 개가 맞았다. 남은 내 번호 하나가 보너스라면… 손에 쥔 복권에 힘이 들어간다.'
      : '기본 번호 추첨이 끝났습니다. 이제 2등을 결정하는 보너스 번호를 뽑겠습니다.',
    6,
  );
  add(
    'bonus',
    '보너스 번호 공개',
    `보너스 번호는 ${result.bonus}번입니다. ${bonusMatch ? '내 복권에도 있는 번호다.' : '내 복권에는 없는 번호다.'} 보너스는 기본 번호 다섯 개가 맞았을 때 2등 판정에 사용됩니다.`,
    6,
    true,
  );
  add(
    'check',
    '한 번 더 번호 대조',
    `기본 번호 ${matches}개 일치${bonusMatch ? ' · 보너스 일치' : ' · 보너스 불일치'}. 복권과 화면을 번갈아 보며 빠뜨린 번호가 없는지 확인한다.`,
    6,
    true,
    false,
    me,
  );
  const reactions: Record<number, string> = {
    1: '여섯 개가 전부 맞았다. 설마… 몇 번을 다시 세어도 같은 번호다. 정말 1등이다!',
    2: '다섯 개에 보너스까지! 마지막 공을 기다린 보람이 있다. 2등이다!',
    3: '다섯 개나 맞았다! 보너스는 아쉽지만, 3등이면 이번 주의 큰 행운이다.',
    4: '네 개가 맞았다. 4등! 작은 기대가 진짜 당첨으로 돌아왔다.',
    5: '세 개 일치, 5등이다. 크게 달라지진 않아도 당첨이라는 말이 반갑다.',
    0: '다시 세어 봐도 두 개 이하. 이번 주 복권은 낙첨이다. 잠깐 기대했던 마음을 내려놓는다.',
  };
  add(
    'verdict',
    rank ? `${rank}등 당첨 확인` : '이번 주 추첨 결과',
    reactions[rank] ?? reactions[0],
    6,
    true,
    true,
    me,
  );
  add(
    'receipt',
    rank ? '당첨금 입금 확인' : '추첨 기록 정리',
    rank
      ? `입금 내역을 확인했다. 이번 복권으로 실제 받은 금액은 ${won(result.payout)}. 결과와 수령액을 추첨 기록에 남겨 둔다.`
      : '당첨금은 0원. 복권을 접어 놓고 이번 주 번호를 추첨 기록에 남긴다.',
    6,
    true,
    true,
    me,
  );
  add(
    'after',
    '다시 나의 일상으로',
    rank === 1
      ? '행운이 찾아왔지만 갚아야 할 빚은 아직 남아 있다. 이 돈을 어디에 쓸지 차분히 생각해 보자.'
      : rank
        ? '좋아, 한 번 웃었으니 다시 내 페이스로. 다음 주 거래도 잘 풀리면 좋겠다.'
        : '오늘의 기대는 여기까지. 다음 주는 내 손으로 좋은 거래를 만들어 보자.',
    6,
    true,
    true,
    me,
  );
  return shots;
}
