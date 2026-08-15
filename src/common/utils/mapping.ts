export function mapProfileFields(profile: any) {
  if (!profile) return null;
  return {
    ...profile,
    id: profile.id,
    fullName: profile.full_name,
    fullName_snake: profile.full_name,
    lastLuckySpin: profile.last_lucky_spin,
    last_lucky_spin: profile.last_lucky_spin,
    spinTickets: profile.spin_tickets,
    spin_tickets: profile.spin_tickets,
    points: profile.points ?? 0,
    email: profile.email,
  };
}

export function mapTransactionFields(t: any) {
  if (!t) return null;
  return {
    ...t,
    id: t.id ? t.id.toString() : undefined,
    userId: t.user_id,
    user_id: t.user_id,
    amount: Number(t.amount),
    reason: t.reason,
    type: t.type,
    createdAt: t.created_at,
    created_at: t.created_at,
  };
}

export function mapVoucherFields(v: any) {
  if (!v) return null;
  return {
    ...v,
    id: v.id ? v.id.toString() : undefined,
    userId: v.user_id,
    user_id: v.user_id,
    discountAmount: Number(v.discount_amount),
    discount_amount: Number(v.discount_amount),
    minOrderValue: v.min_order_value !== null ? Number(v.min_order_value) : 0,
    min_order_value: v.min_order_value !== null ? Number(v.min_order_value) : 0,
    createdAt: v.created_at,
    created_at: v.created_at,
    expiresAt: v.expires_at,
    expires_at: v.expires_at,
  };
}
