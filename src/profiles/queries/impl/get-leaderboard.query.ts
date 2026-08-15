export class GetLeaderboardQuery {
  constructor(public readonly gameName: string, public readonly limit?: number) {}
}
