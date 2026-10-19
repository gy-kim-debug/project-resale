import { useGameStore } from '../app/store';
import { listings } from '../content/listings';
import { initialPlayer, formatWon } from '../domain/models';
import { Icon } from './Icon';
export function UtilityScreens() {
  const state = useGameStore();
  return state.tab === '보관함' ? (
    <section className="panel">
      <p className="eyebrow">INVENTORY / 가진 것들</p>
      <h1>아직은, 빈손.</h1>
      <p className="panel-lead">이곳을 채우는 건 당신의 다음 선택이다.</p>
      <div className="empty-inventory">
        <Icon name="box" size={44} />
        <h2>보유 물품 0개</h2>
        <p>매입한 물품을 보관하고 관리할 공간입니다.</p>
      </div>
      <div className="section-label">
        <span>눈여겨본 물건</span>
        <span className="mono">
          {state.favoriteIds.length.toString().padStart(2, '0')}
        </span>
      </div>
      {listings
        .filter((item) => state.favoriteIds.includes(item.id))
        .map((item) => (
          <button
            className="saved"
            key={item.id}
            onClick={() => {
              state.setTab('게시판');
              state.select(item.id);
            }}
          >
            <span>
              {item.title}
              <strong>{formatWon(item.price)}</strong>
            </span>
            <Icon name="arrow" size={18} />
          </button>
        ))}
      {!state.favoriteIds.length && (
        <p className="muted">장터에서 관심 있는 물건을 저장해 보세요.</p>
      )}
      <button className="outline-button" onClick={() => state.setTab('게시판')}>
        장터 둘러보기 <Icon name="arrow" size={17} />
      </button>
    </section>
  ) : state.tab === '생활' ? (
    <section className="panel">
      <p className="eyebrow">SURVIVAL / 버티는 법</p>
      <h1>
        살아 있어야,
        <br />
        다음 거래도 있다.
      </h1>
      <p className="panel-lead">배를 채우고 눈을 붙이는 일도 생존의 일부다.</p>
      {(
        [
          ['food', '한 끼 해결하기', '허기를 달랠 방법을 찾는다.'],
          ['moon', '눈 붙이기', '피로한 몸에 잠깐의 시간을 준다.'],
          ['home', '머물 곳 찾기', '오늘 밤을 보낼 자리를 찾는다.'],
        ] as const
      ).map(([icon, label, description]) => (
        <div className="action-row" key={label}>
          <span className="action-icon">
            <Icon name={icon} size={23} />
          </span>
          <div>
            <h2>{label}</h2>
            <p>{description}</p>
          </div>
          <button disabled>준비 중</button>
        </div>
      ))}
      <p className="muted rule-note">
        행동 비용과 시간, 생존 규칙은 추후 설계됩니다.
      </p>
    </section>
  ) : (
    <section className="panel debt-panel">
      <p className="eyebrow">DEBT / 벗어나야 할 숫자</p>
      <h1>끝내, 갚아야 한다.</h1>
      <p className="panel-lead">
        원금과 발생 이자를 모두 상환하면 이 빚은 끝난다.
      </p>
      <div className="debt-summary">
        <span>남은 총 채무</span>
        <strong className="mono">
          {formatWon(initialPlayer.principal + initialPlayer.interest)}
        </strong>
        <span className="debt-summary-caption">상환의 시작점</span>
      </div>
      <dl>
        {(
          [
            ['남은 원금', initialPlayer.principal],
            ['발생 이자', initialPlayer.interest],
            ['보유 현금', initialPlayer.cash],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className="mono">{formatWon(value)}</dd>
          </div>
        ))}
      </dl>
      <button className="repay-button" disabled>
        일부 상환 준비 중
      </button>
      <p className="muted rule-note">
        이자율, 정산 주기와 상환 순서는 아직 정해지지 않았습니다.
      </p>
    </section>
  );
}
