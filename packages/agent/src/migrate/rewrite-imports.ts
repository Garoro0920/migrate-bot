import { posix } from 'node:path';

// Pages Router → App Router 移行で頻発する LLM の相対 import 不整合を deterministic
// に修正する post-processing。例えば pages/users/[id].tsx (深さ 2) から
// app/users/[id]/page.tsx (深さ 3) に移ると、同じ依存先 (例: components/Layout) を
// 指す相対パスは ../../ から ../../../ になるべきだが、LLM がそれを見落とすケースを補正。
//
// 戦略: source 側の各相対 import を絶対パス (リポジトリ root 基準) に解決して保持し、
// target 側の各相対 import を target 位置から再計算する。一致するものがあればそのまま、
// なければ「import path の tail (./ や ../ を取り除いた残り)」で source の絶対パス候補を
// 引き当て、target 位置から正しい相対 path に書き換える。

interface ImportMatch {
  readonly raw: string;
  readonly path: string;
  readonly index: number;
}

const IMPORT_REGEX = /(?:from|import|require\s*\()\s*['"]([^'"]+)['"]/g;

export interface RewriteImportsInput {
  readonly sourceContent: string;
  readonly targetContent: string;
  readonly sourcePath: string;
  readonly targetPath: string;
}

export function rewriteImports(input: RewriteImportsInput): string {
  const sourceDir = posix.dirname(toPosix(input.sourcePath));
  const targetDir = posix.dirname(toPosix(input.targetPath));

  const sourceImports = findImports(input.sourceContent);
  // tail (例 "components/Layout") → 絶対パス (例 "components/Layout") の map
  // 同一 tail で複数の絶対 path がある場合は最初に見つけたものを採用 (実用上ほぼ衝突しない)
  const tailToAbs = new Map<string, string>();
  const sourceAbsSet = new Set<string>();
  for (const imp of sourceImports) {
    if (!isRelative(imp.path)) continue;
    const abs = posix.normalize(posix.join(sourceDir, imp.path));
    sourceAbsSet.add(abs);
    const tail = stripRelativePrefix(imp.path);
    if (!tailToAbs.has(tail)) tailToAbs.set(tail, abs);
  }

  const targetImports = findImports(input.targetContent);
  // 後ろから書き換えると index がズレないので逆順で処理
  let result = input.targetContent;
  for (let i = targetImports.length - 1; i >= 0; i--) {
    const imp = targetImports[i];
    if (!imp || !isRelative(imp.path)) continue;
    const targetAbs = posix.normalize(posix.join(targetDir, imp.path));
    if (sourceAbsSet.has(targetAbs)) continue; // 既に有効な依存先を指している

    const tail = stripRelativePrefix(imp.path);
    const correctAbs = tailToAbs.get(tail);
    if (!correctAbs) continue;

    const newRelative = toRelativeImport(targetDir, correctAbs);
    if (newRelative === imp.path) continue;

    // imp.raw は from "..." / import "..." / require("...") の形。imp.path は
    // その中に 1 度だけ現れるので literal replace で十分。
    const newRaw = imp.raw.replace(imp.path, newRelative);
    result = result.slice(0, imp.index) + newRaw + result.slice(imp.index + imp.raw.length);
  }

  return result;
}

function findImports(content: string): readonly ImportMatch[] {
  const out: ImportMatch[] = [];
  IMPORT_REGEX.lastIndex = 0;
  for (const match of content.matchAll(IMPORT_REGEX)) {
    if (match.index === undefined) continue;
    const path = match[1];
    if (path === undefined) continue;
    out.push({ raw: match[0], path, index: match.index });
  }
  return out;
}

function isRelative(p: string): boolean {
  return p.startsWith('./') || p.startsWith('../') || p === '.' || p === '..';
}

function stripRelativePrefix(p: string): string {
  return p.replace(/^(?:\.\.?\/)+/, '');
}

function toRelativeImport(fromDir: string, toAbsPath: string): string {
  let rel = posix.relative(fromDir, toAbsPath);
  if (rel === '') rel = '.';
  if (!rel.startsWith('.')) rel = `./${rel}`;
  return rel;
}

function toPosix(p: string): string {
  return p.replace(/\\/g, '/');
}
