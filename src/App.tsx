import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useGameStore, type Tab } from './app/store';
import { Icon, type IconName } from './components/Icon';
import {
  Button,
  DebtView,
  InfoView,
  InventoryView,
  RouteView,
  ShopView,
  StorageView,
  type Route,
} from './components/GameViews';
import type { Game } from './domain/game';
import { dayOf, timeOf, won } from './domain/game';
import { listingLimit, tier } from './domain/engine';
import { TIERS } from './content/rules';

const nav: { tab: Tab; icon: IconName }[] = [
  { tab: '내 정보', icon: 'user' },
  { tab: '채무', icon: 'debt' },
  { tab: '활동', icon: 'activity' },
  { tab: '보관함', icon: 'bag' },
  { tab: '상점', icon: 'market' },
];
const groups: { title: string; activities: Route['kind'][] }[] = [
  { title: '돈 벌기', activities: ['무료나눔', '아르바이트', '물건 수집'] },
  { title: '거래', activities: ['장터', '매각처'] },
  { title: '회복', activities: ['식사', '수면', '치료'] },
];
function Header({ g }: { g: Game }) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const update = () =>
      document.documentElement.style.setProperty(
        '--header-height',
        `${node.getBoundingClientRect().height}px`,
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <header className="status-header" ref={ref}>
      <div className="status-top">
        <time>
          {dayOf(g)}일째 {timeOf(g)}
        </time>
        <span>
          현금 <b>{won(g.cash)}</b>
        </span>
      </div>
      <div className="vitals">
        {(
          [
            { name: '포만감', value: g.satiety, icon: 'food' },
            { name: '체력', value: g.health, icon: 'heart' },
            { name: '피로도', value: g.fatigue, icon: 'moon' },
          ] as const
        ).map((s) => (
          <div className={`vital ${s.value <= 20 ? 'low' : ''}`} key={s.name}>
            <div>
              <Icon name={s.icon} size={14} />
              <span>{s.name}</span>
              <b>{s.value}</b>
            </div>
            <meter min={0} max={100} value={s.value} aria-label={s.name} />
          </div>
        ))}
      </div>
      <div className="header-debt">
        <span>남은 채무</span>
        <strong>{won(g.principal + g.interest)}</strong>
      </div>
    </header>
  );
}
function Sheet({
  routes,
  children,
  locked,
  onBack,
  onClose,
}: {
  routes: Route[];
  children: ReactNode;
  locked: boolean;
  onBack: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const root = routes[0];
  const current = routes[routes.length - 1];
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      before?.focus();
    };
  }, []);
  useEffect(() => {
    title.current?.focus();
    ref.current?.scrollTo(0, 0);
  }, [current.kind, current.id, routes.length]);
  function keydown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (!locked) {
        if (routes.length > 1) onBack();
        else onClose();
      }
    }
    if (e.key === 'Tab') {
      const nodes = ref.current?.parentElement?.querySelectorAll<HTMLElement>(
        'button:not(:disabled),input:not(:disabled),a[href],[tabindex="0"]',
      );
      if (!nodes?.length) return;
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === title.current)
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }
  return (
    <div
      className={`sheet-layer ${root.kind === '장터' || root.kind === '무료나눔' ? 'market-sheet' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sheet-title"
      onKeyDown={keydown}
    >
      <div className="sheet-toolbar">
        {locked ? (
          <span>응답 필요</span>
        ) : (
          <button onClick={routes.length > 1 ? onBack : onClose}>
            {routes.length > 1 ? '← 뒤로' : '닫기'}
          </button>
        )}
        <h1 id="sheet-title" tabIndex={-1} ref={title}>
          {current.kind}
        </h1>
      </div>
      <div className="sheet-content" ref={ref}>
        {children}
      </div>
    </div>
  );
}
function ActivityHome({ g, open }: { g: Game; open: (r: Route) => void }) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">오늘의 선택</p>
          <h1>활동</h1>
        </div>
        <span className="tier-label">{TIERS[tier(g)].name}</span>
      </div>
      {groups.map((group) => (
        <section className="activity-group" key={group.title}>
          <h2>{group.title}</h2>
          <div className="activity-grid">
            {group.activities.map((kind) => (
              <button key={kind} onClick={() => open({ kind })}>
                {kind}
              </button>
            ))}
          </div>
        </section>
      ))}
      {g.sales.length > 0 && (
        <section className="card">
          <h2>
            판매 중 {g.sales.length}/{listingLimit(g)}
          </h2>
          <p>
            시간을 보내면 문의가 올 수 있습니다. 읽거나 메뉴를 바꿀 때는 시간이
            흐르지 않습니다.
          </p>
          <Button onClick={() => useGameStore.getState().act({ type: 'wait' })}>
            구매 문의 기다리기 · 30분
          </Button>
        </section>
      )}
      {g.event && (
        <Button onClick={() => open({ kind: '특별 제안' })}>
          새 특별 제안 · {g.event.title}
        </Button>
      )}
      <section className="recent">
        <h2>최근 소식</h2>
        {g.logs.slice(0, 3).map((l) => (
          <p key={l.id}>{l.text}</p>
        ))}
      </section>
    </>
  );
}
export default function App() {
  const state = useGameStore();
  const g = state.game;
  const [routes, setRoutes] = useState<Route[]>([]);
  const [welcome, setWelcome] = useState(() => {
    try {
      return localStorage.getItem('game-help-seen') !== 'yes';
    } catch {
      return true;
    }
  });
  useEffect(() => {
    void useGameStore.getState().hydrate();
  }, []);
  const pending = !!g?.inquiries.length;
  const over = !!g && g.status !== 'playing';
  // Pending inquiries override every route, including when restored from a save.
  const shownRoutes: Route[] = pending ? [{ kind: '문의' }] : routes;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.tab]);
  const open = (r: Route) => setRoutes((prev) => [...prev, r]);
  function act(c: Parameters<typeof state.act>[0]) {
    const ok = state.act(c);
    if (
      ok &&
      ['accept', 'break', 'reject'].includes(c.type) &&
      !useGameStore.getState().game?.inquiries.length
    )
      setRoutes([]);
    return ok;
  }
  function close() {
    setRoutes([]);
    state.dismiss();
  }
  if (!g || !state.ready)
    return (
      <div className="loading" role="status">
        저장된 이야기를 불러오는 중…
      </div>
    );
  return (
    <div className="app-shell">
      <Header g={g} />
      <div
        className="base-content"
        inert={shownRoutes.length > 0 || over || welcome}
      >
        <main>
          {state.tab === '활동' ? (
            <ActivityHome g={g} open={open} />
          ) : state.tab === '내 정보' ? (
            <InfoView g={g} />
          ) : state.tab === '채무' ? (
            <DebtView g={g} act={act} />
          ) : state.tab === '보관함' ? (
            <InventoryView g={g} open={open} />
          ) : (
            <ShopView g={g} act={act} />
          )}
          {state.notice && !shownRoutes.length && !over && (
            <div
              className={`result page-result ${state.ok ? '' : 'error'}`}
              role="status"
            >
              <p>{state.notice}</p>
              <button onClick={state.dismiss} aria-label="결과 안내 닫기">
                확인
              </button>
            </div>
          )}
          <footer className="utility-links">
            <button onClick={() => open({ kind: '안내' })}>플레이 안내</button>
            <button onClick={() => open({ kind: '기록' })}>진행 기록</button>
            <button onClick={() => open({ kind: '저장 관리' })}>
              저장 관리
            </button>
            <small>
              {state.saving
                ? '저장 중…'
                : state.saveError
                  ? '저장 확인 필요'
                  : '이 기기에 자동 저장'}
            </small>
          </footer>
        </main>
        <nav className="bottom-nav" aria-label="주요 메뉴">
          {nav.map((n) => (
            <button
              key={n.tab}
              className={n.tab === '활동' ? 'home-tab' : ''}
              aria-current={n.tab === state.tab ? 'page' : undefined}
              onClick={() => state.setTab(n.tab)}
              disabled={pending}
            >
              <span className="nav-icon">
                <Icon name={n.icon} size={n.tab === '활동' ? 25 : 21} />
              </span>
              <span>{n.tab}</span>
            </button>
          ))}
        </nav>
      </div>
      {shownRoutes.length > 0 && !over && (
        <Sheet
          routes={shownRoutes}
          locked={pending}
          onBack={() => setRoutes((prev) => prev.slice(0, -1))}
          onClose={close}
        >
          {state.saveError && shownRoutes.at(-1)?.kind === '저장 관리' && (
            <p className="warning">{state.saveError}</p>
          )}
          <RouteView
            key={`${shownRoutes[shownRoutes.length - 1].kind}-${shownRoutes[shownRoutes.length - 1].id ?? ''}`}
            route={shownRoutes[shownRoutes.length - 1]}
            g={g}
            open={open}
            act={act}
          />
          {state.notice && (
            <div className={`result ${state.ok ? '' : 'error'}`} role="status">
              <p>{state.notice}</p>
              <button onClick={state.dismiss} aria-label="결과 안내 닫기">
                확인
              </button>
            </div>
          )}
        </Sheet>
      )}
      {state.saveError && shownRoutes.at(-1)?.kind !== '저장 관리' && (
        <aside className="storage-error" role="alert">
          <p>{state.saveError}</p>
          <Button
            onClick={() => {
              setWelcome(false);
              setRoutes([{ kind: '저장 관리' }]);
            }}
          >
            백업·저장 관리 열기
          </Button>
        </aside>
      )}
      {welcome && !over && !state.saveError && (
        <div className="welcome-overlay">
          <section
            className="welcome-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="welcome-title"
          >
            <p className="eyebrow">게임 시작 안내</p>
            <h1 id="welcome-title">
              현금 0원.
              <br />
              갚아야 할 돈, 100억.
            </h1>
            <p>
              일하고, 물건을 찾고, 되팔며 빚을 갚으세요. 무료 급식은 언제나
              이용할 수 있습니다.
            </p>
            <p>
              행동할 때만 시간이 흐릅니다. 체력 0은 사망이며, 수면은 체력을
              회복하지 않습니다. 진행은 이 브라우저에 자동 저장됩니다.
            </p>
            <Button
              onClick={() => {
                try {
                  localStorage.setItem('game-help-seen', 'yes');
                } catch {
                  /* optional onboarding preference */
                }
                setWelcome(false);
              }}
            >
              활동 시작
            </Button>
          </section>
        </div>
      )}
      {over && (
        <div className="end-overlay">
          <section role="dialog" aria-modal="true" aria-labelledby="end-title">
            <p className="eyebrow">
              {g.status === 'dead' ? '사망 · 게임 종료' : '채무 전액 상환'}
            </p>
            <h1 id="end-title">
              {g.status === 'dead' ? '이 이야기는 여기까지.' : '드디어, 자유.'}
            </h1>
            <p>
              {dayOf(g)}일 동안 거래 {g.stats.sales}회 · 누적 상환{' '}
              {won(g.stats.repaid)}
            </p>
            <p>
              {g.status === 'dead'
                ? '사망한 진행은 되살릴 수 없습니다. 새 게임은 별개의 시작입니다.'
                : '원금과 발생한 이자를 모두 갚았습니다.'}
            </p>
            <StorageView />
          </section>
        </div>
      )}
    </div>
  );
}
