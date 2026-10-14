import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './config.mjs';
import {
  ADDON_ID,
  ADDON_VERSION,
  createCatalogDefinitions,
  createFilteredCatalogDefinitions
} from './catalog-spec.mjs';

const publicDir = path.join(ROOT, 'public');
const catalogSourceRoot = path.join(publicDir, 'catalog');
const collectionsFile = path.join(ROOT, 'collections.json');

const PRESETS = [
  {
    folder: 'tamil',
    aliases: ['lang=tamil'],
    config: { languages: ['ta'] },
    name: 'Nuvio Regional Catalog · Tamil (தமிழ்)',
    description: 'Tamil movies and series discovery for Nuvio, powered by TMDB.'
  },
  {
    folder: 'telugu',
    aliases: ['lang=telugu'],
    config: { languages: ['te'] },
    name: 'Nuvio Regional Catalog · Telugu (తెలుగు)',
    description: 'Telugu movies and series discovery for Nuvio, powered by TMDB.'
  },
  {
    folder: 'malayalam',
    aliases: ['lang=malayalam'],
    config: { languages: ['ml'] },
    name: 'Nuvio Regional Catalog · Malayalam (മലയാളം)',
    description: 'Malayalam movies and series discovery for Nuvio, powered by TMDB.'
  },
  {
    folder: 'kannada',
    aliases: ['lang=kannada'],
    config: { languages: ['kn'] },
    name: 'Nuvio Regional Catalog · Kannada (ಕನ್ನಡ)',
    description: 'Kannada movies and series discovery for Nuvio, powered by TMDB.'
  },
  {
    folder: 'tamil-telugu',
    aliases: ['lang=tamil,telugu', 'tamil_telugu'],
    config: { languages: ['ta', 'te'] },
    name: 'Nuvio Regional Catalog · Tamil & Telugu',
    description: 'Tamil and Telugu movies and series discovery for Nuvio, powered by TMDB.'
  },
  {
    folder: 'popular',
    aliases: ['cats=popular'],
    config: { categories: ['popular'] },
    name: 'Nuvio Regional Catalog · Popular Hits',
    description: 'Popular Tamil, Telugu, Malayalam and Kannada movies & series.'
  },
  {
    folder: 'top_rated',
    aliases: ['top-rated', 'cats=top_rated'],
    config: { categories: ['top_rated'] },
    name: 'Nuvio Regional Catalog · Top Rated',
    description: 'Top rated regional Indian movies & series.'
  },
  {
    folder: 'new',
    aliases: ['latest', 'cats=new', 'ott', 'recent'],
    config: { categories: ['new'] },
    name: 'Nuvio Regional Catalog · Recently OTT Released',
    description: 'Recently OTT released movies and newly aired episodes in the last 2-3 months.'
  },
  {
    folder: 'movies',
    aliases: ['types=movie'],
    config: { types: ['movie'] },
    name: 'Nuvio Regional Catalog · Movies Only',
    description: 'Regional Indian movies across Tamil, Telugu, Malayalam and Kannada.'
  },
  {
    folder: 'series',
    aliases: ['types=series'],
    config: { types: ['series'] },
    name: 'Nuvio Regional Catalog · TV Series Only',
    description: 'Regional Indian TV series across Tamil, Telugu, Malayalam and Kannada.'
  },
  // Language-specific Movies Only
  {
    folder: 'tamil-movies',
    aliases: ['lang=tamil&types=movie', 'tamil_movies'],
    config: { languages: ['ta'], types: ['movie'] },
    name: 'Nuvio Regional Catalog · Tamil Movies Only',
    description: 'Tamil movies only across Popular, Top Rated, Recently OTT Released, and genres.'
  },
  {
    folder: 'telugu-movies',
    aliases: ['lang=telugu&types=movie', 'telugu_movies'],
    config: { languages: ['te'], types: ['movie'] },
    name: 'Nuvio Regional Catalog · Telugu Movies Only',
    description: 'Telugu movies only across Popular, Top Rated, Recently OTT Released, and genres.'
  },
  {
    folder: 'malayalam-movies',
    aliases: ['lang=malayalam&types=movie', 'malayalam_movies'],
    config: { languages: ['ml'], types: ['movie'] },
    name: 'Nuvio Regional Catalog · Malayalam Movies Only',
    description: 'Malayalam movies only across Popular, Top Rated, Recently OTT Released, and genres.'
  },
  {
    folder: 'kannada-movies',
    aliases: ['lang=kannada&types=movie', 'kannada_movies'],
    config: { languages: ['kn'], types: ['movie'] },
    name: 'Nuvio Regional Catalog · Kannada Movies Only',
    description: 'Kannada movies only across Popular, Top Rated, Recently OTT Released, and genres.'
  },
  // Language-specific TV Series Only
  {
    folder: 'tamil-series',
    aliases: ['lang=tamil&types=series', 'tamil_series'],
    config: { languages: ['ta'], types: ['series'] },
    name: 'Nuvio Regional Catalog · Tamil Series Only',
    description: 'Tamil TV series only across Popular, Top Rated, Recent, and genres.'
  },
  {
    folder: 'telugu-series',
    aliases: ['lang=telugu&types=series', 'telugu_series'],
    config: { languages: ['te'], types: ['series'] },
    name: 'Nuvio Regional Catalog · Telugu Series Only',
    description: 'Telugu TV series only across Popular, Top Rated, Recent, and genres.'
  },
  {
    folder: 'malayalam-series',
    aliases: ['lang=malayalam&types=series', 'malayalam_series'],
    config: { languages: ['ml'], types: ['series'] },
    name: 'Nuvio Regional Catalog · Malayalam Series Only',
    description: 'Malayalam TV series only across Popular, Top Rated, Recent, and genres.'
  },
  {
    folder: 'kannada-series',
    aliases: ['lang=kannada&types=series', 'kannada_series'],
    config: { languages: ['kn'], types: ['series'] },
    name: 'Nuvio Regional Catalog · Kannada Series Only',
    description: 'Kannada TV series only across Popular, Top Rated, Recent, and genres.'
  },
  // Language-specific Recent OTT
  {
    folder: 'tamil-ott',
    aliases: ['lang=tamil&cats=new', 'tamil_ott', 'tamil-new'],
    config: { languages: ['ta'], categories: ['new'] },
    name: 'Nuvio Regional Catalog · Tamil Recently OTT Released',
    description: 'Tamil movies and series released on OTT in the last 2-3 months.'
  },
  {
    folder: 'telugu-ott',
    aliases: ['lang=telugu&cats=new', 'telugu_ott', 'telugu-new'],
    config: { languages: ['te'], categories: ['new'] },
    name: 'Nuvio Regional Catalog · Telugu Recently OTT Released',
    description: 'Telugu movies and series released on OTT in the last 2-3 months.'
  },
  {
    folder: 'malayalam-ott',
    aliases: ['lang=malayalam&cats=new', 'malayalam_ott', 'malayalam-new'],
    config: { languages: ['ml'], categories: ['new'] },
    name: 'Nuvio Regional Catalog · Malayalam Recently OTT Released',
    description: 'Malayalam movies and series released on OTT in the last 2-3 months.'
  },
  {
    folder: 'kannada-ott',
    aliases: ['lang=kannada&cats=new', 'kannada_ott', 'kannada-new'],
    config: { languages: ['kn'], categories: ['new'] },
    name: 'Nuvio Regional Catalog · Kannada Recently OTT Released',
    description: 'Kannada movies and series released on OTT in the last 2-3 months.'
  },
  // Additional Language Mixes
  {
    folder: 'tamil-malayalam',
    aliases: ['lang=tamil,malayalam', 'tamil_malayalam'],
    config: { languages: ['ta', 'ml'] },
    name: 'Nuvio Regional Catalog · Tamil & Malayalam',
    description: 'Tamil and Malayalam movies and series discovery for Nuvio, powered by TMDB.'
  },
  {
    folder: 'telugu-kannada',
    aliases: ['lang=telugu,kannada', 'telugu_kannada'],
    config: { languages: ['te', 'kn'] },
    name: 'Nuvio Regional Catalog · Telugu & Kannada',
    description: 'Telugu and Kannada movies and series discovery for Nuvio, powered by TMDB.'
  }
];

function copyCatalogFile(type, id, targetCatalogDir) {
  const sourcePath = path.join(catalogSourceRoot, type, `${id}.json`);
  if (!fs.existsSync(sourcePath)) return;
  const targetTypeDir = path.join(targetCatalogDir, type);
  fs.mkdirSync(targetTypeDir, { recursive: true });
  fs.copyFileSync(sourcePath, path.join(targetTypeDir, `${id}.json`));
}

export function buildPresets() {
  console.log('Generating preset static catalogs and manifests for GitHub Pages...');

  let allCollections = [];
  if (fs.existsSync(collectionsFile)) {
    try {
      allCollections = JSON.parse(fs.readFileSync(collectionsFile, 'utf8'));
    } catch {}
  }

  let totalPresetsBuilt = 0;

  for (const preset of PRESETS) {
    const definitions = createFilteredCatalogDefinitions(preset.config);
    const manifest = {
      id: ADDON_ID,
      version: ADDON_VERSION,
      name: preset.name,
      description: preset.description,
      resources: ['catalog'],
      types: preset.config.types?.length ? preset.config.types : ['movie', 'series'],
      idPrefixes: ['tmdb:'],
      catalogs: definitions.map(def => ({
        type: def.type,
        id: def.id,
        name: def.title,
        pageSize: 60
      })),
      behaviorHints: { adult: false, configurable: true, configurationRequired: false }
    };

    const manifestContent = JSON.stringify(manifest, null, 2) + '\n';
    const targetFolders = [preset.folder, ...(preset.aliases || [])];

    for (const folder of targetFolders) {
      const targetDir = path.join(publicDir, folder);
      const targetCatalogDir = path.join(targetDir, 'catalog');
      fs.mkdirSync(targetDir, { recursive: true });
      fs.writeFileSync(path.join(targetDir, 'manifest.json'), manifestContent, 'utf8');

      // Copy matching catalog files
      for (const def of definitions) {
        copyCatalogFile(def.type, def.id, targetCatalogDir);
      }

      // Filter collections if language-specific
      if (preset.config.languages && allCollections.length > 0) {
        const langMap = { ta: 'tamil', te: 'telugu', ml: 'malayalam', kn: 'kannada' };
        const allowed = new Set(preset.config.languages.map(c => langMap[c]).filter(Boolean));
        const filteredCollections = allCollections.filter(c => {
          if (c.id === 'regional.south-indian') return true;
          return Array.from(allowed).some(k => c.id.toLowerCase().includes(k));
        });
        fs.writeFileSync(path.join(targetDir, 'collections.json'), JSON.stringify(filteredCollections, null, 2) + '\n', 'utf8');
      }

      totalPresetsBuilt++;
    }
  }

  console.log(`Successfully built ${totalPresetsBuilt} preset configurations in public/!`);
}

buildPresets();
