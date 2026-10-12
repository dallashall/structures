import type { EventHandler } from '../types';

/**
 * Simple event emitter for singleton classes to broadcast state changes
 */
export class EventEmitter {
  private events: Map<string, Set<EventHandler>>;

  constructor() {
    this.events = new Map();
  }

  /**
   * Subscribe to an event
   */
  on(event: string, handler: EventHandler): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, handler: EventHandler): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.events.delete(event);
      }
    }
  }

  /**
   * Emit an event to all subscribers
   */
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
