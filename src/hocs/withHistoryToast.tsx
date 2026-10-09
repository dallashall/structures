import React from 'react';

import type { HistoryToast } from '../core/HistoryAnnouncer';

import { historyAnnouncer } from '../core/HistoryAnnouncer';

/**
 * Props injected by withHistoryToast HOC
 */
export interface WithHistoryToastProps {
  toasts: HistoryToast[];
  onExited: (key: number) => void;
}

const TOAST_NOTIFICATIONS = ['toast:shown', 'toast:expired', 'toast:removed'];

const handleExited = (key: number): void => {
  historyAnnouncer.remove(key);
};

/**
 * HOC that passes the undo and redo toasts, oldest first
 */
export function withHistoryToast<P extends object>(
  Component: React.ComponentType<P & WithHistoryToastProps>,
) {
  return function WithHistoryToast(props: P) {
    const [toasts, setToasts] = React.useState<HistoryToast[]>(historyAnnouncer.getToasts());

    React.useEffect(() => {
      const readToasts = (): void => setToasts(historyAnnouncer.getToasts());
      const subscribe = (name: string): void => { historyAnnouncer.on(name, readToasts); };
      const unsubscribe = (name: string): void => { historyAnnouncer.off(name, readToasts); };

      const unsubscribeAll = (): void => TOAST_NOTIFICATIONS.forEach(unsubscribe);

      TOAST_NOTIFICATIONS.forEach(subscribe);
      readToasts();
      return unsubscribeAll;
    }, []);

    return <Component {...props} toasts={toasts} onExited={handleExited} />;
  };
}
