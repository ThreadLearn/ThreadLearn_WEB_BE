export class XPGrantedEvent {
  constructor(
    public readonly userId: string,
    public readonly xpAmount: number,
  ) {}
}
