/**
 * Recursively serializes database records, converting BigInt, Date, and Decimal fields.
 * This is useful for returning Prisma query results over HTTP JSON APIs safely.
 */
export function serializeData(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'bigint') return data.toString();
  if (data instanceof Date) return data.toISOString();

  // Handle Prisma Decimal or Decimal.js instances
  if (typeof data === 'object') {
    if (typeof data.toNumber === 'function') {
      return data.toNumber();
    }
    if (data.d && Array.isArray(data.d)) {
      return Number(typeof data.toString === 'function' ? data.toString() : data.d[0] || 0);
    }
  }

  if (Array.isArray(data)) return data.map(item => serializeData(item));

  if (typeof data === 'object') {
    const copy: any = {};
    for (const key of Object.keys(data)) {
      copy[key] = serializeData(data[key]);
    }
    return copy;
  }
  return data;
}

