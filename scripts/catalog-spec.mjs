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
