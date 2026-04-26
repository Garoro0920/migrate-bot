# pages-router-minimal

agent の Analyze 段階を unit test するための最小 fixture。
実際の `pnpm install` は行わず、ファイル構造だけを使う。

含まれるパターン:

| ファイル | 期待される `kind` |
|---|---|
| `pages/_app.tsx` | `app` |
| `pages/index.tsx` | `static-page` |
| `pages/posts/[slug].tsx` | `ssg-page` |
| `pages/api/hello.ts` | `api-route` |
