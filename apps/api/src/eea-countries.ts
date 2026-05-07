// EEA / UK / Switzerland country code list (ISO 3166-1 alpha-2).
//
// ToS §2 で EEA / UK / Switzerland 居住者の利用を明示的に禁止している。
// Stripe Checkout 側で billing_address を必須収集 + custom_text で警告
// 表示しているが、すり抜けで決済通過するケースに備え、webhook 受信時に
// billing country を検証して該当なら自動 refund する 5 段目の防御。
//
// EU 27 + EEA 追加 3 (Iceland / Liechtenstein / Norway) + UK + Switzerland
// = 計 32 ヶ国。Brexit 後も UK GDPR が適用されるため UK は含む。
// Switzerland は EEA 非加盟だが Swiss FADP (連邦データ保護法) があるため含む。

const EEA_UK_CH_COUNTRIES: ReadonlySet<string> = new Set([
  // EU 27
  'AT', // Austria
  'BE', // Belgium
  'BG', // Bulgaria
  'HR', // Croatia
  'CY', // Cyprus
  'CZ', // Czech Republic
  'DK', // Denmark
  'EE', // Estonia
  'FI', // Finland
  'FR', // France
  'DE', // Germany
  'GR', // Greece
  'HU', // Hungary
  'IE', // Ireland
  'IT', // Italy
  'LV', // Latvia
  'LT', // Lithuania
  'LU', // Luxembourg
  'MT', // Malta
  'NL', // Netherlands
  'PL', // Poland
  'PT', // Portugal
  'RO', // Romania
  'SK', // Slovakia
  'SI', // Slovenia
  'ES', // Spain
  'SE', // Sweden
  // EEA additional
  'IS', // Iceland
  'LI', // Liechtenstein
  'NO', // Norway
  // UK + Switzerland
  'GB', // United Kingdom
  'CH', // Switzerland
]);

/**
 * 与えられた country code (ISO 3166-1 alpha-2) が EEA / UK / Switzerland に
 * 属する場合 true。null / undefined / 空文字列 / 大小文字どちらでも安全に
 * 動作する (内部で大文字化)。
 *
 * Stripe Checkout `customer_details.address.country` は alpha-2 形式で返る。
 */
export function isEeaUkCh(countryCode: string | null | undefined): boolean {
  if (typeof countryCode !== 'string' || countryCode.length === 0) {
    return false;
  }
  return EEA_UK_CH_COUNTRIES.has(countryCode.toUpperCase());
}

export const EEA_UK_CH_COUNTRY_COUNT = EEA_UK_CH_COUNTRIES.size;
