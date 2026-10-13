import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './config.mjs';
import { ADDON_ID, createCatalogDefinitions } from './catalog-spec.mjs';

const collectionPath = path.join(ROOT, 'collections.json');
if (!fs.existsSync(collectionPath)) {
  throw new Error('collections.json not found. Run npm run build:collections first.');
}
const collections = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
if (!Array.isArray(collections) || collections.length < 5) {
  throw new Error('collections.json does not look like the expected Nuvio collection list.');
}
const expected = new Map(createCatalogDefinitions().map(def => [`${def.type}\0${def.id}`, def]));
let folderCount = 0;
let sourceCount = 0;
for (const collection of collections) {
  if (!Array.isArray(collection.folders)) throw new Error(`Collection ${collection.title || collection.id} has no folders array.`);
  for (const folder of collection.folders) {
    folderCount++;
    if (!Array.isArray(folder.catalogSources)) throw new Error(`Folder ${folder.title || folder.id} has no catalogSources array.`);
    for (const source of folder.catalogSources) {
      sourceCount++;
      if (source.addonId !== ADDON_ID) throw new Error(`Unexpected addonId on source ${source.catalogId}.`);
      if (!expected.has(`${source.type}\0${source.catalogId}`)) {
        throw new Error(`Unknown collection source: ${source.type}/${source.catalogId}`);
      }
    }
  }
}
const manifestPath = path.join(ROOT, 'public', 'manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const actual = new Set((manifest.catalogs || []).map(c => `${c.type}\0${c.id}`));
  const missing = [...expected.keys()].filter(k => !actual.has(k));
  if (manifest.id !== ADDON_ID) throw new Error(`Manifest addon ID mismatch: ${manifest.id}`);
  if (missing.length) throw new Error(`Manifest is missing ${missing.length} expected catalogs.`);
}
console.log(`Validation passed: ${collections.length} collections, ${folderCount} folders, ${sourceCount} source references, ${expected.size} catalog definitions.`);
