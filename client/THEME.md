# UI Theme Guide

This project uses a unified, professional gradient theme with reusable utility classes defined in `src/index.css`.

## Palette
- Primary: Indigo/Blue (accent blue to indigo)
- Success: Emerald/Green
- Danger: Red/Rose
- Backgrounds: Neutral slate/gray tints

## Key Utilities
- Backgrounds
  - `app-bg-gradient` — App/page background
  - `app-header-gradient` — Top header bar
  - `app-success-gradient` — Success backdrop (e.g., FaceAuth success)
- Buttons
  - `btn-gradient-primary`
  - `btn-gradient-success`
  - `btn-gradient-danger`
- Text
  - `text-gradient-primary`
  - `text-gradient-success`
- Chips (light pills)
  - `chip-gradient`
  - `chip-gradient-success`
- Cards
  - `card-gradient-blue`
  - `card-gradient-green`
  - `card-gradient-yellow`
  - `card-gradient-red`
  - `card-gradient-soft` (neutral/empty states)

## Usage Examples
- Page container: `<div class="min-h-screen app-bg-gradient ...">`
- Header: `<header class="app-header-gradient ...">`
- Primary button: `<button class="btn-gradient-primary text-white ...">`
- Gradient title text: `<h2 class="text-gradient-primary ...">Title</h2>`
- Stat cards: `<div class="card-gradient-blue rounded-2xl ...">`
- Light chip: `<div class="chip-gradient rounded-full ...">`

## Notes
- Animations, spacing, and other utilities remain unchanged.
- Prefer these classes over ad-hoc `bg-gradient-to-* from-* to-*` to keep the look consistent.
