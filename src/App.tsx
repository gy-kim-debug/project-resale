import { useEffect } from 'react';
import { useGameStore, type Tab } from './app/store';
import { usePreviewStore } from './app/previewStore';
import { InquiriesScreen } from './components/TradeScreens';
import { initialPlayer } from './domain/models';
import { PlayerStatus } from './components/PlayerStatus';
import {
  ActivityScreen,
  ActivityDetailScreen,
} from './components/ActivityScreen';
import { MarketScreen } from './components/MarketScreen';
import { UtilityScreens } from './components/UtilityScreens';
import { Icon, type IconName } from './components/Icon';
const navigation: { tab: Tab; icon: IconName }[] = [
  { tab: '활동', icon: 'activity' },
  { tab: '내 정보', icon: 'user' },
  { tab: '보관함', icon: 'bag' },
  { tab: '상점', icon: 'market' },
  { tab: '채무', icon: 'debt' },
];
export default function App() {
  const state = useGameStore();
  const preview = usePreviewStore();
  const pending = preview.inquiries.length > 0;
  useEffect(() => {
    void useGameStore.getState().hydrate();
  }, []);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [
    state.tab,
    state.activity,
    state.selectedId,
    preview.selectedItemId,
    pending,
  ]);
  return (
    <div
      className={`app-shell ${!pending && state.tab === '활동' && state.activity === '장터' ? 'in-market' : ''}`}
    >
      <header className="game-header">
        <div className="header-top">
          <button
            className="game-brand"
            disabled={pending}
            onClick={() => state.setTab('활동')}
            aria-label="활동 홈으로"
          >
            <span className="brand-slash">/</span>
            <span>
              100억<span className="brand-sub">상환 생존기</span>
            </span>
          </button>
          <span className="game-time mono">
            DAY {String(initialPlayer.day).padStart(2, '0')} <span>09:00</span>
          </span>
        </div>
        <PlayerStatus />
      </header>
      <main>
        <p className="muted rule-note">
          화면 토대 · 목업 데이터. 시간·생존·이자·확률은 미계산. 헤더 수치는
          표시 예시이며 진행은 저장하지 않습니다.
        </p>
        {preview.notice && (
          <div className="save-error" role="status">
            {preview.notice}
            <button onClick={() => preview.notify('')} aria-label="안내 닫기">
              닫기
            </button>
          </div>
        )}
        {state.saveError && (
          <p role="status" className="save-error">
            {state.saveError}
          </p>
        )}
        {pending ? (
          <InquiriesScreen />
        ) : state.tab === '활동' ? (
          state.activity === '장터' ? (
            <MarketScreen />
          ) : state.activity ? (
            <ActivityDetailScreen
              key={state.activity}
              activity={state.activity}
            />
          ) : (
            <ActivityScreen />
          )
        ) : (
          <UtilityScreens />
        )}
      </main>
      <nav className="bottom-nav" aria-label="주요 메뉴">
        {navigation.map(({ tab, icon }) => (
          <button
            key={tab}
            disabled={pending}
            aria-current={state.tab === tab ? 'page' : undefined}
            onClick={() => state.setTab(tab)}
          >
            <Icon name={icon} size={21} />
            <span>{tab}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
