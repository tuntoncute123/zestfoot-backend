export interface PricingSummary {
  grossRevenue: number;
  totalCostPrice: number;
  promoDiscounts: number;
  netProfit: number;
  marginPercent: number;
}

export function parseNumber(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') return parseFloat(val) || 0;
  if (typeof val === 'object') {
    if (typeof val.toNumber === 'function') return val.toNumber();
    if (val.value !== undefined) return Number(val.value) || 0;
    if (val.d && Array.isArray(val.d)) {
      try {
        const digits = val.d.join('');
        const exp = val.e ?? (digits.length - 1);
        const sign = val.s === -1 ? -1 : 1;
        return sign * parseFloat(digits) * Math.pow(10, exp - digits.length + 1);
      } catch {
        return 0;
      }
    }
  }
  return Number(val) || 0;
}

export function calculateNetProfit(
  sellingPrice: number,
  costPrice: number,
  discountAmount: number = 0,
): number {
  return parseNumber(sellingPrice) - parseNumber(costPrice) - parseNumber(discountAmount);
}

export function calculateMarginPercent(netProfit: number, sellingPrice: number): number {
  const price = parseNumber(sellingPrice);
  if (price <= 0) return 0;
  return Math.round((parseNumber(netProfit) / price) * 100 * 100) / 100;
}

export function calculateClearanceThreshold(
  costPrice: number,
  minMarginPercent: number = 10,
  overheadFee: number = 0,
): number {
  const cost = parseNumber(costPrice);
  return Math.ceil(cost * (1 + minMarginPercent / 100) + parseNumber(overheadFee));
}

export function computePricingMetrics(items: Array<{ price: any; costPrice?: any; discount?: any }>): PricingSummary {
  let grossRevenue = 0;
  let totalCostPrice = 0;
  let promoDiscounts = 0;

  for (const item of items) {
    const price = parseNumber(item.price);
    const cost = parseNumber(item.costPrice);
    const discount = parseNumber(item.discount);

    grossRevenue += price;
    totalCostPrice += cost;
    promoDiscounts += discount;
  }

  const netProfit = grossRevenue - totalCostPrice - promoDiscounts;
  const marginPercent = grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 100 * 100) / 100 : 0;

  return {
    grossRevenue,
    totalCostPrice,
    promoDiscounts,
    netProfit,
    marginPercent,
  };
}
