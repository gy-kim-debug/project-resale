import { useEffect } from 'react';
import { useGameStore, type Tab } from './app/store';
import { PlayerStatus } from './components/PlayerStatus';
import { HomeScreen } from './components/HomeScreen';
import { MarketScreen } from './components/MarketScreen';
import { UtilityScreens } from './components/UtilityScreens';
import { Icon, type IconName } from './components/Icon';
const navigation: { tab: Tab; label: string; icon: IconName }[] = [
  { tab: '생존', label: '생존', icon: 'home' },
  { tab: '게시판', label: '장터', icon: 'market' },
  { tab: '보관함', label: '보관함', icon: 'bag' },
  { tab: '생활', label: '생활', icon: 'moon' },
  { tab: '채무', label: '채무', icon: 'debt' },
];
export default function App() {
  const state = useGameStore();
  useEffect(() => {
    void useGameStore.getState().hydrate();
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [state.tab, state.selectedId]);
  return (
    <div className={`app-shell ${state.tab === '게시판' ? 'in-market' : ''}`}>
      <header className="game-header">
        <div className="header-top">
          <button
            className="game-brand"
            onClick={() => state.setTab('생존')}
            aria-label="생존 홈으로"
          >
            <span className="brand-slash">/</span>
            <span>
              100억<span className="brand-sub">상환 생존기</span>
            </span>
          </button>
          <span className="run-indicator">
            <span /> 1회차 <i /> 무직
          </span>
        </div>
        <PlayerStatus />
      </header>
      <main>
        {state.saveError && (
          <p role="status" className="save-error">
            {state.saveError}
          </p>
        )}
        {state.tab === '생존' ? (
          <HomeScreen />
        ) : state.tab === '게시판' ? (
          <MarketScreen />
        ) : (
          <UtilityScreens />
        )}
      </main>
      <nav className="bottom-nav" aria-label="주요 메뉴">
        {navigation.map(({ tab, label, icon }) => (
          <button
            key={tab}
            aria-current={state.tab === tab ? 'page' : undefined}
            onClick={() => state.setTab(tab)}
          >
            <Icon name={icon} size={21} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
