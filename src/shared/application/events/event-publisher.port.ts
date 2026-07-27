export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');

export type EventHandler<TPayload> = (
  payload: TPayload,
) => void | Promise<void> | unknown | Promise<unknown>;

export interface EventPublisher {
  publish<TPayload>(eventName: string, payload: TPayload): void | Promise<void>;
}

export interface EventSubscriber {
  subscribe<TPayload>(eventName: string, handler: EventHandler<TPayload>): void;
}

export interface EventBus extends EventPublisher, EventSubscriber {}
