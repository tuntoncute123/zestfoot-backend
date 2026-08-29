export const COUNTRIES = [
  { code: 'us', name: 'Mỹ' },
  { code: 'mx', name: 'Mexico' },
  { code: 'ca', name: 'Canada' },
  { code: 'ar', name: 'Argentina' },
  { code: 'br', name: 'Brazil' },
  { code: 'fr', name: 'Pháp' },
  { code: 'gb', name: 'Anh' },
  { code: 'es', name: 'Tây Ban Nha' },
  { code: 'pt', name: 'Bồ Đào Nha' },
  { code: 'de', name: 'Đức' },
  { code: 'it', name: 'Ý' },
  { code: 'nl', name: 'Hà Lan' },
  { code: 'be', name: 'Bỉ' },
  { code: 'hr', name: 'Croatia' },
  { code: 'jp', name: 'Nhật Bản' },
  { code: 'kr', name: 'Hàn Quốc' },
  { code: 'ma', name: 'Maroc' },
  { code: 'sn', name: 'Senegal' },
  { code: 'uy', name: 'Uruguay' },
  { code: 'co', name: 'Colombia' },
  { code: 'ch', name: 'Thụy Sĩ' },
  { code: 'dk', name: 'Đan Mạch' },
  { code: 'sa', name: 'Ả Rập Xê Út' },
  { code: 'ir', name: 'Iran' },
  { code: 'au', name: 'Úc' },
  { code: 'ec', name: 'Ecuador' },
  { code: 'pl', name: 'Ba Lan' },
  { code: 'tn', name: 'Tunisia' },
  { code: 'cm', name: 'Cameroon' },
  { code: 'gh', name: 'Ghana' },
  { code: 'ci', name: 'Bờ Biển Ngà' },
  { code: 'ng', name: 'Nigeria' },
  { code: 'dz', name: 'Algeria' },
  { code: 'eg', name: 'Ai Cập' },
  { code: 'se', name: 'Thụy Điển' },
  { code: 'no', name: 'Na Uy' },
  { code: 'tr', name: 'Thổ Nhĩ Kỳ' },
  { code: 'ua', name: 'Ukraine' },
  { code: 'at', name: 'Áo' },
  { code: 'gr', name: 'Hy Lạp' },
  { code: 'pe', name: 'Peru' },
  { code: 'cl', name: 'Chile' },
  { code: 'cr', name: 'Costa Rica' },
  { code: 'jm', name: 'Jamaica' },
  { code: 'pa', name: 'Panama' },
  { code: 'iq', name: 'Iraq' },
  { code: 'ae', name: 'UAE' },
  { code: 'qa', name: 'Qatar' }
];


export function getVoucherDiscountAmount(prizeType: string): number {
  if (prizeType.includes('500')) return 500000;
  if (prizeType.includes('200')) return 200000;
  if (prizeType.includes('100')) return 100000;
  return 50000;
}
