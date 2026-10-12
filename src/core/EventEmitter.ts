import type { EventHandler } from '../types';

// A throwing handler is logged and skipped, so one broken subscriber never stops the others
export class EventEmitter {
  private events: Map<string, Set<EventHandler>>;

  constructor() {
    this.events = new Map();
  }

  on(event: string, handler: EventHandler): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.events.delete(event);
      }
    }
  }

  protected emit(event: string, ...args: any[]): void {
    const handlers = this.events.get(event);
    if (handlers) {
      const callHandler = (handler: EventHandler): void => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error);
        }
      };
      handlers.forEach(callHandler);
    }
  }

}
