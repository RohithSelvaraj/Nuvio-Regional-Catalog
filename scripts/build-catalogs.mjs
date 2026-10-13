import fs from 'node:fs';
import path from 'node:path';
import { ROOT, getTmdbCredentials } from './config.mjs';
import { ADDON_ID, ADDON_NAME, ADDON_VERSION, createCatalogDefinitions, genreNames } from './catalog-spec.mjs';

const publicDir = path.join(ROOT, 'public');
const catalogRoot = path.join(publicDir, 'catalog');
fs.mkdirSync(publicDir, { recursive: true });
const definitions = createCatalogDefinitions();

const manifest = {
  id: ADDON_ID,
  version: ADDON_VERSION,
  name: ADDON_NAME,
  description: 'Regional movie and series discovery for Tamil, Telugu, Malayalam and Kannada, powered by TMDB.',
  resources: ['catalog'],
  types: ['movie', 'series'],
  idPrefixes: ['tmdb:'],
  catalogs: definitions.map(def => ({
    type: def.type,
    id: def.id,
    name: def.title,
    pageSize: 20
  })),
  behaviorHints: { adult: false, configurable: false }
};
fs.writeFileSync(path.join(publicDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');

if (process.argv.includes('--manifest-only')) {
  console.log(`Wrote manifest.json with ${definitions.length} catalogs (manifest-only mode; no TMDB calls).`);
  process.exit(0);
}

const credentials = getTmdbCredentials();
if (!credentials) {
  console.error('TMDB credentials are missing. Copy .env.example to .env and add TMDB_API_KEY or TMDB_READ_ACCESS_TOKEN.');
  console.error('For GitHub Pages, add the same credential as a GitHub Actions secret before deploying.');
  process.exit(1);
}

const imageBase = 'https://image.tmdb.org/t/p';
const today = new Date();
const isoDate = date => date.toISOString().slice(0, 10);
const todayString = isoDate(today);
const recentStart = new Date(today);
recentStart.setUTCDate(recentStart.getUTCDate() - 730);
const recentStartString = isoDate(recentStart);

function buildUrl(endpoint, params) {
  const url = new URL(`https://api.themoviedb.org/3/${endpoint}`);
  if (credentials.kind === 'api_key') url.searchParams.set('api_key', credentials.value);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  return url;
}

async function tmdbGet(endpoint, params) {
  const url = buildUrl(endpoint, params);
  const headers = { accept: 'application/json' };
  if (credentials.kind === 'bearer') headers.Authorization = `Bearer ${credentials.value}`;

  for (let attempt = 0; attempt < 5; attempt++) {
    let response;
    try {
      response = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) });
    } catch (error) {
      if (attempt === 4) throw new Error(`TMDB network request failed for ${endpoint}: ${error.message}`);
      await delay(1000 * (attempt + 1));
      continue;
    }
    if (response.ok) return response.json();
    if ((response.status === 429 || response.status >= 500) && attempt < 4) {
      const retryAfter = Number(response.headers.get('retry-after'));
      await delay(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 15_000) : 1000 * (attempt + 1));
      continue;
    }
    // Never print a full URL: the v3 API key is a query parameter for that auth mode.
    throw new Error(`TMDB returned HTTP ${response.status} for ${endpoint}. Check your key and TMDB API access.`);
  }
  throw new Error(`TMDB request failed after retries: ${endpoint}`);
}

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function queryFor(def) {
  const params = {
    include_adult: 'false',
    page: 1,
    with_original_language: def.language.code,
    sort_by: 'popularity.desc',
    region: 'IN'
  };
  if (def.category === 'top_rated') {
    params.sort_by = 'vote_average.desc';
    params['vote_count.gte'] = 10;
  } else if (def.category === 'new') {
    params.sort_by = def.mediaKey === 'movie' ? 'primary_release_date.desc' : 'first_air_date.desc';
    params[def.mediaKey === 'movie' ? 'primary_release_date.gte' : 'first_air_date.gte'] = recentStartString;
    params[def.mediaKey === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte'] = todayString;
  } else if (def.category === 'genre') {
    params.sort_by = 'popularity.desc';
  }
  if (def.genre) params.with_genres = def.genre.id;
  if (def.mediaKey === 'movie') params.include_video = 'false';
  return params;
}

function toMeta(item, def) {
  const date = item.release_date || item.first_air_date || '';
  const names = genreNames(def.type);
  return {
    id: `tmdb:${item.id}`,
    type: def.type,
    name: item.title || item.name || item.original_title || item.original_name || 'Untitled',
    ...(item.poster_path ? { poster: `${imageBase}/w500${item.poster_path}` } : {}),
    ...(item.backdrop_path ? { background: `${imageBase}/w1280${item.backdrop_path}` } : {}),
    ...(item.overview ? { description: item.overview } : {}),
    ...(date ? { releaseInfo: date, year: Number(date.slice(0, 4)) || undefined } : {}),
    ...(Number.isFinite(Number(item.vote_average)) ? { imdbRating: Number(item.vote_average).toFixed(1) } : {}),
    genres: (item.genre_ids || []).map(id => names[id]).filter(Boolean)
  };
}

async function main() {
  // Only delete generated catalog JSON. Other public files (collection JSON, index.html) stay intact.
  fs.rmSync(catalogRoot, { recursive: true, force: true });
  fs.mkdirSync(catalogRoot, { recursive: true });
  console.log(`Building ${definitions.length} static catalogs from TMDB...`);
  let successes = 0;
  for (let i = 0; i < definitions.length; i++) {
    const def = definitions[i];
    try {
      const endpoint = def.mediaKey === 'movie' ? 'discover/movie' : 'discover/tv';
      const data = await tmdbGet(endpoint, queryFor(def));
      const response = {
        metas: (data.results || []).map(item => toMeta(item, def)),
        cacheMaxAge: 21_600,
        staleRevalidate: 86_400,
        staleError: 604_800
      };
      const outputDir = path.join(catalogRoot, def.type);
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(path.join(outputDir, `${def.id}.json`), JSON.stringify(response) + '\n', 'utf8');
      successes++;
      console.log(`[${i + 1}/${definitions.length}] ${def.title}: ${response.metas.length} items`);
      // A modest pause smooths bursts on larger catalogs and reduces 429 responses.
      await delay(120);
    } catch (error) {
      console.error(`Catalog failed (${def.id}): ${error.message}`);
      throw error;
    }
  }
  fs.writeFileSync(path.join(publicDir, '.nojekyll'), '', 'utf8');
  console.log(`Finished: ${successes}/${definitions.length} catalogs built.`);
  console.log('TMDB API credentials were not written to generated files.');
}

await main();
