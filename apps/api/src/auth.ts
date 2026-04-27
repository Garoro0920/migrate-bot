// Internal/admin endpoints の認証。Bearer <INTERNAL_API_TOKEN> ヘッダ + timing-safe 比較。
// このトークンは:
// - apps/api Worker の secret として登録 (wrangler secret put INTERNAL_API_TOKEN)
// - apps/runner の env に同じ値を渡す (flyctl secrets set INTERNAL_API_TOKEN=...)
// - admin-trigger CLI 利用時に operator が --token または env で渡す
//
// share scope は migrate-bot のサービス境界内に閉じる (顧客には公開しない)。

export function extractBearerToken(authHeader: string | null | undefined): string | null {
  if (!authHeader) return null;
  const match = /^Bearer\s+(.+)$/.exec(authHeader);
  return match?.[1] ?? null;
}

export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function checkBearerAuth(authHeader: string | null | undefined, expected: string): boolean {
  const token = extractBearerToken(authHeader);
  if (token === null) return false;
  return timingSafeEqual(token, expected);
}
