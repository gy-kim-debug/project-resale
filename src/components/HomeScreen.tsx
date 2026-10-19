import { useGameStore } from '../app/store';
import { initialPlayer as player, formatWon } from '../domain/models';
import { Icon } from './Icon';
import { PlayerStatus } from './PlayerStatus';
export function HomeScreen() {
  const setTab = useGameStore((state) => state.setTab);
  return (
    <div className="home-screen">
      <section className="home-intro">
        <div className="day-label">
          <span className="signal-dot" /> 생존 1일차{' '}
          <span className="mono">09:00 AM</span>
        </div>
        <h1>
          오늘도,
          <br />
          살아남아야 한다<span>.</span>
        </h1>
        <p>가진 건 없고, 갚아야 할 건 너무 많다.</p>
      </section>
      <button
        className="debt-card"
        onClick={() => setTab('채무')}
        aria-label="남은 채무 100억원, 채무 관리 열기"
      >
        <div className="debt-top">
          <span>
            <Icon name="debt" size={15} /> 남은 채무
          </span>
          <span className="stamp">미상환</span>
        </div>
        <div className="debt-amount mono">
          10,000,000,000<span>원</span>
        </div>
        <div className="debt-rule" />
        <div className="debt-bottom">
          <span>원금 100억 · 발생 이자 {formatWon(player.interest)}</span>
          <Icon name="arrow" size={17} />
        </div>
      </button>
      <div className="cash-line">
        <span>
          <Icon name="wallet" size={17} /> 수중의 현금
        </span>
        <strong className="mono">
          0 <small>원</small>
        </strong>
      </div>
      <PlayerStatus />
      <section className="market-entry-section">
        <div className="section-label">
          <span>살아남을 방법</span>
          <span className="mono">FIND A WAY</span>
        </div>
        <button className="market-entry" onClick={() => setTab('게시판')}>
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
      <div className="home-shortcuts">
        <button onClick={() => setTab('생활')}>
          <Icon name="moon" size={20} />
          <span>
            잠깐 숨 고르기<small>식사와 휴식</small>
          </span>
          <span className="shortcut-arrow">↗</span>
        </button>
        <button onClick={() => setTab('보관함')}>
          <Icon name="bag" size={20} />
          <span>
            내 물건 확인<small>보관함과 관심 매물</small>
          </span>
          <span className="shortcut-arrow">↗</span>
        </button>
      </div>
      <section className="story-note">
        <span className="mono">DAY 01 / 기록</span>
        <p>
          주머니를 뒤져도 동전 하나 없다.
          <br />
          금이 간 휴대폰 화면만 희미하게 빛난다.
        </p>
        <span className="story-cursor" />
      </section>
      <p className="preview-note">
        개발 프리뷰 · 표시 수치와 매물은 예시입니다
      </p>
    </div>
  );
}
