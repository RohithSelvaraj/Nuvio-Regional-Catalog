import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './config.mjs';
import { ADDON_ID, LANGUAGES, MOVIE_GENRES, SERIES_GENRES, catalogId } from './catalog-spec.mjs';

const publicDir = path.join(ROOT, 'public');
fs.mkdirSync(publicDir, { recursive: true });

function source(type, id) {
  return { addonId: ADDON_ID, catalogId: id, type };
}
function folder(id, title, catalogSources, emoji = '🎬') {
  return {
    id,
    title,
    tileShape: 'POSTER',
    hideTitle: false,
    focusGifEnabled: false,
    catalogSources,
    coverEmoji: emoji
  };
}
function collection(id, title, folders, pinToTop = true) {
  return {
    id,
    title,
    showAllTab: true,
    viewMode: 'FOLLOW_LAYOUT',
    pinToTop,
    focusGlowEnabled: true,
    folders
  };
}

const collections = [];
for (const language of LANGUAGES) {
  const folders = [];
  const baseCategories = [
    ['popular', 'Popular', '🔥'],
    ['top_rated', 'Top Rated', '⭐'],
    ['new', 'Latest', '🆕']
  ];
  for (const type of ['movie', 'series']) {
    const plural = type === 'movie' ? 'Movies' : 'Series';
    for (const [category, label, emoji] of baseCategories) {
      folders.push(folder(
        `regional.${language.code}.${type}.${category}`,
        `${label} ${plural}`,
        [source(type, catalogId(type, language.code, category))],
        emoji
      ));
    }
    const genres = type === 'movie' ? MOVIE_GENRES : SERIES_GENRES;
    for (const genre of genres) {
      folders.push(folder(
        `regional.${language.code}.${type}.genre.${genre.id}`,
        `${genre.name} ${plural}`,
        [source(type, catalogId(type, language.code, 'genre', genre.id))],
        '🎭'
      ));
    }
  }
  collections.push(collection(
    `regional.language.${language.code}`,
    `${language.emoji} ${language.name} Regional Catalog`,
    folders,
    true
  ));
}

// A compact mixed-language landing section complements (but does not replace)
// the four language-specific collections.
const mixFolders = [];
for (const type of ['movie', 'series']) {
  const plural = type === 'movie' ? 'Movies' : 'Series';
  for (const [category, label, emoji] of [['popular', 'Popular', '🔥'], ['top_rated', 'Top Rated', '⭐'], ['new', 'Latest', '🆕']]) {
    mixFolders.push(folder(
      `regional.mix.${type}.${category}`,
      `${label} South Indian ${plural}`,
      LANGUAGES.map(lang => source(type, catalogId(type, lang.code, category))),
      emoji
    ));
  }
}
collections.unshift(collection('regional.south-indian', '🇮🇳 South Indian Mix', mixFolders, true));

const json = JSON.stringify(collections, null, 2) + '\n';
fs.writeFileSync(path.join(ROOT, 'collections.json'), json, 'utf8');
fs.writeFileSync(path.join(publicDir, 'collections.json'), json, 'utf8');
console.log(`Created collections.json with ${collections.length} collections and ${collections.reduce((sum, c) => sum + c.folders.length, 0)} folders.`);
console.log('Collection sources refer to addon ID:', ADDON_ID);
