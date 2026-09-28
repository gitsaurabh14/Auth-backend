# E-commerce Auth

The API handles register, login, refresh-token rotation, logout, profile lookup, and protected product CRUD. The UI talks to those endpoints over `/api`.

## Project layout

- `backend/` — REST API on `http://localhost:3000`
- `frontend/` — browser app on `http://localhost:5173` (dev server proxies `/api` to the backend)

## Run it

1. Install Node.js.
2. `backend/.env` replace both secrets with long random values.
3. In `backend/`, run `npm install` then `npm run dev`.
4. In `frontend/`, run `npm install` then `npm run dev`.
5. Open `http://localhost:5173`. `GET /api/health` should report `{ "status": "ok" }`.

`FRONTEND_ORIGIN=http://localhost:5173` is required when the UI calls the API without the Vite proxy.

## Frontend features

- Create account and sign in (strong password rules match the API)
- Session restore via `GET /api/auth/me`
- Silent refresh on expired access tokens using the httpOnly refresh cookie
- Logout (revokes the stored refresh hash)
- Public product catalog, search, and product details
- Create / edit / delete only products you own

## API behavior

- `POST /api/auth/register`: returns `201` and a safe user profile only.
- `POST /api/auth/login`: returns a 15-minute access token and writes a 7-day httpOnly refresh-token cookie.
- `POST /api/auth/refresh-token`: verifies the stored SHA-256 token hash and rotates it; an old token cannot be reused.
- `POST /api/auth/logout` and `GET /api/auth/me`: require `Authorization: Bearer <accessToken>`.
- Product writes also require that header. Products can only be updated or deleted by their creator.

Validation errors use HTTP `400` and have this shape:

```json
{ "message": "Validation failed.", "errors": [{ "field": "price", "message": "Price must be a non-negative number." }] }
```

