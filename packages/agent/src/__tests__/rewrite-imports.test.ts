import { describe, expect, it } from 'vitest';
import { rewriteImports } from '../migrate/rewrite-imports';

describe('rewriteImports', () => {
  it('deepens relative imports when target is one directory deeper', () => {
    // 実際の E2E で起きたバグ: pages/users/[id].tsx → app/users/[id]/page.tsx
    // Layout は repo root の components/Layout にある。
    const source = `import Layout from "../../components/Layout";\nimport ListDetail from "../../components/ListDetail";\nimport { sampleUserData } from "../../utils/sample-data";\n`;
    const targetFromLlm = `import Layout from "../../components/Layout";\nimport ListDetail from "../../components/ListDetail";\nimport { sampleUserData } from "../../utils/sample-data";\nexport default function Page() {}`;
    const result = rewriteImports({
      sourceContent: source,
      targetContent: targetFromLlm,
      sourcePath: 'pages/users/[id].tsx',
      targetPath: 'app/users/[id]/page.tsx',
    });
    expect(result).toContain('"../../../components/Layout"');
    expect(result).toContain('"../../../components/ListDetail"');
    expect(result).toContain('"../../../utils/sample-data"');
  });

  it('preserves imports when source and target are at the same depth', () => {
    // pages/users/index.tsx (深さ 2 from root: pages/users/) → app/users/page.tsx
    // (深さ 2 from root: app/users/)。両方から ../../components/Layout は root の
    // components/Layout を指すので rewrite 不要。
    const source = `import Layout from "../../components/Layout";\n`;
    const target = `import Layout from "../../components/Layout";\n`;
    const result = rewriteImports({
      sourceContent: source,
      targetContent: target,
      sourcePath: 'pages/users/index.tsx',
      targetPath: 'app/users/page.tsx',
    });
    expect(result).toContain('"../../components/Layout"');
  });

  it('preserves correct imports unchanged', () => {
    const source = `import Layout from "../components/Layout";\n`;
    const target = `import Layout from "../components/Layout";\n`;
    const result = rewriteImports({
      sourceContent: source,
      targetContent: target,
      sourcePath: 'pages/index.tsx',
      targetPath: 'app/page.tsx',
    });
    expect(result).toBe(target);
  });

  it('leaves node_modules / package imports untouched', () => {
    const source = `import { useRouter } from "next/router";\nimport React from "react";\n`;
    const target = `import { useRouter } from "next/navigation";\nimport React from "react";\nimport { foo } from "@/lib/foo";\n`;
    const result = rewriteImports({
      sourceContent: source,
      targetContent: target,
      sourcePath: 'pages/users/[id].tsx',
      targetPath: 'app/users/[id]/page.tsx',
    });
    expect(result).toContain('"next/navigation"');
    expect(result).toContain('"react"');
    expect(result).toContain('"@/lib/foo"');
  });

  it('handles double quotes and single quotes', () => {
    const source = `import a from '../../components/A';\nimport b from "../../components/B";\n`;
    const target = `import a from '../../components/A';\nimport b from "../../components/B";\n`;
    const result = rewriteImports({
      sourceContent: source,
      targetContent: target,
      sourcePath: 'pages/users/[id].tsx',
      targetPath: 'app/users/[id]/page.tsx',
    });
    expect(result).toContain("'../../../components/A'");
    expect(result).toContain('"../../../components/B"');
  });

  it('does not rewrite when LLM dropped an import that source had', () => {
    // source has Layout, target removes it (intentional)
    const source = `import Layout from "../../components/Layout";\nexport default function() {}\n`;
    const target = `export default function Page() { return <div>hi</div>; }\n`;
    const result = rewriteImports({
      sourceContent: source,
      targetContent: target,
      sourcePath: 'pages/users/[id].tsx',
      targetPath: 'app/users/[id]/page.tsx',
    });
    expect(result).toBe(target);
  });

  it('does not rewrite when LLM added a new import absent from source (no tail match)', () => {
    const source = `export default function() {}\n`;
    const target = `import Suspense from "../foo/bar";\nexport default function() {}\n`;
    const result = rewriteImports({
      sourceContent: source,
      targetContent: target,
      sourcePath: 'pages/index.tsx',
      targetPath: 'app/page.tsx',
    });
    // No matching tail in source, leave alone
    expect(result).toContain('"../foo/bar"');
  });

  it('handles _document.tsx → app/layout.tsx style move', () => {
    // pages/_document.tsx (depth 1) → app/layout.tsx (depth 1, same)
    const source = `import { sharedStyles } from "../styles/shared";\n`;
    const target = `import { sharedStyles } from "../styles/shared";\n`;
    const result = rewriteImports({
      sourceContent: source,
      targetContent: target,
      sourcePath: 'pages/_document.tsx',
      targetPath: 'app/layout.tsx',
    });
    expect(result).toContain('"../styles/shared"');
  });

  it('handles api route deep move (pages/api/users/[id].ts -> app/api/users/[id]/route.ts)', () => {
    const source = `import { db } from "../../../lib/db";\n`;
    const target = `import { db } from "../../../lib/db";\n`;
    const result = rewriteImports({
      sourceContent: source,
      targetContent: target,
      sourcePath: 'pages/api/users/[id].ts',
      targetPath: 'app/api/users/[id]/route.ts',
    });
    expect(result).toContain('"../../../../lib/db"');
  });

  it('preserves original quoting style', () => {
    const source = `import a from '../../components/A';\n`;
    const target = `import a from '../../components/A';\n`;
    const result = rewriteImports({
      sourceContent: source,
      targetContent: target,
      sourcePath: 'pages/users/[id].tsx',
      targetPath: 'app/users/[id]/page.tsx',
    });
    expect(result).toContain("from '../../../components/A'");
    expect(result).not.toContain('from "');
  });
});
