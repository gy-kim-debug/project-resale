import { useState } from 'react';
import type { Route } from '../components/GameViews';
import type { Tab } from './store';

/** Game-local layer stack. Browser navigation is left to the browser. */
export function usePageNavigation(tab: Tab, setTab: (tab: Tab) => void) {
  const [routes, setRoutes] = useState<Route[]>([]);
  function navigate(next: Route[], nextTab = tab) {
    setRoutes(next);
    if (nextTab !== tab) setTab(nextTab);
  }
  function back() {
    setRoutes((current) => current.slice(0, -1));
  }
  return { routes, navigate, back };
}
