export interface PaginationParams {
  range?: { from?: number; to?: number };
  page?: number;
  pageSize?: number;
  limit?: number;
  offset?: number;
}

export interface PaginationResult {
  skip: number;
  take: number;
  page: number;
  pageSize: number;
  calcTotalPages: (totalCount: number) => number;
}

export function parsePagination(params: PaginationParams = {}, defaultPageSize = 10): PaginationResult {
  let skip = 0;
  let take = defaultPageSize;
  let page = 1;
  let pageSize = defaultPageSize;

  if (params.range && typeof params.range.from === 'number' && typeof params.range.to === 'number') {
    skip = Math.max(0, params.range.from);
    take = Math.max(1, params.range.to - params.range.from + 1);
    pageSize = take;
    page = Math.floor(skip / take) + 1;
  } else if (params.page !== undefined && params.page > 0) {
    pageSize = params.pageSize || params.limit || defaultPageSize;
    page = params.page;
    skip = (page - 1) * pageSize;
    take = pageSize;
  } else if (params.limit !== undefined) {
    take = params.limit;
    skip = params.offset || 0;
    pageSize = take;
  }

  return {
    skip,
    take,
    page,
    pageSize,
    calcTotalPages: (totalCount: number) => Math.ceil(totalCount / (pageSize || 1)),
  };
}
