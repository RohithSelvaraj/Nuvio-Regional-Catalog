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
    aliases: ['latest', 'cats=new'],
    config: { categories: ['new'] },
    name: 'Nuvio Regional Catalog · Latest Releases',
    description: 'Latest regional Indian movie & series releases.'
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
        pageSize: 20
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
