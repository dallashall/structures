import React from 'react';

import type { HistoryStepNotice } from '../core/EditHistory';

import { editHistory } from '../core/EditHistory';

export interface HistoryToastMessage {
  key: number;
  kind: 'undo' | 'redo';
  text: string;
  // True once the toast has timed out or been pushed out. It animates away, then onExited removes it.
  leaving: boolean;
}

/**
 * Props injected by withHistoryToast HOC
 */
export interface WithHistoryToastProps {
  messages: HistoryToastMessage[];
  onExited: (key: number) => void;
}

const VISIBLE_MS = 2500;
// Older toasts leave once more than this many show at once
const MAX_VISIBLE = 4;

const markLeaving = (keys: Set<number>) => (message: HistoryToastMessage): HistoryToastMessage =>
  keys.has(message.key) ? { ...message, leaving: true } : message;

const toKey = (message: HistoryToastMessage): number => message.key;
const isStaying = (message: HistoryToastMessage): boolean => !message.leaving;

/**
 * HOC that passes a stack of toasts, one per undo or redo, oldest first
 */
export function withHistoryToast<P extends object>(
  Component: React.ComponentType<P & WithHistoryToastProps>,
) {
  return function WithHistoryToast(props: P) {
    const [messages, setMessages] = React.useState<HistoryToastMessage[]>([]);

    React.useEffect(() => {
      let nextKey = 0;
      const timers = new Set<ReturnType<typeof setTimeout>>();

      const show = (kind: 'undo' | 'redo', label: string): void => {
        const key = ++nextKey;
        const text = `${kind === 'undo' ? 'Undid' : 'Redid'} ${label}`;

        const pushMessage = (current: HistoryToastMessage[]): HistoryToastMessage[] => {
          const next = [...current, { key, kind, text, leaving: false }];
          const staying = next.filter(isStaying);
          const overflow = new Set(staying.slice(0, Math.max(0, staying.length - MAX_VISIBLE)).map(toKey));
          return next.map(markLeaving(overflow));
        };
        setMessages(pushMessage);

        const markThisLeaving = markLeaving(new Set([key]));
        const expireMessage = (current: HistoryToastMessage[]): HistoryToastMessage[] =>
          current.map(markThisLeaving);
        const expire = (): void => {
          timers.delete(timer);
          setMessages(expireMessage);
        };
        const timer = setTimeout(expire, VISIBLE_MS);
        timers.add(timer);
      };

      const showUndone = ({ label }: HistoryStepNotice): void => show('undo', label);
      const showRedone = ({ label }: HistoryStepNotice): void => show('redo', label);

      editHistory.on('history:step-undone', showUndone);
      editHistory.on('history:step-redone', showRedone);
      return () => {
        editHistory.off('history:step-undone', showUndone);
        editHistory.off('history:step-redone', showRedone);
        timers.forEach(clearTimeout);
      };
    }, []);

    const handleExited = React.useCallback((key: number): void => {
      const isOther = (message: HistoryToastMessage): boolean => message.key !== key;
      const removeMessage = (current: HistoryToastMessage[]): HistoryToastMessage[] => current.filter(isOther);
      setMessages(removeMessage);
    }, []);

    return <Component {...props} messages={messages} onExited={handleExited} />;
  };
}
