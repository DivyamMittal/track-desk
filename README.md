# CRISIL TrackDesk

TypeScript repository split into two top-level projects for the CRISIL work logging platform.

## Projects

- `frontend`: React frontend with role-based portals
- `backend`: Express API with Joi validation and Mongo-ready architecture

## Run

```bash
npm install
npm run dev --workspace backend
npm run dev --workspace frontend
```

## Notes

- All persisted timestamps are UTC/GMT.
- Frontend converts UTC values to the user's local timezone.
- Shared enums and UI primitives live inside the two projects so the repo stays split into `frontend` and `backend`.

