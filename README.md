# Glass Vision Board

A local-first, Pinterest-inspired vision board and mood board app built with React, TypeScript, and Vite. It is ready to deploy as a static app on Vercel.

## What it does

- **Boards**: Includes three starter boards: Vision Board, Dream Travel, and Career Goals.
- **Board themes**: Create unlimited boards, choose a color theme, and change an existing board theme from the board header dropdown.
- **Pins**: Add four pin types:
  - Image URL
  - Uploaded image from your device
  - Quote or affirmation
  - Link with title and optional preview image
- **Manage pins**: Hover a pin to reveal the delete button. Link pins open in a new tab.
- **Local-first storage**: Boards and pins save automatically in the browser with `localStorage`.
- **User-controlled data**: Export all boards to JSON, import a backup JSON file, or restore the starter boards.
- **Glassmorphism UI**: Colorful translucent panels, accessible labels, keyboard-friendly forms, and responsive layout.

## Important local-storage notes

This app has no database and no login system. Everything is saved in the user's current browser on their current device.

Uploaded images are converted to data URLs and optimized before saving, but browser storage still has a limit. If storage fills up, export your data, delete large image uploads, or use image URL pins instead.

When you use external image URLs or link previews, the app stores the URL locally, but the browser still loads that image from the external website.

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Build for production

```bash
npm run build
npm run preview
```

The production build is created in `dist/`.

## Deploy to Vercel

### Option 1: GitHub + Vercel dashboard

1. Push this project to a GitHub repository.
2. In Vercel, choose **Add New Project** and import the repository.
3. Vercel should detect Vite automatically.
4. Use these settings if you need to enter them manually:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`
5. Deploy.

### Option 2: Vercel CLI

```bash
npm install -g vercel
vercel
vercel --prod
```

## Project structure

```text
vision-board-app/
  index.html
  package.json
  vercel.json
  vite.config.ts
  src/
    App.tsx
    data.ts
    icons.tsx
    imageTools.ts
    main.tsx
    storage.ts
    styles.css
    types.ts
```

## Good next upgrades

- Drag-and-drop pin ordering.
- Edit existing pins and rename boards.
- Optional passphrase-based local encryption before saving to `localStorage`.
- Optional PWA install/offline shell.
- Optional cloud sync with a user-owned backend later, while keeping export/import.
