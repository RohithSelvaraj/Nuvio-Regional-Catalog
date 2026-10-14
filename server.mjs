import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, getTmdbCredentials, DEFAULT_TMDB_API_KEY } from './scripts/config.mjs';
import {
  ADDON_ID,
  ADDON_NAME,
  ADDON_VERSION,
  LANGUAGES,
  ALL_LANGUAGES,
  MOVIE_GENRES,
  SERIES_GENRES,
  genreNames,
  parseConfig,
  createFilteredCatalogDefinitions
} from './scripts/catalog-spec.mjs';

const app = express();
app.use(cors());
app.use(express.json());

const imageBase = 'https://image.tmdb.org/t/p';
const memoryCache = new Map();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Comprehensive Adult & Explicit Keyword Blacklist
const ADULT_KEYWORDS = [
  'nudity', 'full frontal nudity', 'partial nudity', 'female nudity', 'male nudity', 'explicit nudity', 'graphic nudity',
  'sexual content', 'explicit sexual content', 'sex scene', 'erotica', 'erotic thriller', 'erotic drama', 'erotic romance',
  'softcore', 'softcore porn', 'hardcore', 'hardcore pornography', 'pornography', 'pornographic', 'bdsm', 'fetish',
  'sensual', 'steamy', 'lust', 'seduction', 'seductive', 'infidelity', 'adultery', 'extramarital affair',
  'voyeurism', 'voyeuristic', 'peeping tom', 'stripper', 'strip club', 'striptease', 'lap dance', 'pole dancing',
  'escort', 'call girl', 'prostitution', 'brothel', 'red-light district', 'sex worker', 'gigolo', 'one-night stand',
  'casual sex', 'threesome', 'menage a trois', 'group sex', 'orgy', 'swingers', 'swapping', 'exhibitionism',
  'bathing scene', 'shower scene', 'skin show', 'cleavage', 'topless', 'bottomless', 'underwear', 'lingerie',
  'lingerie model', 'boudoir', 'bedroom scene', 'intimate scenes', 'passionate lovemaking', 'steamy romance',
  'carnal desire', 'physical intimacy', 'honey trap', 'femme fatale', 'sleaze', 'b-grade romance', 'c-grade erotica',
  'midnight movie', 'adult film', 'adult content', 'adult web series', 'ott erotica', 'provocative', 'sensuous', 'sexy',
  'sexpionage', 'cybersex', 'sexting', 'mms leak', 'hidden camera', 'honeytrap sting', 'sex addiction', 'nymphomania',
  'nymphomaniac', 'erotic literature', 'taboo relationship', 'forbidden desire', 'temptation', 'lusty', 'uncensored sex',
  'steamy scenes', 'adult romance'
];

const ADULT_KEYWORD_REGEX = new RegExp('\\b(' + ADULT_KEYWORDS.map(k => k.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|') + ')\\b', 'i');

// Promotional, short-form, YouTube, spoof, compilation and amateur tags
const JUNK_PROMO_REGEX = /\b(youtube|trailer|teaser|promo|making of|press meet|audio launch|glimpse|motion poster|behind the scenes|sneak peek|interview|b-roll|raw footage|lyrical video|song video|video album|music video|spoof|parody|b-movie|c-grade|trash|stand-up comedy|stand up|standup comedy|vlog|podcast|talk show|game show|reality show|serial|soap opera|mega serial|daily serial|webisode|episode\s*\d+|compilation|best scenes|comedy scenes|award show|awards\s*\d+|filmfare|siima|red carpet|short film|short films|micro film|shorts|documentary short|stage play|theatrical play|live theater|fan-dub|fandub|fan edit|fan-made|unofficial cut|video game|walkthrough|camrip|hdcam|telesync|tsrip|student film|unreleased|leaked|clickbait|must watch|1080p full movie)\b/i;

// Major Recognized Studios, Directors and Actors Whitelist for edge cases (e.g., Censor 'A' action blockbusters)
const WHITELIST_STUDIOS_CAST = /\b(lyca|sun pictures|red giant|ags entertainment|dream warrior|studio green|2d entertainment|raaj kamal|sivakarthikeyan productions|wunderbar|vels film|madras talkies|sathya jyothi|prince pictures|sri venkateswara|mythri movie|hombale|geetha arts|dvv entertainment|haarika|vyjayanthi|suresh productions|sitara|people media factory|uv creations|annapurna|konidela|aashirvad|wayfarer|mammootty kampany|fahadh faasil|bhavana studios|sree gokulam|krg studios|rockline|yash raj|dharma|red chillies|nadiadwala|excel entertainment|jio studios|t-series|zee studios|rajinikanth|kamal haasan|vijay|ajith|suriya|vikram|dhanush|karthi|sivakarthikeyan|vijay sethupathi|prabhas|allu arjun|mahesh babu|jr ntr|ram charan|pawan kalyan|chiranjeevi|nani|mohanlal|mammootty|prithviraj|tovino|dulquer|yash|rishab shetty|rakshit shetty|sudeep|shah rukh|salman|aamir|hrithik|ranbir)\b/i;

function getCached(key) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key, data) {
  if (memoryCache.size > 1500) {
    const oldestKey = memoryCache.keys().next().value;
    memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, { timestamp: Date.now(), data });
}

function toMeta(item, type) {
  const date = item.release_date || item.first_air_date || '';
  const names = genreNames(type);
  return {
    id: `tmdb:${item.id}`,
    type,
    name: item.title || item.name || item.original_title || item.original_name || 'Untitled',
    ...(item.poster_path ? { poster: `${imageBase}/w500${item.poster_path}` } : {}),
    ...(item.backdrop_path ? { background: `${imageBase}/w1280${item.backdrop_path}` } : {}),
    ...(item.overview ? { description: item.overview } : {}),
    ...(date ? { releaseInfo: date, year: Number(date.slice(0, 4)) || undefined } : {}),
    ...(Number.isFinite(Number(item.vote_average)) ? { imdbRating: Number(item.vote_average).toFixed(1) } : {}),
    genres: (item.genre_ids || []).map(id => names[id]).filter(Boolean)
  };
}

async function tmdbFetch(endpoint, params, credentials) {
  const domains = ['api.tmdb.org', 'api.themoviedb.org'];
  const headers = {
    accept: 'application/json',
    'Connection': 'close',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  };
  if (credentials?.kind === 'bearer') headers.Authorization = `Bearer ${credentials.value}`;

  for (let attempt = 0; attempt < 4; attempt++) {
    const domain = domains[attempt % domains.length];
    const url = new URL(`https://${domain}/3/${endpoint}`);
    if (credentials?.kind === 'api_key') url.searchParams.set('api_key', credentials.value);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
    }

    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(12_000) });
      if (response.ok) return await response.json();
      if (response.status === 401 && credentials?.value !== DEFAULT_TMDB_API_KEY) {
        credentials.kind = 'api_key';
        credentials.value = DEFAULT_TMDB_API_KEY;
        delete headers.Authorization;
        continue;
      }
      if ((response.status === 429 || response.status >= 500) && attempt < 3) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      throw new Error(`TMDB responded with HTTP ${response.status}`);
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
    }
  }
  throw new Error('TMDB request failed after retries');
}

function isValidItem(item, type, category, genreId, langCode) {
  if (!item || !item.id) return false;
  const title = item.title || item.name || item.original_title || item.original_name || '';
  if (!title) return false;

  // 1. Must have high quality poster
  if (!item.poster_path) return false;

  // 2. Primary Adult Flagging: instantly drop adult/softcore
  if (item.adult === true || item.softcore === true) return false;

  // 3. Synopsis / Description presence requirement
  const overview = (item.overview || '').trim();
  if (overview.length < 15) return false;

  // 4. Primary regional language matching (Tamil, Telugu, Malayalam, Kannada, Hindi)
  if (item.original_language && langCode) {
    if (item.original_language !== langCode) return false;
  }

  // 5. Runtime check for movies (exclude < 60 mins)
  if (type === 'movie' && item.runtime && item.runtime > 0 && item.runtime < 60) {
    return false;
  }

  // 6. User rating threshold: filter out C-grade films with low ratings
  if (item.vote_count >= 5 && item.vote_average < 4.0) {
    return false;
  }

  // 7. Obscurity threshold: weed out zero-review amateur/indie uploads
  if ((item.vote_count ?? 0) === 0 && (item.popularity ?? 0) < 1.5) {
    return false;
  }

  // 8. Documentary (99) handling
  if (Array.isArray(item.genre_ids) && item.genre_ids.includes(99)) {
    if (category !== 'genre' || genreId !== 99) return false;
  }

  // 9. Reality / Talk / Soap TV genres (10764, 10767, 10766)
  if (Array.isArray(item.genre_ids) && (item.genre_ids.includes(10764) || item.genre_ids.includes(10767) || item.genre_ids.includes(10766))) {
    if (category !== 'genre' || ![10764, 10767, 10766].includes(genreId)) return false;
  }

  // 10. Promotional, YouTube, Short Film, Spoof, Stand-up and compilation blacklisting
  if (category !== 'genre' || genreId !== 99) {
    if (JUNK_PROMO_REGEX.test(title)) return false;
    if (JUNK_PROMO_REGEX.test(overview)) return false;
    if (/\((documentary|short|micro documentary|short film)\)/i.test(title)) return false;
  }

  // 11. Adult Keyword Blacklisting & Studio Whitelisting
  const textToCheck = `${title} ${overview}`;
  if (ADULT_KEYWORD_REGEX.test(textToCheck)) {
    const hasAllowedGenre = Array.isArray(item.genre_ids) && item.genre_ids.some(id => [28, 53, 80].includes(id));
    const isWhitelisted = WHITELIST_STUDIOS_CAST.test(textToCheck);
    if (!isWhitelisted || !hasAllowedGenre) {
      return false;
    }
  }

  return true;
}

async function resolveCatalog(type, catalogIdStr, config) {
  const providersKey = config.providers?.sort().join(',') || 'all';
  const cacheKey = `${type}:${catalogIdStr}:${providersKey}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const credentials = getTmdbCredentials();
  if (credentials) {
    try {
      const parts = catalogIdStr.split('.');
      if (parts[0] === 'regional' && parts[1] === type) {
        const langCode = parts[2];
        const category = parts[3];
        const genreId = parts[4] ? Number(parts[4]) : null;

        const today = new Date();
        const isoDate = d => d.toISOString().slice(0, 10);
        const todayString = isoDate(today);
        const ninetyDaysAgo = new Date(today);
        ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90);
        const ninetyDaysAgoString = isoDate(ninetyDaysAgo);

        const endpoint = type === 'movie' ? 'discover/movie' : 'discover/tv';
        const baseParams = {
          include_adult: 'false',
          with_original_language: langCode,
          sort_by: 'popularity.desc'
        };

        if (type === 'movie') {
          baseParams.include_video = 'false';
          if (category !== 'genre' || genreId !== 99) {
            baseParams.without_genres = '99';
          }
        } else {
          baseParams.without_genres = '10763,10764,10766,10767';
        }

        if (category === 'top_rated') {
          baseParams.sort_by = 'vote_average.desc';
          baseParams['vote_count.gte'] = 8;
        } else if (category === 'new') {
          baseParams.sort_by = 'popularity.desc';
          if (type === 'movie') {
            baseParams['release_date.gte'] = ninetyDaysAgoString;
            baseParams['release_date.lte'] = todayString;
            baseParams.with_release_type = '4'; // Digital OTT Release in India
            baseParams.region = 'IN';
          } else {
            const seriesDays = langCode === 'kn' ? 180 : 90;
            const seriesStart = new Date(today);
            seriesStart.setUTCDate(seriesStart.getUTCDate() - seriesDays);
            baseParams['first_air_date.gte'] = isoDate(seriesStart);
            baseParams['first_air_date.lte'] = todayString;
          }
        } else if (category === 'genre') {
          baseParams.sort_by = 'popularity.desc';
        }

        if (genreId) baseParams.with_genres = genreId;

        if (config.providers && config.providers.length > 0) {
          baseParams.with_watch_providers = config.providers.join('|');
          baseParams.watch_region = 'IN';
        }

        const maxPages = category === 'genre' ? 2 : 3;
        let rawResults = [];
        for (let p = 1; p <= maxPages; p++) {
          try {
            const pageData = await tmdbFetch(endpoint, { ...baseParams, page: p }, credentials);
            if (Array.isArray(pageData.results)) {
              rawResults.push(...pageData.results);
            }
            if (!pageData.results || pageData.results.length < 20) break;
          } catch (e) {
            if (p === 1) throw e;
            break;
          }
        }

        // If OTT release query returns few items, fallback to recent Indian theatrical releases
        if (category === 'new' && type === 'movie' && rawResults.length < 8) {
          try {
            const fallbackParams = {
              ...baseParams,
              page: 1,
              'release_date.gte': ninetyDaysAgoString,
              'release_date.lte': todayString,
              region: 'IN'
            };
            delete fallbackParams.with_release_type;
            const fallbackData = await tmdbFetch(endpoint, fallbackParams, credentials);
            if (Array.isArray(fallbackData.results)) {
              rawResults.push(...fallbackData.results);
            }
          } catch {}
        }

        const seenIds = new Set();
        const validItems = [];
        for (const item of rawResults) {
          if (!item || seenIds.has(item.id)) continue;
          seenIds.add(item.id);
          if (isValidItem(item, type, category, genreId, langCode)) {
            validItems.push(item);
          }
        }

        if (validItems.length > 0) {
          const result = {
            metas: validItems.map(item => toMeta(item, type)),
            cacheMaxAge: 21_600,
            staleRevalidate: 86_400,
            staleError: 604_800
          };
          setCached(cacheKey, result);
          return result;
        }
      }
    } catch (err) {
      console.warn(`[TMDB Live Fetch] Fallback triggered for ${catalogIdStr}: ${err.message}`);
    }
  }

  // Fallback to static bundled catalog file
  const localFile = path.join(ROOT, 'public', 'catalog', type, `${catalogIdStr}.json`);
  if (fs.existsSync(localFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(localFile, 'utf8'));
      if (Array.isArray(data.metas) && data.metas.length > 0) {
        setCached(cacheKey, data);
        return data;
      }
    } catch (e) {
      console.warn(`[Static Catalog Error] Could not read ${localFile}:`, e.message);
    }
  }

  return { metas: [], cacheMaxAge: 3600 };
}

function buildManifest(configStr = '', queryObj = {}) {
  // Merge path config with query params
  const config = parseConfig(configStr);
  const queryConfig = parseConfig(queryObj);
  const mergedConfig = { ...config, ...queryConfig };
  if (config.languages && queryConfig.languages) {
    mergedConfig.languages = Array.from(new Set([...config.languages, ...queryConfig.languages]));
  }
  if (config.genres && queryConfig.genres) {
    mergedConfig.genres = Array.from(new Set([...config.genres, ...queryConfig.genres]));
  }
  if (config.providers && queryConfig.providers) {
    mergedConfig.providers = Array.from(new Set([...config.providers, ...queryConfig.providers]));
  }

  const definitions = createFilteredCatalogDefinitions(mergedConfig);

  let dynamicName = ADDON_NAME;
  let dynamicDesc = 'Regional movie and series discovery for Indian regional languages, powered by TMDB.';

  if (mergedConfig.languages && mergedConfig.languages.length > 0) {
    const langNames = mergedConfig.languages
      .map(c => ALL_LANGUAGES.find(l => l.code === c)?.name || c)
      .join(', ');
    dynamicName = `${ADDON_NAME} (${langNames})`;
    dynamicDesc = `Personalized discovery for ${langNames} movies and TV series.`;
  }

  return {
    id: ADDON_ID,
    version: ADDON_VERSION,
    name: dynamicName,
    description: dynamicDesc,
    resources: ['catalog'],
    types: mergedConfig.types?.length ? mergedConfig.types : ['movie', 'series'],
    idPrefixes: ['tmdb:'],
    catalogs: definitions.map(def => ({
      type: def.type,
      id: def.id,
      name: def.title,
      pageSize: 60
    })),
    behaviorHints: {
      adult: false,
      configurable: true,
      configurationRequired: false
    }
  };
}

// 1. Healthcheck
app.get('/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime(), version: ADDON_VERSION }));
app.get('/status', (req, res) => res.json({ status: 'ok', uptime: process.uptime(), version: ADDON_VERSION }));

// 2. Configuration Page UI
const configureHtmlPath = path.join(ROOT, 'public', 'configure.html');
function serveConfigure(req, res) {
  if (fs.existsSync(configureHtmlPath)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.sendFile(configureHtmlPath);
  }
  res.redirect('/manifest.json');
}

app.get('/configure', serveConfigure);
app.get('/:config/configure', serveConfigure);

// 3. Manifest Endpoints
app.get('/manifest.json', (req, res) => {
  const manifest = buildManifest('', req.query);
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  res.json(manifest);
});

app.get('/:config/manifest.json', (req, res) => {
  const manifest = buildManifest(req.params.config, req.query);
  res.setHeader('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400');
  res.json(manifest);
});

// 4. Catalog Endpoints
async function handleCatalog(req, res) {
  const { config = '', type, id } = req.params;
  const cleanId = id.replace(/\.json$/, '');
  const parsedConfig = { ...parseConfig(config), ...parseConfig(req.query) };

  try {
    const catalogData = await resolveCatalog(type, cleanId, parsedConfig);
    res.setHeader('Cache-Control', 'public, max-age=21600, stale-while-revalidate=86400');
    return res.json(catalogData);
  } catch (err) {
    console.error(`Error handling catalog ${type}/${cleanId}:`, err);
    return res.status(200).json({ metas: [] });
  }
}

app.get('/catalog/:type/:id.json', handleCatalog);
app.get('/catalog/:type/:id/:extra.json', handleCatalog);
app.get('/:config/catalog/:type/:id.json', handleCatalog);
app.get('/:config/catalog/:type/:id/:extra.json', handleCatalog);

// 5. Collections JSON Endpoints
const collectionsFilePath = path.join(ROOT, 'collections.json');
function handleCollections(req, res) {
  const config = { ...parseConfig(req.params.config || ''), ...parseConfig(req.query) };
  if (!fs.existsSync(collectionsFilePath)) {
    return res.status(404).json({ error: 'collections.json not found' });
  }

  try {
    const allCollections = JSON.parse(fs.readFileSync(collectionsFilePath, 'utf8'));
    if (!config.languages || config.languages.length === 0 || config.languages.length >= 4) {
      res.setHeader('Content-Type', 'application/json');
      return res.json(allCollections);
    }

    const langCodeToTitleKey = {
      ta: 'tamil',
      te: 'telugu',
      ml: 'malayalam',
      kn: 'kannada'
    };

    const selectedKeys = new Set(config.languages.map(c => langCodeToTitleKey[c]).filter(Boolean));
    const filtered = allCollections.filter(c => {
      if (c.id === 'regional.south-indian') return true;
      const idLower = c.id.toLowerCase();
      return Array.from(selectedKeys).some(k => idLower.includes(k));
    });

    res.setHeader('Content-Type', 'application/json');
    return res.json(filtered);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to read collections' });
  }
}

app.get('/collections.json', handleCollections);
app.get('/:config/collections.json', handleCollections);

// 6. Serve static files from public (css, icons, etc.)
app.use(express.static(path.join(ROOT, 'public')));

// 7. Root Route: Show configure page if browser, or manifest if requested as JSON
app.get('/', (req, res) => {
  const accept = req.headers.accept || '';
  if (accept.includes('text/html')) {
    return serveConfigure(req, res);
  }
  const manifest = buildManifest('', req.query);
  res.json(manifest);
});

// Export app for serverless platforms like Vercel
export default app;

// Listen if run directly
const isMain = process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url;
if (isMain || process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\n🚀 Nuvio Regional Catalog server running!`);
    console.log(`   Configurator: http://localhost:${PORT}/configure`);
    console.log(`   Manifest:     http://localhost:${PORT}/manifest.json`);
    console.log(`   Healthcheck:  http://localhost:${PORT}/health\n`);
  });
}
