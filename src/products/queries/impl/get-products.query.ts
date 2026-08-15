export class GetProductsQuery {
  constructor(
    public readonly limit?: number,
    public readonly offset?: number,
  ) {}
}
