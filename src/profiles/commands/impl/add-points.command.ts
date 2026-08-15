export class AddPointsCommand {
  constructor(
    public readonly userId: string,
    public readonly amount: number,
    public readonly reason: string,
    public readonly type: 'earn' | 'spend',
  ) {}
}
