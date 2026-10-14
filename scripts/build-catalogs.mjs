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
    pageSize: 60
  })),
  behaviorHints: { adult: false, configurable: true }
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
const ninetyDaysAgo = new Date(today);
ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);
const ninetyDaysAgoString = isoDate(ninetyDaysAgo);

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
      if (attempt === 4) {
        console.warn(`[TMDB Network Warning] ${endpoint}: ${error.message}`);
        return { results: [] };
      }
      await delay(1200 * (attempt + 1));
      continue;
    }
    if (response.ok) return response.json();
    if ((response.status === 429 || response.status >= 500) && attempt < 4) {
      const retryAfter = Number(response.headers.get('retry-after'));
      await delay(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 15_000) : 1500 * (attempt + 1));
      continue;
    }
    console.warn(`[TMDB Warning] HTTP ${response.status} for ${endpoint}`);
    return { results: [] };
  }
  return { results: [] };
}

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

const JUNK_TITLE_REGEX = /\b(documentary|micro documentary|docuseries|short film|short|interview|trailer|teaser|promo|press meet|super show|rave|audio launch|making of|glimpse|motion poster|behind the scenes|sneak peek)\b/i;

function isValidItem(item, def) {
  if (!item) return false;
  const title = item.title || item.name || item.original_title || item.original_name || '';
  if (!title) return false;
  if (!item.poster_path) return false;

  // 1. Check if genre is documentary (99)
  if (Array.isArray(item.genre_ids) && item.genre_ids.includes(99)) {
    if (def.category !== 'genre' || def.genre?.id !== 99) return false;
  }

  // 2. Filter out documentary, making of, or shorts from title
  if (def.category !== 'genre' || def.genre?.id !== 99) {
    if (JUNK_TITLE_REGEX.test(title)) return false;
    if (/\((documentary|short|micro documentary)\)/i.test(title)) return false;
  }

  // 3. Filter out if overview mentions documentary or making of
  const overview = (item.overview || '').toLowerCase();
  if (def.category !== 'genre' || def.genre?.id !== 99) {
    if (/\b(micro documentary|making of)\b/i.test(overview)) return false;
    if (overview.startsWith('a documentary') || overview.startsWith('documentary about')) return false;
  }

  // 4. Filter out zero-vote junk if popularity is negligible
  if ((item.vote_count ?? 0) === 0 && (item.popularity ?? 0) < 1.0) {
    return false;
  }

  return true;
}

function queryFor(def, page = 1) {
  const params = {
    include_adult: 'false',
    page,
    with_original_language: def.language.code,
    sort_by: 'popularity.desc'
  };

  if (def.type === 'movie') {
    params.include_video = 'false';
    if (def.category !== 'genre' || def.genre?.id !== 99) {
      params.without_genres = '99';
    }
  } else {
    params.without_genres = '10763,10767';
  }

  if (def.category === 'top_rated') {
    params.sort_by = 'vote_average.desc';
    params['vote_count.gte'] = 10;
  } else if (def.category === 'new') {
    params.sort_by = 'popularity.desc';
    if (def.mediaKey === 'movie') {
      params['release_date.gte'] = ninetyDaysAgoString;
      params['release_date.lte'] = todayString;
      params.with_release_type = '4';
      params.region = 'IN';
    } else {
      const seriesDays = def.language.code === 'kn' ? 180 : 90;
      const seriesStart = new Date(today);
      seriesStart.setUTCDate(seriesStart.getUTCDate() - seriesDays);
      params['first_air_date.gte'] = isoDate(seriesStart);
      params['first_air_date.lte'] = todayString;
    }
  } else if (def.category === 'genre') {
    params.sort_by = 'popularity.desc';
  }
  if (def.genre) params.with_genres = def.genre.id;
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
  fs.rmSync(catalogRoot, { recursive: true, force: true });
  fs.mkdirSync(catalogRoot, { recursive: true });
  console.log(`Building ${definitions.length} static catalogs from TMDB (expanded to ~60 items, filtered for movies & series only)...`);
  let successes = 0;
  for (let i = 0; i < definitions.length; i++) {
    const def = definitions[i];
    try {
      const endpoint = def.mediaKey === 'movie' ? 'discover/movie' : 'discover/tv';
      
      const maxPages = def.category === 'genre' ? 1 : 3;
      let rawResults = [];
      for (let p = 1; p <= maxPages; p++) {
        try {
          const data = await tmdbGet(endpoint, queryFor(def, p));
          if (Array.isArray(data.results)) {
            rawResults.push(...data.results);
          }
          if (!data.results || data.results.length < 20) break;
          await delay(100);
        } catch (e) {
          if (p === 1) break;
          break;
        }
      }

      const seenIds = new Set();
      const validItems = [];
      for (const item of rawResults) {
        if (!item || seenIds.has(item.id)) continue;
        seenIds.add(item.id);
        if (isValidItem(item, def)) {
          validItems.push(item);
        }
      }

      const response = {
        metas: validItems.map(item => toMeta(item, def)),
        cacheMaxAge: 21_600,
        staleRevalidate: 86_400,
        staleError: 604_800
      };
      const outputDir = path.join(catalogRoot, def.type);
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(path.join(outputDir, `${def.id}.json`), JSON.stringify(response) + '\n', 'utf8');
      successes++;
      console.log(`[${i + 1}/${definitions.length}] ${def.title}: ${response.metas.length} items`);
      await delay(120);
    } catch (error) {
      console.error(`Catalog failed (${def.id}): ${error.message}`);
      const outputDir = path.join(catalogRoot, def.type);
      fs.mkdirSync(outputDir, { recursive: true });
      fs.writeFileSync(path.join(outputDir, `${def.id}.json`), JSON.stringify({ metas: [], cacheMaxAge: 3600 }) + '\n', 'utf8');
    }
  }
  fs.writeFileSync(path.join(publicDir, '.nojekyll'), '', 'utf8');
  console.log(`Finished: ${successes}/${definitions.length} catalogs built.`);
  console.log('TMDB API credentials were not written to generated files.');
}

await main();
