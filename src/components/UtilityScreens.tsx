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
              state.openActivity('장터');
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
      <button
        className="outline-button"
        onClick={() => state.openActivity('장터')}
      >
        장터 둘러보기 <Icon name="arrow" size={17} />
      </button>
    </section>
  ) : state.tab === '내 정보' ? (
    <section className="panel">
      <p className="eyebrow">MY STATUS / 현재의 나</p>
      <h1>내 정보</h1>
      <p className="panel-lead">지금 가진 것과 버텨온 시간을 확인한다.</p>
      <dl>
        {(
          [
            ['보유 현금', formatWon(initialPlayer.cash)],
            ['경과 일수', `${initialPlayer.day}일차`],
            ['배고픔', `${initialPlayer.hunger} / 100`],
            ['피로', `${initialPlayer.fatigue} / 100`],
            ['건강', `${initialPlayer.health} / 100`],
          ] as const
        ).map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd className="mono">{value}</dd>
          </div>
        ))}
      </dl>
      <button className="debt-card" onClick={() => state.setTab('채무')}>
        <div className="debt-top">
          <span>
            <Icon name="debt" size={15} /> 남은 채무
          </span>
          <span className="stamp">미상환</span>
        </div>
        <div className="debt-amount mono">
          {formatWon(initialPlayer.principal + initialPlayer.interest)}
        </div>
        <div className="debt-rule" />
        <div className="debt-bottom">
          <span>채무 관리 열기</span>
          <Icon name="arrow" size={17} />
        </div>
      </button>
      <p className="muted rule-note">사망하면 게임이 종료됩니다.</p>
    </section>
  ) : state.tab === '상점' ? (
    <section className="panel">
      <p className="eyebrow">SHOP / 상점</p>
      <h1>상점</h1>
      <div className="empty-inventory">
        <Icon name="market" size={44} />
        <h2>상점을 준비하고 있습니다</h2>
        <p>판매 품목과 이용 방식은 아직 정해지지 않았습니다.</p>
      </div>
      <button className="outline-button" disabled>
        이용 준비 중
      </button>
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
