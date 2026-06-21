import { BaseEntity } from './base.entity';
import { IDomainEvent } from './events/domain-event.interface';

export abstract class AggregateRoot<T> extends BaseEntity<T> {
  private _domainEvents: IDomainEvent[] = [];

  get domainEvents(): IDomainEvent[] {
    return this._domainEvents;
  }

  protected addDomainEvent(domainEvent: IDomainEvent): void {
    this._domainEvents.push(domainEvent);
  }

  public clearEvents(): void {
    this._domainEvents = [];
  }
}
