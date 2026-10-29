import { StartMenu } from './components/StartMenu';
import { usePageNavigation } from './app/navigation';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useGameStore, type Tab } from './app/store';
import { Toast } from './components/Toast';
import { Icon, type IconName } from './components/Icon';
import {
  Button,
  DebtView,
  InfoView,
  InventoryView,
  RouteView,
  BusinessTabView,
  StorageView,
  type Route,
} from './components/GameViews';
import type { Game } from './domain/game';
import { weekOf, actionsLeft, won, ACTIONS_PER_WEEK } from './domain/game';
import { listingLimit } from './domain/engine';
import { ActionBudget, ActionProgress } from './components/ActionProgress';
import type {
  ActionPresentation,
  Changes,
  ChangeKey,
} from './app/actionPresentation';
import { unreadCount } from './app/notifications';
import { MARKETS, marketDefinition } from './content/markets';
import {
  interestPending,
  interestAmount,
  mandatoryPrincipal,
  paymentWeek,
  weeklyRateText,
} from './domain/debt';

const nav: { tab: Tab; icon: IconName }[] = [
  { tab: '내 정보', icon: 'user' },
  { tab: '채무', icon: 'debt' },
  { tab: '활동', icon: 'activity' },
  { tab: '보관함', icon: 'bag' },
  { tab: '사업', icon: 'market' },
];
const groups: {
  title: string;
  activities: { label: string; route: Route }[];
}[] = [
  {
    title: '돈 벌기',
    activities: (['무료나눔', '아르바이트', '물건 수집'] as const).map(
      (kind) => ({ label: kind, route: { kind } }),
    ),
  },
  {
    title: '시장',
    activities: MARKETS.map((market) => ({
      label: market.name,
      route: { kind: '장터', marketId: market.id },
    })),
  },
  {
    title: '자산',
    activities: [
      { label: '즉시 판매', route: { kind: '즉시 판매' } },
      { label: '사업', route: { kind: '사업' } },
    ],
  },
];
function Header({
  g,
  action,
  changes,
  actionId,
  onOpen,
  unread,
}: {
  g: Game;
  unread: number;
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
          aria-describedby="mail-unread-count"
          disabled={
            !!action ||
            !!g.inquiries.length ||
            interestPending(g) ||
            g.status !== 'playing'
          }
          onClick={() => onOpen('우편함')}
        >
          <Icon name="mail" size={21} />
          {unread > 0 && (
            <span className="mail-badge" aria-hidden="true">
              {unread}
            </span>
          )}
          <span id="mail-unread-count" className="sr-only">
            안 읽은 알림 {unread}개
          </span>
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
              <span className="status-day">{weekOf(g)}주차</span>{' '}
              <strong className="status-clock">
                남은 행동 {actionsLeft(g)}/{ACTIONS_PER_WEEK}
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
      <div className="header-obligations">
        <div className="header-interest">
          <span>이번 주 남은 의무 원금</span>
          <strong>{won(mandatoryPrincipal(g))}</strong>
        </div>
        <div className="header-interest">
          <span>
            {paymentWeek(g)}주차 이자{' '}
            <small>{weeklyRateText(paymentWeek(g))}</small>
          </span>
          <strong>{won(interestAmount(g))}</strong>
        </div>
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
  onHome,
  scrollPositions,
  footer,
}: {
  routes: Route[];
  children: ReactNode;
  locked: boolean;
  onBack: () => void;
  onClose: () => void;
  onHome: () => void;
  scrollPositions: Map<string, number>;
  footer?: ReactNode;
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
  const routeKey = `${current.kind}:${current.id ?? ''}:${current.marketId ?? ''}:${routes.length}`;
  useLayoutEffect(() => {
    const node = ref.current;
    title.current?.focus({ preventScroll: true });
    node?.scrollTo(0, scrollPositions.get(routeKey) ?? 0);
  }, [routeKey, scrollPositions]);
  function keydown(e: React.KeyboardEvent) {
    if (e.key === 'Escape' && !locked) {
      e.preventDefault();
      if (routes.length > 1) onBack();
      else onClose();
    }
  }
  return (
    <div
      className={`sheet-layer ${root.kind === '장터' || root.kind === '무료나눔' ? 'market-sheet' : ''}`}
      role="region"
      aria-labelledby="sheet-title"
      onKeyDown={keydown}
    >
      <div className="sheet-toolbar">
        {locked ? (
          <span>
            {current.kind === '주간 정산' ? '납부 필요' : '응답 필요'}
          </span>
        ) : (
          <button onClick={routes.length > 1 ? onBack : onClose}>
            {routes.length > 1 ? '← 뒤로' : '닫기'}
          </button>
        )}
        <h1 id="sheet-title" tabIndex={-1} ref={title}>
          {current.kind === '장터'
            ? marketDefinition(current.marketId ?? 'street').name
            : current.kind}
        </h1>
        <button
          className="route-home"
          aria-label="활동으로 이동"
          disabled={locked}
          onClick={onHome}
        >
          <Icon name="home" size={20} />
        </button>
      </div>
      <div
        className="sheet-content"
        ref={ref}
        onScroll={(event) =>
          scrollPositions.set(routeKey, event.currentTarget.scrollTop)
        }
      >
        {children}
      </div>
      {footer}
    </div>
  );
}
function ActivityHome({
  g,
  open,
  settle,
}: {
  g: Game;
  open: (r: Route) => void;
  settle: () => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>활동</h1>
        </div>
      </div>
      {[groups[1], groups[0], groups[2]].map((group) => (
        <section
          className={`activity-group activity-${group.title === '시장' ? 'markets' : group.title === '돈 벌기' ? 'earn' : 'assets'}`}
          key={group.title}
        >
          <h2>{group.title}</h2>
          <div className="activity-grid">
            {group.activities.map((activity) => {
              const market =
                activity.route.kind === '장터'
                  ? marketDefinition(activity.route.marketId ?? 'street')
                  : null;
              const icon: IconName = market
                ? (
                    {
                      street: 'market',
                      computers: 'keyboard',
                      instruments: 'music',
                      cars: 'car',
                      property: 'building',
                      auction: 'gavel',
                      aircraft: 'market',
                    } as const
                  )[market.id]
                : activity.label === '아르바이트'
                  ? 'wallet'
                  : activity.label === '무료나눔'
                    ? 'gift'
                    : activity.label === '물건 수집'
                      ? 'search'
                      : activity.label === '사업'
                        ? 'building'
                        : 'bag';
              return (
                <button
                  className={market?.id === 'street' ? 'market-featured' : ''}
                  aria-label={activity.label}
                  key={activity.label}
                  onClick={() => open(activity.route)}
                >
                  <span className="activity-icon">
                    <Icon name={icon} size={24} />
                  </span>
                  <span className="activity-label">
                    <strong>{activity.label}</strong>
                    {market && <small>{won(market.min)}부터</small>}
                  </span>
                  <span className="activity-arrow" aria-hidden="true">
                    ↗
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {g.sales.length > 0 && (
        <section className="card">
          <h2>
            판매 중 {g.sales.length}/{listingLimit(g)}
          </h2>

          <Button
            actionCost={1}
            onClick={() => useGameStore.getState().act({ type: 'wait' })}
          >
            구매 문의 기다리기
          </Button>
        </section>
      )}
      {actionsLeft(g) > 0 && (
        <Button onClick={settle}>이번 주 마무리하기</Button>
      )}
      {g.event && (
        <Button onClick={() => open({ kind: '특별 제안' })}>
          새 특별 제안 · {g.event.title}
        </Button>
      )}
    </>
  );
}
function GameApp() {
  const state = useGameStore();
  const g = state.game;
  const { routes, navigate, back } = usePageNavigation(state.tab, state.setTab);
  const [scrollPositions] = useState(() => new Map<string, number>());
  useEffect(() => {
    void useGameStore.getState().hydrate();
  }, []);
  const due = !!g && interestPending(g);
  const pending = due || !!g?.inquiries.length;
  const over = !!g && g.status !== 'playing';
  // Pending inquiries override every route, including when restored from a save.
  const shownRoutes: Route[] = due
    ? [{ kind: '주간 정산' }]
    : pending
      ? [{ kind: '문의' }]
      : routes;
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [state.tab]);
  const open = (r: Route) => {
    if (state.action || state.slotBusy || pending || over) return;
    if (r.kind === '장터') state.selectMarket(r.marketId ?? 'street');
    navigate([...routes, r]);
  };
  async function act(c: Parameters<typeof state.act>[0]) {
    const ok = await state.act(c);
    if (
      ok &&
      ['accept', 'break', 'reject', 'counter', 'payInterest'].includes(
        c.type,
      ) &&
      !useGameStore.getState().game?.inquiries.length
    )
      navigate([], state.tab, true);
    return ok;
  }
  function close() {
    back();
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
        unread={unreadCount(
          state.action?.before ?? g,
          state.readNotificationIds,
        )}
        action={state.action}
        changes={state.changes}
        actionId={state.actionId}
        onOpen={(kind) => {
          if (state.action || state.slotBusy || pending || over) return;
          navigate([{ kind }]);
          state.dismiss();
        }}
      />
      {actionsLeft(g) === 0 &&
        !due &&
        !over &&
        !state.action &&
        !pending &&
        shownRoutes.length === 0 && (
          <aside className="weekly-settlement-bar">
            <Button onClick={() => navigate([{ kind: '주간 정산' }])}>
              이번주 정산하기
            </Button>
          </aside>
        )}
      <div
        className="game-scene"
        aria-busy={!!state.action || state.slotBusy}
        inert={!!state.action || state.slotBusy}
        aria-hidden={state.action ? true : undefined}
      >
        <div className="base-content" inert={shownRoutes.length > 0 || over}>
          <main>
            {state.tab === '활동' ? (
              <ActivityHome
                g={g}
                open={open}
                settle={() => navigate([{ kind: '주간 정산' }])}
              />
            ) : state.tab === '내 정보' ? (
              <InfoView g={g} />
            ) : state.tab === '채무' ? (
              <DebtView g={g} act={act} />
            ) : state.tab === '보관함' ? (
              <InventoryView g={g} open={open} />
            ) : (
              <BusinessTabView g={g} act={act} />
            )}
          </main>
        </div>
        <nav className="bottom-nav" aria-label="주요 메뉴">
          {nav.map((n) => (
            <button
              key={n.tab}
              className={n.tab === '활동' ? 'home-tab' : ''}
              aria-current={n.tab === state.tab ? 'page' : undefined}
              onClick={() => {
                navigate([], n.tab);
                state.dismiss();
              }}
              disabled={pending || !!state.action || over}
            >
              <span className="nav-icon">
                <Icon name={n.icon} size={n.tab === '활동' ? 25 : 21} />
              </span>
              <span>{n.tab}</span>
            </button>
          ))}
        </nav>
        {shownRoutes.length > 0 && !over && (
          <Sheet
            routes={shownRoutes}
            locked={pending}
            onBack={back}
            onClose={close}
            onHome={() => {
              navigate([], '활동');
              state.dismiss();
            }}
            scrollPositions={scrollPositions}
            footer={
              actionsLeft(g) === 0 &&
              !pending &&
              shownRoutes.at(-1)?.kind !== '주간 정산' ? (
                <aside className="sheet-settlement-bar">
                  <Button onClick={() => navigate([{ kind: '주간 정산' }])}>
                    이번주 정산하기
                  </Button>
                </aside>
              ) : null
            }
          >
            {state.saveError && shownRoutes.at(-1)?.kind === '저장 관리' && (
              <p className="warning">{state.saveError}</p>
            )}
            <RouteView
              key={`${shownRoutes[shownRoutes.length - 1].kind}-${shownRoutes[shownRoutes.length - 1].marketId ?? ''}-${shownRoutes[shownRoutes.length - 1].id ?? ''}`}
              route={shownRoutes[shownRoutes.length - 1]}
              g={g}
              open={open}
              act={act}
            />
          </Sheet>
        )}
        {state.saveError && shownRoutes.at(-1)?.kind !== '저장 관리' && (
          <aside className="storage-error" role="alert">
            <p>{state.saveError}</p>
            <Button
              onClick={() => {
                navigate([{ kind: '저장 관리' }]);
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
                {weekOf(g)}주차 · 거래 {g.stats.sales}회 · 누적 상환{' '}
                {won(g.stats.repaid)}
              </p>
              <p>
                {g.status === 'cleared'
                  ? '원금과 발생한 이자를 모두 갚았습니다.'
                  : g.status === 'bankrupt'
                    ? '주간 의무 원금 또는 이자를 납부하지 못했습니다.'
                    : '종료된 게임입니다.'}
              </p>
              <StorageView />
            </section>
          </div>
        )}
      </div>
      {state.notice && !state.action && !over && (
        <Toast
          key={state.noticeId}
          id={state.noticeId}
          message={state.notice}
          ok={state.ok}
          dismiss={state.dismiss}
        />
      )}
      {state.action && (
        <ActionProgress key={state.action.id} action={state.action} />
      )}
    </div>
  );
}

export default function App() {
  const ready = useGameStore((s) => s.ready);
  const screen = useGameStore((s) => s.screen);
  const slot = useGameStore((s) => s.activeSlot);
  useEffect(() => {
    void useGameStore.getState().hydrate();
  }, []);
  if (!ready)
    return (
      <div className="loading" role="status">
        저장된 이야기를 불러오는 중…
      </div>
    );
  if (screen === 'menu') return <StartMenu />;
  return <GameApp key={slot} />;
}
