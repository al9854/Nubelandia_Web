# Nubelandia · Panel del salón (front)

React + Vite + TypeScript + Tailwind CSS.

## Correr

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`. Con `VITE_USE_MOCKS=true` (por defecto en `.env.development`) funciona sin back.
Usuarios de prueba: `admin / nube123` (administrador) y `lucia / nube123` (empleada).

## Variables

| Variable | Qué hace |
|---|---|
| `VITE_API_URL` | Dirección del back (por ejemplo `http://localhost:5000`) |
| `VITE_USE_MOCKS` | `true` usa el servidor simulado; `false` llama al back real |

## Scripts

- `npm run dev` servidor de desarrollo
- `npm run build` revisa tipos y genera `dist/`
- `npm run typecheck` solo revisa tipos

## Ver el front en GitHub Pages

1. Sube el proyecto a GitHub (rama `main`).
2. En el repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Cada `git push` a `main` ejecuta `.github/workflows/deploy.yml` y publica en `https://<tu-usuario>.github.io/<nombre-del-repo>/`.

La versión publicada usa datos de ejemplo (`VITE_USE_MOCKS=true`) y rutas con `#` (`HashRouter`), porque GitHub Pages no sabe recargar rutas como `/sesiones`. El QR público queda en `.../#/qr`.

Estado, decisiones y contrato asumido: ver `BITACORA.md`.
