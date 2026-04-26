# pages-router-medium

中規模 Pages Router fixture (約 30 ファイル)。Phase 1 §1.2 のコスト計測と
パターン網羅検証用。実 `pnpm install` までは行わず、ファイル構造で
analyze + plan + migrate のロジックを駆動する。

含まれるパターン:
- `_app.tsx` (app)
- `_document.tsx` (document)
- `_error.tsx` (error、`getInitialProps` あり)
- `404.tsx` (error)
- 静的ページ × 6 (`index`, `about`, `contact`, `privacy`, `terms`, など)
- SSR ページ × 4 (`search`, `dashboard/*`, `products/index`, `users/index`)
- SSG ページ × 5 (`blog/*`, `categories/*`, `products/[id]`, `users/[id]`)
- API ルート × 11 (`hello`, `health`, `users/*`, `products/*`, `blog/*`, `auth/*`)

合計 30 ファイル (`pages/` 配下)。
