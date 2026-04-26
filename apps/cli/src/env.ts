import { existsSync, readFileSync } from 'node:fs';

export function loadDotenv(path: string): void {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf-8');
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx <= 0) continue;
    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key.length === 0) continue;
    if (process.env[key] !== undefined) continue;
    process.env[key] = value;
  }
}
