# CRISIL TrackDesk

TypeScript repository split into two top-level projects for the CRISIL work logging platform.

## Projects

- `frontend`: React frontend with role-based portals
- `backend`: Express API with Joi validation and Mongo-ready architecture

## Run

```bash
cd backend && npm install && npm run dev
cd frontend && npm install && npm run dev
```

## Deploy

- Create two separate Vercel projects.
- Frontend project root must be [frontend](/Users/divyam/Documents/CRISIL/frontend). It uses [frontend/vercel.json](/Users/divyam/Documents/CRISIL/frontend/vercel.json) and publishes the Vite build.
- Backend project root must be [backend](/Users/divyam/Documents/CRISIL/backend). It uses [backend/vercel.json](/Users/divyam/Documents/CRISIL/backend/vercel.json) so requests rewrite to the serverless API entrypoint.

## Notes

- All persisted timestamps are UTC/GMT.
- Frontend converts UTC values to the user's local timezone.
- Each project is intentionally self-contained; do not add a root-level `package.json` or `tsconfig.json`.
- Shared enums and UI primitives live inside the two projects so the repo stays split into `frontend` and `backend`.
