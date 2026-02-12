# TomarDatos (Frontend)

[README en Español](./README.md)

Frontend built with **React + TypeScript + Vite + TailwindCSS** to capture lead/customer data (voice and/or manual input) and send it to a backend API.

## Requirements

- Node.js (**18+** recommended)
- npm (or pnpm/yarn)

## Install

1. Clone the repository.
2. Open the project folder.
3. Install dependencies:

```bash
npm install
```

## Run in development

```bash
npm run dev
```

Vite will print the local URL (usually `http://localhost:5173`).

## Build / production (optional)

```bash
npm run build
npm run preview
```

## What this app does

- Start screen with:
  - **Sync** button (requests microphone permission and warms up browser voices).
  - **Start** button to begin the capture flow.
- Capture screen:
  - Microphone status badge (**LISTENING** / **READY**).
  - Main fields: Tax ID (NIT), company name, city, contact name, phone, email, customer type, and concept.
  - “Destination/CRM” fields:
    - **Contact method** (WhatsApp or Email) *(not required)*.
    - **Assigned to** (fixed list).
    - **Sales line** (auto-detected from “concept”, can be overridden manually).
- Basic input sanitizing:
  - **NIT** and **Phone** are numeric-only (letters/symbols are stripped).
  - **Email** normalizes spoken punctuation:
    - `arroba` → `@`
    - `punto` → `.`
    - `guion bajo` / `underscore` → `_`
    - `guion` / `guion medio` → `-`
    - **Accents are automatically removed** (é, á, í, ó, ú, ñ, etc.) for domain validity.
- Fields with "null" option:
  - You can say/type **"nulo"**, **"null"**, **"ninguno"**, **"n/a"** in: NIT, Company name, Customer name, Phone, Email.
  - This leaves the field empty (allowed if not required).

## Form rules (validation)

Required:
- **NIT**
- **City**
- **Customer type**
- **Concept**
- **Assigned to**
- **Sales line**

Contact method is *optional*:
- If **Email** is selected, an email format check is applied.
- If **WhatsApp** is selected, phone number is required.

## “Sales line” mapping

The app detects a category from **Concept**:

- If it contains `montacarg...` → `Servicio montacargas` or `Alquiler montacargas`
- If it contains `mantenimiento...` → `Mantenimiento`
- If it contains `venta...` → `Venta`

The backend typically maps those labels to:

- Venta → `SOLU`
- Mantenimiento → `SERV`
- Servicio/Alquiler montacargas → `MONT`

## Important configuration (Backend URL)

The frontend currently POSTs to:

- `http://localhost:5016/api/Registros`

If your backend uses a different host/port, update it in `src/App.tsx` (`guardarEnBackend`).

> Tip: you can make this configurable via `VITE_API_BASE_URL` in a `.env` file.

## Logo / brand assets (publishing to GitHub)

The UI expects `public/logo_hidraulicos.webp`.

- If the logo is proprietary and you don't want to publish it, this repo ignores it by default via `.gitignore`.
- To run locally with the real logo, place the file at `public/logo_hidraulicos.webp`.

## Project structure

- `src/App.tsx`: main form + voice capture logic.
- `src/main.tsx`: React bootstrap.
- `index.html`: Vite entry.
- `public/`: static assets.

## Troubleshooting

- **No “LISTENING” badge**: check browser microphone permissions.
- **Voice recognition not working**: depends on browser support (Chrome is usually best for the Web Speech API).
- **CORS / save errors**: backend must allow requests from the frontend origin.

## License

Add a license if you plan to publish the repository (MIT, private, etc.).

