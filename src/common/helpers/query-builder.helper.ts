import { parsePagination } from './pagination.helper';

export interface RawQueryDto {
  eq?: Record<string, any>;
  ilike?: Record<string, any>;
  orderBy?: Array<{ column: string; ascending?: boolean }>;
  range?: { from?: number; to?: number };
  limit?: number;
  offset?: number;
  page?: number;
  pageSize?: number;
}

export function buildPrismaQueryOptions(dto: RawQueryDto = {}) {
  const where: Record<string, any> = {};

  if (dto.eq && typeof dto.eq === 'object') {
    for (const [key, val] of Object.entries(dto.eq)) {
      if (val !== undefined && val !== null && val !== '') {
        where[key] = val;
      }
    }
  }

  if (dto.ilike && typeof dto.ilike === 'object') {
    for (const [key, val] of Object.entries(dto.ilike)) {
      if (typeof val === 'string' && val.trim()) {
        const cleanVal = val.replace(/%/g, '');
        where[key] = { contains: cleanVal, mode: 'insensitive' };
      }
    }
  }

  const orderBy: any[] = [];
  if (Array.isArray(dto.orderBy) && dto.orderBy.length > 0) {
    for (const item of dto.orderBy) {
      if (item.column) {
        orderBy.push({ [item.column]: item.ascending === false ? 'desc' : 'asc' });
      }
    }
  }

  const { skip, take } = parsePagination({
    range: dto.range,
    limit: dto.limit,
    offset: dto.offset,
    page: dto.page,
    pageSize: dto.pageSize,
  });

  return {
    where: Object.keys(where).length > 0 ? where : undefined,
    orderBy: orderBy.length > 0 ? orderBy : undefined,
    skip,
    take,
  };
}
