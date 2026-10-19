import { useGameStore, type Activity } from '../app/store';
import { initialPlayer, formatWon } from '../domain/models';
import { Icon, type IconName } from './Icon';
const survivalActivities: {
  activity: Exclude<Activity, '장터'>;
  title: string;
  description: string;
  icon: IconName;
}[] = [
  {
    activity: '식사',
    title: '음식 먹기',
    description: '허기를 달랠 한 끼를 찾는다.',
    icon: 'food',
  },
  {
    activity: '수면',
    title: '잠자기',
    description: '눈을 붙이고 지친 몸을 쉬게 한다.',
    icon: 'moon',
  },
  {
    activity: '숙박',
    title: '머물 곳 찾기',
    description: '오늘 밤을 보낼 자리를 찾는다.',
    icon: 'home',
  },
];
export function ActivityScreen() {
  const openActivity = useGameStore((state) => state.openActivity);
  return (
    <section className="home-screen activity-hub">
      <div className="home-intro">
        <p className="eyebrow">ACTIVITY / 다음 선택</p>
        <h1>
          오늘, 무엇을 할까<span>.</span>
        </h1>
        <p>거래하고, 먹고, 쉬는 일. 모든 선택은 여기서.</p>
      </div>
      <div className="cash-line">
        <span>
          <Icon name="wallet" size={17} /> 사용할 수 있는 현금
        </span>
        <strong className="mono">{formatWon(initialPlayer.cash)}</strong>
      </div>
      <section className="market-entry-section">
        <div className="section-label">
          <span>거래하기</span>
          <span className="mono">TRADE</span>
        </div>
        <button className="market-entry" onClick={() => openActivity('장터')}>
          <div className="entry-top">
            <span className="market-app-icon">
              <Icon name="market" size={25} />
            </span>
            <span className="entry-app-name">
              골목장터<small>중고거래 · 나눔 · 뜻밖의 기회</small>
            </span>
            <span className="entry-launch">
              <Icon name="arrow" size={20} />
            </span>
          </div>
          <div className="entry-cta">
            중고거래 앱 열기 <Icon name="arrow" size={18} />
          </div>
        </button>
      </section>
      <section>
        <div className="section-label">
          <span>먹고, 쉬고, 버티기</span>
          <span className="mono">SURVIVE</span>
        </div>
        <div className="activity-options">
          {survivalActivities.map(({ activity, title, description, icon }) => (
            <button
              className="activity-option"
              key={activity}
              onClick={() => openActivity(activity)}
            >
              <span className="action-icon">
                <Icon name={icon} size={22} />
              </span>
              <span>
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
              <Icon name="arrow" size={18} />
            </button>
          ))}
        </div>
      </section>
      <p className="preview-note">
        개발 프리뷰 · 행동 결과는 아직 적용되지 않습니다
      </p>
    </section>
  );
}
export function ActivityDetailScreen({
  activity,
}: {
  activity: Exclude<Activity, '장터'>;
}) {
  const openActivity = useGameStore((state) => state.openActivity);
  const item = survivalActivities.find((item) => item.activity === activity)!;
  return (
    <section className="panel activity-detail">
      <button className="activity-back" onClick={() => openActivity(null)}>
        <Icon name="back" size={17} /> 활동으로
      </button>
      <p className="eyebrow">SURVIVAL / {activity}</p>
      <span className="activity-detail-icon">
        <Icon name={item.icon} size={38} />
      </span>
      <h1>{item.title}</h1>
      <p className="panel-lead">{item.description}</p>
      <dl>
        <div>
          <dt>보유 현금</dt>
          <dd>{formatWon(initialPlayer.cash)}</dd>
        </div>
        <div>
          <dt>비용 · 소요 시간</dt>
          <dd>미정</dd>
        </div>
      </dl>
      <button className="outline-button" disabled>
        {activity} 실행 준비 중
      </button>
      <p className="muted rule-note">
        비용과 시간, 상태 변화 규칙을 정한 뒤 실행 기능을 추가합니다.
      </p>
    </section>
  );
}
