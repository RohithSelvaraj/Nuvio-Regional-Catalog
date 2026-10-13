import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Tiny .env reader so this project needs no third-party runtime dependencies.
export function loadLocalEnv() {
  const envFile = path.join(ROOT, '.env');
  if (!fs.existsSync(envFile)) return;
  const raw = fs.readFileSync(envFile, 'utf8').replace(/^\uFEFF/, '');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[match[1]] === undefined) process.env[match[1]] = value;
  }
}

export function getTmdbCredentials() {
  loadLocalEnv();
  const token = (process.env.TMDB_READ_ACCESS_TOKEN || '').trim();
  const apiKey = (process.env.TMDB_API_KEY || '').trim();
  const validValue = value => value && !/^PASTE_YOUR_/i.test(value) && !/^your[_ -]/i.test(value);
  if (validValue(token)) return { kind: 'bearer', value: token };
  if (validValue(apiKey)) return { kind: 'api_key', value: apiKey };
  return null;
}
