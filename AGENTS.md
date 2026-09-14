# Base44 Development Environment

## Architecture
- **Frontend**: Vite + React + TypeScript + shadcn-ui (port 3000)
- **Backend**: Node.js + Express + MongoDB (port 5000, internal only)
- **Database**: MongoDB (compose service)

## How it runs
- `docker compose -f docker-compose.base44.yml up -d` starts MongoDB, the backend (nodemon), and the frontend (Vite dev server).
- The Vite dev server proxies `/api`, `/uploads`, and `/courrier` to the backend, so the frontend and backend share a single origin (port 3000). This avoids CORS and cookie issues.
- `VITE_API_URL=/api` is set for the frontend; API calls use relative URLs through the proxy.
- Static file URLs (photos, uploads) use `(VITE_API_URL || default).replace('/api', '')` to construct relative base URLs.

## Secrets
- `JWT_SECRET` — required for JWT auth. A development placeholder is generated automatically; replace it with a real value for production.
- MongoDB URI is internal (compose service), not a secret.

## Default admin login
- Username: `admin`
- Password: `admin123`
- Created automatically on first boot if no admin exists.

## Verification
- `curl http://localhost:3000` should return the frontend HTML.
- `curl http://localhost:3000/api/test` should return `{"message":"API is working"}`.
- Login at the login page with admin/admin123.

## Notes
- The `lovable-tagger` Vite plugin was removed to avoid external service dependencies in the preview.
- Scanner hardware features are disabled (`SCANNER_ENABLED=false`); the scanner service gracefully handles missing hardware.
- File watch polling is enabled for both frontend and backend to support bind mounts.
