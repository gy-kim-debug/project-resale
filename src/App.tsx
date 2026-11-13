import { useGameOptions } from './app/gameOptions';
import { useChatReplies } from './app/chatReplies';
import { MarketStatus } from './components/MarketStatus';
import { ChatList, PendingInquiryBar } from './components/ChatViews';
import { unreadChats } from './domain/chats';
import { SalesOverview } from './components/SalesOverview';
import { DailyTabView } from './components/DailyViews';
import { StoryPlayer } from './components/StoryPlayer';
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
  InventoryView,
  RouteView,
  StorageView,
  type Route,
} from './components/GameViews';
import type { Game } from './domain/game';
import { weekOf, actionsLeft, won } from './domain/game';
import {
  ActionBudget,
  ActionProgress,
  HeaderBudget,
} from './components/ActionProgress';
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
  settlementAmount,
} from './domain/debt';

const nav: { tab: Tab; icon: IconName }[] = [
  { tab: '채무', icon: 'debt' },
  { tab: '보관함', icon: 'bag' },
  { tab: '활동', icon: 'activity' },
  { tab: '채팅', icon: 'chat' },
  { tab: '일상', icon: 'moon' },
];
const groups: {
  title: string;
  activities: { label: string; route: Route }[];
}[] = [
  {
    title: '시장',
    activities: MARKETS.map((market) => ({
      label: market.name,
      route: { kind: '장터', marketId: market.id },
    })),
  },
];
function Header({
  g,
  action,
  changes,
  actionId,
  onOpen,
  unread,
  obscured,
}: {
  g: Game;
  unread: number;
  obscured: boolean;
  action: ActionPresentation | null;
  changes: Changes;
  actionId: number;
  onOpen: (kind: '우편함' | '설정' | '내 정보') => void;
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
    <header
      className="status-header"
      ref={ref}
      inert={obscured}
      aria-hidden={obscured || undefined}
    >
      <div className="header-tools" aria-label="빠른 메뉴">
        <button
          aria-label="우편함"
          aria-describedby="mail-unread-count"
          disabled={!!action || interestPending(g) || g.status !== 'playing'}
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
          disabled={!!action || interestPending(g) || g.status !== 'playing'}
          onClick={() => onOpen('설정')}
        >
          <Icon name="settings" size={21} />
        </button>
      </div>
      {action ? (
        <ActionBudget key={action.id} action={action} />
      ) : (
        <HeaderBudget g={g} />
      )}
      <div
        key={`cash-${actionId}`}
        className={`header-cash${g.cash >= 1_000_000_000_000 ? ' header-cash-wide' : ''}${changed('cash')}`}
      >
        <span className="header-label">보유 현금</span>
        <b>{won(g.cash)}</b>
      </div>
      <div
        className={`header-payment${g.cash < settlementAmount(g) ? ' payment-short' : ''}`}
      >
        <div className="header-payment-total">
          <span>이번 주 납부금</span>
          <strong>{won(settlementAmount(g))}</strong>
        </div>
        <div className="header-payment-detail">
          <span>원금 {won(mandatoryPrincipal(g))}</span>
          <span aria-hidden="true">·</span>
          <span>이자 {won(interestAmount(g))}</span>
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
  summary,
  footer,
}: {
  routes: Route[];
  children: ReactNode;
  locked: boolean;
  onBack: () => void;
  onClose: () => void;
  onHome: () => void;
  scrollPositions: Map<string, number>;
  summary?: ReactNode;
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
    const scroller =
      node?.querySelector<HTMLElement>('.market-results') ?? node;
    scroller?.scrollTo(0, scrollPositions.get(routeKey) ?? 0);
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
      className={`sheet-layer ${root.kind === '장터' ? 'market-sheet' : ''}`}
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
      {summary}
      <div
        className="sheet-content"
        ref={ref}
        onScrollCapture={(event) => {
          const scroller = event.target as HTMLElement;
          if (
            scroller === event.currentTarget ||
            scroller.classList.contains('market-results')
          )
            scrollPositions.set(routeKey, scroller.scrollTop);
        }}
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
        <Button onClick={() => open({ kind: '내 정보' })}>내 정보</Button>
      </div>
      {groups.map((group) => (
        <section
          className={`activity-group activity-${group.title === '시장' ? 'markets' : 'assets'}`}
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
      <SalesOverview g={g} open={open} />
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
  const pending = due;
  const over = !!g && g.status !== 'playing';
  // Debt settlement is mandatory; unanswered inquiries are handled in the chat tab.
  const shownRoutes: Route[] = due ? [{ kind: '주간 정산' }] : routes;
  const currentRoute = shownRoutes.at(-1);
  const chatReplying = useChatReplies((s) =>
    currentRoute?.kind === '채팅방' && currentRoute.id
      ? !!s.pending[currentRoute.id]
      : false,
  );
  const endedChat =
    !chatReplying &&
    currentRoute?.kind === '채팅방' &&
    g?.chats?.some(
      (thread) => thread.id === currentRoute.id && thread.status !== 'active',
    );
  const previousInventory = useRef(g?.inventory);
  const receivedItem = useRef<string | null>(null);
  useEffect(() => {
    const previous = previousInventory.current;
    previousInventory.current = g?.inventory;
    if (!g) return;
    const purchaseId =
      currentRoute?.kind === '매물'
        ? currentRoute.id
        : currentRoute?.kind === '채팅방'
          ? g.chats?.find(
              (thread) =>
                thread.id === currentRoute.id && thread.side === 'buy',
            )?.itemId
          : undefined;
    if (
      previous &&
      purchaseId &&
      !previous.some((item) => item.id === purchaseId) &&
      g.inventory.some((item) => item.id === purchaseId)
    )
      receivedItem.current = purchaseId;
    // Purchases may finish through a story choice rather than the buy button.
    // Wait for both the action presentation and its dialogue to finish.
    if (receivedItem.current && !state.action && !g.story?.active) {
      const id = receivedItem.current;
      receivedItem.current = null;
      if (g.inventory.some((item) => item.id === id))
        navigate([{ kind: '물품', id }], '보관함');
    }
  }, [g, currentRoute, state.action, navigate]);
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
    if (ok && c.type === 'post') {
      navigate([], '활동');
      return ok;
    }
    if (
      ok &&
      ['accept', 'break', 'reject', 'counter', 'payInterest'].includes(
        c.type,
      ) &&
      !useGameStore.getState().game?.inquiries.length &&
      state.tab !== '채팅' &&
      !routes.some((r) => r.kind === '채팅방')
    )
      navigate([], state.tab);
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
        obscured={shownRoutes.length > 0 || over}
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
            <PendingInquiryBar g={g} open={open} />
            {state.tab === '활동' ? (
              <ActivityHome
                g={g}
                open={open}
                settle={() => navigate([{ kind: '주간 정산' }])}
              />
            ) : state.tab === '채팅' ? (
              <ChatList g={g} open={open} />
            ) : state.tab === '채무' ? (
              <DebtView g={g} act={act} />
            ) : state.tab === '보관함' ? (
              <InventoryView g={g} open={open} />
            ) : (
              <DailyTabView g={g} open={open} act={act} />
            )}
          </main>
        </div>
        <nav
          className="bottom-nav"
          aria-label="주요 메뉴"
          inert={shownRoutes.length > 0 || over}
          aria-hidden={shownRoutes.length > 0 || over || undefined}
        >
          {nav.map((n) => (
            <button
              key={n.tab}
              aria-label={n.tab}
              aria-describedby={
                n.tab === '채팅' ? 'chat-nav-description' : undefined
              }
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
                {n.tab === '채팅' && unreadChats(g) > 0 && (
                  <span className="chat-nav-badge" aria-hidden="true">
                    {unreadChats(g)}
                  </span>
                )}
              </span>
              <span>{n.tab}</span>
            </button>
          ))}
          <span id="chat-nav-description" className="sr-only">
            안 읽은 채팅 {unreadChats(g)}개
          </span>
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
            summary={
              shownRoutes[0]?.kind === '장터' ? (
                <MarketStatus g={g} />
              ) : undefined
            }
            footer={
              <>
                {endedChat && !pending && (
                  <div className="sheet-chat-exit">
                    <Button
                      onClick={() => {
                        navigate([], '채팅');
                        state.dismiss();
                      }}
                    >
                      채팅 나가기
                    </Button>
                  </div>
                )}
                {actionsLeft(g) === 0 &&
                  !pending &&
                  shownRoutes.at(-1)?.kind !== '주간 정산' && (
                    <aside className="sheet-settlement-bar">
                      <Button onClick={() => navigate([{ kind: '주간 정산' }])}>
                        이번주 정산하기
                      </Button>
                    </aside>
                  )}
              </>
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
          undo={
            state.discarded?.after === state.game
              ? state.undoDiscard
              : undefined
          }
        />
      )}
      {state.action && (
        <ActionProgress key={state.action.id} action={state.action} />
      )}
    </div>
  );
}

export default function App() {
  const reducedMotion = useGameOptions((s) => s.reducedMotion);
  useEffect(() => {
    document.documentElement.dataset.gameMotion = reducedMotion
      ? 'reduced'
      : 'default';
    return () => {
      delete document.documentElement.dataset.gameMotion;
    };
  }, [reducedMotion]);
  const story = useGameStore((s) => s.game?.story?.active);
  const action = useGameStore((s) => s.action);
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
  return (
    <>
      <div inert={!!story && !action}>
        <GameApp key={slot} />
      </div>
      {story && !action && (
        <StoryPlayer key={`${slot}-${story.kind}-${story.target ?? ''}`} />
      )}
    </>
  );
}
