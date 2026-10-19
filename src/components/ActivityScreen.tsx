import { useState } from 'react';
import { useGameStore, type Activity } from '../app/store';
import { usePreviewStore } from '../app/previewStore';
import { jobs } from '../content/preview';
import { formatWon } from '../domain/models';
import { Icon } from './Icon';
import { OutletsScreen } from './TradeScreens';

const activities: { activity: Activity; description: string }[] = [
  { activity: '장터', description: '매물 탐색 · 구매 · 가격 협상' },
  { activity: '무료나눔', description: '올라온 글이 있을 때만 수령 가능' },
  {
    activity: '아르바이트',
    description: '고정 보상과 소요 시간을 확인하고 선택',
  },
  {
    activity: '물건 수집',
    description: '시간을 써서 물건 발견 · 대부분 저렴한 물건',
  },
  { activity: '매각처', description: '고물상·상점 방문 후 제시 가격으로 매각' },
  { activity: '식사', description: '무료 급식 · 음식으로 포만감과 체력 회복' },
  { activity: '수면', description: '무료 수면 · 다음 날 아침으로 진행' },
  { activity: '치료', description: '음식과 다른 방식으로 체력 회복' },
];
export function ActivityScreen() {
  const open = useGameStore((s) => s.openActivity);
  const cash = usePreviewStore((s) => s.cash);
  return (
    <section className="home-screen activity-hub">
      <div className="home-intro">
        <p className="eyebrow">활동</p>
        <h1>무엇을 할까요?</h1>
      </div>
      <div className="cash-line">
        <span>보유 현금 (목업)</span>
        <strong>{formatWon(cash)}</strong>
      </div>
      <div className="section-label">활동 선택</div>
      <div className="activity-options">
        {activities.map((a) => (
          <button
            className="activity-option"
            key={a.activity}
            onClick={() => open(a.activity)}
          >
            <span className="action-icon">
              <Icon
                name={a.activity === '장터' ? 'market' : 'activity'}
                size={22}
              />
            </span>
            <span>
              <strong>{a.activity}</strong>
              <small>{a.description}</small>
            </span>
            <Icon name="arrow" size={18} />
          </button>
        ))}
      </div>
      <p className="muted rule-note">
        행동과 진행은 시간을 소모합니다. 화면 읽기·메뉴 이동·물품 버리기는
        시간이 흐르지 않습니다. 현재 화면 목업에서는 시간과 생존 수치를 계산하지
        않습니다.
      </p>
    </section>
  );
}
export function ActivityDetailScreen({
  activity,
}: {
  activity: Exclude<Activity, '장터'>;
}) {
  const open = useGameStore((s) => s.openActivity);
  const preview = usePreviewStore();
  const [choice, setChoice] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [emptyFeed, setEmptyFeed] = useState(false);
  const choose = (value: string) => {
    setChoice(value);
    setConfirmed(false);
  };
  if (activity === '매각처') return <OutletsScreen />;
  const job = jobs.find((j) => j.id === choice);
  const summary =
    activity === '수면'
      ? '다음 날 아침 · 피로도 전부 회복 · 체력 유지 · 일정량 포만감 감소. 아침 시각과 감소량은 미정입니다.'
      : activity === '식사' && choice === '무료 급식'
        ? '언제든 이용 가능 · 포만감과 체력을 조금 회복 · 반복 이용 가능 · 시간 소모. 구체 수치는 미정입니다.'
        : activity === '물건 수집'
          ? '항상 물건을 발견합니다. 대부분 저렴하며 종류·상태·가치는 달라집니다. 이 화면은 고정된 예시 물품만 사용합니다.'
          : activity === '무료나눔'
            ? '수령 조건을 충족하면 확정 수령합니다. 글이 올라오는 시점과 품목은 랜덤이며 현금이 없어도 글이 없을 수 있습니다.'
            : job
              ? `${job.title} · 보상 ${formatWon(job.reward)} · ${job.duration}. 모두 테스트 수치입니다. 체력·포만감 등 조건이 허용하면 연속 선택할 수 있습니다.`
              : '효과·비용·소요 시간과 선택 항목은 아직 정하지 않았습니다.';
  function confirm() {
    if (activity === '무료나눔')
      preview.receive('giveaway', '나눔 받은 생활용품 (예시)', '생활');
    if (activity === '물건 수집')
      preview.receive(`find-${Date.now()}`, '수집한 빈 병 (예시)', '생활');
    setConfirmed(true);
  }
  return (
    <section className="panel">
      <button className="activity-back" onClick={() => open(null)}>
        ← 활동으로
      </button>
      <h1>{activity}</h1>
      {!choice && (
        <>
          {activity === '아르바이트' &&
            jobs.map((j) => (
              <button className="saved" key={j.id} onClick={() => choose(j.id)}>
                <span>
                  {j.title}
                  <strong>
                    {formatWon(j.reward)} · {j.duration}
                  </strong>
                </span>
                선택
              </button>
            ))}
          {activity === '무료나눔' && (
            <>
              <p className="panel-lead">
                글의 등장은 랜덤입니다. 목업에서는 글이 있는 상황과 없는 상황을
                각각 확인합니다.
              </p>
              <button
                className="outline-button"
                onClick={() => setEmptyFeed(!emptyFeed)}
              >
                {emptyFeed ? '예시 글 보기' : '글 없는 상황 보기'}
              </button>
              {emptyFeed ? (
                <p role="status">현재 무료나눔 글이 없습니다.</p>
              ) : (
                <button
                  className="saved"
                  disabled={preview.acquiredIds.includes('giveaway')}
                  onClick={() => choose('생활용품')}
                >
                  생활용품 나눔 (예시) ·{' '}
                  {preview.acquiredIds.includes('giveaway')
                    ? '수령 완료'
                    : '상세 보기'}
                </button>
              )}
            </>
          )}
          {activity === '식사' && (
            <>
              <button className="saved" onClick={() => choose('무료 급식')}>
                무료 급식 · 항상 이용 가능
              </button>
              <button className="saved" disabled>
                음식 선택 · 품목·가격 미정
              </button>
            </>
          )}
          {activity === '치료' && (
            <p className="panel-lead">
              치료로 체력을 회복합니다. 치료 종류·비용·효과·시간이 미정이라
              실행은 연결하지 않았습니다.
            </p>
          )}
          {(activity === '수면' || activity === '물건 수집') && (
            <button className="outline-button" onClick={() => choose(activity)}>
              조건과 결과 확인
            </button>
          )}
        </>
      )}
      {choice && (
        <>
          <h2>{job?.title ?? choice}</h2>
          <p className="panel-lead">{summary}</p>
          <p className="muted">
            비용·소요 시간:{' '}
            {activity === '수면' || choice === '무료 급식'
              ? '이용료 무료 · 소요 시간 미정'
              : (job?.duration ?? '미정')}
            <br />
            포만감 소모 행동은 포만감 0에서 실행할 수 없습니다. 수면·식사 등
            회복 행동의 세부 조건은 각 규칙에 따릅니다.
          </p>
          {!confirmed ? (
            <button className="outline-button" onClick={confirm}>
              선택 확인 (목업)
            </button>
          ) : (
            <div role="status">
              <h2>결과 화면 (목업)</h2>
              <p className="panel-lead">
                {activity === '무료나눔' || activity === '물건 수집'
                  ? preview.notice
                  : '선택을 확인했습니다. 보상·시간·생존 상태는 적용하지 않았습니다.'}
              </p>
              <button
                className="outline-button"
                onClick={() => setConfirmed(false)}
              >
                다시 선택
              </button>
              <button
                className="outline-button"
                onClick={() => useGameStore.getState().setTab('보관함')}
              >
                보관함 확인
              </button>
            </div>
          )}
          <button
            className="outline-button"
            onClick={() => {
              setChoice(null);
              setConfirmed(false);
            }}
          >
            선택 목록으로
          </button>
        </>
      )}
    </section>
  );
}
