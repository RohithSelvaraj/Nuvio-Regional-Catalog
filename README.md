# Nuvio Regional Catalog

A Windows-friendly starter project for a custom Nuvio catalog focused on **Tamil, Telugu, Malayalam and Kannada** movies and series. It builds a static, Stremio-compatible catalog addon from TMDB data and a separate Nuvio collections JSON file.

> This product uses the TMDB API but is not endorsed or certified by TMDB. This addon supplies discovery/catalog metadata only; it does not provide video streams.

## What is included

- Language-separated collections for Tamil, Telugu, Malayalam and Kannada.
- A South Indian Mix collection with popular, top-rated and latest movies/series.
- Separate Movies and Series catalogs, each with Popular, Top Rated, Latest and genre shelves.
- A static addon manifest plus catalog responses generated into `public/`.
- GitHub Actions workflow to publish on each push, on demand, and twice daily.
- Secret-safe credential handling: `.env` is ignored by Git; GitHub Actions reads credentials from repository secrets.

## Windows quick start

1. Extract this project folder onto your Desktop so the full path is:
   `C:\Users\Rohith Jones\Desktop\Nuvio Regional Catalog`
2. Install **Node.js 20 or newer** from <https://nodejs.org/> if it is not already installed.
3. Double-click `SETUP-WINDOWS.bat`.
4. When Notepad opens `.env`, paste your TMDB v3 API key on the `TMDB_API_KEY=` line. Save and close Notepad. (Or use `TMDB_READ_ACCESS_TOKEN` for a TMDB API Read Access Token; if both are set, the read token takes priority.)
5. The script runs `npm run build`. Generated addon files are written to `public/`; the importable Nuvio collection file is `collections.json` in the project root.

You can run just the collection generator later with `npm run build:collections`. To create only the manifest without a TMDB request, run `npm run build:manifest`. The full local build is `npm run build`.

## Publish the addon so Nuvio can reach it from other devices

This project uses GitHub Pages for static hosting. The TMDB key is used only during the build; it is not included in the published JSON. The catalogs are refreshed by GitHub Actions twice daily, and can also be rebuilt manually.

### A. Configure your existing GitHub repository

Your repository already exists at <https://github.com/RohithSelvaraj/Nuvio-Regional-Catalog> and is currently empty. It does not need to be recreated.
2. Open <https://github.com/RohithSelvaraj/Nuvio-Regional-Catalog/settings/secrets/actions> (**Settings → Secrets and variables → Actions → New repository secret**).
3. Add one secret:
   - Recommended name: `TMDB_READ_ACCESS_TOKEN` — Value: your newly rotated TMDB API Read Access Token; **or**
   - Name: `TMDB_API_KEY` — Value: your newly rotated TMDB v3 API key.
4. Keep the repository secret private. Do not paste the key into README, JavaScript, JSON, or a Git commit.

### B. Push this folder to your repository

After you have extracted the folder to your Desktop and configured the replacement credential as the GitHub Actions secret, double-click `PUSH-TO-GITHUB.bat`. It initializes the `main` branch if needed, checks that a local `.env` file is ignored, sets the existing repository as `origin`, commits the project files, and pushes them. It will stop if a different remote URL is already configured. Git may prompt you to authenticate with GitHub.

You can also perform the push manually with PowerShell: `git init -b main`, `git add .`, `git commit -m "Initial Nuvio Regional Catalog"`, `git remote add origin https://github.com/RohithSelvaraj/Nuvio-Regional-Catalog.git`, and `git push -u origin main`.

### C. Enable GitHub Pages deployment

1. In your repository, open **Settings → Pages**.
2. Under **Build and deployment**, select **GitHub Actions** as the source.
3. Open **Actions** and select **Build and deploy Nuvio Regional Catalog**. The first push should start the workflow. If it does not, use **Run workflow**.
4. Wait for the workflow to finish successfully. The deployment job prints the exact Pages URL. It should be:
   `https://rohithselvaraj.github.io/Nuvio-Regional-Catalog/manifest.json`

The workflow builds the catalogs from the repository source using your Actions secret. The published JSON contains catalog results, not your credentials. The project refreshes twice daily; use **Actions → Build and deploy Nuvio Regional Catalog → Run workflow** to force a refresh.

## Install it in Nuvio

1. Copy the exact manifest URL shown by the successful GitHub Pages deployment. It will usually be `https://rohithselvaraj.github.io/Nuvio-Regional-Catalog/manifest.json`; use the Pages URL shown in the workflow if it differs.
2. In Nuvio, open **Settings → Add-ons** (on some platforms this is under **Content and Discovery → Add-ons**).
3. Choose **Add Addon / Install from URL**, paste the manifest URL, and install it.
4. Keep a compatible metadata addon installed and enabled as well. This addon emits TMDB IDs (`tmdb:12345`) and provides catalog rows only; Nuvio needs a metadata provider to resolve full details reliably.

## Import the collections

1. In the project root, open `collections.json`. This file is also generated again by `npm run build:collections`.
2. Sign in at <https://nuvio.tv/> and open **Account → Collections** (or <https://nuvio.tv/account?tab=collections>).
3. Choose **Import**, select the local `collections.json`, and confirm. Choose Add/Append if offered and you want to keep existing collections.
4. Refresh Nuvio. If a collection imports before the addon is installed, install the addon first and then refresh the collections/catalog view.

The collection refers to the addon ID `org.nuvio.regionalcatalog`; do not change that ID in `scripts/catalog-spec.mjs` after importing unless you also rebuild and re-import the collection JSON.

## Local smoke checks

After the build finishes:

- `public/manifest.json` should exist and list 160 catalogs.
- `public/catalog/movie/regional.movie.ta.popular.json` should contain a `metas` array for Tamil movies.
- `public/catalog/series/regional.series.ml.popular.json` should contain a `metas` array for Malayalam series.
- `collections.json` should be valid JSON and contain the four language collections plus South Indian Mix.

You can validate that the manifest can be generated without API access by running `npm run build:manifest`. The catalog files themselves require a valid TMDB credential.

## Troubleshooting

- **HTTP 401/403 from TMDB:** check the key type and that the secret/value was copied exactly. The v3 key goes in `TMDB_API_KEY`; the long API Read Access Token goes in `TMDB_READ_ACCESS_TOKEN`.
- **Workflow fails because no credential is configured:** add the repository secret and re-run the workflow. Secret changes do not need a new Git commit.
- **Nuvio cannot install the manifest:** make sure the GitHub Pages workflow succeeded, Pages is set to GitHub Actions, and you used the full HTTPS manifest URL (ending in `/manifest.json`).
- **Catalog rows appear but details are sparse:** enable a compatible metadata addon in Nuvio. This project intentionally uses `tmdb:` IDs and does not try to replace a full metadata addon.
- **Changes to `collections.json` do not appear in Nuvio:** re-import the file into your Nuvio account; pushing it to GitHub alone does not automatically update an already imported collection.

## Repository hygiene / security

- Both TMDB credentials were pasted into the setup chat. Treat them as exposed: rotate/revoke them in your TMDB account before production use, then store only the replacement in `.env` locally or as a GitHub Actions secret. Do not put either old credential into this project.
- Never commit `.env`.
- Do not remove `.env` from `.gitignore`.
- Prefer GitHub Actions repository secrets for the public deployment.
- If you accidentally commit a real TMDB credential, revoke/rotate it in TMDB; deleting the file in a later commit is not enough.

## Credits

TMDB provides the movie and television metadata used by this project. This product uses the TMDB API but is not endorsed or certified by TMDB.
