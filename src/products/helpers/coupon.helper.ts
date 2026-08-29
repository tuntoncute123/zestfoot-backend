export interface CouponValidationResult {
  valid: boolean;
  type?: 'public' | 'private';
  discount?: number;
  message: string;
  coupon?: any;
  voucher?: any;
}


export function validatePublicCoupon(coupon: any, orderTotal: number): CouponValidationResult {
  if (!coupon.is_active) {
    return { valid: false, message: 'Mã giảm giá không hoạt động.' };
  }

  const now = new Date();
  if (coupon.start_date && new Date(coupon.start_date) > now) {
    return { valid: false, message: 'Mã giảm giá chưa đến đợt áp dụng.' };
  }
  if (coupon.end_date && new Date(coupon.end_date) < now) {
    return { valid: false, message: 'Mã giảm giá đã hết hạn.' };
  }
  if (coupon.usage_limit && (coupon.used_count || 0) >= coupon.usage_limit) {
    return { valid: false, message: 'Mã giảm giá đã hết số lượng.' };
  }

  const minOrderVal = coupon.min_order_value ? Number(coupon.min_order_value) : 0;
  if (orderTotal < minOrderVal) {
    return {
      valid: false,
      message: `Đơn hàng tối thiểu để dùng mã này là ${minOrderVal.toLocaleString('vi-VN')}đ`,
    };
  }

  let discountAmount = 0;
  const discountVal = Number(coupon.discount_value);
  if (coupon.discount_type === 'fixed') {
    discountAmount = discountVal;
  } else if (coupon.discount_type === 'percent') {
    discountAmount = (orderTotal * discountVal) / 100;
    const maxDiscount = coupon.max_discount_amount ? Number(coupon.max_discount_amount) : null;
    if (maxDiscount && discountAmount > maxDiscount) {
      discountAmount = maxDiscount;
    }
  }

  return {
    valid: true,
    type: 'public',
    discount: discountAmount,
    message: `Áp dụng Coupon thành công! -${discountAmount.toLocaleString('vi-VN')}đ`,
    coupon: {
      ...coupon,
      id: coupon.id.toString(),
      discount_value: discountVal,
      min_order_value: minOrderVal,
      max_discount_amount: coupon.max_discount_amount ? Number(coupon.max_discount_amount) : null,
    },
  };
}


export function validatePrivateVoucher(voucher: any, orderTotal: number): CouponValidationResult {
  if (voucher.expires_at && new Date(voucher.expires_at) < new Date()) {
    return { valid: false, message: 'Voucher đã hết hạn.' };
  }

  const minOrder = voucher.min_order_value || 0;
  if (orderTotal < minOrder) {
    return {
      valid: false,
      message: `Đơn hàng tối thiểu để dùng voucher này là ${minOrder.toLocaleString('vi-VN')}đ`,
    };
  }

  const discountAmount = voucher.discount_amount;

  return {
    valid: true,
    type: 'private',
    discount: discountAmount,
    message: `Áp dụng Voucher thành công! -${discountAmount.toLocaleString('vi-VN')}đ`,
    voucher: {
      ...voucher,
      id: voucher.id.toString(),
    },
  };
}
