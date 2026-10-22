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
import { dayOf, actionsLeft, won } from './domain/game';
import { listingLimit, tier } from './domain/engine';
import { ActionBudget, ActionProgress } from './components/ActionProgress';
import type {
  ActionPresentation,
  Changes,
  ChangeKey,
} from './app/actionPresentation';
import { TIERS } from './content/rules';
import {
  interestPending,
  interestAmount,
  paymentWeek,
  weeklyRateText,
  daysUntilInterest,
} from './domain/debt';

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
];
function Header({
  g,
  action,
  changes,
  actionId,
  onOpen,
}: {
  g: Game;
  action: ActionPresentation | null;
  changes: Changes;
  actionId: number;
  onOpen: (kind: '우편함' | '설정') => void;
}) {
  const changed = (key: ChangeKey) =>
    changes[key]
      ? ` stat-changed ${changes[key]! > 0 ? 'stat-rise' : 'stat-fall'}`
      : '';
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
      <div className="header-tools" aria-label="빠른 메뉴">
        <button
          aria-label="우편함"
          disabled={
            !!action ||
            !!g.inquiries.length ||
            interestPending(g) ||
            g.status !== 'playing'
          }
          onClick={() => onOpen('우편함')}
        >
          <Icon name="mail" size={21} />
          {g.event && <span className="mail-dot" aria-hidden="true" />}
        </button>
        <button
          aria-label="설정"
          disabled={
            !!action ||
            !!g.inquiries.length ||
            interestPending(g) ||
            g.status !== 'playing'
          }
          onClick={() => onOpen('설정')}
        >
          <Icon name="settings" size={21} />
        </button>
      </div>
      <div
        className={`status-top${g.cash >= 1_000_000_000 ? ' status-top-wide' : ''}`}
      >
        <time
          key={`time-${actionId}`}
          className={`header-time${changed('minute')}`}
        >
          {action ? (
            <ActionBudget key={action.id} action={action} />
          ) : (
            <>
              <span className="status-day">{dayOf(g)}일째</span>{' '}
              <strong className="status-clock">
                남은 행동 {actionsLeft(g)}/3
              </strong>
            </>
          )}
        </time>
        <span
          key={`cash-${actionId}`}
          className={`header-cash${changed('cash')}`}
        >
          <span className="header-label">현금</span> <b>{won(g.cash)}</b>
        </span>
      </div>
      <div className="header-interest">
        <span>{paymentWeek(g)}주차 이자</span>
        <strong>{won(interestAmount(g))}</strong>
      </div>
      <div className="header-interest-date">
        <span>주 {weeklyRateText(paymentWeek(g))}</span>
        <span>
          {interestPending(g) ? '납부 필요' : `${daysUntilInterest(g)}일 남음`}
        </span>
      </div>
      <div key={`debt-${actionId}`} className={`header-debt${changed('debt')}`}>
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
          <span>
            {current.kind === '이자 납부' ? '납부 필요' : '응답 필요'}
          </span>
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

          <Button onClick={() => useGameStore.getState().act({ type: 'wait' })}>
            구매 문의 기다리기 · 행동 1회
          </Button>
        </section>
      )}
      {g.event && (
        <Button onClick={() => open({ kind: '특별 제안' })}>
          새 특별 제안 · {g.event.title}
        </Button>
      )}
    </>
  );
}
export default function App() {
  const state = useGameStore();
  const g = state.game;
  const [routes, setRoutes] = useState<Route[]>([]);
  useEffect(() => {
    void useGameStore.getState().hydrate();
  }, []);
  const due = !!g && interestPending(g);
  const pending = due || !!g?.inquiries.length;
  const over = !!g && g.status !== 'playing';
  // Pending inquiries override every route, including when restored from a save.
  const shownRoutes: Route[] = due
    ? [{ kind: '이자 납부' }]
    : pending
      ? [{ kind: '문의' }]
      : routes;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.tab]);
  const open = (r: Route) => setRoutes((prev) => [...prev, r]);
  async function act(c: Parameters<typeof state.act>[0]) {
    const ok = await state.act(c);
    if (
      ok &&
      ['accept', 'break', 'reject', 'counter', 'payInterest'].includes(
        c.type,
      ) &&
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
      <Header
        g={state.action?.before ?? g}
        action={state.action}
        changes={state.changes}
        actionId={state.actionId}
        onOpen={(kind) => {
          if (state.action || pending || over) return;
          setRoutes([{ kind }]);
          state.dismiss();
        }}
      />
      <div
        className="game-scene"
        aria-busy={!!state.action}
        inert={!!state.action}
        aria-hidden={state.action ? true : undefined}
      >
        <div className="base-content" inert={shownRoutes.length > 0 || over}>
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
              <ShopView />
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
              <div
                className={`result ${state.ok ? '' : 'error'}`}
                role="status"
              >
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
                setRoutes([{ kind: '저장 관리' }]);
              }}
            >
              백업·저장 관리 열기
            </Button>
          </aside>
        )}
        {over && (
          <div className="end-overlay">
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="end-title"
            >
              <p className="eyebrow">
                {g.status === 'cleared'
                  ? '채무 전액 상환'
                  : g.status === 'bankrupt'
                    ? '파산 · 게임 종료'
                    : '게임 종료'}
              </p>
              <h1 id="end-title">
                {g.status === 'cleared'
                  ? '드디어, 자유.'
                  : '이 이야기는 여기까지.'}
              </h1>
              <p>
                {dayOf(g)}일 동안 거래 {g.stats.sales}회 · 누적 상환{' '}
                {won(g.stats.repaid)}
              </p>
              <p>
                {g.status === 'cleared'
                  ? '원금과 발생한 이자를 모두 갚았습니다.'
                  : g.status === 'bankrupt'
                    ? '주간 이자를 납부하지 못했습니다.'
                    : '종료된 게임입니다.'}
              </p>
              <StorageView />
            </section>
          </div>
        )}
      </div>
      {state.action && (
        <ActionProgress key={state.action.id} action={state.action} />
      )}
    </div>
  );
}
