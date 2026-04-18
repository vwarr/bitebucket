# BiteBucket - Global Cuisine Checklist Desktop App

## Project Overview
A Tauri desktop app (React + TypeScript frontend, Rust backend) that lets users explore world cuisines through curated dish checklists with allergy/dietary filtering.

## Tech Stack
- **App shell:** Tauri (Rust backend, web frontend)
- **Frontend:** React + TypeScript
- **Styling:** Tailwind CSS
- **Local database:** sql.js (SQLite in WASM for the frontend)
- **State management:** Zustand
- **Map rendering:** Leaflet / react-leaflet
- **Build tool:** Vite

## Development Workflow
- **IMPORTANT:** When writing code, spawn AGENT TEAMS to do so. Do not write code directly — delegate to parallel agents.
- `npm run dev` — start Vite dev server
- `npm run tauri dev` — start Tauri dev mode
- `npm run build` — production build

## Project Structure
```
src/
├── components/    # React components
├── stores/        # Zustand stores
├── db/            # SQLite database setup & queries
├── data/          # Seed data (countries, dishes)
├── types/         # TypeScript types
├── pages/         # Top-level page components
└── utils/         # Utility functions
src-tauri/         # Tauri Rust backend
```
