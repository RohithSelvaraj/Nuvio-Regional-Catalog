import fs from 'node:fs';
import path from 'node:path';
import { ROOT, getTmdbCredentials, DEFAULT_TMDB_API_KEY } from './config.mjs';
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

function buildUrl(baseDomain, endpoint, params) {
  const url = new URL(`https://${baseDomain}/3/${endpoint}`);
  if (credentials.kind === 'api_key') url.searchParams.set('api_key', credentials.value);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  return url;
}

async function tmdbGet(endpoint, params) {
  // Use api.tmdb.org as primary (not blocked by Indian ISPs), fallback to api.themoviedb.org
  const domains = ['api.tmdb.org', 'api.themoviedb.org'];
  const headers = {
    accept: 'application/json',
    'Connection': 'close',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  };
  if (credentials.kind === 'bearer') headers.Authorization = `Bearer ${credentials.value}`;

  for (let attempt = 0; attempt < 4; attempt++) {
    const domain = domains[attempt % domains.length];
    const url = buildUrl(domain, endpoint, params);
    try {
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
      if (response.ok) return await response.json();
      if (response.status === 401 && credentials.value !== DEFAULT_TMDB_API_KEY) {
        console.warn(`[TMDB Auth Warning] Key returned 401. Retrying with default API key...`);
        credentials.kind = 'api_key';
        credentials.value = DEFAULT_TMDB_API_KEY;
        delete headers.Authorization;
        continue;
      }
      if ((response.status === 429 || response.status >= 500) && attempt < 3) {
        const retryAfter = Number(response.headers.get('retry-after'));
        await delay(Number.isFinite(retryAfter) && retryAfter > 0 ? Math.min(retryAfter * 1000, 10_000) : 1000 * (attempt + 1));
        continue;
      }
      console.warn(`[TMDB Warning] HTTP ${response.status} for ${endpoint} on ${domain}`);
    } catch (error) {
      if (attempt === 3) {
        console.warn(`[TMDB Network Warning] ${endpoint}: ${error.message}`);
        return { results: [] };
      }
      await delay(800 * (attempt + 1));
    }
  }
  return { results: [] };
}

function delay(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

function isValidItem(item, def) {
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
  if (item.original_language && def.language?.code) {
    if (item.original_language !== def.language.code) return false;
  }

  // 5. Runtime check for movies (exclude < 60 mins)
  if (def.type === 'movie' && item.runtime && item.runtime > 0 && item.runtime < 60) {
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
    if (def.category !== 'genre' || def.genre?.id !== 99) return false;
  }

  // 9. Reality / Talk / Soap TV genres (10764, 10767, 10766)
  if (Array.isArray(item.genre_ids) && (item.genre_ids.includes(10764) || item.genre_ids.includes(10767) || item.genre_ids.includes(10766))) {
    if (def.category !== 'genre' || (def.genre && ![10764, 10767, 10766].includes(def.genre.id))) return false;
  }

  // 10. Promotional, YouTube, Short Film, Spoof, Stand-up and compilation blacklisting
  if (def.category !== 'genre' || def.genre?.id !== 99) {
    if (JUNK_PROMO_REGEX.test(title)) return false;
    if (JUNK_PROMO_REGEX.test(overview)) return false;
    if (/\((documentary|short|micro documentary|short film)\)/i.test(title)) return false;
  }

  // 11. Adult Keyword Blacklisting & Studio Whitelisting
  const textToCheck = `${title} ${overview}`;
  if (ADULT_KEYWORD_REGEX.test(textToCheck)) {
    // Check if whitelisted mainstream studio/cast in Action/Thriller/Crime genre
    const hasAllowedGenre = Array.isArray(item.genre_ids) && item.genre_ids.some(id => [28, 53, 80].includes(id));
    const isWhitelisted = WHITELIST_STUDIOS_CAST.test(textToCheck);
    if (!isWhitelisted || !hasAllowedGenre) {
      return false;
    }
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
    params.without_genres = '10763,10764,10766,10767';
  }

  if (def.category === 'top_rated') {
    params.sort_by = 'vote_average.desc';
    params['vote_count.gte'] = 8;
  } else if (def.category === 'new') {
    params.sort_by = 'popularity.desc';
    if (def.mediaKey === 'movie') {
      params['release_date.gte'] = ninetyDaysAgoString;
      params['release_date.lte'] = todayString;
      params.with_release_type = '4'; // Digital OTT Release in India
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
  fs.mkdirSync(catalogRoot, { recursive: true });
  console.log(`Building ${definitions.length} static catalogs from TMDB (~60 items per catalog, filtered for high-quality regional movies & series)...`);
  let successes = 0;

  for (let i = 0; i < definitions.length; i++) {
    const def = definitions[i];
    const outputDir = path.join(catalogRoot, def.type);
    fs.mkdirSync(outputDir, { recursive: true });
    const targetFile = path.join(outputDir, `${def.id}.json`);

    try {
      const endpoint = def.mediaKey === 'movie' ? 'discover/movie' : 'discover/tv';
      const maxPages = def.category === 'genre' ? 2 : 3;
      let rawResults = [];

      for (let p = 1; p <= maxPages; p++) {
        try {
          const data = await tmdbGet(endpoint, queryFor(def, p));
          if (Array.isArray(data.results)) {
            rawResults.push(...data.results);
          }
          if (!data.results || data.results.length < 20) break;
          await delay(80);
        } catch {
          if (p === 1) break;
          break;
        }
      }

      // If OTT release query returns few items, fallback to recent Indian theatrical releases
      if (def.category === 'new' && def.mediaKey === 'movie' && rawResults.length < 8) {
        try {
          const fallbackParams = {
            include_adult: 'false',
            page: 1,
            with_original_language: def.language.code,
            sort_by: 'popularity.desc',
            'release_date.gte': ninetyDaysAgoString,
            'release_date.lte': todayString,
            region: 'IN'
          };
          const fallbackData = await tmdbGet(endpoint, fallbackParams);
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
        if (isValidItem(item, def)) {
          validItems.push(item);
        }
      }

      if (validItems.length > 0 || !fs.existsSync(targetFile)) {
        const response = {
          metas: validItems.map(item => toMeta(item, def)),
          cacheMaxAge: 21_600,
          staleRevalidate: 86_400,
          staleError: 604_800
        };
        fs.writeFileSync(targetFile, JSON.stringify(response) + '\n', 'utf8');
        successes++;
        console.log(`[${i + 1}/${definitions.length}] ${def.title}: ${response.metas.length} items`);
      } else {
        console.log(`[${i + 1}/${definitions.length}] Preserved existing catalog for ${def.title} (live query returned 0 items)`);
        successes++;
      }
      await delay(80);
    } catch (error) {
      console.error(`Catalog failed (${def.id}): ${error.message}`);
      if (!fs.existsSync(targetFile)) {
        fs.writeFileSync(targetFile, JSON.stringify({ metas: [], cacheMaxAge: 3600 }) + '\n', 'utf8');
      }
    }
  }

  fs.writeFileSync(path.join(publicDir, '.nojekyll'), '', 'utf8');
  console.log(`Finished: ${successes}/${definitions.length} catalogs processed successfully.`);
}

await main();
