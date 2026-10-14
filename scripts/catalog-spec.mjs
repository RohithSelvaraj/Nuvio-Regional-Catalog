export const ADDON_ID = 'org.nuvio.regionalcatalog';
export const ADDON_NAME = 'Nuvio Regional Catalog';
export const ADDON_VERSION = '1.0.0';

export const LANGUAGES = [
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', emoji: '🟠' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', emoji: '🟣' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', emoji: '🟢' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', emoji: '🔵' }
];

export const MOVIE_GENRES = [
  { id: 28, name: 'Action' },
  { id: 12, name: 'Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 14, name: 'Fantasy' },
  { id: 36, name: 'History' },
  { id: 27, name: 'Horror' },
  { id: 10402, name: 'Music' },
  { id: 9648, name: 'Mystery' },
  { id: 10749, name: 'Romance' },
  { id: 878, name: 'Science Fiction' },
  { id: 53, name: 'Thriller' },
  { id: 10752, name: 'War' },
  { id: 37, name: 'Western' }
];

export const SERIES_GENRES = [
  { id: 10759, name: 'Action & Adventure' },
  { id: 16, name: 'Animation' },
  { id: 35, name: 'Comedy' },
  { id: 80, name: 'Crime' },
  { id: 99, name: 'Documentary' },
  { id: 18, name: 'Drama' },
  { id: 10751, name: 'Family' },
  { id: 10762, name: 'Kids' },
  { id: 9648, name: 'Mystery' },
  { id: 10763, name: 'News' },
  { id: 10764, name: 'Reality' },
  { id: 10765, name: 'Sci-Fi & Fantasy' },
  { id: 10766, name: 'Soap' },
  { id: 10767, name: 'Talk' },
  { id: 10768, name: 'War & Politics' },
  { id: 37, name: 'Western' }
];

const TYPE_INFO = {
  movie: { mediaKey: 'movie', plural: 'Movies', dateField: 'release_date' },
  series: { mediaKey: 'tv', plural: 'Series', dateField: 'first_air_date' }
};

export function catalogId(type, languageCode, category, genreId = null) {
  return genreId == null
    ? `regional.${type}.${languageCode}.${category}`
    : `regional.${type}.${languageCode}.genre.${genreId}`;
}

export function createCatalogDefinitions() {
  const definitions = [];
  for (const language of LANGUAGES) {
    for (const type of ['movie', 'series']) {
      const typeInfo = TYPE_INFO[type];
      for (const category of ['popular', 'top_rated', 'new']) {
        const categoryName = {
          popular: 'Popular',
          top_rated: 'Top Rated',
          new: type === 'movie' ? 'Recently OTT Released' : 'Recently Released'
        }[category];
        definitions.push({
          id: catalogId(type, language.code, category),
          type,
          mediaKey: typeInfo.mediaKey,
          language,
          category,
          genre: null,
          title: type === 'movie' && category === 'new'
            ? `${language.name} · Recently OTT Released Movies`
            : `${language.name} · ${categoryName} ${typeInfo.plural}`,
          dateField: typeInfo.dateField
        });
      }
      const genres = type === 'movie' ? MOVIE_GENRES : SERIES_GENRES;
      for (const genre of genres) {
        definitions.push({
          id: catalogId(type, language.code, 'genre', genre.id),
          type,
          mediaKey: typeInfo.mediaKey,
          language,
          category: 'genre',
          genre,
          title: `${language.name} · ${genre.name} ${typeInfo.plural}`,
          dateField: typeInfo.dateField
        });
      }
    }
  }
  return definitions;
}

export function genreNames(type) {
  return Object.fromEntries((type === 'movie' ? MOVIE_GENRES : SERIES_GENRES).map(g => [g.id, g.name]));
}

export const ALL_LANGUAGES = [
  ...LANGUAGES,
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', emoji: '🟡' }
];

export const OTT_PROVIDERS = [
  { id: 8, key: 'netflix', name: 'Netflix', color: '#E50914' },
  { id: 119, key: 'prime', name: 'Prime Video', color: '#00A8E1' },
  { id: 122, key: 'hotstar', name: 'Disney+ Hotstar', color: '#13357B' },
  { id: 232, key: 'zee5', name: 'Zee5', color: '#7B2CBF' },
  { id: 237, key: 'sonyliv', name: 'Sony LIV', color: '#FF4500' },
  { id: 220, key: 'jiocinema', name: 'JioCinema', color: '#D80064' },
  { id: 532, key: 'aha', name: 'Aha', color: '#FF4D00' },
  { id: 309, key: 'sunnxt', name: 'Sun NXT', color: '#FDB813' }
];

export function parseConfig(input) {
  if (!input) return {};
  let query = {};
  if (typeof input === 'object') {
    query = input;
  } else if (typeof input === 'string') {
    const trimmed = decodeURIComponent(input.trim());
    if (!trimmed) return {};

    if (trimmed.startsWith('c=')) {
      try {
        const decoded = Buffer.from(trimmed.slice(2), 'base64').toString('utf8');
        return JSON.parse(decoded);
      } catch {}
    } else if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        return JSON.parse(trimmed);
      } catch {}
    }

    if (!trimmed.includes('=')) {
      const parts = trimmed.toLowerCase().split(/[-_,+&]/).map(s => s.trim()).filter(Boolean);
      const nameToCode = {
        tamil: 'ta', ta: 'ta',
        telugu: 'te', te: 'te',
        malayalam: 'ml', ml: 'ml',
        kannada: 'kn', kn: 'kn',
        hindi: 'hi', hi: 'hi'
      };
      const langs = [];
      const types = [];
      const cats = [];
      for (const p of parts) {
        if (nameToCode[p]) langs.push(nameToCode[p]);
        else if (p === 'movie' || p === 'movies') types.push('movie');
        else if (p === 'series') types.push('series');
        else if (p === 'popular') cats.push('popular');
        else if (p === 'top' || p === 'top_rated' || p === 'toprated') cats.push('top_rated');
        else if (p === 'new' || p === 'latest' || p === 'recent' || p === 'ott') cats.push('new');
      }
      if (langs.length) query.lang = Array.from(new Set(langs)).join(',');
      if (types.length) query.types = Array.from(new Set(types)).join(',');
      if (cats.length) query.cats = Array.from(new Set(cats)).join(',');
    } else {
      const normalized = trimmed.replace(/[;|]/g, '&');
      const params = new URLSearchParams(normalized);
      for (const [k, v] of params.entries()) {
        query[k.toLowerCase()] = v;
      }
    }
  }

  const result = {};

  const langVal = query.lang || query.languages;
  if (langVal && langVal !== 'all') {
    const rawList = langVal.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const codes = new Set();
    const nameToCode = {
      tamil: 'ta', ta: 'ta',
      telugu: 'te', te: 'te',
      malayalam: 'ml', ml: 'ml',
      kannada: 'kn', kn: 'kn',
      hindi: 'hi', hi: 'hi'
    };
    for (const item of rawList) {
      if (nameToCode[item]) codes.add(nameToCode[item]);
    }
    if (codes.size > 0) result.languages = Array.from(codes);
  }

  const typeVal = query.type || query.types;
  if (typeVal && typeVal !== 'all') {
    const types = typeVal.split(',').map(s => s.trim().toLowerCase()).filter(s => s === 'movie' || s === 'series');
    if (types.length > 0) result.types = types;
  }

  const catVal = query.category || query.categories || query.cats;
  if (catVal && catVal !== 'all') {
    const cats = catVal.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    if (cats.length > 0) result.categories = cats;
  }

  const genreVal = query.genre || query.genres;
  if (genreVal && genreVal !== 'all') {
    const rawGenres = genreVal.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const genreIds = [];
    for (const g of rawGenres) {
      const num = Number(g);
      if (Number.isFinite(num) && num > 0) {
        genreIds.push(num);
      } else {
        const match = [...MOVIE_GENRES, ...SERIES_GENRES].find(item => item.name.toLowerCase() === g);
        if (match) genreIds.push(match.id);
      }
    }
    if (genreIds.length > 0) result.genres = Array.from(new Set(genreIds));
  }

  const ottVal = query.ott || query.providers || query.provider || query.watch;
  if (ottVal && ottVal !== 'all' && ottVal !== 'none') {
    const rawOtt = ottVal.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const providerIds = [];
    const keyToId = Object.fromEntries(OTT_PROVIDERS.map(p => [p.key, p.id]));
    for (const item of rawOtt) {
      const num = Number(item);
      if (Number.isFinite(num) && num > 0) {
        providerIds.push(num);
      } else if (keyToId[item]) {
        providerIds.push(keyToId[item]);
      }
    }
    if (providerIds.length > 0) result.providers = Array.from(new Set(providerIds));
  }

  return result;
}

export function createFilteredCatalogDefinitions(config = {}) {
  const hasLang = Array.isArray(config.languages) && config.languages.length > 0;
  const hasTypes = Array.isArray(config.types) && config.types.length > 0;
  const hasCats = Array.isArray(config.categories) && config.categories.length > 0;
  const hasGenres = Array.isArray(config.genres) && config.genres.length > 0;

  if (!hasLang && !hasTypes && !hasCats && !hasGenres) {
    return createCatalogDefinitions();
  }

  const selectedLangs = hasLang
    ? ALL_LANGUAGES.filter(l => config.languages.includes(l.code))
    : LANGUAGES;

  const selectedTypes = hasTypes ? config.types : ['movie', 'series'];
  const definitions = [];

  for (const language of selectedLangs) {
    for (const type of selectedTypes) {
      const typeInfo = TYPE_INFO[type];
      if (!typeInfo) continue;

      const categoriesToCheck = hasCats
        ? ['popular', 'top_rated', 'new'].filter(c => config.categories.includes(c))
        : ['popular', 'top_rated', 'new'];

      for (const category of categoriesToCheck) {
        const categoryName = {
          popular: 'Popular',
          top_rated: 'Top Rated',
          new: 'Latest'
        }[category];
        definitions.push({
          id: catalogId(type, language.code, category),
          type,
          mediaKey: typeInfo.mediaKey,
          language,
          category,
          genre: null,
          title: `${language.name} · ${categoryName} ${typeInfo.plural}`,
          dateField: typeInfo.dateField
        });
      }

      if (!hasCats || config.categories.includes('genre')) {
        const genres = type === 'movie' ? MOVIE_GENRES : SERIES_GENRES;
        for (const genre of genres) {
          if (hasGenres && !config.genres.includes(genre.id)) {
            continue;
          }
          definitions.push({
            id: catalogId(type, language.code, 'genre', genre.id),
            type,
            mediaKey: typeInfo.mediaKey,
            language,
            category: 'genre',
            genre,
            title: `${language.name} · ${genre.name} ${typeInfo.plural}`,
            dateField: typeInfo.dateField
          });
        }
      }
    }
  }
  return definitions;
}

