export class GetProductsQuery {
  constructor(
    public readonly limit?: number,
    public readonly offset?: number,
    public readonly brand?: string,
    public readonly category?: string,
    public readonly gender?: string,
    public readonly isNew?: boolean,
    public readonly isSale?: boolean,
    public readonly isTrending?: boolean,
    public readonly isAsicsExclusive?: boolean,
  ) {}
}
