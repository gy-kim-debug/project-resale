import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Route } from '../components/GameViews';
import type { Tab } from './store';

/** Session-local page history; gameplay remains in the game store. */
export function usePageNavigation(tab: Tab, setTab: (tab: Tab) => void) {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [session] = useState(() => `resale-${Date.now()}-${Math.random()}`);
  const currentTab = useRef(tab);
  useLayoutEffect(() => {
    currentTab.current = tab;
  }, [tab]);
  useEffect(() => {
    history.replaceState(
      { resaleUi: session, routes: [], tab: currentTab.current },
      '',
    );
    const restore = (event: PopStateEvent) => {
      const page = event.state;
      if (page?.resaleUi === session) {
        setRoutes(page.routes);
        setTab(page.tab);
      } else setRoutes([]);
    };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, [session, setTab]);
  function navigate(
    next: Route[],
    nextTab = currentTab.current,
    replace = false,
  ) {
    const page = { resaleUi: session, routes: next, tab: nextTab };
    if (replace) history.replaceState(page, '');
    else history.pushState(page, '');
    setRoutes(next);
    if (nextTab !== currentTab.current) setTab(nextTab);
  }
  return { routes, navigate, back: () => history.back() };
}
