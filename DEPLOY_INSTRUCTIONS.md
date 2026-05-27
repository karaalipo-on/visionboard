# Browser-only Vercel deployment

1. Unzip this ZIP file.
2. In GitHub, upload the files from inside the unzipped folder. The repository root must contain package.json, index.html, src/, vite.config.ts, vercel.json, and .npmrc.
3. Do not upload the ZIP file itself to GitHub.
4. Delete any old package-lock.json from the GitHub repo if you can. This source package intentionally does not include package-lock.json. The included .npmrc also tells npm not to use a lockfile during the Vercel install step.
5. In Vercel, import the GitHub repo. Use:
   - Framework Preset: Vite
   - Install Command: npm install
   - Build Command: npm run build
   - Output Directory: dist
   - Root Directory: ./

If your GitHub repo contains a folder named vision-board-app and package.json is inside that folder, set Vercel Root Directory to vision-board-app, or move the files out so package.json is at the repo root.
