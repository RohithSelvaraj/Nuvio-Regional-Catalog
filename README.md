# Nuvio Regional Catalog

A configurable discovery catalog add-on for **Nuvio** and **Stremio**, organizing movies and TV series by Indian regional languages: **Tamil, Telugu, Malayalam, Kannada, Hindi**, and more.

> **Hosted Add-on & Configurator:**  
> 👉 [**https://rohithselvaraj.github.io/Nuvio-Regional-Catalog/**](https://rohithselvaraj.github.io/Nuvio-Regional-Catalog/)

> This product uses the TMDB API but is not endorsed or certified by TMDB. This addon supplies discovery/catalog metadata only; it does not provide video streams.

---

## 🔗 Ready-to-Install Addon Links (GitHub Pages CDN)

You can copy and install any of these direct manifest URLs right into **Nuvio (Settings → Add-ons → Install from URL)**:

| Add-on Catalog | Direct Manifest URL | Catalogs |
| :--- | :--- | :--- |
| 🌟 **All Regional Languages** | `https://rohithselvaraj.github.io/Nuvio-Regional-Catalog/manifest.json` | 160 Catalogs |
| 🟠 **Tamil Movies & TV Series** | `https://rohithselvaraj.github.io/Nuvio-Regional-Catalog/tamil/manifest.json` | 40 Catalogs |
| 🟣 **Telugu Movies & TV Series** | `https://rohithselvaraj.github.io/Nuvio-Regional-Catalog/telugu/manifest.json` | 40 Catalogs |
| 🟢 **Malayalam Movies & TV Series** | `https://rohithselvaraj.github.io/Nuvio-Regional-Catalog/malayalam/manifest.json` | 40 Catalogs |
| 🔵 **Kannada Movies & TV Series** | `https://rohithselvaraj.github.io/Nuvio-Regional-Catalog/kannada/manifest.json` | 40 Catalogs |
| 🟠🟣 **Tamil & Telugu Mix** | `https://rohithselvaraj.github.io/Nuvio-Regional-Catalog/tamil-telugu/manifest.json` | 80 Catalogs |
| 🔥 **Popular South Indian Hits** | `https://rohithselvaraj.github.io/Nuvio-Regional-Catalog/popular/manifest.json` | 8 Catalogs |
| ⭐ **Top Rated Regional Cinema** | `https://rohithselvaraj.github.io/Nuvio-Regional-Catalog/top_rated/manifest.json` | 8 Catalogs |
| ⚡ **Latest Releases** | `https://rohithselvaraj.github.io/Nuvio-Regional-Catalog/new/manifest.json` | 8 Catalogs |
| 🎬 **Movies Only (All Languages)** | `https://rohithselvaraj.github.io/Nuvio-Regional-Catalog/movies/manifest.json` | 84 Catalogs |
| 📺 **TV Series Only (All Languages)** | `https://rohithselvaraj.github.io/Nuvio-Regional-Catalog/series/manifest.json` | 76 Catalogs |

---

## ✨ Features & What's Included

- 🎛️ **Live Interactive Configurator**: Hosted at [https://rohithselvaraj.github.io/Nuvio-Regional-Catalog/](https://rohithselvaraj.github.io/Nuvio-Regional-Catalog/) to pick languages, genres, and platforms.
- 🎯 **Dynamic URL Matching Engine**: Automatically matches user checkbox selections to the exact pre-built static manifest URL or dynamic query.
- 🌐 **5 Indian Languages Supported**: Tamil (தமிழ்), Telugu (తెలుగు), Malayalam (മലയാളം), Kannada (ಕನ್ನಡ), and Hindi (हिन्दी).
- 📺 **OTT Platform Filter (India)**: Filter discover catalogs by streaming subscriptions (Netflix, Prime Video, Disney+ Hotstar, Zee5, Sony LIV, JioCinema, Aha, Sun NXT).
- ⚡ **Live TMDB Server + Offline CDN**: Runs statically on GitHub Pages with sub-catalogs, or as a live Express backend with 6-hour caching.
- 🚀 **Zero-Config Cloud Deployments**: Ready for GitHub Pages, **Render** (free web service), or **Vercel** (serverless).
- 📦 **160 Core Catalogs Intact**: Retains the complete, verified 160 original catalogs and importable `collections.json`.

---

## 📱 How to Install in Nuvio

1. Open the [**Nuvio Regional Catalog Configurator**](https://rohithselvaraj.github.io/Nuvio-Regional-Catalog/).
2. Select your languages or choose a pre-built preset above.
3. Click **Copy Manifest URL** (or copy from the table above).
4. In your Nuvio app / TV:
   - Go to **Settings → Add-ons** (or **Content and Discovery → Add-ons**).
   - Click **Add Addon / Install from URL**.
   - Paste the copied HTTPS manifest URL and confirm.
5. Your customized rows appear immediately!

---

## 🛠️ Running the Live Server Locally

1. Clone or open this repository:
   ```bash
   cd "c:\Users\Rohith Jones\Desktop\Nuvio Regional Catalog"
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set your TMDB credentials in `.env`:
   ```env
   TMDB_API_KEY=679f12b78743a9d15432a1aeb79aa087
   ```
4. Start the server:
   ```bash
   npm start
   ```
5. Open `http://localhost:3000` or `http://localhost:3000/configure`.

---

## 🌐 Deploying to Render or Vercel

If you want live on-the-fly OTT provider filtering and dynamic custom URL generation:

### Deploy on Render (Free Web Service)
1. Push this repository to GitHub.
2. In [Render Dashboard](https://dashboard.render.com/), choose **New → Web Service** and select `RohithSelvaraj/Nuvio-Regional-Catalog`.
3. Render detects `render.yaml` automatically. Add `TMDB_API_KEY` under Environment Variables and click **Deploy**.

### Deploy on Vercel (Free Serverless)
1. Import `RohithSelvaraj/Nuvio-Regional-Catalog` in [Vercel](https://vercel.com/new).
2. The included `vercel.json` and `api/index.mjs` configure serverless functions automatically.
3. Add `TMDB_API_KEY` under Environment Variables and deploy.

---

## 🧪 Build & Test Commands

```bash
# Validate core catalog specification (ensures 160 original catalogs remain intact)
npm run validate

# Build static manifests & presets for GitHub Pages
npm run build:manifest

# Build full static catalog files from TMDB
npm run build:catalogs

# Generate all sub-catalog preset folders
npm run build:presets

# Full build
npm run build
```

---

## 🔒 Security & Credentials

- Never commit `.env` to Git (`.gitignore` protects it).
- For GitHub Actions deployment, configure `TMDB_API_KEY` in **Repository Settings → Secrets and variables → Actions**.
- For Render or Vercel, configure `TMDB_API_KEY` in the service's Environment Variables.

---

## 📜 Credits

- Powered by [The Movie Database (TMDB)](https://www.themoviedb.org/).
- Built for the [Nuvio](https://nuvio.tv/) and [Stremio](https://www.stremio.com/) communities.
